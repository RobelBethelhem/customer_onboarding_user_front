
import React, { useEffect, useState } from 'react';
import { Star, Info, ChevronDown, Percent, Wallet, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { OnboardingState, AccountType, AccountTier } from '../types';
import { productService, formatRate } from '../services/api';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
  audience?: 'individual' | 'organization'; // business account wizard: products for organizations
  allowedClasses?: string[] | null;          // business: the classes this kind of organization may open (null = all)
}

const AccountTypeStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack, audience, allowedClasses }) => {
  // Products come from the bank's catalog (dashboard → Account Products), in the order KYC set
  const [products, setProducts] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await productService.list(audience ?? 'individual', allowedClasses ?? null);
      setProducts(list);
      // Drop a choice that is no longer offered (turned off, or saved from an older version of the form)
      const acc = list.find(a => a.id === state.selectedAccountType?.id);
      const tier = acc?.tiers.find(t => t.id === state.selectedTier?.id);
      if (state.selectedAccountType && (!acc || !tier)) {
        onUpdate({ selectedAccountType: null, selectedTier: null });
      } else if (acc && tier) {
        onUpdate({ selectedAccountType: acc, selectedTier: tier }); // pick up changed rates
      }
    } catch {
      setLoadError('We could not load the account types. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const acc = products.find(a => a.id === e.target.value) || null;
    onUpdate({ selectedAccountType: acc, selectedTier: acc ? acc.tiers[0] : null });
  };

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const acc = state.selectedAccountType;
    const tier = acc?.tiers.find(t => t.id === e.target.value) || null;
    onUpdate({ selectedTier: tier });
  };

  const selectedAccount = state.selectedAccountType;
  const selectedTier = state.selectedTier;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Account Type</h2>
        <p className="text-sm text-gray-500">Choose the account that suits your needs</p>
      </div>

      <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading account types…
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

        {!loading && !loadError && products.length === 0 && (
          <div className="p-4 rounded-xl bg-gray-50 text-sm text-gray-600">
            {allowedClasses
              ? 'No account type is offered online for this type of organization yet. Please visit a Zemen Bank branch.'
              : 'No account types are available right now. Please try again later or visit a Zemen Bank branch.'}
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            {/* Product dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product *</label>
              <div className="relative">
                <select
                  value={selectedAccount?.id || ''}
                  onChange={handleAccountChange}
                  className={`w-full px-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/10 font-semibold transition-all appearance-none ${selectedAccount ? 'text-gray-800' : 'text-gray-400'}`}
                >
                  <option value="" disabled>Select an account product</option>
                  {products.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Product summary */}
            {selectedAccount && (
              <div className="p-4 rounded-xl border-2 border-brand/20 bg-brand-50/30 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-brand text-white shadow-md flex-shrink-0">
                    <Star className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{selectedAccount.name}</h3>
                    {selectedAccount.description && <p className="text-xs text-gray-500 mt-0.5">{selectedAccount.description}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight bg-green-50 text-green-600 px-2 py-1 rounded">
                    <Percent className="w-3 h-3" /> {selectedAccount.interestRange}
                  </span>
                  {selectedAccount.minDeposit > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      <Wallet className="w-3 h-3" /> Min. Balance {selectedAccount.minDeposit.toLocaleString()} ETB
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Account class dropdown */}
            {selectedAccount && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Account Class *</label>
                <div className="relative">
                  <select
                    value={selectedTier?.id || ''}
                    onChange={handleTierChange}
                    className={`w-full px-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/10 font-semibold transition-all appearance-none ${selectedTier ? 'text-gray-800' : 'text-gray-400'}`}
                  >
                    <option value="" disabled>Select an account class</option>
                    {selectedAccount.tiers.map((tier: AccountTier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} ({formatRate(tier.interestRate, selectedAccount.isIFB)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {selectedTier && (
                  <div className="ml-1 text-xs text-gray-500 space-y-0.5">
                    <p>Balance: <span className="font-semibold text-gray-700">{selectedTier.range}</span></p>
                    {selectedTier.remarks && selectedTier.remarks !== selectedTier.range && <p>{selectedTier.remarks}</p>}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="p-4 bg-gray-50 rounded-xl flex items-start gap-3 mt-2">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="text-xs text-gray-500 leading-relaxed">
            Interest rates are determined by the account product and class you select. Digital accounts are operated
            through approved digital banking channels and may be upgraded to full branch-operable accounts after
            physical verification at your selected home branch.
          </div>
        </div>
      </div>

      {selectedAccount && selectedTier && (
        <div className="px-6 py-3 bg-brand-50/50 border-y border-brand-100 flex justify-between items-center gap-3">
          <div className="text-xs min-w-0">
            <span className="text-gray-500">Selected: </span>
            <span className="font-bold text-gray-800">{selectedTier.name}</span>
          </div>
          <div className="text-xs font-bold text-brand whitespace-nowrap">
            {selectedTier.interestRate === null ? formatRate(null, selectedAccount.isIFB) : `${formatRate(selectedTier.interestRate)} p.a.`}
          </div>
        </div>
      )}

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button
          disabled={!selectedTier}
          onClick={onNext}
          className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all ${selectedTier ? 'bg-brand shadow-lg shadow-brand-200' : 'bg-gray-300 cursor-not-allowed'}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default AccountTypeStep;
