
export interface Branch {
  id: number;
  name: string;
  category: "City" | "Outline";
  type: "Branch" | "Sub-branch";
  latitude: number | null;   // null when the admin hasn't set a location
  longitude: number | null;
  branchCode: string;
  ifbCode?: string;          // branch used for interest-free (IFB) accounts, e.g. 164 → 664
  distanceKm?: number;
}

// An account class from the bank's product catalog (dashboard → Account Products)
export interface AccountTier {
  id: string;                  // class code, e.g. 'DBSV'
  name: string;                // e.g. 'Basic Saving — Digital'
  range: string;               // balance band shown to the customer
  interestRate: number | null; // % per year; null = interest-free / not stated
  code: string;
  productNumber: string;       // sent as tierId (FlexCube account template)
  minBalance: number | null;
  maxBalance: number | null;
  remarks: string;
}

export interface AccountType {
  id: string;
  name: string;
  icon: string;
  description: string;
  minDeposit: number;
  interestRange: string;
  tiers: AccountTier[];
  isIFB?: boolean; // Interest-Free Banking product — the wizard switches to the green IFB theme
}

// An additional service from the bank's catalog (dashboard → Products & Services)
export interface AdditionalService {
  id: string;
  name: string;
  summary: string;
  details: string[];
  icon: string;
  // When set, the customer must accept these terms (this version) to choose the service
  termsTitle?: string;
  termsText?: string;
  termsVersion?: number;
}

// A frame captured during the live face check, sent to the server with the selfie
export interface LivenessFrame {
  action: 'mouth' | 'turn';
  image: string; // base64 JPEG
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
  // Existing customer — the new account is opened under their current CIF (no new CIF)
  hasExistingAccount: boolean | null; // null until answered
  existingAccountNumber: string;      // 16-digit account number, if they gave one
  existingCif: string;                // 7-digit CIF (entered, or taken from the account number)
  // Optional services, set up by the branch Personal Banker after the account is opened
  requestedServices: string[];        // service ids from the catalog, e.g. 'mobile_banking'
  selectedServices: { id: string; name: string; icon: string }[]; // the same services, for the review screens
  serviceTermsAccepted: { id: string; version: number; acceptedAt: string }[];
  // Live face check, verified by the Fayda backend (the signed result goes with the application)
  faceVerificationToken: string;
  livenessFrames: LivenessFrame[];
  faceMatched: boolean | null;        // server verdict, for the review screen (null = not checked)
}

export enum Step {
  Landing = 0,
  Welcome = 1,
  ExistingAccount = 2,
  Branch = 3,
  AccountType = 4,
  FaydaId = 5,
  Otp = 6,
  Review = 7,
  AdditionalInfo = 8,
  Documents = 9,
  FaceVerify = 10,
  Services = 11,
  FinalReview = 12,
  Success = 13
}
