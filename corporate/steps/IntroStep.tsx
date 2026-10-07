import React, { useState } from 'react';
import { Briefcase, ShieldCheck, Building2, Users, FileCheck2, Loader2, AlertTriangle, RefreshCw, ChevronDown, ExternalLink, Clock } from 'lucide-react';
import type { CorporateCatalog } from '../types';
import { listSavedApplications, statusPageUrl } from '../api';
import { formatDate } from '../constants';
import { StepFrame } from '../ui';

interface Props {
  catalog: CorporateCatalog | null;
  catalogError: string;
  onRetry: () => void;
  onStart: () => void;
  onExit: () => void;
}

const HOW_IT_WORKS = [
  { icon: <ShieldCheck className="w-5 h-5" />, title: 'Verify yourself', text: 'With your Fayda ID (OTP) and a short live face check.' },
  { icon: <Building2 className="w-5 h-5" />, title: 'The organization', text: 'Its details, address, branch and the account you want.' },
  { icon: <Users className="w-5 h-5" />, title: 'Signatories and directors', text: 'Each gets an SMS link and verifies with their own Fayda ID.' },
  { icon: <FileCheck2 className="w-5 h-5" />, title: 'Documents and review', text: 'Upload the documents; our team reviews and opens the account.' },
];

/** First screen of the business account wizard: how it works, what to prepare */
const IntroStep: React.FC<Props> = ({ catalog, catalogError, onRetry, onStart, onExit }) => {
  const [open, setOpen] = useState<string | null>(null);
  const saved = listSavedApplications();

  return (
    <StepFrame
      title="Open a Business Account"
      subtitle="For companies, associations, NGOs, government offices and other organizations"
      badge={<div className="p-2.5 rounded-xl bg-brand text-white shadow-md flex-shrink-0"><Briefcase className="w-5 h-5" /></div>}
      onBack={onExit}
      backLabel="Home"
      onNext={onStart}
      nextLabel="Start"
      nextDisabled={!catalog}
    >
      <p className="text-sm text-gray-600 leading-relaxed">
        Apply as the representative of the organization. You will need your Fayda ID and the phone registered with it,
        the organization's documents (scans or clear photos), and the names and mobile numbers of the signatories and directors.
      </p>

      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HOW_IT_WORKS.map((s, i) => (
          <li key={s.title} className="p-4 rounded-2xl bg-gray-50 flex gap-3">
            <div className="p-2 h-fit rounded-xl bg-brand/10 text-brand">{s.icon}</div>
            <div>
              <div className="text-sm font-bold text-gray-800">{i + 1}. {s.title}</div>
              <div className="text-xs text-gray-500">{s.text}</div>
            </div>
          </li>
        ))}
      </ol>

      {/* Documents per type of organization (set by the bank's KYC team) */}
      {catalogError ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            {catalogError}
            <button onClick={onRetry} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-700 underline">
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        </div>
      ) : !catalog ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Documents you will need</h3>
          {catalog.categories.map(c => (
            <div key={c.id} className="rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => setOpen(open === c.id ? null : c.id)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50">
                <span className="text-sm font-bold text-gray-700">{c.name}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open === c.id ? 'rotate-180' : ''}`} />
              </button>
              {open === c.id && (
                <ul className="px-4 pb-3 space-y-1.5">
                  {c.description && <li className="text-xs text-gray-500 pb-1">{c.description}</li>}
                  {c.documents.map(d => (
                    <li key={d.id} className="text-xs text-gray-600 flex gap-2">
                      <span className={d.required ? 'text-brand' : 'text-gray-300'}>•</span>
                      <span>
                        {d.name}
                        {!d.required && <span className="text-gray-400"> (if available)</span>}
                        {d.subtypes.length > 0 && (
                          <span className="text-gray-400"> — {c.subtypes.filter(s => d.subtypes.includes(s.id)).map(s => s.name).join(', ')}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 ml-1">
            Up to {catalog.rules.maxPeople} people per application, including you.
            {catalog.rules.signatureRequired && ' Each signatory also uploads a photo of their specimen signature.'}
          </p>
        </div>
      )}

      {saved.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Applications sent from this device</h3>
          {saved.map(a => (
            <a key={a.applicationId} href={statusPageUrl(a.applicationId, a.accessKey)}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">{a.organizationName}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {a.applicationId} · {formatDate(a.submittedAt)}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </StepFrame>
  );
};

export default IntroStep;
