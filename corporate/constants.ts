import type { ApplicationStatus, OrganizationForm, Role, SigningRule } from './types';

// Source of the organization's funds — FlexCube WEALTH_SOURCE list-of-values codes
// (same codes as for individuals, the ones that fit an organization)
export const SOURCES_OF_FUNDS = [
  { value: '', label: 'Select source of funds' },
  { value: 'SB', label: 'Business income' },
  { value: 'INV', label: 'Investment / dividend income' },
  { value: 'SOA', label: 'Sale of assets' },
  { value: 'LP', label: 'Loan proceeds' },
  { value: 'D', label: 'Donations' },
  { value: 'GF', label: 'Grants / gifts' },
  { value: 'T', label: 'Trust' },
  { value: 'PS', label: 'Savings' },
  { value: 'O', label: 'Other' },
];

export const ROLE_LABELS: Record<Role, string> = {
  signatory: 'Signatory',
  director: 'Director / manager',
};

export const roleText = (roles: Role[]) =>
  roles.length ? roles.map(r => ROLE_LABELS[r]).join(' & ') : 'Representative';

export const SIGNING_RULES: { value: SigningRule; label: string; hint: string }[] = [
  { value: 'single', label: 'Any one signatory alone', hint: 'Each signatory can operate the account on their own' },
  { value: 'any_two', label: 'Any two signatories jointly', hint: 'Two signatories sign together' },
  { value: 'all', label: 'All signatories jointly', hint: 'Every signatory signs' },
  { value: 'other', label: 'Other', hint: 'Describe the rule, e.g. from your board resolution' },
];

export const STATUS_INFO: Record<ApplicationStatus, { label: string; tone: 'amber' | 'blue' | 'green' | 'red' | 'gray'; text: string }> = {
  awaiting_verification: { label: 'Waiting for verification', tone: 'amber', text: 'Everyone on the application verifies with their own Fayda ID from the SMS link. It goes to our team once all have.' },
  pending: { label: 'Under review', tone: 'blue', text: 'Our team is reviewing the application and documents.' },
  in_review: { label: 'Under review', tone: 'blue', text: 'Our team is reviewing the application and documents.' },
  escalated: { label: 'Under review', tone: 'blue', text: 'The application is with a senior approver.' },
  approving: { label: 'Opening the account', tone: 'blue', text: 'The account is being opened.' },
  returned: { label: 'Changes needed', tone: 'amber', text: 'Our team needs some documents again. See below.' },
  rejected: { label: 'Not approved', tone: 'red', text: 'We could not approve this application.' },
  approved: { label: 'Account opened', tone: 'green', text: 'The account of the organization is open.' },
};

export const TONE_CLASSES = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-gray-50 text-gray-600 border-gray-200',
};

// The Fayda backend's signed results expire: eKYC after 7 days, the face check after 48 hours.
// Ask again a little before, so they do not expire while the application is sent.
export const EKYC_MAX_AGE_MS = 6.5 * 24 * 60 * 60 * 1000;
export const FACE_MAX_AGE_MS = 46 * 60 * 60 * 1000;

/** 09XXXXXXXX / 07XXXXXXXX / +2519XXXXXXXX → 09XXXXXXXX, or '' (same rule as the bank) */
export function normalizeMobile(phone: string): string {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  const m = digits.match(/^(?:251|0)?([79]\d{8})$/);
  return m ? `0${m[1]}` : '';
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMPTY_ADDRESS = { city: '', subCity: '', woreda: '', houseNumber: '' };

export const EMPTY_ORGANIZATION: OrganizationForm = {
  categoryId: '', subtypeId: '', name: '', registrationNumber: '', registrationIssuedBy: '', establishmentDate: '',
  tradeLicenseNumber: '', tin: '', vatNumber: '', industry: '', otherIndustry: '', sourceOfFunds: '',
  otherSourceOfFunds: '', annualIncome: '', phone: '', mobile: '', fax: '', email: '', poBox: '',
  registeredAddress: { ...EMPTY_ADDRESS }, sameCorrespondenceAddress: true, correspondenceAddress: { ...EMPTY_ADDRESS },
};

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const formatDate = (d?: string | number) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Object.entries with the value type kept */
export const entriesOf = <T,>(o: Record<string, T>): [string, T][] => Object.keys(o).map(k => [k, o[k]] as [string, T]);
