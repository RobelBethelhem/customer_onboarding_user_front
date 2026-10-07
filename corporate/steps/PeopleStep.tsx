import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  UserPlus, Trash2, ShieldCheck, User, Users, Smartphone, CheckCircle2, Clock, Copy, Share2, Send, Loader2, AlertTriangle, X,
} from 'lucide-react';
import type { CorporateCatalog, CorporateState, PersonForm, Role } from '../types';
import { personName } from '../types';
import { ROLE_LABELS, SIGNING_RULES, normalizeMobile, formatDate } from '../constants';
import { corporateService } from '../api';
import { validatePeople } from '../validation';
import { StepFrame, TextInput, Field, inputClass } from '../ui';

interface Props {
  state: CorporateState;
  catalog: CorporateCatalog;
  update: (u: Partial<CorporateState>) => void;
  onNext: () => void;
  onBack: () => void;
  onVerifyHere: (roles: Role[]) => void; // the person is here: they verify on this phone now
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

/** Copy or share the SMS link (the person may prefer WhatsApp / Telegram) */
async function shareLink(p: PersonForm, organizationName: string) {
  const text = `Please verify your identity for the Zemen Bank account of ${organizationName}: ${p.link}`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Zemen Bank verification', text }); return; }
  } catch { /* closed the share sheet */ return; }
  try { await navigator.clipboard.writeText(p.link); toast.success('Link copied'); } catch { toast.error('Could not copy the link'); }
}

