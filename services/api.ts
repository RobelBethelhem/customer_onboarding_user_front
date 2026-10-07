import type { AccountTier, AccountType, AdditionalService, Branch, LivenessFrame } from '../types';

export const API_BASE_URL = 'https://onboard.zemenbank.com/api1'; // Default per prompt instructions
const DASHBOARD_URL = 'https://onboard.zemenbank.com/api2'; // Dashboard backend for referral APIs

async function postRequest<T,>(path: string, body: any): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Face detection result from /api/face/detect
export interface FaceDetectResult {
  success: boolean;
  faceDetected: boolean;
  faceCount: number;
  message?: string;
  confidence?: number;
  expressions?: {
    happy: number;
    neutral: number;
    surprised: number;
    sad: number;
    angry: number;
    disgusted: number;
    fearful: number;
  };
}

// Liveness challenge result from /api/face/liveness
export interface LivenessResult {
  success: boolean;
  passed: boolean;
  confidence: number;
  challenge: string;
  message?: string;
  details?: Record<string, any>;
}

// Passive liveness result from /api/face/passive-liveness (deprecated - kept for reference)
export interface PassiveLivenessResult {
  success: boolean;
  isLive: boolean;
  confidence: number;
  message?: string;
  checks?: {
    textureAnalysis: boolean;
    depthEstimation: boolean;
    microMovement: boolean;
    blinkDetected: boolean;
    overallScore: number;
  };
}

// Face video upload result from /api/face/upload-video
export interface FaceVideoUploadResult {
  success: boolean;
  videoId: string;
  message?: string;
}

// Live face check verified by the server, from /api/face/verify-liveness
export interface LivenessVerifyResult {
  success: boolean;
  passed: boolean;           // the actions were really done by one live person
  matched: boolean;          // face matches the Fayda photo
  similarity: number | null;
  antiSpoofScore: number | null;
  failed: string | null;     // which check did not pass
  message: string;           // what to tell the customer
  token: string;             // signed result, sent with the application
}

// Face comparison result from /api/face/compare
export interface FaceCompareResult {
  success: boolean;
  matched: boolean;
  similarity: number;
  distance: number;
  threshold?: number;
  message?: string;
}

export const faydaService = {
  // verifyFcn: (idNumber: string) =>
  //   postRequest<{ token: string; message: string }>('/api/verify', { idNumber, captchaValue: "" }),

  // validateOtp: (otp: string, uniqueId: string, token: string) =>
  //   postRequest<any>('/api/validateOtp', { otp, uniqueId, token }),

  // resendFcn: (phoneNumber: string) =>
  //   postRequest<{ success: boolean }>('/api/resend', { identifier: phoneNumber }),


  verifyFcn: (idNumber: string) =>
    postRequest<{ success: boolean; transactionID: string; maskedMobile: string | null }>('/api/fayda/request-otp', { individualId: idNumber }),

  validateOtp: (otp: string, uniqueId: string, token?: string) =>
    postRequest<any>('/api/fayda/ekyc', { individualId: uniqueId, otp }),

  resendFcn: (phoneNumber: string) =>
    postRequest<{ success: boolean }>('/api/resend', { identifier: phoneNumber }),



  screeningCheck: (data: { firstName: string; middleName: string; lastName: string; dateOfBirth: string; nationality: string }) =>
    postRequest<{ success: boolean; blocked: boolean; riskLevel: string; matches: any[] }>('/api/screening/check', data),

  /** Detect face in image — returns face count, expressions, landmarks */
  detectFace: (imageBase64: string) =>
    postRequest<FaceDetectResult>('/api/face/detect', { image: imageBase64 }),

  /** Check a liveness challenge — validates blink, smile, turn, etc. server-side */
  checkLiveness: (imageBase64: string, challenge: string) =>
    postRequest<LivenessResult>('/api/face/liveness', { image: imageBase64, challenge }),

  /** Passive liveness — send multiple frames captured over a few seconds for analysis (deprecated) */
  passiveLiveness: (frames: string[]) =>
    postRequest<PassiveLivenessResult>('/api/face/passive-liveness', { frames }),

  /** Upload face video for manual KYC verification */
  uploadFaceVideo: (data: { video: string; selfiePhoto: string; videoMimeType: string; videoSizeBytes: number }) =>
    postRequest<FaceVideoUploadResult>('/api/face/upload-video', data),

  /** Compare selfie against Fayda ID photo — field names must match backend */
  compareFace: (selfieBase64: string, idPhotoBase64: string) =>
    postRequest<FaceCompareResult>('/api/face/compare', { selfieImage: selfieBase64, idPhoto: idPhotoBase64 }),

  /** Live check: frames from the browser re-checked on the server, anti-spoof model, match with the Fayda photo */
  verifyLiveness: (data: { selfie: string; frames: LivenessFrame[]; faydaPhoto: string }) =>
    postRequest<LivenessVerifyResult>('/api/face/verify-liveness', data),

  submitOnboarding: (payload: any) =>
    postRequest<{ success: boolean; customerNumber?: string; customerId?: string; status: string; message?: string }>('/api/flexcube/create-customer', payload),
};

// ========== Referral Service (talks to Dashboard backend) ==========

