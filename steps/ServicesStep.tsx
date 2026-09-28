import React, { useState } from 'react';
import { Smartphone, Globe, CreditCard, Check, ChevronDown, Info } from 'lucide-react';
import { OnboardingState } from '../types';
import { ADDITIONAL_SERVICES } from '../constants';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ICONS: Record<string, React.ReactNode> = {
  mobile_banking: <Smartphone className="w-6 h-6" />,
  internet_banking: <Globe className="w-6 h-6" />,
  debit_card: <CreditCard className="w-6 h-6" />,
};

const ServicesStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const [selected, setSelected] = useState<string[]>(state.requestedServices || []);
  const [expanded, setExpanded] = useState<string | null>(null);

  const allSelected = selected.length === ADDITIONAL_SERVICES.length;

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleContinue = () => {
    // Keep the catalogue order so the review screen and dashboard list them consistently
    onUpdate({ requestedServices: ADDITIONAL_SERVICES.map(s => s.id).filter(id => selected.includes(id)) });
    onNext();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Additional Services</h2>
        <p className="text-sm text-gray-500">Would you like any of these with your new account? Choose any, all, or none.</p>
      </div>

      <div className="p-4 sm:p-6 space-y-3 flex-1">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSelected(allSelected ? [] : ADDITIONAL_SERVICES.map(s => s.id))}
            className="text-sm font-bold text-brand hover:underline py-1"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {ADDITIONAL_SERVICES.map(service => {
          const isSelected = selected.includes(service.id);
          const isOpen = expanded === service.id;
          return (
            <div
              key={service.id}
              className={`rounded-2xl border-2 transition-all ${isSelected ? 'border-brand bg-brand-50' : 'border-gray-100 bg-white'}`}
            >
              <button
                type="button"
                onClick={() => toggle(service.id)}
                aria-pressed={isSelected}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div className={`p-3 rounded-xl flex-shrink-0 ${isSelected ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {ICONS[service.id]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800">{service.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{service.summary}</p>
                </div>
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand border-brand' : 'border-gray-300'}`}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </button>

              <div className="px-4 pb-3 -mt-1">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : service.id)}
                  aria-expanded={isOpen}
                  className="flex items-center gap-1 text-xs font-bold text-brand py-1"
                >
                  What does this mean?
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <ul className="mt-2 mb-1 space-y-1.5 text-sm text-gray-600">
                    {service.details.map(line => (
                      <li key={line} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            These are set up by your branch after your account is opened. We will send you an SMS once each service is ready.
          </p>
        </div>
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-[2] py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-dark transition-all"
        >
          {selected.length ? `Continue (${selected.length} selected)` : 'Skip'}
        </button>
      </div>
    </div>
  );
};

export default ServicesStep;