/** The applicant's role, the other signatories and directors (verified here or by link), and who signs */
const PeopleStep: React.FC<Props> = ({ state, catalog, update, onNext, onBack, onVerifyHere }) => {
  const [tried, setTried] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newRoles, setNewRoles] = useState<Role[]>(['signatory']);
  const [linkForm, setLinkForm] = useState(false);
  const [linkPhone, setLinkPhone] = useState('');
  const [linkName, setLinkName] = useState('');
  const [busy, setBusy] = useState('');
  const errors = tried ? validatePeople(state, catalog) : {};
  const { maxPeople, inviteValidDays } = catalog.rules;
  const canAdd = state.people.length + 1 < maxPeople;
  const me = state.identity.faydaData;
  const org = state.organization;
  const category = catalog.categories.find(c => c.id === org.categoryId);
  const waiting = state.people.filter(p => p.status !== 'verified').length;

  const setPerson = (key: string, u: Partial<PersonForm>) =>
    update({ people: state.people.map(p => (p.key === key ? { ...p, ...u } : p)) });

  const resetAdd = () => { setAdding(false); setLinkForm(false); setLinkPhone(''); setLinkName(''); setNewRoles(['signatory']); };

  const sendLink = async () => {
    if (!newRoles.length) { toast.error('Choose signatory, director or both'); return; }
    const phone = normalizeMobile(linkPhone);
    if (!phone) { toast.error('Enter a valid mobile number (09… or 07…)'); return; }
    if (phone === normalizeMobile(state.applicant.phone)) { toast.error('This is your own number — enter the mobile of the person who verifies'); return; }
    if (state.people.some(p => p.mode === 'link' && normalizeMobile(p.phone) === phone)) { toast.error('A link was already sent to this number'); return; }
    setBusy('send');
    try {
      const r = await corporateService.addPerson({
        ekycToken: state.identity.ekycToken || '', groupId: state.groupId, mode: 'link', roles: newRoles,
        organizationName: org.name, categoryName: category?.name || '', applicantPhone: normalizeMobile(state.applicant.phone),
        phone, name: linkName.trim(),
      });
      update({
        people: [...state.people, {
          key: newKey(), mode: 'link', roles: newRoles, name: linkName.trim(), phone, verificationId: r.verification.verificationId,
          verificationKey: r.key, link: r.link || '', status: 'pending', fullName: '', sentAt: r.verification.sentAt, signature: null,
        }],
      });
      toast.success(r.verification.smsSent === false
        ? 'The SMS could not be sent — share the link with them another way'
        : `Link sent to ${phone}. You will see a tick here when they finish.`);
      resetAdd();
    } catch (e: any) {
      toast.error(e?.message || 'The link could not be sent');
    } finally {
      setBusy('');
    }
  };

  const resend = async (p: PersonForm) => {
    setBusy(`resend:${p.key}`);
    try {
      const r = await corporateService.resendLink(p.verificationId, p.verificationKey);
      setPerson(p.key, { link: r.link, sentAt: r.verification.sentAt, expired: false });
      toast.success(`A new link was sent to ${p.phone}`);
    } catch (e: any) {
      toast.error(e?.message || 'The link could not be sent');
    } finally {
      setBusy('');
    }
  };

  const remove = (p: PersonForm) => {
    if (p.verificationId) corporateService.removePerson(p.verificationId, p.verificationKey).catch(() => { /* expires anyway */ });
    update({ people: state.people.filter(x => x.key !== p.key) });
  };

  const next = () => {
    setTried(true);
    const first = Object.values(validatePeople(state, catalog))[0];
    if (first) { toast.error(first); return; }
    onNext();
  };

  return (
    <StepFrame title="Signatories & Directors" subtitle={`Up to ${maxPeople} people, including you — each verifies with their own Fayda ID`}
      onBack={onBack} onNext={next}>
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

      {/* The others */}
      {state.people.map((p, i) => {
        const verified = p.status === 'verified';
        const problem = errors[`people.${i}`] || (p.lost ? 'This person is no longer on the application — remove them and add them again.' : '');
        return (
          <div key={p.key} className={`rounded-2xl border-2 p-4 space-y-3 ${
            verified ? 'border-green-100 bg-green-50/30' : problem ? 'border-red-200 bg-red-50/30' : 'border-amber-100 bg-amber-50/30'}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${verified ? 'bg-green-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                {verified ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-800 break-words">{personName(p, i)}</div>
                <div className={`text-[11px] font-semibold ${verified ? 'text-green-600' : 'text-amber-700'}`}>
                  {verified
                    ? (p.mode === 'with_applicant' ? 'Verified with Fayda here, with you' : 'Verified with Fayda from the link')
                    : p.expired ? 'The link has expired — send it again'
                    : `Link sent to ${p.phone}${p.sentAt ? ` on ${formatDate(p.sentAt)}` : ''} · waiting for them to verify`}
                </div>
              </div>
              <button type="button" onClick={() => remove(p)} title="Remove"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <RoleToggles roles={p.roles} onChange={roles => setPerson(p.key, { roles })} error={errors[`people.${i}.roles`]} />
            {!verified && p.link && !p.lost && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => shareLink(p, org.name)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  {navigator.share ? <Share2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {navigator.share ? 'Share link' : 'Copy link'}
                </button>
                <button type="button" onClick={() => resend(p)} disabled={!!busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  {busy === `resend:${p.key}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send SMS again
                </button>
              </div>
            )}
            {problem && <p className="text-xs text-red-600 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {problem}</p>}
          </div>
        );
      })}

      {/* Add someone: are they here? */}
      {!adding ? (
        canAdd ? (
          <button type="button" onClick={() => setAdding(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-500 hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" /> Add a signatory or director
          </button>
        ) : (
          <p className="text-xs text-gray-400 text-center">An application can have at most {maxPeople} people.</p>
        )
      ) : (
        <div className="rounded-2xl border-2 border-brand/30 p-4 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-gray-800">Add a signatory or director</span>
            <button type="button" onClick={resetAdd} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <Field label="Their role">
            <RoleToggles roles={newRoles} onChange={setNewRoles} />
          </Field>

          {!linkForm ? (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Is this person with you now?</div>
              <button type="button" disabled={!newRoles.length}
                onClick={() => { const roles = newRoles; resetAdd(); onVerifyHere(roles); }}
                className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-brand text-left flex items-start gap-3 transition-all disabled:opacity-50">
                <div className="p-2.5 rounded-xl bg-brand/10 text-brand flex-shrink-0"><Users className="w-5 h-5" /></div>
                <div>
                  <div className="font-bold text-gray-800">Yes, they are with me</div>
                  <div className="text-xs text-gray-500">They verify now on this phone: their Fayda ID, the OTP sent to their phone, and a face check.</div>
                </div>
              </button>
              <button type="button" disabled={!newRoles.length} onClick={() => setLinkForm(true)}
                className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-brand text-left flex items-start gap-3 transition-all disabled:opacity-50">
                <div className="p-2.5 rounded-xl bg-brand/10 text-brand flex-shrink-0"><Smartphone className="w-5 h-5" /></div>
                <div>
                  <div className="font-bold text-gray-800">No, send them a link</div>
                  <div className="text-xs text-gray-500">
                    Wherever they are, they verify on their own phone. You see a tick here when they finish.
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <TextInput label="Their mobile number" required value={linkPhone} onChange={setLinkPhone}
                type="tel" inputMode="tel" maxLength={15} placeholder="09…" hint="The verification link is sent to it by SMS" />
              <TextInput label="Their name" value={linkName} onChange={setLinkName} maxLength={100}
                hint="Optional — for the SMS greeting. The name on the account comes from their Fayda ID." />
              <div className="flex gap-2">
                <button type="button" onClick={() => setLinkForm(false)} disabled={busy === 'send'}
                  className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-50">Back</button>
                <button type="button" onClick={sendLink} disabled={busy === 'send'}
                  className="flex-[2] py-3 text-white font-bold rounded-xl bg-brand shadow-lg shadow-brand-200 hover:bg-brand-dark flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send link
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {errors.signatories && <p className="text-xs text-red-600 ml-1">{errors.signatories}</p>}

      {waiting > 0 && (
        <div className="p-3 rounded-xl bg-blue-50 text-xs text-blue-700 flex gap-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            {waiting === 1 ? 'One person has' : `${waiting} people have`} not verified yet. You can wait here for the tick, or continue —
            the application goes to the bank once everyone has verified. Links work for {inviteValidDays} days.
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
