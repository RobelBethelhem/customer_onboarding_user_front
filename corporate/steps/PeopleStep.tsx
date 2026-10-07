import React, { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2, ShieldCheck, MessageSquare, User } from 'lucide-react';
import type { CorporateCatalog, CorporateState, PersonForm, Role } from '../types';
import { ROLE_LABELS, SIGNING_RULES } from '../constants';
import { validatePeople } from '../validation';
import { StepFrame, TextInput, Field, inputClass } from '../ui';

interface Props {
  state: CorporateState;
  catalog: CorporateCatalog;
  update: (u: Partial<CorporateState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ROLES: Role[] = ['signatory', 'director'];
const newKey = () => Math.random().toString(36).slice(2, 10);

const RoleToggles: React.FC<{ roles: Role[]; onChange: (r: Role[]) => void; error?: string }> = ({ roles, onChange, error }) => (
  <div className="space-y-1">
    <div className="flex flex-wrap gap-2">
      {ROLES.map(r => {
        const on = roles.includes(r);
        return (
          <button key={r} type="button" onClick={() => onChange(on ? roles.filter(x => x !== r) : [...roles, r])}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              on ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
            {on ? '✓ ' : ''}{ROLE_LABELS[r]}
          </button>
        );
      })}
    </div>
    {error && <p className="text-xs text-red-600 ml-1">{error}</p>}
  </div>
);

/** The applicant's role, the other signatories and directors, and who signs */
const PeopleStep: React.FC<Props> = ({ state, catalog, update, onNext, onBack }) => {
  const [tried, setTried] = useState(false);
  const errors = tried ? validatePeople(state, catalog) : {};
  const { maxPeople, inviteValidDays } = catalog.rules;
  const canAdd = state.people.length + 1 < maxPeople;
  const me = state.identity.faydaData;

  const setPerson = (i: number, u: Partial<PersonForm>) =>
    update({ people: state.people.map((p, j) => (j === i ? { ...p, ...u } : p)) });

  const next = () => {
    setTried(true);
    const first = Object.values(validatePeople(state, catalog))[0];
    if (first) { toast.error(first); return; }
    onNext();
  };

  return (
    <StepFrame title="Signatories & Directors" subtitle={`Up to ${maxPeople} people, including you`} onBack={onBack} onNext={next}>
      {/* The applicant */}
      <div className="rounded-2xl border-2 border-brand/20 bg-brand-50/30 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand text-white"><User className="w-5 h-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-gray-800 truncate">{me?.fullName.eng || 'You'}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-green-600 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> You · verified with Fayda
            </div>
          </div>
        </div>
        <TextInput label="Your mobile number" required value={state.applicant.phone}
          onChange={v => update({ applicant: { ...state.applicant, phone: v } })} error={errors['applicant.phone']}
          type="tel" inputMode="tel" maxLength={15} hint="We send the application status to it" />
        <Field label="Your role in the organization" hint="Leave both off if you only represent the organization">
          <RoleToggles roles={state.applicant.roles} onChange={roles => update({ applicant: { ...state.applicant, roles } })} />
        </Field>
      </div>

      {/* Others */}
      {state.people.map((p, i) => (
        <div key={p.key} className="rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Person {i + 2}</span>
            <button type="button" onClick={() => update({ people: state.people.filter((_, j) => j !== i) })}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput label="Full name" required value={p.fullName} onChange={v => setPerson(i, { fullName: v })}
              error={errors[`people.${i}.fullName`]} maxLength={100} placeholder="As on their Fayda ID" />
            <TextInput label="Mobile number" required value={p.phone} onChange={v => setPerson(i, { phone: v })}
              error={errors[`people.${i}.phone`]} type="tel" inputMode="tel" maxLength={15} placeholder="09…" />
          </div>
          <RoleToggles roles={p.roles} onChange={roles => setPerson(i, { roles })} error={errors[`people.${i}.roles`]} />
        </div>
      ))}

      {canAdd ? (
        <button type="button"
          onClick={() => update({ people: [...state.people, { key: newKey(), fullName: '', phone: '', roles: ['signatory'], signature: null }] })}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-500 hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" /> Add a signatory or director
        </button>
      ) : (
        <p className="text-xs text-gray-400 text-center">An application can have at most {maxPeople} people.</p>
      )}
      {errors.signatories && <p className="text-xs text-red-600 ml-1">{errors.signatories}</p>}

      {state.people.length > 0 && (
        <div className="p-3 rounded-xl bg-blue-50 text-xs text-blue-700 flex gap-2">
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          <span>
            After you submit, each person gets an SMS with a link to verify with their own Fayda ID (OTP and face check).
            The link works for {inviteValidDays} days. Our team reviews the application once everyone has verified.
          </span>
        </div>
      )}

      {/* Who signs */}
      <Field label="Who signs for the account" required error={errors.signingRule}>
        <div className="space-y-2">
          {SIGNING_RULES.map(r => (
            <label key={r.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                state.signingRule === r.value ? 'border-brand bg-brand-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
              <input type="radio" name="signingRule" checked={state.signingRule === r.value}
                onChange={() => update({ signingRule: r.value })} className="mt-0.5 accent-[var(--brand)]" />
              <span>
                <span className="block text-sm font-bold text-gray-800">{r.label}</span>
                <span className="block text-xs text-gray-500">{r.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Field>
      {state.signingRule === 'other' && (
        <Field label="Describe the rule" required error={errors.signingRuleOther}>
          <textarea value={state.signingRuleOther} onChange={e => update({ signingRuleOther: e.target.value })}
            maxLength={300} rows={3} className={inputClass(errors.signingRuleOther)}
            placeholder="e.g. The general manager together with one board member" />
        </Field>
      )}
    </StepFrame>
  );
};

export default PeopleStep;
