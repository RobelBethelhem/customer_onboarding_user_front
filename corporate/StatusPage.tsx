import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, RefreshCw, XCircle, Building2, CheckCircle2, Clock, Send, FileText, Users, AlertTriangle, PenLine, Landmark,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import WizardWrapper from '../components/WizardWrapper';
import type { ApplicationView, PublicDocument, PublicPerson, UploadedFile } from './types';
import { corporateService, CorporateApiError } from './api';
import { STATUS_INFO, TONE_CLASSES, roleText, formatDate, entriesOf } from './constants';
import { StepFrame, Section, Row } from './ui';
import FileUpload from './FileUpload';

const REVIEW_BADGE: Record<string, string> = {
  accepted: 'text-green-600', rejected: 'text-red-600', pending: 'text-gray-400', missing: 'text-gray-300',
};
const REVIEW_TEXT: Record<string, string> = { accepted: 'Accepted', rejected: 'Not accepted', pending: 'Received', missing: 'Not uploaded' };

/** The applicant's page for one application (?corporate=ID&key=KEY, link from the SMS) */
const StatusPage: React.FC<{ applicationId: string; accessKey: string; onHome: () => void }> = ({ applicationId, accessKey, onHome }) => {
  const [view, setView] = useState<ApplicationView | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState('');
  // replacement uploads while the application is returned
  const [newDocs, setNewDocs] = useState<Record<string, UploadedFile>>({});
  const [newSigs, setNewSigs] = useState<Record<string, UploadedFile>>({});
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setView(await corporateService.status(applicationId, accessKey));
    } catch (e: any) {
      setError(e?.message || 'The application could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, accessKey]);

  useEffect(() => { load(); }, [load]);

  const resend = async (person: PublicPerson) => {
    setResending(person.id);
    try {
      setView(await corporateService.resend(applicationId, accessKey, person.id));
      toast.success(`A new link was sent to ${person.fullName}`);
    } catch (e: any) {
      toast.error(e?.message || 'The link could not be sent.');
    } finally {
      setResending('');
    }
  };

  const signatureRequired = !!view?.rules?.signatureRequired;
  const needsDoc = (d: PublicDocument) => d.status === 'rejected' || (d.required && d.status === 'missing');
  const needsSig = (p: PublicPerson) => p.roles.includes('signatory')
    && (p.signature?.status === 'rejected' || (signatureRequired && !p.signature));

  const resubmit = async () => {
    if (!view) return;
    const missing = [
      ...view.documents.filter(d => needsDoc(d) && !newDocs[d.docId]).map(d => d.name),
      ...view.people.filter(p => needsSig(p) && !newSigs[p.id]).map(p => `the signature of ${p.fullName}`),
    ];
    if (missing.length) { toast.error(`Please upload ${missing.join(', ')}`); return; }
    setSending(true);
    try {
      const updated = await corporateService.resubmit(
        applicationId, accessKey,
        entriesOf<UploadedFile>(newDocs).map(([docId, f]) => ({ docId, fileId: f.fileId, fileKey: f.fileKey })),
        entriesOf<UploadedFile>(newSigs).map(([personId, f]) => ({ personId, fileId: f.fileId, fileKey: f.fileKey }))
      );
      setView(updated);
      setNewDocs({});
      setNewSigs({});
      toast.success('Sent. Our team will review the new documents.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      const err = e as CorporateApiError;
      toast.error(err.message || 'The documents could not be sent.');
      if (err.fileId) {
        setNewDocs(prev => Object.fromEntries(entriesOf<UploadedFile>(prev).filter(([, f]) => f.fileId !== err.fileId)));
        setNewSigs(prev => Object.fromEntries(entriesOf<UploadedFile>(prev).filter(([, f]) => f.fileId !== err.fileId)));
      }
      if (err.status === 409) load();
    } finally {
      setSending(false);
    }
  };

  let screen: React.ReactNode;
  if (!view) {
    screen = (
      <StepFrame title="Business Account Application" onNext={error ? onHome : undefined} nextLabel="Zemen Bank Home">
        {error ? (
          <div className="flex flex-col items-center text-center py-10 space-y-3">
            <XCircle className="w-12 h-12 text-red-400" />
            <p className="text-sm text-gray-600">{error}</p>
            <button onClick={load} className="flex items-center gap-1.5 text-xs font-bold text-brand underline">
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
        )}
      </StepFrame>
    );
  } else {
    const info = STATUS_INFO[view.status] || { label: view.status, tone: 'gray' as const, text: '' };
    const returned = view.status === 'returned';
    const auth = { applicationId, key: accessKey };
    const maxFileMb = view.rules?.maxFileMb || 5;
    const waiting = view.status === 'awaiting_verification';

    screen = (
      <StepFrame
        title={view.organizationName}
        subtitle={`${view.categoryName} · ${view.applicationId}`}
        badge={
          <button onClick={load} disabled={loading} title="Refresh"
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
        onBack={onHome}
        backLabel="Home"
        onNext={returned ? resubmit : undefined}
        nextLabel={sending ? 'Sending…' : 'Send to the Bank'}
        busy={sending}
      >
        <div className={`p-4 rounded-2xl border ${TONE_CLASSES[info.tone]}`}>
          <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Status</div>
          <div className="text-lg font-black">{info.label}</div>
          <p className="text-sm mt-1">{info.text}</p>
          {view.returnReason && <p className="text-sm mt-2"><b>Our team:</b> {view.returnReason}</p>}
          {view.rejectionReason && <p className="text-sm mt-2"><b>Reason:</b> {view.rejectionReason}</p>}
        </div>

        {view.status === 'approved' && (
          <Section title="Your account" icon={<Landmark className="w-3.5 h-3.5" />}>
            <Row label="Account number" value={view.accountNumber} />
            <Row label="Customer number (CIF)" value={view.cifNumber} />
            <Row label="Branch" value={view.branch} />
          </Section>
        )}

        <Section title="People" icon={<Users className="w-3.5 h-3.5" />}>
          {view.people.map(p => (
            <div key={p.id} className="py-2 border-b border-gray-50 last:border-0 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate">{p.fullName}{p.isApplicant && ' (you)'}</div>
                  <div className="text-xs text-gray-400">{roleText(p.roles)} · {p.phone}</div>
                </div>
                {p.verified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-green-600 flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-600 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" /> Not yet
                  </span>
                )}
              </div>
              {waiting && !p.verified && !p.isApplicant && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                  <span>
                    Link sent {formatDate(p.inviteSentAt)}
                    {p.inviteExpiresAt && (new Date(p.inviteExpiresAt).getTime() < Date.now()
                      ? <span className="text-red-500"> · expired</span>
                      : ` · works until ${formatDate(p.inviteExpiresAt)}`)}
                  </span>
                  <button onClick={() => resend(p)} disabled={!!resending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    {resending === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send the link again
                  </button>
                </div>
              )}
              {p.signature && (
                <div className="text-xs flex items-center gap-1.5">
                  <PenLine className="w-3.5 h-3.5 text-gray-300" />
                  <span className="text-gray-400">Signature:</span>
                  <span className={`font-bold ${REVIEW_BADGE[p.signature.status]}`}>{REVIEW_TEXT[p.signature.status]}</span>
                </div>
              )}
              {returned && needsSig(p) && (
                <FileUpload kind="signature" label={`New signature — ${p.fullName}`} required auth={auth} maxFileMb={maxFileMb}
                  value={newSigs[p.id] || null}
                  note={p.signature?.note && <p className="text-xs text-red-600"><b>Why:</b> {p.signature.note}</p>}
                  onChange={f => setNewSigs(prev => { const n = { ...prev }; if (f) n[p.id] = f; else delete n[p.id]; return n; })} />
              )}
            </div>
          ))}
        </Section>

        <Section title="Documents" icon={<FileText className="w-3.5 h-3.5" />}>
          {view.documents.map(d => (
            <div key={d.docId} className="py-2 border-b border-gray-50 last:border-0 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-700 min-w-0">{d.name}</span>
                <span className={`text-[10px] font-bold uppercase flex-shrink-0 ${REVIEW_BADGE[d.status]}`}>{REVIEW_TEXT[d.status]}</span>
              </div>
              {returned && needsDoc(d) && (
                <FileUpload kind="document" label={`New file — ${d.name}`} required auth={auth} maxFileMb={maxFileMb}
                  value={newDocs[d.docId] || null}
                  note={d.note && <p className="text-xs text-red-600"><b>Why:</b> {d.note}</p>}
                  onChange={f => setNewDocs(prev => { const n = { ...prev }; if (f) n[d.docId] = f; else delete n[d.docId]; return n; })} />
              )}
            </div>
          ))}
        </Section>

        {returned && (
          <div className="p-3 rounded-xl bg-amber-50 text-xs text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Upload the files marked above, then press “Send to the Bank”.
          </div>
        )}

        <div className="text-xs text-gray-400 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> Branch: {view.branch} · Submitted {formatDate(view.submittedAt)}
        </div>
      </StepFrame>
    );
  }

  return (
    <AppShell>
      <WizardWrapper step={0} progress={null}>
        {screen}
      </WizardWrapper>
    </AppShell>
  );
};

export default StatusPage;
