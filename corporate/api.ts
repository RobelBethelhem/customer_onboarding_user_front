import { API_BASE_URL } from '../services/api';
import type { OnboardingState } from '../types';
import type {
  ApplicationView, CorporateCatalog, InviteInfo, InviteResult, Role, SubmitResult, UploadedFile, VerificationView,
} from './types';

// Business account API of the dashboard, reached through the Fayda backend (api1)
const BASE = `${API_BASE_URL}/api/corporate`;

/** An error to show the customer; `fileId` / `verificationId` name what has to be done again */
export class CorporateApiError extends Error {
  status: number;
  fileId?: string;
  verificationId?: string;
  constructor(message: string, status: number, fileId?: string, verificationId?: string) {
    super(message);
    this.status = status;
    this.fileId = fileId;
    this.verificationId = verificationId;
  }
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new CorporateApiError('We could not reach the bank. Please check your connection and try again.', 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new CorporateApiError(
      data.error || data.message || `Request failed with status ${response.status}`,
      response.status,
      data.fileId || undefined,
      data.verificationId || undefined
    );
  }
  return data.data as T;
}

/** Who may upload: someone verified with Fayda, or the applicant replacing files of a returned application */
export type UploadAuth = { ekycToken: string } | { applicationId: string; key: string };

/** The Fayda verification and live face check of one person, as the bank checks it */
export const identityPayload = (s: OnboardingState) => ({
  ekycToken: s.ekycToken || '',
  faceVerificationToken: s.faceVerificationToken || '',
  faydaPhoto: s.faydaData?.photo || '',
  selfie: s.selfiePhoto || '',
  livenessFrames: s.livenessFrames || [],
  faceVideoId: s.faceVideoId || '',
});

export const corporateService = {
  /** Organization types, their documents and the application rules (set by KYC) */
  catalog: () => call<CorporateCatalog>('GET', '/catalog'),

  /** Store one document scan or specimen signature (base64, without the data: prefix) */
  upload: (kind: 'document' | 'signature', fileName: string, data: string, auth: UploadAuth) =>
    call<UploadedFile>('POST', '/files', { kind, fileName, data, ...auth }),

  submit: (payload: unknown) => call<SubmitResult>('POST', '/applications', payload),

  /**
   * A signatory or director, while the application is filled in: verified with the applicant
   * (their identity from this phone) or sent an SMS link. Needs the applicant's eKYC result.
   */
  addPerson: (body: {
    ekycToken: string; groupId: string; mode: 'with_applicant' | 'link'; roles: Role[];
    organizationName: string; categoryName: string; applicantPhone: string;
    phone?: string; name?: string; identity?: ReturnType<typeof identityPayload>;
  }) => call<{ verification: VerificationView; key: string; link?: string }>('POST', '/verifications', body),

  /** Which people have verified (for the ticks) */
  peopleStatus: (items: { id: string; key: string }[]) =>
    call<VerificationView[]>('POST', '/verifications', { action: 'status', items }),

  /** A new SMS link for a person who has not verified yet */
  resendLink: (id: string, key: string) =>
    call<{ verification: VerificationView; link: string }>('POST', `/verifications/${encodeURIComponent(id)}`, { key, action: 'resend' }),

  /** The person was removed from the application: their link stops working */
  removePerson: (id: string, key: string) =>
    call<{ cancelled: boolean }>('POST', `/verifications/${encodeURIComponent(id)}`, { key, action: 'cancel' }),

  /** The applicant's status page */
  status: (applicationId: string, key: string) =>
    call<ApplicationView>('GET', `/applications/${encodeURIComponent(applicationId)}?key=${encodeURIComponent(key)}`),

  /** New SMS verification link for a person who has not verified yet */
  resend: (applicationId: string, key: string, personId: string) =>
    call<ApplicationView>('POST', `/applications/${encodeURIComponent(applicationId)}`, { key, action: 'resend', personId }),

  /** Replace the documents and signatures KYC sent back */
  resubmit: (
    applicationId: string,
    key: string,
    documents: { docId: string; fileId: string; fileKey: string }[],
    signatures: { personId: string; fileId: string; fileKey: string }[]
  ) => call<ApplicationView>('POST', `/applications/${encodeURIComponent(applicationId)}`, { key, action: 'resubmit', documents, signatures }),

  /** Who an SMS verification link is for */
  invite: (token: string) => call<InviteInfo>('GET', `/invites/${encodeURIComponent(token)}`),

  /** The invited person's Fayda verification */
  verifyInvite: (token: string, identity: ReturnType<typeof identityPayload>) =>
    call<InviteResult>('POST', `/invites/${encodeURIComponent(token)}`, identity),
};

// ─── Applications sent from this device (shown on the intro screen) ─────────────────────────
const SAVED_APPS_KEY = 'zemen-business-apps';

export interface SavedApplication {
  applicationId: string;
  accessKey: string;
  organizationName: string;
  submittedAt: number;
}

export function listSavedApplications(): SavedApplication[] {
  try {
    const list = JSON.parse(localStorage.getItem(SAVED_APPS_KEY) || '[]');
    return Array.isArray(list) ? list.filter(a => a && a.applicationId && a.accessKey) : [];
  } catch {
    return [];
  }
}

export function rememberApplication(app: SavedApplication) {
  try {
    const list = [app, ...listSavedApplications().filter(a => a.applicationId !== app.applicationId)].slice(0, 10);
    localStorage.setItem(SAVED_APPS_KEY, JSON.stringify(list));
  } catch { /* storage unavailable: the SMS still has the link */ }
}

export const statusPageUrl = (applicationId: string, key: string) =>
  `${window.location.origin}${window.location.pathname}?corporate=${encodeURIComponent(applicationId)}&key=${encodeURIComponent(key)}`;
