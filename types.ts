
export interface Branch {
  id: number;
  name: string;
  category: "City" | "Outline";
  type: "Branch" | "Sub-branch";
  latitude: number;
  longitude: number;
  branchCode: string;
  distanceKm?: number;
}

export interface AccountTier {
  id: string;
  name: string;
  range: string;
  interestRate: number;
}

export interface AccountType {
  id: string;
  name: string;
  icon: string;
  description: string;
  minDeposit: number;
  interestRange: string;
  tiers: AccountTier[];
}

export interface FaydaCustomerData {
  uin: string;
  fullName: { eng: string; amh: string };
  dateOfBirth: string;
  gender: { eng: string; amh: string };
  phone: string;
  email: string;
  region: { eng: string; amh: string };
  zone: { eng: string; amh: string };
  woreda: { eng: string; amh: string };
  residenceStatus: { eng: string; amh: string };
  photo: string; // base64
}

export interface OnboardingState {
  currentStep: number;
  selectedBranch: Branch | null;
  selectedAccountType: AccountType | null;
  selectedTier: AccountTier | null;
  fcn: string;
  token: string;
  faydaData: FaydaCustomerData | null;
  additionalInfo: {
    motherMaidenName: string;
    email: string;
    taxIdentity: string;
    annualIncome: string;
    occupation: string;
    industry: string;
    wealthSource: string;
    otherOccupation: string;
    otherIndustry: string;
    otherWealthSource: string;
    maritalStatus: string;
    promotionType: string;
  };
  documents: Array<{ base64: string; label: string }>;
  selfiePhoto: string;
  verificationPhotos: {
    faceCenter: string;
    livenessFrames: string[];
  };
  livenessConfidence: number;
  faceMatchScore: number;
  faceVideoId: string;
  result: {
    success: boolean;
    customerNumber?: string;
    customerId?: string;
    status?: string;
    message?: string;
  } | null;
  // Referral tracking
  referralCode: string;       // e.g., 'REF-0015678' from URL param
  referrerName: string;       // Name of the person who referred (for banner display)
}

export enum Step {
  Landing = 0,
  Welcome = 1,
  Branch = 2,
  AccountType = 3,
  FaydaId = 4,
  Otp = 5,
  Review = 6,
  AdditionalInfo = 7,
  Documents = 8,
  FaceVerify = 9,
  FinalReview = 10,
  Success = 11
}
