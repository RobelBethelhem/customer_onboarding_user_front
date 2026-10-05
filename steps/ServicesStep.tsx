import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone, Globe, CreditCard, Wallet, MessageSquare, Bell, Send, ShieldCheck, PiggyBank, Star,
  Check, ChevronDown, Info, Loader2, AlertTriangle, RefreshCw, FileText, X,
} from 'lucide-react';
import { OnboardingState, AdditionalService } from '../types';
import { additionalServicesService } from '../services/api';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Icon keys set by KYC on the dashboard (lib/serviceIcons.ts there)
const ICONS: Record<string, React.ElementType> = {
  smartphone: Smartphone, globe: Globe, card: CreditCard, wallet: Wallet, message: MessageSquare,
  bell: Bell, send: Send, shield: ShieldCheck, piggy: PiggyBank, star: Star,
};

type Acceptance = { id: string; version: number; acceptedAt: string };

const ServicesStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  // Services come from the bank's catalog (dashboard → Products & Services), in the order KYC set
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<string[]>(state.requestedServices || []);
  const [accepted, setAccepted] = useState<Acceptance[]>(state.serviceTermsAccepted || []);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [termsFor, setTermsFor] = useState<AdditionalService | null>(null);
  const [termsQueue, setTermsQueue] = useState<AdditionalService[]>([]);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await additionalServicesService.list();
      setServices(list);
      // Forget choices no longer offered, and acceptances of terms that have changed since
      setSelected(prev => prev.filter(id => list.some(s => s.id === id)));
      setAccepted(prev => prev.filter(a => list.some(s => s.id === a.id && s.termsText && s.termsVersion === a.version)));
    } catch {
      setLoadError('We could not load the services. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const hasTerms = (s: AdditionalService) => !!s.termsText;
  const isAccepted = (s: AdditionalService) => !hasTerms(s) || accepted.some(a => a.id === s.id && a.version === s.termsVersion);

  const accept = (s: AdditionalService) => {
    setAccepted(prev => [...prev.filter(a => a.id !== s.id), { id: s.id, version: s.termsVersion || 0, acceptedAt: new Date().toISOString() }]);
    setSelected(prev => (prev.includes(s.id) ? prev : [...prev, s.id]));
    // next service in a "Select all" whose terms still need accepting
    const [next, ...rest] = termsQueue;
    setTermsFor(next || null);
    setTermsQueue(rest);
  };

  const closeTerms = () => {
    setTermsFor(null);
    setTermsQueue([]);
  };

  const toggle = (s: AdditionalService) => {
    if (selected.includes(s.id)) {
      setSelected(prev => prev.filter(id => id !== s.id));
    } else if (!isAccepted(s)) {
      setTermsFor(s); // choosing it means accepting its terms first
    } else {
      setSelected(prev => [...prev, s.id]);
    }
  };

  const allSelected = services.length > 0 && services.every(s => selected.includes(s.id));
  const selectAll = () => {
    if (allSelected) {
      setSelected([]);
      return;
    }
    setSelected(prev => [...prev, ...services.filter(s => isAccepted(s) && !prev.includes(s.id)).map(s => s.id)]);
    const pending = services.filter(s => !isAccepted(s) && !selected.includes(s.id));
    if (pending.length) {
      setTermsFor(pending[0]);
      setTermsQueue(pending.slice(1));
    }
  };

  const handleContinue = () => {
    // Keep the catalogue order so the review screen and dashboard list them consistently
    const chosen = services.filter(s => selected.includes(s.id));
    onUpdate({
      requestedServices: chosen.map(s => s.id),
      selectedServices: chosen.map(s => ({ id: s.id, name: s.name, icon: s.icon })),
      serviceTermsAccepted: accepted.filter(a => chosen.some(s => s.id === a.id && hasTerms(s))),
    });
    onNext();
  };

  const chosenCount = services.filter(s => selected.includes(s.id)).length;

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Additional Services</h2>
        <p className="text-sm text-gray-500">Would you like any of these with your new account? Choose any, all, or none.</p>
      </div>

      <div className="p-4 sm:p-6 space-y-3 flex-1">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading services…
          </div>
        )}

        {!loading && loadError && (
          <div className="p-4 rounded-xl border border-red-100 bg-red-50 text-sm text-red-700 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg font-semibold hover:bg-red-100">
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        )}

        {!loading && !loadError && services.length === 0 && (
          <div className="p-4 rounded-xl bg-gray-50 text-sm text-gray-600">
            No additional services are offered right now. You can continue.
          </div>
        )}

        {!loading && services.length > 0 && (
          <div className="flex justify-end">
            <button type="button" onClick={selectAll} className="text-sm font-bold text-brand hover:underline py-1">
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
        )}

        {!loading && services.map(service => {
          const isSelected = selected.includes(service.id);
          const isOpen = expanded === service.id;
          const Icon = ICONS[service.icon] || Star;
          return (
            <div key={service.id}
              className={`rounded-2xl border-2 transition-all ${isSelected ? 'border-brand bg-brand-50' : 'border-gray-100 bg-white'}`}>
              <button type="button" onClick={() => toggle(service)} aria-pressed={isSelected}
                className="w-full flex items-center gap-4 p-4 text-left">
                <div className={`p-3 rounded-xl flex-shrink-0 ${isSelected ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800">{service.name}</h3>
                  {service.summary && <p className="text-xs text-gray-500 mt-0.5">{service.summary}</p>}
                </div>
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand border-brand' : 'border-gray-300'}`}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </button>

              <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                {service.details.length > 0 && (
                  <button type="button" onClick={() => setExpanded(isOpen ? null : service.id)} aria-expanded={isOpen}
                    className="flex items-center gap-1 text-xs font-bold text-brand py-1">
                    What does this mean?
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {hasTerms(service) && (
                  <button type="button" onClick={() => setTermsFor(service)} className="flex items-center gap-1 text-xs font-bold text-gray-600 py-1">
                    <FileText className="w-3.5 h-3.5" />
                    {isAccepted(service) ? <span className="text-green-700">Terms accepted</span> : 'Terms and conditions'}
                  </button>
                )}
              </div>
              {isOpen && (
                <ul className="px-4 pb-4 space-y-1.5 text-sm text-gray-600">
                  {service.details.map(line => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {!loading && services.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              These are set up by your branch after your account is opened. We will send you an SMS once each service is ready.
            </p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button onClick={handleContinue} disabled={loading}
          className="flex-[2] py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-dark transition-all disabled:opacity-50">
          {chosenCount ? `Continue (${chosenCount} selected)` : 'Skip'}
        </button>
      </div>

      {/* Terms and conditions — accepting them chooses the service. Rendered at the app root: the
          wizard card is transformed, which would pin a "fixed" sheet to the card instead of the screen. */}
      {termsFor && createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={closeTerms}>
          <div className="bg-white w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="terms-title">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
              <div className="min-w-0">
                <h3 id="terms-title" className="text-lg font-bold text-gray-800">{termsFor.termsTitle || `${termsFor.name} Terms and Conditions`}</h3>
                <p className="text-xs text-gray-400">Version {termsFor.termsVersion}</p>
              </div>
              <button onClick={closeTerms} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{termsFor.termsText}</div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeTerms} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100">
                Close
              </button>
              {isAccepted(termsFor) && selected.includes(termsFor.id) ? (
                <button onClick={closeTerms} className="flex-[2] py-3 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Accepted
                </button>
              ) : (
                <button onClick={() => accept(termsFor)} className="flex-[2] py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-dark">
                  I accept — add {termsFor.name}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.getElementById('app-root') || document.body
      )}
    </div>
  );
};

export default ServicesStep;
