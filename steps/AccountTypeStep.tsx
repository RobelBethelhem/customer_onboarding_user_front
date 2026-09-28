
import React from 'react';
import { Star, Briefcase, Baby, GraduationCap, Info, ChevronDown, Percent, Wallet } from 'lucide-react';
import { OnboardingState, AccountType, AccountTier } from '../types';
import { ACCOUNT_TYPES } from '../constants';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const AccountTypeStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'star': return <Star className="w-6 h-6" />;
      case 'briefcase': return <Briefcase className="w-6 h-6" />;
      case 'child': return <Baby className="w-6 h-6" />;
      case 'graduation': return <GraduationCap className="w-6 h-6" />;
      default: return <Star className="w-6 h-6" />;
    }
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const acc = ACCOUNT_TYPES.find(a => a.id === e.target.value) || null;
    onUpdate({ selectedAccountType: acc, selectedTier: acc ? acc.tiers[0] : null });
  };

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const acc = state.selectedAccountType;
    const tier = acc?.tiers.find(t => t.id === e.target.value) || null;
    onUpdate({ selectedTier: tier });
  };

  const selectedAccount = state.selectedAccountType;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Account Type</h2>
        <p className="text-sm text-gray-500">Choose the best saving plan for your needs</p>
      </div>

      <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        {/* Account type dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product *</label>
          <div className="relative">
            <select
              value={selectedAccount?.id || ''}
              onChange={handleAccountChange}
              className={`w-full px-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/10 font-semibold transition-all appearance-none ${selectedAccount ? 'text-gray-800' : 'text-gray-400'}`}
            >
              <option value="" disabled>Select an account product</option>
              {ACCOUNT_TYPES.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Simplified product description */}
        {selectedAccount && (
          <div className="p-4 rounded-xl border-2 border-brand/20 bg-brand-50/30 space-y-3">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-brand text-white shadow-md flex-shrink-0">
                {getIcon(selectedAccount.icon)}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{selectedAccount.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedAccount.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight bg-green-50 text-green-600 px-2 py-1 rounded">
                <Percent className="w-3 h-3" /> {selectedAccount.interestRange}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight bg-gray-100 text-gray-600 px-2 py-1 rounded">
                <Wallet className="w-3 h-3" /> Min. Deposit {selectedAccount.minDeposit.toLocaleString()} ETB
              </span>
            </div>
          </div>
        )}

        {/* Interest tier dropdown */}
        {selectedAccount && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Interest Tier *</label>
            <div className="relative">
              <select
                value={state.selectedTier?.id || ''}
                onChange={handleTierChange}
                className={`w-full px-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/10 font-semibold transition-all appearance-none ${state.selectedTier ? 'text-gray-800' : 'text-gray-400'}`}
              >
                <option value="" disabled>Select an interest tier</option>
                {selectedAccount.tiers.map((tier: AccountTier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} — {tier.range} ({tier.interestRate.toFixed(2)}%)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-xl flex items-start gap-3 mt-2">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="text-xs text-gray-500 leading-relaxed">
            Interest rates are determined by the account product and tier you select. Digital accounts are operated
            through approved digital banking channels and may be upgraded to full branch-operable accounts after
            physical verification at your selected home branch.
          </div>
        </div>
      </div>

      {selectedAccount && (
        <div className="px-6 py-3 bg-brand-50/50 border-y border-brand-100 flex justify-between items-center">
          <div className="text-xs">
            <span className="text-gray-500">Selected: </span>
            <span className="font-bold text-gray-800">{selectedAccount.name}</span>
          </div>
          <div className="text-xs font-bold text-brand">
            {state.selectedTier?.interestRate.toFixed(2)}% APR
          </div>
        </div>
      )}

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button
          disabled={!state.selectedTier}
          onClick={onNext}
          className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all ${state.selectedTier ? 'bg-brand shadow-lg shadow-brand-200' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default AccountTypeStep;
