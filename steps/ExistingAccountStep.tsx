import React, { useState } from 'react';
import { UserCheck, UserPlus, Info, CheckCircle2 } from 'lucide-react';
import { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

type IdType = 'account' | 'cif';

// Account number layout: BRN(3) + product(3) + CIF(7) + SEQ(3) — the CIF is digits 7–13
const cifFromAccountNumber = (accountNumber: string) => accountNumber.substring(6, 13);

const ExistingAccountStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const [hasAccount, setHasAccount] = useState<boolean | null>(state.hasExistingAccount ?? null);
  const [idType, setIdType] = useState<IdType>(state.existingCif && !state.existingAccountNumber ? 'cif' : 'account');
  const [value, setValue] = useState(state.existingAccountNumber || state.existingCif || '');
  const [touched, setTouched] = useState(false);

  const requiredLength = idType === 'account' ? 16 : 7;
  const isValid = value.length === requiredLength;
  const cif = !isValid ? '' : idType === 'account' ? cifFromAccountNumber(value) : value;
  const canContinue = hasAccount === false || (hasAccount === true && isValid);

  const switchIdType = (type: IdType) => {
    if (type === idType) return;
    setIdType(type);
    setValue('');
    setTouched(false);
  };

  const handleContinue = () => {
    if (!canContinue) return;
    onUpdate(hasAccount
      ? { hasExistingAccount: true, existingAccountNumber: idType === 'account' ? value : '', existingCif: cif }
      : { hasExistingAccount: false, existingAccountNumber: '', existingCif: '' });
    onNext();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Existing Customer</h2>
        <p className="text-sm text-gray-500">Do you already have an account with Zemen Bank?</p>
      </div>

      <div className="p-6 space-y-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ChoiceCard
            selected={hasAccount === true}
            onClick={() => setHasAccount(true)}
            icon={<UserCheck className="w-6 h-6" />}
            title="Yes, I have an account"
            desc="Open a new account under my existing customer profile"
          />
          <ChoiceCard
            selected={hasAccount === false}
            onClick={() => setHasAccount(false)}
            icon={<UserPlus className="w-6 h-6" />}
            title="No, I'm new"
            desc="Open my first Zemen Bank account"
          />
        </div>

        {hasAccount && (
          <div className="space-y-4">
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <ToggleButton active={idType === 'account'} onClick={() => switchIdType('account')}>Account Number</ToggleButton>
              <ToggleButton active={idType === 'cif'} onClick={() => switchIdType('cif')}>CIF Number</ToggleButton>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="existing-account-id" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                {idType === 'account' ? '16-digit account number' : '7-digit CIF number'} *
              </label>
              <input
                id="existing-account-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={'0'.repeat(requiredLength)}
                value={value}
                onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, requiredLength))}
                onBlur={() => setTouched(true)}
                className="w-full text-center text-xl sm:text-2xl font-mono py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 tracking-widest transition-all"
              />
              {touched && !isValid && (
                <p className="text-red-500 text-xs mt-1 ml-1">
                  {idType === 'account' ? 'Account number must be 16 digits' : 'CIF number must be 7 digits'}
                </p>
              )}
            </div>

            {idType === 'account' && cif && (
              <div className="flex items-center gap-2 p-3 bg-brand-50 border border-brand-100 rounded-xl text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0" />
                <span className="text-gray-600">Your CIF number:</span>
                <span className="font-mono font-bold text-gray-800 tracking-wider">{cif}</span>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Your new account will be opened under your existing customer profile (CIF) — no new customer
                profile is created. We check the CIF against our records and your Fayda ID before opening the account.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all ${canContinue ? 'bg-brand shadow-lg shadow-brand-200 hover:bg-brand-dark' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const ChoiceCard = ({ selected, onClick, icon, title, desc }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`p-4 rounded-2xl border-2 text-left transition-all ${selected ? 'border-brand bg-brand-50' : 'border-gray-100 bg-white hover:border-brand/30'}`}
  >
    <div className={`inline-flex p-3 rounded-xl mb-3 ${selected ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
      {icon}
    </div>
    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
  </button>
);

const ToggleButton = ({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${active ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
  >
    {children}
  </button>
);

export default ExistingAccountStep;
