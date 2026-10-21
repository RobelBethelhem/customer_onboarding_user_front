import { OnboardingState, Step } from './types';
import { EMPTY_FOREIGN_DOCUMENTS } from './utils/nationality';

/** A fresh individual account application (also the identity part of the business wizards) */
export const INITIAL_STATE: OnboardingState = {
  currentStep: Step.Landing,
  selectedBranch: null,
  selectedAccountType: null,
  selectedTier: null,
  selectedCurrency: '',
  fcn: '',
  token: '',
  faydaData: null,
  ekycToken: '',
  additionalInfo: {
    motherMaidenName: '',
    email: '',
    taxIdentity: '',
    annualIncome: '',
    occupation: '',
    industry: '',
    wealthSource: '',
    otherOccupation: '',
    otherIndustry: '',
    otherWealthSource: '',
    maritalStatus: '',
    promotionType: '',
  },
  documents: [],
  foreignDocuments: EMPTY_FOREIGN_DOCUMENTS,
  selfiePhoto: '',
  verificationPhotos: {
    faceCenter: '',
    livenessFrames: [],
  },
  livenessConfidence: 0,
  faceMatchScore: 0,
  faceVideoId: '',
  result: null,
  referralCode: '',
  referrerName: '',
  hasExistingAccount: null,
  existingAccountNumber: '',
  existingCif: '',
  branchFromCif: false,
  requestedServices: [],
  selectedServices: [],
  serviceTermsAccepted: [],
  faceVerificationToken: '',
  livenessFrames: [],
  faceMatched: null,
};

// Fields of the live face check, cleared when the person verifies with Fayda again
export const NO_FACE_CHECK: Partial<OnboardingState> = {
  selfiePhoto: '',
  verificationPhotos: { faceCenter: '', livenessFrames: [] },
  livenessConfidence: 0,
  faceMatchScore: 0,
  faceVideoId: '',
  faceVerificationToken: '',
  livenessFrames: [],
  faceMatched: null,
};