async function dashboardGet<T>(path: string): Promise<T> {
  const response = await fetch(`${DASHBOARD_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

async function dashboardPost<T>(path: string, body: any): Promise<T> {
  const response = await fetch(`${DASHBOARD_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export interface ReferralVerifyResult {
  success: boolean;
  data?: {
    customerNumber: string;
    fullName: string;
    phone?: string;
    email?: string;
    referralCode: string;
    referralLink: string;
    totalReferrals: number;
  };
  error?: string;
}

export interface ReferralValidateResult {
  success: boolean;
  valid: boolean;
  data?: {
    referralCode: string;
    referrerName: string | null;
    referrerCustomerNumber: string;
  };
  error?: string;
}

export interface RewardsResult {
  success: boolean;
  data?: {
    customerNumber: string;
    balance: number;
    totalEarned: number;
    totalRedeemed: number;
    totalEtbConverted: number;
    stats: {
      totalReferrals: number;
      completedReferrals: number;
      pendingReferrals: number;
    };
    transactions: Array<{
      transactionId: string;
      type: string;
      points: number;
      balanceAfter: number;
      description: string;
      createdAt: string;
    }>;
  };
  error?: string;
}

export interface ConvertResult {
  success: boolean;
  data?: {
    transactionId: string;
    pointsRedeemed: number;
    etbAmount: number;
    conversionRate: number;
    newBalance: number;
  };
  error?: string;
}

export const referralService = {
  /** Verify account number and generate referral link */
  verifyAccount: (accountNumber: string) =>
    dashboardPost<ReferralVerifyResult>('/api/referrals/verify', { accountNumber }),

  /** Validate a referral code (check if it's valid, get referrer name) */
  validateCode: (code: string) =>
    dashboardGet<ReferralValidateResult>(`/api/referrals/${code}`),

  /** Get rewards balance, history, stats for a customer */
  getRewards: (customerNumber: string) =>
    dashboardGet<RewardsResult>(`/api/referrals/rewards?customerNumber=${customerNumber}`),

  /** Convert points to ETB */
  convertPoints: (customerNumber: string, points: number) =>
    dashboardPost<ConvertResult>('/api/referrals/convert', { customerNumber, points }),
};

// ========== Application Status Service (talks to Dashboard backend) ==========

export interface ApplicationStatusResult {
  success: boolean;
  found?: boolean;
  data?: {
    applicationId: string;
    fullName: string;
    status: string;
    statusLabel: string;
    reason: string;
    canAmend: boolean;
    customerNumber: string | null;
  };
  error?: string;
}

// ========== Branch directory (maintained by the admin in the dashboard: Settings → Branches) ==========

export const branchService = {
  /** Active branches customers can choose */
  list: () => dashboardGet<{ success: boolean; data: Branch[] }>('/api/branches'),
};

// ========== Account products (managed by KYC on the dashboard's Account Products page) ==========

interface CatalogClass {
  code: string; name: string; interestRate: number | null; minBalance: number | null;
  maxBalance: number | null; remarks: string; productNumber: string;
}
interface CatalogProduct { id: string; name: string; description: string; isIFB: boolean; classes: CatalogClass[] }

const etb = (n: number) => n.toLocaleString('en-US');

function balanceRange(c: CatalogClass): string {
  if (c.minBalance !== null && c.maxBalance !== null) return `${etb(c.minBalance)} - ${etb(c.maxBalance)} ETB`;
  if (c.minBalance !== null) return `Min. ${etb(c.minBalance)} ETB`;
  if (c.maxBalance !== null) return `Up to ${etb(c.maxBalance)} ETB`;
  return c.remarks || 'Any balance';
}

export function formatRate(rate: number | null | undefined, isIFB?: boolean): string {
  if (rate === null || rate === undefined) return isIFB ? 'Interest-free' : '—';
  return `${Number(rate).toFixed(2)}%`;
}

function toAccountType(p: CatalogProduct): AccountType {
  const tiers: AccountTier[] = p.classes.map(c => ({
    id: c.code, code: c.code, name: c.name, range: balanceRange(c), interestRate: c.interestRate,
    productNumber: c.productNumber, minBalance: c.minBalance, maxBalance: c.maxBalance, remarks: c.remarks,
  }));
  const rates = tiers.map(t => t.interestRate).filter((r): r is number => r !== null);
  const mins = tiers.map(t => t.minBalance).filter((m): m is number => m !== null);
  const lo = Math.min(...rates), hi = Math.max(...rates);
  return {
    id: p.id,
    name: p.name,
    icon: 'star',
    description: p.description,
    isIFB: p.isIFB,
    tiers,
    minDeposit: mins.length ? Math.min(...mins) : 0,
    interestRange: !rates.length ? (p.isIFB ? 'Interest-free' : '—') : lo === hi ? formatRate(lo) : `${formatRate(lo)} - ${formatRate(hi)}`,
  };
}

export const productService = {
  /** Active account products and classes, in the order set by KYC — for individuals or organizations */
  list: async (audience: 'individual' | 'organization' = 'individual'): Promise<AccountType[]> => {
    const res = await dashboardGet<{ success: boolean; data: CatalogProduct[] }>(
      audience === 'organization' ? '/api/account-products?for=organization' : '/api/account-products'
    );
    return (res.data || []).map(toAccountType);
  },
};

// ========== Additional services (managed by KYC on the dashboard's Products & Services page) ==========

export const additionalServicesService = {
  /** Active services in the order KYC set; a service with terms must have them accepted */
  list: async (): Promise<AdditionalService[]> => {
    const res = await dashboardGet<{ success: boolean; data: AdditionalService[] }>('/api/additional-services');
    return res.data || [];
  },
};

export const applicationService = {
  /** Look up an application's status by Application ID + phone number */
  checkStatus: (appId: string, phone: string) =>
    dashboardGet<ApplicationStatusResult>(`/api/applications/status?appId=${encodeURIComponent(appId)}&phone=${encodeURIComponent(phone)}`),
};
