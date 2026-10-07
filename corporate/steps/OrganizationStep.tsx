import React, { useState } from 'react';
import { toast } from 'sonner';
import type { CorporateState, OrganizationForm } from '../types';
import { INDUSTRIES } from '../../constants';
import { SOURCES_OF_FUNDS } from '../constants';
import { validateOrganization } from '../validation';
import { StepFrame, TextInput, SelectInput } from '../ui';

interface Props {
  state: CorporateState;
  update: (u: Partial<CorporateState>) => void;
  onNext: () => void;
  onBack: () => void;
}

/** Registration, tax and business details of the organization */
const OrganizationStep: React.FC<Props> = ({ state, update, onNext, onBack }) => {
  const org = state.organization;
  const [tried, setTried] = useState(false);
  const errors = tried ? validateOrganization(org) : {};
  const set = (u: Partial<OrganizationForm>) => update({ organization: { ...org, ...u } });

  const next = () => {
    setTried(true);
    const first = Object.values(validateOrganization(org))[0];
    if (first) { toast.error(first); return; }
    onNext();
  };

  return (
    <StepFrame title="Organization Details" subtitle="As written on the registration documents" onBack={onBack} onNext={next}>
      <TextInput label="Name of the organization" required value={org.name} onChange={v => set({ name: v })}
        error={errors.name} maxLength={150} placeholder="e.g. Abebe Trading PLC" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput label="Registration / license number" required value={org.registrationNumber}
          onChange={v => set({ registrationNumber: v })} error={errors.registrationNumber} maxLength={60} />
        <TextInput label="Issued by" value={org.registrationIssuedBy} onChange={v => set({ registrationIssuedBy: v })}
          maxLength={100} placeholder="e.g. Ministry of Trade" />
        <TextInput label="Date of establishment" type="date" value={org.establishmentDate}
          onChange={v => set({ establishmentDate: v })} />
        <TextInput label="Trade license number" value={org.tradeLicenseNumber}
          onChange={v => set({ tradeLicenseNumber: v })} maxLength={60} hint="If different from the registration number" />
        <TextInput label="TIN" value={org.tin} onChange={v => set({ tin: v.replace(/[^\d]/g, '') })}
          error={errors.tin} inputMode="numeric" maxLength={10} placeholder="10 digits" />
        <TextInput label="VAT registration number" value={org.vatNumber} onChange={v => set({ vatNumber: v })} maxLength={30} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectInput label="Industry" required value={org.industry} options={INDUSTRIES}
          onChange={v => set({ industry: v, otherIndustry: v === 'O' ? org.otherIndustry : '' })} error={errors.industry} />
        {org.industry === 'O' && (
          <TextInput label="Describe the industry" required value={org.otherIndustry}
            onChange={v => set({ otherIndustry: v })} error={errors.otherIndustry} maxLength={100} />
        )}
        <SelectInput label="Source of funds" required value={org.sourceOfFunds} options={SOURCES_OF_FUNDS}
          onChange={v => set({ sourceOfFunds: v, otherSourceOfFunds: v === 'O' ? org.otherSourceOfFunds : '' })} error={errors.sourceOfFunds} />
        {org.sourceOfFunds === 'O' && (
          <TextInput label="Describe the source of funds" required value={org.otherSourceOfFunds}
            onChange={v => set({ otherSourceOfFunds: v })} error={errors.otherSourceOfFunds} maxLength={100} />
        )}
        <TextInput label="Expected annual turnover (ETB)" value={org.annualIncome}
          onChange={v => set({ annualIncome: v.replace(/[^\d.,]/g, '') })} error={errors.annualIncome} inputMode="decimal" maxLength={20} />
      </div>
    </StepFrame>
  );
};

export default OrganizationStep;
