import React, { useState } from 'react';
import { Building2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CorporateCatalog, CorporateState } from '../types';
import { documentsFor } from '../types';
import { StepFrame } from '../ui';
import { entriesOf } from '../constants';

interface Props {
  state: CorporateState;
  catalog: CorporateCatalog;
  update: (u: Partial<CorporateState>) => void;
  onNext: () => void;
  onBack: () => void;
}

/** Type of organization (and sub-type): decides which documents are needed */
const CategoryStep: React.FC<Props> = ({ state, catalog, update, onNext, onBack }) => {
  const org = state.organization;
  const category = catalog.categories.find(c => c.id === org.categoryId);
  const [tried, setTried] = useState(false);

  const choose = (categoryId: string, subtypeId: string) => {
    const next = catalog.categories.find(c => c.id === categoryId);
    // keep only the uploads the new type still asks for
    const ids = new Set(documentsFor(next, subtypeId).map(d => d.id));
    const documents = Object.fromEntries(entriesOf(state.documents).filter(([id]) => ids.has(id)));
    update({ organization: { ...org, categoryId, subtypeId }, documents });
  };

  const needsSubtype = !!category && category.subtypes.length > 0;
  const missing = !category ? 'Choose the type of your organization'
    : needsSubtype && !category.subtypes.some(s => s.id === org.subtypeId) ? `Choose which kind of ${category.name} it is` : '';

  const next = () => {
    setTried(true);
    if (missing) { toast.error(missing); return; }
    onNext();
  };

  return (
    <StepFrame title="Type of Organization" subtitle="The documents you upload depend on it" onBack={onBack} onNext={next}>
      <div className="space-y-3">
        {catalog.categories.map(c => {
          const selected = c.id === org.categoryId;
          return (
            <div key={c.id} className={`rounded-2xl border-2 transition-all ${selected ? 'border-brand bg-brand-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
              <button type="button" onClick={() => !selected && choose(c.id, c.subtypes.length === 1 ? c.subtypes[0].id : '')}
                className="w-full p-4 flex items-start gap-3 text-left">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${selected ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800">{c.name}</div>
                  {c.description && <div className="text-xs text-gray-500 mt-0.5">{c.description}</div>}
                </div>
                {selected && <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0" />}
              </button>
              {selected && c.subtypes.length > 0 && (
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {c.subtypes.map(s => (
                    <button key={s.id} type="button" onClick={() => choose(c.id, s.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        org.subtypeId === s.id ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {tried && missing && <p className="text-xs text-red-600 ml-1">{missing}</p>}

      {category && (!needsSubtype || org.subtypeId) && (
        <div className="p-4 rounded-xl bg-gray-50 space-y-1.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">You will upload</div>
          {documentsFor(category, org.subtypeId).map(d => (
            <div key={d.id} className="text-xs text-gray-600">
              • {d.name}{!d.required && <span className="text-gray-400"> (if available)</span>}
            </div>
          ))}
        </div>
      )}
    </StepFrame>
  );
};

export default CategoryStep;
