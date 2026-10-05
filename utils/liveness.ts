// Live face check in the browser (face-api.js; models in public/models): the customer looks at the
// camera, then opens their mouth and turns their head when asked. The frames captured at those
// moments are checked again on the server (Fayda backend), which also compares the face with the
// Fayda photo. Measures and thresholds follow the Smart Branch face verification (tuned on a live
// camera); the server uses slightly more lenient values on the same measures.
import type * as FaceApi from 'face-api.js';

export type Pt = { x: number; y: number };
export type LivenessAction = 'mouth' | 'turn';

export const MAR_OPEN = 0.3;              // inner-lip gap / mouth width with the mouth open
export const MAR_CLOSED = 0.2;            // mouth treated as closed below this (neutral baseline)
export const YAW_TURN = 0.13;             // |yaw − baseline| beyond this = a head turn (either side)
export const BASELINE_FRAMES = 5;         // neutral frames before the first action
export const BASELINE_TIMEOUT_MS = 12000;
export const ACTION_TIMEOUT_MS = 8000;    // per action
export const DETECT_INTERVAL_MS = 120;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Eyes open: ~0.3, closed: < 0.2 */
export const eyeAspectRatio = (eye: Pt[]) =>
  (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * dist(eye[0], eye[3]) || 1);

/** Inner-lip gap over mouth width: ~0 with the mouth shut, large when open */
export const mouthAspectRatio = (mouth: Pt[]) => dist(mouth[14], mouth[18]) / (dist(mouth[0], mouth[6]) || 1);

/** Head turn: nose tip offset along the eye line, over the eye distance (a tilted photo does not count) */
export function computeYaw(leftEye: Pt[], rightEye: Pt[], nose: Pt[]): number {
  const lc = mid(leftEye[0], leftEye[3]);
  const rc = mid(rightEye[0], rightEye[3]);
  const dx = rc.x - lc.x;
  const dy = rc.y - lc.y;
  const inter = Math.hypot(dx, dy) || 1;
  const em = mid(lc, rc);
  const tip = nose[3];
  return ((tip.x - em.x) * (dx / inter) + (tip.y - em.y) * (dy / inter)) / inter;
}

/** Both actions, in random order */
export function makeSequence(): LivenessAction[] {
  const first: LivenessAction = crypto.getRandomValues(new Uint32Array(1))[0] % 2 === 0 ? 'mouth' : 'turn';
  return [first, first === 'mouth' ? 'turn' : 'mouth'];
}

export const ACTION_PROMPTS: Record<LivenessAction, string> = {
  mouth: 'Open your mouth',
  turn: 'Slowly turn your head to one side',
};

let loading: Promise<typeof FaceApi> | null = null;

/** face-api.js and its two small models (~550 KB), loaded once, only when the face step opens */
export function loadFaceApi(): Promise<typeof FaceApi> {
  if (!loading) {
    loading = (async () => {
      const faceapi = await import('face-api.js');
      const url = new URL('models', document.baseURI).href; // public/models, next to the app
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(url),
        faceapi.nets.faceLandmark68Net.loadFromUri(url),
      ]);
      return faceapi;
    })();
    loading.catch(() => { loading = null; }); // allow a retry
  }
  return loading;
}
