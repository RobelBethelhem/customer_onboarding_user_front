import React, { useState } from 'react';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import type { CorporateCatalog, CorporateState } from '../types';
import { documentsFor } from '../types';
import { validateDocuments } from '../validation';
import { StepFrame } from '../ui';
import FileUpload from '../FileUpload';

interface Props {
  state: CorporateState;
  catalog: CorporateCatalog;
  update: (u: Partial<CorporateState>) => void;
  onNext: () => void;
  onBack: () => void;
}

/** The documents KYC asks for this type of organization, and each signatory's specimen signature */
const DocumentsStep: React.FC<Props> = ({ state, catalog, update, onNext, onBack }) => {
  const [tried, setTried] = useState(false);
  const errors = tried ? validateDocuments(state, catalog) : {};
  const category = catalog.categories.find(c => c.id === state.organization.categoryId);
  const docs = documentsFor(category, state.organization.subtypeId);
  const { maxFileMb, signatureRequired } = catalog.rules;
  const auth = { ekycToken: state.identity.ekycToken || '' };
  const signatories = state.people.map((p, i) => ({ p, i })).filter(({ p }) => p.roles.includes('signatory'));

  const next = () => {
    setTried(true);
    const first = Object.values(validateDocuments(state, catalog))[0];
    if (first) { toast.error('Please upload all required documents and signatures'); return; }
    onNext();
  };

  return (
    <StepFrame title="Documents" subtitle={`${category?.name || 'Organization'} — scans or clear photos`} onBack={onBack} onNext={next}>
      <div className="space-y-3">
        {docs.map(d => (
          <FileUpload key={d.id} kind="document" label={d.name} description={d.description} required={d.required}
            value={state.documents[d.id] || null} auth={auth} maxFileMb={maxFileMb} error={errors[`doc.${d.id}`]}
            onChange={file => {
              const documents = { ...state.documents };
              if (file) documents[d.id] = file; else delete documents[d.id];
              update({ documents });
            }} />
        ))}
      </div>

      {(state.applicant.roles.includes('signatory') || signatories.length > 0) && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-700">Specimen signatures</h3>
            <p className="text-xs text-gray-500">
              Each signatory signs on white paper; take a clear photo of the signature.
              {!signatureRequired && ' Optional — they can also sign at the branch.'}
            </p>
          </div>
          {state.applicant.roles.includes('signatory') && (
            <FileUpload kind="signature" label={`${state.identity.faydaData?.fullName.eng || 'Your'} (you)`}
              required={signatureRequired} value={state.applicant.signature} auth={auth} maxFileMb={maxFileMb}
              error={errors['sig.applicant']}
              onChange={signature => update({ applicant: { ...state.applicant, signature } })} />
          )}
          {signatories.map(({ p, i }) => (
            <FileUpload key={p.key} kind="signature" label={p.fullName || `Person ${i + 2}`}
              required={signatureRequired} value={p.signature} auth={auth} maxFileMb={maxFileMb} error={errors[`sig.${i}`]}
              onChange={signature => update({ people: state.people.map((x, j) => (j === i ? { ...x, signature } : x)) })} />
          ))}
        </div>
      )}

      <div className="p-4 bg-gray-50 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500 leading-relaxed">
          Our KYC team checks every document and may ask to see the originals at the branch.
        </p>
      </div>
    </StepFrame>
  );
};

export default DocumentsStep;
