
import React, { useEffect, useState } from 'react';
import { Globe, Briefcase, IdCard, AlertCircle } from 'lucide-react';
import { OnboardingState, ForeignDocumentsState } from '../types';
import FileUpload from '../corporate/FileUpload';
import { corporateService } from '../corporate/api';
import { FOREIGN_DOCUMENT_LABELS, foreignDocumentsComplete } from '../utils/nationality';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PERMITS: { id: ForeignDocumentsState['permitType']; title: string; text: string; icon: React.ElementType }[] = [
  { id: 'work_permit', title: 'Work permit', text: 'Issued to you for working in Ethiopia', icon: Briefcase },
  { id: 'origin_id', title: 'Origin ID', text: 'For foreign nationals of Ethiopian origin', icon: IdCard },
];

/**
 * Foreign nationals only (Fayda nationality other than Ethiopia): the passport, and a work permit or
 * an Origin ID — whichever they have. Each file is uploaded to the bank as soon as it is chosen;
 * the application then sends their ids, and KYC reviews them.
 */
const DocumentUploadStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const docs = state.foreignDocuments;
  const [maxFileMb, setMaxFileMb] = useState(5);
  const [tried, setTried] = useState(false);

  // The bank's upload limit (same as for business documents)
  useEffect(() => {
    corporateService.catalog().then(c => c?.rules?.maxFileMb && setMaxFileMb(c.rules.maxFileMb)).catch(() => {});
  }, []);

  const set = (patch: Partial<ForeignDocumentsState>) => onUpdate({ foreignDocuments: { ...docs, ...patch } });
  const auth = { ekycToken: state.ekycToken || '' };
  const permit = PERMITS.find(p => p.id === docs.permitType)!;
  const complete = foreignDocumentsComplete(docs);

  const handleContinue = () => {
    setTried(true);
    if (complete) onNext();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Passport &amp; Permit</h2>
        <p className="text-sm text-gray-500">
          Your Fayda record shows your nationality as <span className="font-semibold text-gray-700">{state.faydaData?.nationality}</span>.
          Please upload your passport and either your work permit or your Origin ID.
        </p>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-5">
        <FileUpload
          kind="document"
          label={FOREIGN_DOCUMENT_LABELS.passport}
          description="The page with your photo and passport details"
          required
          value={docs.passport}
          onChange={file => set({ passport: file })}
          auth={auth}
          maxFileMb={maxFileMb}
          error={tried && !docs.passport ? 'Your passport is required.' : undefined}
        />

        <div>
          <p className="text-sm font-bold text-gray-800 mb-2">Which document will you give? <span className="text-brand">*</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERMITS.map(p => {
              const active = docs.permitType === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set({ permitType: p.id })}
                  className={`flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-colors ${
                    active ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className={`p-2 rounded-xl ${active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <p.icon className="w-4 h-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-gray-800">{p.title}</span>
                    <span className="block text-xs text-gray-500">{p.text}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <FileUpload
          key={permit.id}
          kind="document"
          label={permit.title}
          description={permit.id === 'origin_id' ? 'Both sides of your Origin ID card' : 'Your valid work permit'}
          required
          value={permit.id === 'origin_id' ? docs.originId : docs.workPermit}
          onChange={file => set(permit.id === 'origin_id' ? { originId: file } : { workPermit: file })}
          auth={auth}
          maxFileMb={maxFileMb}
          error={tried && !(permit.id === 'origin_id' ? docs.originId : docs.workPermit) ? (permit.id === 'origin_id' ? 'Your Origin ID is required.' : 'Your work permit is required.') : undefined}
        />

        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
          <Globe className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Our KYC team checks these documents before your account is opened.
        </div>

        {!state.ekycToken && (
          <p className="text-xs text-red-600 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Please verify with your Fayda ID again before uploading.
          </p>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button
          onClick={handleContinue}
          className={`flex-[2] py-3 font-bold rounded-xl transition-all ${
            complete ? 'bg-brand text-white shadow-lg shadow-brand-200 hover:bg-brand-dark' : 'bg-gray-200 text-gray-500'}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default DocumentUploadStep;
