
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Loader2, RefreshCw, CheckCircle2, ScanFace, XCircle, ShieldCheck, Video, Square } from 'lucide-react';
import { toast } from 'sonner';
import { OnboardingState } from '../types';
import { faydaService } from '../services/api';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

type Phase = 'idle' | 'detecting' | 'recording' | 'recorded' | 'uploading' | 'success' | 'fail';

const RECORDING_DURATION_MS = 5000; // 5 seconds of video

const toDataUri = (photo: string | undefined | null): string => {
  if (!photo) return '';
  if (photo.startsWith('data:image')) return photo;
  return `data:image/jpeg;base64,${photo}`;
};

const FaceVerificationStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [recordingProgress, setRecordingProgress] = useState(0); // 0 to 100
  const [selfiePhoto, setSelfiePhoto] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  // --- Camera ---
  useEffect(() => {
    startCamera();
    return () => { stopRecording(); stopCamera(); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play().then(() => {
            const onPlaying = () => {
              setCameraReady(true);
              videoRef.current?.removeEventListener('playing', onPlaying);
            };
            if (videoRef.current!.readyState >= 3) {
              setCameraReady(true);
            } else {
              videoRef.current!.addEventListener('playing', onPlaying);
            }
          }).catch(() => {
            setCameraReady(true);
          });
        };
      }
    } catch {
      toast.error('Camera access denied. Please allow camera to continue.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    if (video.readyState < 2 || video.paused || video.videoWidth === 0 || video.videoHeight === 0) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, []);

  /** Main pipeline: detect face → record video → capture selfie */
  const startVerification = useCallback(async () => {
    abortRef.current = false;
    chunksRef.current = [];
    setVideoBlob(null);
    setSelfiePhoto('');

    // Phase 1: Detect face first
    setPhase('detecting');
    setStatusText('Looking for your face...');
    setRecordingProgress(0);

    let faceDetected = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      if (abortRef.current) return;
      const photo = captureFrame();
      if (!photo) {
        await new Promise(r => setTimeout(r, 200));
        continue;
      }
      try {
        const r = await faydaService.detectFace(photo);
        if (r.success && r.faceDetected && r.faceCount === 1) {
          faceDetected = true;
          break;
        } else if (r.faceCount > 1) {
          setStatusText('Multiple faces detected — only one face allowed');
        } else {
          setStatusText('Position your face in the oval');
        }
      } catch {
        setStatusText('Retrying face detection...');
      }
      await new Promise(r => setTimeout(r, 300));
    }

    if (!faceDetected || abortRef.current) {
      if (!abortRef.current) {
        setPhase('fail');
        setStatusText('Could not detect your face. Please try again.');
      }
      return;
    }

    // Phase 2: Record video
    setPhase('recording');
    setStatusText('Recording... please look at the camera naturally');

    if (!streamRef.current) {
      setPhase('fail');
      setStatusText('Camera not available. Please try again.');
      return;
    }

    // Determine supported MIME type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: 1000000, // 1 Mbps — good quality, reasonable size
    });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    const recordingPromise = new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          resolve(blob);
        } else {
          resolve(null);
        }
      };
      recorder.onerror = () => resolve(null);
    });

    recorder.start(500); // Collect data every 500ms

    // Progress timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / RECORDING_DURATION_MS) * 100);
      setRecordingProgress(pct);
    }, 100);

    // Wait for recording duration
    await new Promise(r => setTimeout(r, RECORDING_DURATION_MS));

    // Stop recording
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingProgress(100);

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }

    // Capture a selfie frame right at end of recording
    const selfie = captureFrame();
    if (selfie) {
      setSelfiePhoto(selfie);
    }

    // Wait for recorder to finish
    const blob = await recordingPromise;

    if (abortRef.current) return;

    if (!blob || blob.size < 1000) {
      setPhase('fail');
      setStatusText('Video recording failed. Please try again.');
      return;
    }

    setVideoBlob(blob);
    setPhase('recorded');
    setStatusText(`Video captured (${(blob.size / 1024).toFixed(0)} KB). Ready to submit.`);

  }, [captureFrame]);

  /** Upload video + selfie to backend */
  const handleUpload = useCallback(async () => {
    if (!videoBlob || !selfiePhoto) {
      toast.error('No video or photo captured. Please record again.');
      return;
    }

    setPhase('uploading');
    setStatusText('Uploading verification video...');

    try {
      // Convert video blob to base64
      const videoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URI prefix
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoBlob);
      });

      const result = await faydaService.uploadFaceVideo({
        video: videoBase64,
        selfiePhoto: selfiePhoto,
        videoMimeType: videoBlob.type,
        videoSizeBytes: videoBlob.size,
      });

      if (result.success) {
        setPhase('success');
        setStatusText('Face video captured successfully!');
        toast.success('Video uploaded for KYC verification');

        // Save to state
        onUpdate({
          selfiePhoto: selfiePhoto,
          faceMatchScore: 0,
          livenessConfidence: 0,
          verificationPhotos: {
            faceCenter: selfiePhoto,
            livenessFrames: [],
          },
          faceVideoId: result.videoId || '',
        });

        stopCamera();
      } else {
        setPhase('fail');
        setStatusText(result.message || 'Upload failed. Please try again.');
      }
    } catch (err: any) {
      setPhase('fail');
      setStatusText(err.message || 'Upload failed. Please try again.');
    }
  }, [videoBlob, selfiePhoto, onUpdate]);

  // --- Retake ---
  const handleRetake = () => {
    abortRef.current = true;
    stopRecording();
    setPhase('idle');
    setStatusText('');
    setRecordingProgress(0);
    setSelfiePhoto('');
    setVideoBlob(null);
    if (!streamRef.current) startCamera();
  };

  // --- UI helpers ---
  const borderColor =
    phase === 'success' ? '#22c55e' :
    phase === 'fail' ? '#ef4444' :
    phase === 'recording' ? '#ed1c24' :
    phase === 'detecting' || phase === 'uploading' ? '#3b82f6' :
    phase === 'recorded' ? '#f59e0b' :
    '#d1d5db';

  const isProcessing = phase === 'detecting' || phase === 'recording' || phase === 'uploading';

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Face Verification</h2>
        <p className="text-sm text-gray-500">Record a short video for identity verification by our KYC team</p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-4 overflow-y-auto">

        {/* Phase indicator */}
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Detect', phases: ['detecting'] },
            { label: 'Record', phases: ['recording'] },
            { label: 'Upload', phases: ['uploading'] },
          ].map((step, idx) => {
            const allPhases: Phase[] = ['detecting', 'recording', 'uploading'];
            const currentPhaseIdx = allPhases.indexOf(phase);
            const stepPhaseIdx = allPhases.indexOf(step.phases[0] as Phase);
            const done = phase === 'success' || phase === 'recorded' && stepPhaseIdx < 2 || (currentPhaseIdx > stepPhaseIdx);
            const active = step.phases.includes(phase);
            return (
              <React.Fragment key={step.label}>
                {idx > 0 && <div className={`w-8 h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all text-xs font-bold
                    ${done ? 'bg-green-500 text-white shadow-md shadow-green-200' :
                      active ? 'bg-[#ed1c24] text-white shadow-lg shadow-red-200 ring-3 ring-red-100 scale-110' :
                      'bg-gray-100 text-gray-400'}`}
                  title={step.label}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> :
                   active ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   <span>{idx + 1}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Status message */}
        <div className="text-center h-12 flex items-center justify-center px-4">
          {phase === 'success' ? (
            <p className="text-green-600 font-bold text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Video captured for verification!
            </p>
          ) : phase === 'recorded' ? (
            <p className="text-amber-600 font-bold text-sm flex items-center gap-2">
              <Video className="w-4 h-4" /> {statusText}
            </p>
          ) : phase === 'fail' ? (
            <p className="text-red-600 font-bold text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4" /> {statusText}
            </p>
          ) : isProcessing ? (
            <p className="text-gray-700 font-semibold text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>{statusText}</span>
            </p>
          ) : (
            <p className="text-gray-700 font-semibold">
              {cameraReady ? 'Press Start to record your face video' : 'Starting camera...'}
            </p>
          )}
        </div>

        {/* Recording progress bar */}
        {phase === 'recording' && (
          <div className="w-48 flex flex-col items-center gap-1">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ed1c24] rounded-full transition-all duration-200"
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-600 font-bold">REC {Math.ceil((RECORDING_DURATION_MS - recordingProgress / 100 * RECORDING_DURATION_MS) / 1000)}s</span>
            </div>
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
              <ellipse cx="120" cy="138" rx="85" ry="110" fill="none"
                stroke={borderColor} strokeWidth="3"
                strokeDasharray={phase === 'recording' ? "8 4" : "none"}
              >
                {phase === 'recording' && (
                  <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1s" repeatCount="indefinite" />
                )}
              </ellipse>
            </svg>
          </div>

          {phase === 'success' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-300 animate-fade-in">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
            </div>
          )}

          {/* Recording indicator overlay */}
          {phase === 'recording' && (
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-red-600/90 px-2.5 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] text-white font-bold tracking-wider">REC</span>
            </div>
          )}

          <div className="w-full h-full rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          </div>
        </div>

        {/* Fayda photo indicator */}
        {state.faydaData?.photo && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-200">
            <img src={toDataUri(state.faydaData.photo)} alt="Fayda ID" className="w-7 h-7 rounded-full object-cover border-2 border-[#ed1c24]" />
            <span className="text-xs text-gray-500 font-medium">KYC team will verify against Fayda ID</span>
          </div>
        )}

        {/* Selfie thumbnail after recording */}
        {selfiePhoto && (phase === 'recorded' || phase === 'success' || phase === 'uploading') && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={`data:image/jpeg;base64,${selfiePhoto}`} alt="Captured" className="w-14 h-14 rounded-xl object-cover border-2 border-gray-300 shadow-sm" />
              {phase === 'success' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              <p className="font-semibold text-gray-700">Face snapshot captured</p>
              {videoBlob && <p className="text-gray-400">Video: {(videoBlob.size / 1024).toFixed(0)} KB</p>}
            </div>
          </div>
        )}

        {/* Info notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 max-w-xs">
          <p className="text-[11px] text-blue-700 text-center leading-relaxed">
            Your face video will be reviewed by our KYC team to verify your identity.
            Please look directly at the camera during recording.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          {phase === 'idle' && (
            <button onClick={startVerification} disabled={!cameraReady}
              className={`flex items-center gap-2 px-7 py-2.5 font-bold rounded-full shadow-lg transition-all text-sm active:scale-95
                ${!cameraReady ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#ed1c24] text-white shadow-red-200 hover:bg-[#B01A3A]'}`}>
              <Video className="w-4 h-4" />
              Start Recording
            </button>
          )}

          {phase === 'recording' && (
            <button onClick={handleRetake}
              className="flex items-center gap-2 px-5 py-2 border border-gray-200 text-gray-600 font-bold rounded-full hover:bg-gray-100 text-sm active:scale-95">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}

          {phase === 'recorded' && (
            <>
              <button onClick={handleRetake}
                className="flex items-center gap-2 px-5 py-2 border border-gray-200 text-gray-600 font-bold rounded-full hover:bg-gray-100 text-sm active:scale-95">
                <RefreshCw className="w-4 h-4" /> Retake
              </button>
              <button onClick={handleUpload}
                className="flex items-center gap-2 px-7 py-2.5 bg-[#ed1c24] text-white font-bold rounded-full shadow-lg shadow-red-200 text-sm active:scale-95 hover:bg-[#B01A3A]">
                <CheckCircle2 className="w-4 h-4" /> Upload Video
              </button>
            </>
          )}

          {phase === 'fail' && (
            <button onClick={handleRetake}
              className="flex items-center gap-2 px-7 py-2.5 bg-[#ed1c24] text-white font-bold rounded-full shadow-lg shadow-red-200 text-sm active:scale-95 hover:bg-[#B01A3A]">
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <button
          disabled={phase !== 'success'}
          onClick={onNext}
          className={`flex-[2] py-3 text-white font-bold rounded-xl shadow-lg transition-all
            ${phase === 'success' ? 'bg-[#ed1c24] shadow-red-200 hover:bg-[#B01A3A]' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          Continue to Review
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FaceVerificationStep;
