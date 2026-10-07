import React from 'react';
import { Building2, MapPin, Wallet, Users, FileText, User, ShieldCheck, AlertTriangle, Pencil } from 'lucide-react';
import type { CorporateCatalog, CorporateState } from '../types';
import { CorporateStep, documentsFor } from '../types';
import { INDUSTRIES } from '../../constants';
import { SOURCES_OF_FUNDS, SIGNING_RULES, roleText, normalizeMobile } from '../constants';
import { StepFrame, Section, Row, toDataUri } from '../ui';

interface Props {
  state: CorporateState;
  catalog: CorporateCatalog;
  update: (u: Partial<CorporateState>) => void;
  onEdit: (step: CorporateStep) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

const label = (list: { value: string; label: string }[], code: string, other: string) =>
  code === 'O' ? other || 'Other' : list.find(x => x.value === code)?.label || code;

const address = (a: { city: string; subCity: string; woreda: string; houseNumber: string }) =>
  [a.houseNumber && `House ${a.houseNumber}`, a.woreda, a.subCity, a.city].filter(Boolean).join(', ');

/** Everything at a glance before submitting, with links back to each part */
const CorporateReviewStep: React.FC<Props> = ({ state, catalog, update, onEdit, onBack, onSubmit, submitting }) => {
  const org = state.organization;
  const id = state.identity;
  const category = catalog.categories.find(c => c.id === org.categoryId);
  const subtype = category?.subtypes.find(s => s.id === org.subtypeId);
  const docs = documentsFor(category, org.subtypeId);
  const rule = SIGNING_RULES.find(r => r.value === state.signingRule);

  const edit = (step: CorporateStep, text = 'Edit') => (
    <button type="button" onClick={() => onEdit(step)} disabled={submitting}
      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline disabled:opacity-50">
      <Pencil className="w-3 h-3" /> {text}
    </button>
  );

  return (
    <StepFrame title="Review & Submit" subtitle="Check the application before you send it" onBack={onBack}
      onNext={onSubmit} nextLabel={submitting ? 'Submitting…' : 'Submit Application'} nextDisabled={!state.declaration} busy={submitting}>

      <Section title="You" icon={<User className="w-3.5 h-3.5" />}>
        <div className="flex items-center gap-3">
          {id.faydaData?.photo && <img src={toDataUri(id.faydaData.photo)} alt="" className="w-12 h-14 rounded-lg object-cover" />}
          <div className="min-w-0">
            <div className="font-bold text-gray-800">{id.faydaData?.fullName.eng}</div>
            <div className="text-xs text-gray-500">{roleText(state.applicant.roles)} · {normalizeMobile(state.applicant.phone)}</div>
            {id.faceMatched ? (
              <div className="text-[10px] font-bold uppercase text-green-600 flex items-center gap-1 mt-0.5"><ShieldCheck className="w-3 h-3" /> Fayda and face verified</div>
            ) : (
              <div className="text-[10px] font-bold uppercase text-amber-600 flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" /> Face check goes to our team for review</div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Organization" icon={<Building2 className="w-3.5 h-3.5" />} action={<span className="flex gap-3">{edit(CorporateStep.Category, 'Type')}{edit(CorporateStep.Organization)}</span>}>
        <Row label="Name" value={org.name} />
        <Row label="Type" value={[category?.name, subtype?.name].filter(Boolean).join(' — ')} />
        <Row label="Registration no." value={org.registrationNumber} />
        <Row label="Issued by" value={org.registrationIssuedBy} />
        <Row label="Established" value={org.establishmentDate} />
        <Row label="Trade license" value={org.tradeLicenseNumber} />
        <Row label="TIN" value={org.tin} />
        <Row label="VAT no." value={org.vatNumber} />
        <Row label="Industry" value={label(INDUSTRIES, org.industry, org.otherIndustry)} />
        <Row label="Source of funds" value={label(SOURCES_OF_FUNDS, org.sourceOfFunds, org.otherSourceOfFunds)} />
        <Row label="Annual turnover" value={org.annualIncome && `${org.annualIncome} ETB`} />
      </Section>

      <Section title="Contact & Address" icon={<MapPin className="w-3.5 h-3.5" />} action={edit(CorporateStep.Contact)}>
        <Row label="Mobile" value={org.mobile} />
        <Row label="Phone" value={org.phone} />
        <Row label="Email" value={org.email} />
        <Row label="P.O. Box" value={org.poBox} />
        <Row label="Registered address" value={address(org.registeredAddress)} />
        <Row label="Correspondence" value={org.sameCorrespondenceAddress ? 'Same as registered' : address(org.correspondenceAddress)} />
      </Section>

      <Section title="Branch & Account" icon={<Wallet className="w-3.5 h-3.5" />} action={<span className="flex gap-3">{edit(CorporateStep.Branch, 'Branch')}{edit(CorporateStep.Account, 'Account')}</span>}>
        <Row label="Branch" value={id.selectedBranch?.name} />
        <Row label="Account" value={id.selectedAccountType?.name} />
        <Row label="Class" value={id.selectedTier?.name} />
      </Section>

      <Section title="Signatories & Directors" icon={<Users className="w-3.5 h-3.5" />} action={edit(CorporateStep.People)}>
        <Row label={`${id.faydaData?.fullName.eng || 'You'} (you)`} value={roleText(state.applicant.roles)} />
        {state.people.map(p => (
          <Row key={p.key} label={p.fullName} value={`${roleText(p.roles)} · ${normalizeMobile(p.phone)}`} />
        ))}
        <Row label="Signing rule" value={state.signingRule === 'other' ? state.signingRuleOther : rule?.label} />
        {state.people.length > 0 && (
          <p className="text-xs text-blue-600 pt-1">
            {state.people.length === 1 ? 'This person gets' : `These ${state.people.length} people get`} an SMS link to verify with Fayda.
          </p>
        )}
      </Section>

      <Section title="Documents" icon={<FileText className="w-3.5 h-3.5" />} action={edit(CorporateStep.Documents)}>
        {docs.map(d => (
          <Row key={d.id} label={d.name}
            value={state.documents[d.id]?.fileName || <span className="text-gray-300 font-normal">{d.required ? 'Missing' : 'Not uploaded'}</span>} />
        ))}
        {state.applicant.roles.includes('signatory') && (
          <Row label="Your signature" value={state.applicant.signature ? '✓ Uploaded' : <span className="text-gray-300 font-normal">Not uploaded</span>} />
        )}
        {state.people.filter(p => p.roles.includes('signatory')).map(p => (
          <Row key={p.key} label={`Signature — ${p.fullName}`}
            value={p.signature ? '✓ Uploaded' : <span className="text-gray-300 font-normal">Not uploaded</span>} />
        ))}
      </Section>

      <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
        state.declaration ? 'border-brand bg-brand-50/30' : 'border-gray-100'}`}>
        <input type="checkbox" checked={state.declaration} onChange={e => update({ declaration: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-[var(--brand)]" disabled={submitting} />
        <span className="text-xs text-gray-600 leading-relaxed">
          I am authorized to apply for this account on behalf of <b>{org.name || 'the organization'}</b>. The information
          and documents I give are true and complete, and Zemen Bank may verify them.
        </span>
      </label>
    </StepFrame>
  );
};

export default CorporateReviewStep;
