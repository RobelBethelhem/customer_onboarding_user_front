import type { OnboardingState } from '../types';

// ─── Business account wizard ─────────────────────────────────────────────────────────────────
export enum CorporateStep {
  Intro = 0,
  FaydaId = 1,
  Otp = 2,
  Review = 3,
  FaceVerify = 4,
  Category = 5,
  Organization = 6,
  Contact = 7,
  Branch = 8,
  Account = 9,
  People = 10,
  Documents = 11,
  FinalReview = 12,
  Submitted = 13,
}

export type Role = 'signatory' | 'director';
export type SigningRule = 'single' | 'any_two' | 'all' | 'other';

/** A file stored by the bank (POST /api/corporate/files); the key proves it is ours on submit */
export interface UploadedFile {
  fileId: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  preview?: string; // small JPEG data URL, images only
}

export interface Address {
  city: string;
  subCity: string;
  woreda: string;
  houseNumber: string;
}

export interface OrganizationForm {
  categoryId: string;
  subtypeId: string;
  name: string;
  registrationNumber: string;
  registrationIssuedBy: string;
  establishmentDate: string;
  tradeLicenseNumber: string;
  tin: string;
  vatNumber: string;
  industry: string;
  otherIndustry: string;
  sourceOfFunds: string;
  otherSourceOfFunds: string;
  annualIncome: string;
  phone: string;
  mobile: string;
  fax: string;
  email: string;
  poBox: string;
  registeredAddress: Address;
  sameCorrespondenceAddress: boolean;
  correspondenceAddress: Address;
}

/** Another signatory or director; they verify themselves from the SMS link */
export interface PersonForm {
  key: string;
  fullName: string;
  phone: string;
  roles: Role[];
  signature: UploadedFile | null;
}

export interface CorporateState {
  currentStep: number;
  identity: OnboardingState;     // the applicant's Fayda verification and face check, branch and account
  verifiedAt: number;            // when the applicant verified with Fayda (the eKYC result is valid 7 days)
  faceCheckedAt: number;         // when the live face check was done (its result is valid 48 hours)
  organization: OrganizationForm;
  applicant: { phone: string; roles: Role[]; signature: UploadedFile | null };
  people: PersonForm[];
  signingRule: SigningRule;
  signingRuleOther: string;
  documents: Record<string, UploadedFile>; // by document id from the catalog
  declaration: boolean;
  result: SubmitResult | null;
}

// ─── Catalog (managed by KYC on the dashboard) ───────────────────────────────────────────────
export interface CatalogDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
  subtypes: string[]; // empty: every sub-type of the category
}

export interface CatalogCategory {
  id: string;
  name: string;
  description: string;
  subtypes: { id: string; name: string }[];
  documents: CatalogDocument[];
}

export interface CorporateRules {
  maxPeople: number;
  maxFileMb: number;
  signatureRequired: boolean;
  inviteValidDays: number;
}

export interface CorporateCatalog {
  categories: CatalogCategory[];
  rules: CorporateRules;
}

/** Documents the organization uploads for its category and sub-type */
export const documentsFor = (category: CatalogCategory | undefined, subtypeId: string): CatalogDocument[] =>
  category ? category.documents.filter(d => !d.subtypes.length || d.subtypes.includes(subtypeId)) : [];

// ─── Application as the applicant sees it (status page) ─────────────────────────────────────
export type ApplicationStatus =
  | 'awaiting_verification' | 'pending' | 'in_review' | 'escalated' | 'approving'
  | 'returned' | 'rejected' | 'approved';

export type ReviewStatus = 'pending' | 'accepted' | 'rejected';

export interface PublicPerson {
  id: string;
  fullName: string;
  roles: Role[];
  isApplicant: boolean;
  verified: boolean;
  phone: string; // masked
  inviteSentAt?: string;
  inviteExpiresAt?: string;
  signature: { fileName: string; status: ReviewStatus; note?: string } | null;
}

export interface PublicDocument {
  docId: string;
  name: string;
  required: boolean;
  fileName: string;
  status: ReviewStatus | 'missing';
  note?: string;
}

export interface ApplicationView {
  applicationId: string;
  status: ApplicationStatus;
  organizationName: string;
  categoryName: string;
  submittedAt: string;
  people: PublicPerson[];
  documents: PublicDocument[];
  returnReason?: string;
  rejectionReason?: string;
  cifNumber?: string;
  accountNumber?: string;
  branch: string;
  rules?: { maxFileMb: number; signatureRequired: boolean };
}

export interface SubmitResult {
  applicationId: string;
  accessKey: string;
  status: ApplicationStatus;
  view: ApplicationView;
}

// ─── SMS verification link ───────────────────────────────────────────────────────────────────
export interface InviteInfo {
  applicationId: string;
  organizationName: string;
  categoryName: string;
  applicantName: string;
  fullName: string;
  roles: Role[];
  roleText: string;
  verified: boolean;
  verifiedName?: string;
  expired: boolean;
  expiresAt?: string;
  open: boolean;
}

export interface InviteResult {
  fullName: string;
  organizationName: string;
  applicationId: string;
  allVerified: boolean;
}
