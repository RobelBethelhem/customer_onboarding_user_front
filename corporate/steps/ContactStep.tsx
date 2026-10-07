import React, { useState } from 'react';
import { toast } from 'sonner';
import type { Address, CorporateState, OrganizationForm } from '../types';
import { validateContact } from '../validation';
import { StepFrame, TextInput } from '../ui';

interface Props {
  state: CorporateState;
  update: (u: Partial<CorporateState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const AddressFields: React.FC<{ value: Address; onChange: (a: Address) => void; errors: Record<string, string>; prefix: string }> =
  ({ value, onChange, errors, prefix }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <TextInput label="City" required value={value.city} onChange={v => onChange({ ...value, city: v })}
        error={errors[`${prefix}.city`]} maxLength={60} placeholder="e.g. Addis Ababa" />
      <TextInput label="Sub-city / zone" required={prefix === 'registered'} value={value.subCity}
        onChange={v => onChange({ ...value, subCity: v })} error={errors[`${prefix}.subCity`]} maxLength={60} />
      <TextInput label="Woreda / kebele" value={value.woreda} onChange={v => onChange({ ...value, woreda: v })} maxLength={60} />
      <TextInput label="House / building number" value={value.houseNumber}
        onChange={v => onChange({ ...value, houseNumber: v })} maxLength={30} />
    </div>
  );

/** How to reach the organization, and where it is */
const ContactStep: React.FC<Props> = ({ state, update, onNext, onBack }) => {
  const org = state.organization;
  const [tried, setTried] = useState(false);
  const errors = tried ? validateContact(org) : {};
  const set = (u: Partial<OrganizationForm>) => update({ organization: { ...org, ...u } });

  const next = () => {
    setTried(true);
    const first = Object.values(validateContact(org))[0];
    if (first) { toast.error(first); return; }
    onNext();
  };

  return (
    <StepFrame title="Contact & Address" subtitle="Of the organization" onBack={onBack} onNext={next}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput label="Mobile" value={org.mobile} onChange={v => set({ mobile: v })} error={errors.mobile}
          type="tel" inputMode="tel" maxLength={15} placeholder="09…" />
        <TextInput label="Office phone" value={org.phone} onChange={v => set({ phone: v })} error={errors.phone}
          type="tel" inputMode="tel" maxLength={20} placeholder="011…" />
        <TextInput label="Email" value={org.email} onChange={v => set({ email: v })} error={errors.email}
          type="email" inputMode="email" maxLength={100} />
        <TextInput label="P.O. Box" value={org.poBox} onChange={v => set({ poBox: v })} maxLength={20} />
        <TextInput label="Fax" value={org.fax} onChange={v => set({ fax: v })} type="tel" maxLength={20} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700">Registered address</h3>
        <AddressFields value={org.registeredAddress} onChange={a => set({ registeredAddress: a })} errors={errors} prefix="registered" />
      </div>

      <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer">
        <input type="checkbox" checked={org.sameCorrespondenceAddress}
          onChange={e => set({ sameCorrespondenceAddress: e.target.checked })} className="w-4 h-4 accent-[var(--brand)]" />
        <span className="text-sm text-gray-700">Letters go to the registered address</span>
      </label>

      {!org.sameCorrespondenceAddress && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Correspondence address</h3>
          <AddressFields value={org.correspondenceAddress} onChange={a => set({ correspondenceAddress: a })} errors={errors} prefix="correspondence" />
        </div>
      )}
    </StepFrame>
  );
};

export default ContactStep;
