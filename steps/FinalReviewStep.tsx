
import React, { useState } from 'react';
import {
  Loader2, Pencil, User, MapPin, Landmark, Wallet, Camera, ShieldCheck, Send, UserCheck, Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { OnboardingState, Step } from '../types';
import { faydaService } from '../services/api';
import {
  OCCUPATIONS, INDUSTRIES, WEALTH_SOURCES, MARITAL_STATUSES, PROMOTION_TYPES, ADDITIONAL_SERVICES, isIfbAccountType,
} from '../constants';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
  onEdit: (step: number) => void;
}

/** Ensure base64 photo string has a proper data URI prefix for <img src> */
const toDataUri = (photo: string | undefined | null): string => {
  if (!photo) return '';
  if (photo.startsWith('data:image')) return photo;
  const mime = photo.startsWith('/9j/') ? 'image/jpeg' : photo.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${photo}`;
};

/** Map a coded value back to its human-readable label */
const labelFor = (options: { value: string; label: string }[], value: string): string => {
  if (!value) return '—';
  const found = options.find(o => o.value === value);
  return found ? found.label : value;
};

const FinalReviewStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack, onEdit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { faydaData, additionalInfo, selectedBranch, selectedAccountType, selectedTier } = state;

  // Uppercase a string value (skip empty/falsy) — mirrors the original FlexCube payload formatting
  const uc = (val: string | undefined | null): string => (val || '').toUpperCase();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // NOTE: field names and derivations below are intentionally identical to the original
      // FlexCube create-customer contract. Only the email source has changed (now the
      // reviewed/edited email captured during Additional Information, falling back to Fayda).
      const payload = {
        firstName: uc(state.faydaData?.fullName.eng.split(' ')[0]),
        middleName: uc(state.faydaData?.fullName.eng.split(' ')[1]),
        lastName: uc(state.faydaData?.fullName.eng.split(' ').slice(2).join(' ')),
        fullName: uc(state.faydaData?.fullName.eng),
        fullNameAmharic: state.faydaData?.fullName.amh || '',
        dateOfBirth: state.faydaData?.dateOfBirth || '',
        gender: state.faydaData?.gender.eng === 'Male' ? 'M' : 'F',
        salutation: state.faydaData?.gender.eng === 'Male' ? 'ATO' : 'W/RO',
        nationality: 'ET',
        faydaId: state.fcn,
        uin: state.faydaData?.uin || '',
        mobile: state.faydaData?.phone || '',
        phone: state.faydaData?.phone || '',
        email: state.additionalInfo.email || state.faydaData?.email || '',
        address1: uc(state.faydaData?.region.eng),
        address2: uc(state.faydaData?.zone.eng),
        address3: uc(state.faydaData?.woreda.eng),
        city: uc(state.faydaData?.zone.eng),
        state: uc(state.faydaData?.region.eng),
        region: uc(state.faydaData?.region.eng),
        zone: uc(state.faydaData?.zone.eng),
        woreda: uc(state.faydaData?.woreda.eng),
        motherMaidenName: uc(state.additionalInfo.motherMaidenName),
        tin: state.additionalInfo.taxIdentity,
        monthlyIncome: state.additionalInfo.annualIncome,
        maritalStatus: state.additionalInfo.maritalStatus,
        occupation: state.additionalInfo.occupation,
        otherOccupation: uc(state.additionalInfo.otherOccupation),
        industry: state.additionalInfo.industry,
        otherIndustry: uc(state.additionalInfo.otherIndustry),
        wealthSource: state.additionalInfo.wealthSource,
        otherWealthSource: uc(state.additionalInfo.otherWealthSource),
        promotionType: state.additionalInfo.promotionType || 'Walk in customer',
        customerSegmentation: "RETAIL CUSTOMER",
        branch: uc(state.selectedBranch?.name),
        branchId: state.selectedBranch?.id || 0,
        branchName: uc(state.selectedBranch?.name),
        branchCode: state.selectedBranch?.branchCode || '',
        accountType: uc(state.selectedAccountType?.name),
        accountTypeId: state.selectedAccountType?.id || '',
        accountTypeName: uc(state.selectedAccountType?.name),
        tierId: state.selectedTier?.id || '',
        tierName: uc(state.selectedTier?.name),
        tierInterestRate: state.selectedTier?.interestRate || 0,
        faydaPhoto: state.faydaData?.photo || '',
        selfiePhoto: state.selfiePhoto,
        marriageCertificatePhoto: state.documents.map((d: any) => d.base64).join('|||'),
        faceVideoId: state.faceVideoId || '',
        channel: 'web',
        referralCode: state.referralCode || '',
        // Existing customer — only a new account is opened under this CIF (no new CIF)
        existingCustomer: state.hasExistingAccount === true,
        existingCif: state.hasExistingAccount ? state.existingCif : '',
        existingAccountNumber: state.hasExistingAccount ? state.existingAccountNumber : '',
        // Mobile Banking / Internet Banking / Debit Card — set up by the branch after approval
        requestedServices: state.requestedServices || [],
      };
      const result = await faydaService.submitOnboarding(payload);
      onUpdate({ result });
      onNext();
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const occupationDisplay = additionalInfo.occupation === 'O'
    ? `Other — ${additionalInfo.otherOccupation || '—'}`
    : labelFor(OCCUPATIONS, additionalInfo.occupation);
  const industryDisplay = additionalInfo.industry === 'O'
    ? `Other — ${additionalInfo.otherIndustry || '—'}`
    : labelFor(INDUSTRIES, additionalInfo.industry);
  const wealthDisplay = additionalInfo.wealthSource === 'O'
    ? `Other — ${additionalInfo.otherWealthSource || '—'}`
    : labelFor(WEALTH_SOURCES, additionalInfo.wealthSource);

  return (
    <div className="flex flex-col h-full relative">
      {/* Submission overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/90 z-30 flex flex-col items-center justify-center backdrop-blur-md">
          <Loader2 className="w-16 h-16 text-brand animate-spin mb-6" />
          <p className="text-xl font-bold text-gray-800">Processing Your Application...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to Zemen Bank Core Systems</p>
        </div>
      )}

      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Review &amp; Submit</h2>
        <p className="text-sm text-gray-500">Confirm all details below before final submission. Tap edit to change any section.</p>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-5">

        {/* Existing customer */}
        <Section title="Existing Customer" icon={<UserCheck className="w-4 h-4" />} onEdit={() => onEdit(Step.ExistingAccount)}>
          {state.hasExistingAccount ? (
            <>
              <Row label="Existing Customer" value="Yes" />
              {state.existingAccountNumber && <Row label="Account Number" value={state.existingAccountNumber} />}
              <Row label="CIF Number" value={state.existingCif || '—'} />
              <p className="text-xs text-gray-500">Your new account will be opened under this CIF.</p>
            </>
          ) : (
            <Row label="Existing Customer" value="No — new customer" />
          )}
        </Section>

        {/* Branch */}
        <Section title="Branch" icon={<MapPin className="w-4 h-4" />} onEdit={() => onEdit(Step.Branch)}>
          <Row label="Home Branch" value={selectedBranch?.name || '—'} />
          <Row label="Branch Code" value={selectedBranch?.branchCode || '—'} />
          {isIfbAccountType(selectedAccountType) && selectedBranch?.ifbCode && (
            <Row label="IFB Branch Code" value={selectedBranch.ifbCode} />
          )}
        </Section>

        {/* Account */}
        <Section title="Account" icon={<Landmark className="w-4 h-4" />} onEdit={() => onEdit(Step.AccountType)}>
          <Row label="Product" value={selectedAccountType?.name || '—'} />
          <Row label="Interest Tier" value={selectedTier ? `${selectedTier.name} (${selectedTier.interestRate.toFixed(2)}%)` : '—'} />
          <Row label="Balance Range" value={selectedTier?.range || '—'} />
        </Section>

        {/* Verified identity (read-only) */}
        <Section
          title="Verified Identity"
          icon={<ShieldCheck className="w-4 h-4" />}
          badge="From Fayda — not editable"
        >
          <div className="flex gap-4 mb-2">
            {faydaData?.photo && (
              <img src={toDataUri(faydaData.photo)} alt="Fayda" className="w-16 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
            )}
            <div className="flex-1 space-y-2">
              <Row label="Full Name" value={faydaData?.fullName.eng || '—'} />
              <Row label="UIN" value={faydaData?.uin || '—'} />
            </div>
          </div>
          <Row label="Date of Birth" value={faydaData?.dateOfBirth || '—'} />
          <Row label="Gender" value={faydaData?.gender.eng || '—'} />
          <Row label="Phone" value={faydaData?.phone || '—'} />
          <Row label="Region / Zone / Woreda" value={[faydaData?.region.eng, faydaData?.zone.eng, faydaData?.woreda.eng].filter(Boolean).join(' / ') || '—'} />
        </Section>

        {/* Additional info */}
        <Section title="Additional Information" icon={<Wallet className="w-4 h-4" />} onEdit={() => onEdit(Step.AdditionalInfo)}>
          <Row label="Email" value={additionalInfo.email || '—'} />
          <Row label="Mother's Maiden Name" value={additionalInfo.motherMaidenName || '—'} />
          <Row label="TIN" value={additionalInfo.taxIdentity || '—'} />
          <Row label="Monthly Income (ETB)" value={additionalInfo.annualIncome || '—'} />
          <Row label="Marital Status" value={labelFor(MARITAL_STATUSES, additionalInfo.maritalStatus)} />
          <Row label="Occupation" value={occupationDisplay} />
          <Row label="Industry" value={industryDisplay} />
          <Row label="Source of Wealth" value={wealthDisplay} />
          <Row label="How did you hear about us?" value={labelFor(PROMOTION_TYPES, additionalInfo.promotionType)} />
        </Section>

        {/* Face verification */}
        <Section title="Face Verification" icon={<Camera className="w-4 h-4" />} onEdit={() => onEdit(Step.FaceVerify)}>
          <div className="flex items-center gap-4">
            {state.selfiePhoto ? (
              <img src={`data:image/jpeg;base64,${state.selfiePhoto}`} alt="Selfie" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center"><User className="w-7 h-7 text-gray-400" /></div>
            )}
            <div className="text-xs text-gray-500">
              <p className="font-semibold text-gray-700">
                {state.faceVideoId ? 'Verification video captured' : 'No video captured'}
              </p>
              <p>Your video will be reviewed by the KYC team.</p>
            </div>
          </div>
        </Section>

        {/* Additional services */}
        <Section title="Additional Services" icon={<Smartphone className="w-4 h-4" />} onEdit={() => onEdit(Step.Services)}>
          {(state.requestedServices || []).length > 0 ? (
            <>
              {ADDITIONAL_SERVICES.filter(s => state.requestedServices.includes(s.id)).map(s => (
                <Row key={s.id} label={s.name} value="Requested" />
              ))}
              <p className="text-xs text-gray-500">Set up by your branch after your account is opened.</p>
            </>
          ) : (
            <Row label="Services" value="None requested" />
          )}
        </Section>

        {state.referralCode && (
          <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800">
            Referral code applied: <span className="font-bold">{state.referralCode}</span>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-[2] py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-dark transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Send className="w-4 h-4" /> Submit Application
        </button>
      </div>
    </div>
  );
};

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  onEdit?: () => void;
  badge?: string;
  children: React.ReactNode;
}> = ({ title, icon, onEdit, badge, children }) => (
  <div className="border border-gray-100 rounded-2xl overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
      <div className="flex items-center gap-2 text-gray-700">
        <span className="text-brand">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
      </div>
      {onEdit ? (
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      ) : badge ? (
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{badge}</span>
      ) : null}
    </div>
    <div className="p-4 space-y-2">{children}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-gray-400 flex-shrink-0">{label}</span>
    <span className="text-gray-800 font-semibold text-right break-words">{value}</span>
  </div>
);

export default FinalReviewStep;
