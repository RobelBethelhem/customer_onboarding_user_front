
import React, { useRef, useEffect, useState } from 'react';
import { Loader2, RefreshCw, CheckCircle2, XCircle, ShieldCheck, Video, ScanFace, ArrowRight, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { OnboardingState, LivenessFrame } from '../types';
import { faydaService, LivenessVerifyResult } from '../services/api';
import {
  loadFaceApi, makeSequence, mouthAspectRatio, computeYaw, eyeAspectRatio, ACTION_PROMPTS,
  MAR_OPEN, MAR_CLOSED, YAW_TURN, BASELINE_FRAMES, BASELINE_TIMEOUT_MS, ACTION_TIMEOUT_MS, DETECT_INTERVAL_MS,
  type LivenessAction, type Pt,
} from '../utils/liveness';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

type Phase =
  | 'loading'     // camera + face models
  | 'ready'       // press Start
  | 'liveness'    // following the on-screen actions (video recording)
  | 'verifying'   // server re-checks the frames and compares with the Fayda photo
  | 'uploading'   // video for the KYC team
  | 'recording'   // video only: the live check cannot run on this device, or the customer continues after failed attempts
  | 'success'
  | 'fail';

const MAX_ATTEMPTS = 3;            // after this many failed checks the customer may continue — KYC reviews it
const VIDEO_ONLY_MS = 5000;
const FRAME_MAX_WIDTH = 640;

const toDataUri = (photo: string | undefined | null): string => {
  if (!photo) return '';
  if (photo.startsWith('data:image')) return photo;
  return `data:image/jpeg;base64,${photo}`;
};

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const FaceVerificationStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef<Promise<Blob | null> | null>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const phaseRef = useRef<Phase>('loading');
  const faceapiRef = useRef<typeof import('face-api.js') | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // One attempt: actions to do, progress, captured selfie + frames, video, server result
  const lv = useRef({ seq: [] as LivenessAction[], idx: 0, base: [] as number[], baseYaw: 0, baseDone: false, start: 0, promptStart: 0 });
  const selfieRef = useRef('');
  const framesRef = useRef<LivenessFrame[]>([]);
  const videoBlobRef = useRef<Blob | null>(null);
  const resultRef = useRef<LivenessVerifyResult | null>(null);
  const attemptsRef = useRef(0);

  const [phase, setPhaseState] = useState<Phase>('loading');
  const [status, setStatus] = useState('Starting the camera…');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 2 });
  const [turnMarker, setTurnMarker] = useState<number | null>(null);
  const [liveCheckAvailable, setLiveCheckAvailable] = useState(true);
  const [canContinue, setCanContinue] = useState(false);      // after MAX_ATTEMPTS failed checks
  const [uploadFailed, setUploadFailed] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [outcome, setOutcome] = useState<{ verified: boolean; matched: boolean | null } | null>(null);

  const go = (p: Phase) => { phaseRef.current = p; setPhaseState(p); };

  // ── Camera ────────────────────────────────────────────────────────────────────────────────
  const startCamera = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const stopLoop = () => {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = null;
  };

  // ── Video for the KYC team ────────────────────────────────────────────────────────────────
  const startRecording = () => {
    videoBlobRef.current = null;
    if (!streamRef.current || typeof MediaRecorder === 'undefined') {
      recordingRef.current = Promise.resolve(null);
      return;
    }
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';
    const recorder = new MediaRecorder(streamRef.current, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 600_000 });
    const chunks: Blob[] = [];
    recordingRef.current = new Promise(resolve => {
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' }) : null);
      recorder.onerror = () => resolve(null);
    });
    recorder.start(500);
    recorderRef.current = recorder;
  };

  const stopRecording = async (): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    const blob = recordingRef.current ? await recordingRef.current : null;
    recordingRef.current = null;
    if (blob && blob.size > 1000) videoBlobRef.current = blob;
    return videoBlobRef.current;
  };

  /** The current camera frame, not mirrored, at most 640 px wide */
  const grabFrame = (): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;
    const canvas = frameCanvasRef.current || (frameCanvasRef.current = document.createElement('canvas'));
    const scale = Math.min(1, FRAME_MAX_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };
  const jpeg = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

  // ── Setup / teardown ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const camera = startCamera();
      let faceapi: typeof import('face-api.js') | null = null;
      try {
        faceapi = await loadFaceApi();
      } catch (e) {
        console.warn('[Face] Live check not available on this device:', e);
      }
      const cameraOk = await camera;
      if (!mountedRef.current) return;
      faceapiRef.current = faceapi;
      setLiveCheckAvailable(!!faceapi);
      if (!cameraOk) {
        setError('Camera access denied. Please allow the camera in your browser settings and try again.');
        go('fail');
        return;
      }
      go('ready');
    })();
    return () => {
      mountedRef.current = false;
      stopLoop();
      void stopRecording();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Failure / retry ───────────────────────────────────────────────────────────────────────
  const fail = (message: string) => {
    stopLoop();
    setTurnMarker(null);
    attemptsRef.current += 1;
    if (attemptsRef.current >= MAX_ATTEMPTS) setCanContinue(true);
    setError(message);
    go('fail');
  };

  const retry = async () => {
    setError('');
    setUploadFailed(false);
    if (!streamRef.current && !(await startCamera())) {
      setError('Camera access denied. Please allow the camera in your browser settings and try again.');
      go('fail');
      return;
    }
    go('ready');
  };

  // ── Live check ────────────────────────────────────────────────────────────────────────────
  const showAction = () => {
    const st = lv.current;
    const action = st.seq[st.idx];
    setStatus(ACTION_PROMPTS[action]);
    setTurnMarker(action === 'turn' ? 0 : null);
  };

  const tick = async () => {
    const faceapi = faceapiRef.current;
    if (!mountedRef.current || busyRef.current || !faceapi || phaseRef.current !== 'liveness') return;
    busyRef.current = true;
    try {
      const st = lv.current;
      const now = Date.now();
      if (!st.baseDone && now - st.start > BASELINE_TIMEOUT_MS) {
        void stopRecording();
        fail('We could not see your face clearly. Face the camera in good light, with only you in view, and try again.');
        return;
      }
      if (st.baseDone && now - st.promptStart > ACTION_TIMEOUT_MS) {
        void stopRecording();
        fail(`Not completed in time: "${ACTION_PROMPTS[st.seq[st.idx]]}". Please try again.`);
        return;
      }

      // Analyse a still copy of the frame, so the frame sent to the server is the one that was checked
      const frame = grabFrame();
      if (!frame) return;
      const det = await faceapi
        .detectSingleFace(frame, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
        .withFaceLandmarks();
      if (!mountedRef.current || phaseRef.current !== 'liveness') return;
      if (!det) {
        setStatus('Position your face in the oval');
        return;
      }

      const lm = det.landmarks;
      const leftEye = lm.getLeftEye() as Pt[];
      const rightEye = lm.getRightEye() as Pt[];
      const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
      const mar = mouthAspectRatio(lm.getMouth() as Pt[]);
      const yaw = computeYaw(leftEye, rightEye, lm.getNose() as Pt[]);

      if (!st.baseDone) {
        // Neutral, centred face: eyes open, mouth closed, looking at the camera → the selfie
        if (ear > 0.15 && mar < MAR_CLOSED && Math.abs(yaw) < 0.25) {
          st.base.push(yaw);
          setStatus(`Hold still… (${st.base.length}/${BASELINE_FRAMES})`);
          if (st.base.length >= BASELINE_FRAMES) {
            selfieRef.current = jpeg(frame);
            st.baseYaw = st.base.reduce((a, b) => a + b, 0) / st.base.length;
            st.baseDone = true;
            st.idx = 0;
            st.promptStart = now;
            showAction();
          }
        } else {
          setStatus('Look straight at the camera with your mouth closed');
        }
        return;
      }

      const action = st.seq[st.idx];
      const rel = yaw - st.baseYaw;
      if (action === 'turn') setTurnMarker(Math.max(-1, Math.min(1, rel / (YAW_TURN * 1.4))));
      const done = action === 'mouth' ? mar > MAR_OPEN : Math.abs(rel) > YAW_TURN;
      if (!done) return;

      framesRef.current.push({ action, image: jpeg(frame) });
      st.idx += 1;
      st.promptStart = now;
      setProgress({ done: st.idx, total: st.seq.length });
      if (st.idx >= st.seq.length) {
        stopLoop();
        setTurnMarker(null);
        void finishLiveCheck();
      } else {
        showAction();
      }
    } catch {
      // a frame that could not be analysed — skip it
    } finally {
      busyRef.current = false;
    }
  };

  const startLiveCheck = () => {
    if (!faceapiRef.current) {
      void startVideoOnly();
      return;
    }
    lv.current = { seq: makeSequence(), idx: 0, base: [], baseYaw: 0, baseDone: false, start: Date.now(), promptStart: 0 };
    selfieRef.current = '';
    framesRef.current = [];
    resultRef.current = null;
    setError('');
    setProgress({ done: 0, total: lv.current.seq.length });
    setTurnMarker(null);
    setStatus('Look straight at the camera');
    startRecording();
    go('liveness');
    stopLoop();
    loopRef.current = setInterval(() => { void tick(); }, DETECT_INTERVAL_MS);
  };

  const finishLiveCheck = async () => {
    go('verifying');
    setStatus('Checking your face… this can take up to half a minute');
    await stopRecording();
    try {
      const res = await faydaService.verifyLiveness({
        selfie: selfieRef.current,
        frames: framesRef.current,
        faydaPhoto: state.faydaData?.photo || '',
      });
      if (!mountedRef.current) return;
      resultRef.current = res;
      if (!res.passed) {
        fail(res.message || 'The live check did not pass. Please try again.');
      } else if (!res.matched) {
        fail(`${res.message || 'Your face does not match your Fayda ID photo.'} Make sure your face is well lit and try again.`);
      } else {
        await upload();
      }
    } catch (e: any) {
      if (!mountedRef.current) return;
      fail(e?.message || 'The face check is not available right now. Please try again.');
    }
  };

  // ── Video only (device cannot run the live check, or continuing after failed attempts) ──
  const startVideoOnly = async () => {
    setError('');
    setStatus('Recording… please look at the camera');
    setVideoProgress(0);
    startRecording();
    go('recording');
    const started = Date.now();
    await new Promise<void>(resolve => {
      const timer = setInterval(() => {
        const pct = Math.min(100, ((Date.now() - started) / VIDEO_ONLY_MS) * 100);
        setVideoProgress(pct);
        if (pct >= 100) { clearInterval(timer); resolve(); }
      }, 100);
    });
    if (!mountedRef.current) return;
    const frame = grabFrame();
    if (frame && !selfieRef.current) selfieRef.current = jpeg(frame);
    await stopRecording();
    if (!selfieRef.current) {
      fail('We could not capture your photo. Please try again.');
      return;
    }
    await upload();
  };

  /** After failed attempts: keep the last result (KYC sees it) and send the video for review */
  const continueForReview = async () => {
    if (!selfieRef.current || !videoBlobRef.current) {
      await startVideoOnly();
      return;
    }
    await upload();
  };

  // ── Upload the video + save the result ────────────────────────────────────────────────────
  const upload = async () => {
    setUploadFailed(false);
    go('uploading');
    setStatus('Saving your verification…');
    const selfie = selfieRef.current;
    const blob = videoBlobRef.current;
    let videoId = '';
    if (blob) {
      try {
        const r = await faydaService.uploadFaceVideo({
          video: await blobToBase64(blob),
          selfiePhoto: selfie,
          videoMimeType: blob.type,
          videoSizeBytes: blob.size,
        });
        videoId = r.success ? r.videoId || '' : '';
        if (!r.success) throw new Error(r.message || 'Upload failed');
      } catch (e: any) {
        if (!mountedRef.current) return;
        setUploadFailed(true);
        setError(`${e?.message || 'Upload failed'}. Please check your connection and try again.`);
        go('fail');
        return;
      }
    }
    if (!mountedRef.current) return;
    const res = resultRef.current;
    onUpdate({
      selfiePhoto: selfie,
      faceMatchScore: res?.similarity ?? 0,
      livenessConfidence: res?.antiSpoofScore ?? 0,
      verificationPhotos: { faceCenter: selfie, livenessFrames: [] },
      faceVideoId: videoId,
      faceVerificationToken: res?.token || '',
      livenessFrames: res ? framesRef.current : [],
      faceMatched: res ? res.matched : null,
    });
    setOutcome({ verified: !!(res?.passed && res.matched), matched: res ? res.matched : null });
    toast.success(res?.passed && res.matched ? 'Face verified' : 'Saved for review by our team');
    go('success');
    stopCamera();
  };

  // ── UI ────────────────────────────────────────────────────────────────────────────────────
  const borderColor =
    phase === 'success' ? '#22c55e' :
    phase === 'fail' ? '#ef4444' :
    phase === 'liveness' || phase === 'recording' ? 'var(--brand, #ed1c24)' :
    phase === 'verifying' || phase === 'uploading' ? '#3b82f6' :
    '#d1d5db';
  const busy = phase === 'verifying' || phase === 'uploading' || phase === 'loading';
  const markerLeftPct = 50 + (turnMarker ?? 0) * 45;

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Face Verification</h2>
        <p className="text-sm text-gray-500">A quick live check: follow the instructions on the screen</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-4 overflow-y-auto">
        {/* Progress through the actions */}
        {(phase === 'liveness' || phase === 'verifying') && (
          <div className="flex items-center gap-2" aria-label="Progress">
            {Array.from({ length: progress.total }).map((_, i) => (
              <span key={i} className={`h-2.5 rounded-full transition-all ${i < progress.done ? 'w-8 bg-green-500' : 'w-2.5 bg-gray-300'}`} />
            ))}
          </div>
        )}

        {/* Camera with face oval */}
        <div className="relative w-60 h-72 flex-shrink-0">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <svg viewBox="0 0 240 288" className="w-full h-full">
              <defs>
                <mask id="faceMask">
                  <rect width="240" height="288" fill="white" />
                  <ellipse cx="120" cy="138" rx="85" ry="110" fill="black" />
                </mask>
              </defs>
              <rect width="240" height="288" fill="rgba(0,0,0,0.55)" mask="url(#faceMask)" rx="16" />
              <ellipse cx="120" cy="138" rx="85" ry="110" fill="none" stroke={borderColor} strokeWidth="3"
                strokeDasharray={phase === 'liveness' || phase === 'recording' ? '8 4' : 'none'}>
                {(phase === 'liveness' || phase === 'recording') && (
                  <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1s" repeatCount="indefinite" />
                )}
              </ellipse>
            </svg>
          </div>

          {/* What to do now */}
          {phase === 'liveness' && (
            <div className="absolute top-0 inset-x-0 z-20 bg-black/60 text-white text-center px-3 py-2 rounded-t-2xl">
              <p className="text-sm font-bold leading-tight">{status}</p>
            </div>
          )}
          {phase === 'liveness' && turnMarker !== null && (
            <div className="absolute bottom-3 left-4 right-4 z-20">
              <div className="relative h-3 rounded-full bg-white/30">
                <div className="absolute inset-y-0 left-0 w-1/4 bg-green-400/80 rounded-full" />
                <div className="absolute inset-y-0 right-0 w-1/4 bg-green-400/80 rounded-full" />
                <div className="absolute -top-1.5 h-6 w-6 -ml-3 rounded-full bg-white border-2 border-brand shadow transition-[left] duration-100"
                  style={{ left: `${markerLeftPct}%` }} />
              </div>
            </div>
          )}
          {(phase === 'liveness' || phase === 'recording') && (
            <div className="absolute top-12 right-2 z-20 flex items-center gap-1.5 bg-red-600/90 px-2 py-0.5 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] text-white font-bold tracking-wider">REC</span>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/40 rounded-2xl text-white px-4 text-center">
              <Loader2 className="w-9 h-9 animate-spin" />
              <span className="text-xs font-semibold">{status}</span>
            </div>
          )}
          {phase === 'success' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-300 animate-fade-in">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
            </div>
          )}

          <div className="w-full h-full rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          </div>
        </div>

        {/* Status line */}
        <div className="text-center min-h-[3rem] flex items-center justify-center px-2 max-w-xs">
          {phase === 'success' ? (
            <p className="text-green-600 font-bold text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              {outcome?.verified ? 'Face verified' : 'Saved — our team will review it'}
            </p>
          ) : phase === 'fail' ? (
            <p className="text-red-600 font-semibold text-sm flex items-start gap-2 text-left">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
            </p>
          ) : phase === 'ready' ? (
            <p className="text-gray-700 font-semibold text-sm">
              {liveCheckAvailable
                ? <>You will be asked to <b>open your mouth</b> and <b>turn your head</b>. Use good light, with only you in view.</>
                : 'We will record a short video of your face for our team to review.'}
            </p>
          ) : phase === 'recording' ? (
            <div className="w-48 flex flex-col items-center gap-1">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-200" style={{ width: `${videoProgress}%` }} />
              </div>
              <span className="text-xs text-gray-600 font-semibold">{status}</span>
            </div>
          ) : phase === 'liveness' ? (
            <p className="text-gray-500 text-xs">Follow the instruction at the top of the camera</p>
          ) : null}
        </div>

        {/* Fayda photo it is compared with */}
        {state.faydaData?.photo && phase !== 'success' && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-200">
            <img src={toDataUri(state.faydaData.photo)} alt="Fayda ID" className="w-7 h-7 rounded-full object-cover border-2 border-brand" />
            <span className="text-xs text-gray-500 font-medium">Your face is compared with your Fayda ID photo</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          {phase === 'ready' && (
            <button onClick={startLiveCheck}
              className="flex items-center gap-2 px-7 py-2.5 bg-brand text-white font-bold rounded-full shadow-lg shadow-brand-200 hover:bg-brand-dark text-sm active:scale-95">
              {liveCheckAvailable ? <ScanFace className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              {liveCheckAvailable ? 'Start Face Check' : 'Start Recording'}
            </button>
          )}
          {phase === 'liveness' && (
            <button onClick={() => { void stopRecording(); stopLoop(); setTurnMarker(null); go('ready'); }}
              className="flex items-center gap-2 px-5 py-2 border border-gray-200 text-gray-600 font-bold rounded-full hover:bg-gray-100 text-sm active:scale-95">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
          {phase === 'fail' && (
            <>
              {uploadFailed ? (
                <button onClick={() => void upload()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-bold rounded-full shadow-lg shadow-brand-200 text-sm active:scale-95 hover:bg-brand-dark">
                  <Upload className="w-4 h-4" /> Try Upload Again
                </button>
              ) : (
                <button onClick={() => void retry()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-bold rounded-full shadow-lg shadow-brand-200 text-sm active:scale-95 hover:bg-brand-dark">
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              )}
              {canContinue && !uploadFailed && (
                <button onClick={() => void continueForReview()}
                  className="flex items-center gap-2 px-5 py-2 border border-gray-300 text-gray-700 font-bold rounded-full hover:bg-gray-100 text-sm active:scale-95">
                  Continue — our team will review <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack}
          className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button disabled={phase !== 'success'} onClick={onNext}
          className={`flex-[2] py-3 text-white font-bold rounded-xl shadow-lg transition-all ${
            phase === 'success' ? 'bg-brand shadow-brand-200 hover:bg-brand-dark' : 'bg-gray-300 cursor-not-allowed'
          }`}>
          Continue to Review
        </button>
      </div>
    </div>
  );
};

export default FaceVerificationStep;
