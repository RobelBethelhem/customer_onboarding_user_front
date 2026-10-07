import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

/** Screen of the business wizard: title, scrolling body, Back / Continue */
export const StepFrame: React.FC<{
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  backLabel?: string;
}> = ({ title, subtitle, badge, children, onBack, onNext, nextLabel = 'Continue', nextDisabled, busy, backLabel = 'Back' }) => (
  <div className="flex flex-col h-full">
    <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {badge}
    </div>
    <div className="p-5 sm:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-5">{children}</div>
    {(onBack || onNext) && (
      <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 sm:gap-4">
        {onBack && (
          <button onClick={onBack} disabled={busy}
            className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
            {backLabel}
          </button>
        )}
        {onNext && (
          <button onClick={onNext} disabled={nextDisabled || busy}
            className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              nextDisabled || busy ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand shadow-lg shadow-brand-200 hover:bg-brand-dark'}`}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {nextLabel}
          </button>
        )}
      </div>
    )}
  </div>
);

export const inputClass = (error?: string) =>
  `w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/10 font-semibold text-gray-800 transition-all placeholder:text-gray-300 placeholder:font-normal ${
    error ? 'border-red-300 bg-red-50/40' : 'border-gray-100'}`;

export const Field: React.FC<{ label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; className?: string }> =
  ({ label, required, error, hint, children, className = '' }) => (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
        {label}{required && ' *'}
      </label>
      {children}
      {error ? <p className="text-xs text-red-600 ml-1">{error}</p> : hint ? <p className="text-xs text-gray-400 ml-1">{hint}</p> : null}
    </div>
  );

export const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  className?: string;
  autoComplete?: string;
}> = ({ label, value, onChange, required, error, hint, type = 'text', placeholder, inputMode, maxLength, className, autoComplete }) => (
  <Field label={label} required={required} error={error} hint={hint} className={className}>
    <input type={type} value={value} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength}
      autoComplete={autoComplete} onChange={e => onChange(e.target.value)} className={inputClass(error)} />
  </Field>
);

export const SelectInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  className?: string;
}> = ({ label, value, onChange, options, required, error, className }) => (
  <Field label={label} required={required} error={error} className={className}>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`${inputClass(error)} pr-10 appearance-none ${value ? '' : 'text-gray-400'}`}>
        {options.map(o => <option key={o.value} value={o.value} disabled={!o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  </Field>
);

/** Small titled box used on review and status screens */
export const Section: React.FC<{ title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }> =
  ({ title, icon, action, children }) => (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">{icon}{title}</h3>
        {action}
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );

export const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) =>
  value ? (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="font-semibold text-gray-800 text-right break-words min-w-0">{value}</span>
    </div>
  ) : null;

export const toDataUri = (photo: string | undefined | null): string => {
  if (!photo) return '';
  if (photo.startsWith('data:image')) return photo;
  const mime = photo.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${photo}`;
};
