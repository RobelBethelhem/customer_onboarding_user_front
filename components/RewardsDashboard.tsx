import React, { useState } from 'react';
import { referralService, RewardsResult } from '../services/api';

const RewardsDashboard: React.FC = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rewards, setRewards] = useState<RewardsResult['data'] | null>(null);
  const [convertAmount, setConvertAmount] = useState('');
  const [converting, setConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState('');

  const handleLookup = async () => {
    if (accountNumber.length !== 16) {
      setError('Please enter a valid 16-digit account number');
      return;
    }

    setLoading(true);
    setError('');
    setRewards(null);

    try {
      // Extract customer number from account: BRN(3) + 111(3) + CIF(7) + SEQ(3)
      const customerNumber = accountNumber.substring(6, 13);
      const response = await referralService.getRewards(customerNumber);
      if (response.success && response.data) {
        setRewards(response.data);
      } else {
        setError(response.error || 'Could not fetch rewards');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rewards');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!rewards || !convertAmount) return;
    const points = parseInt(convertAmount);
    if (isNaN(points) || points <= 0) return;

    setConverting(true);
    setConvertSuccess('');

    try {
      const response = await referralService.convertPoints(rewards.customerNumber, points);
      if (response.success && response.data) {
        setConvertSuccess(`Converted ${response.data.pointsRedeemed} points to ${response.data.etbAmount.toFixed(2)} ETB`);
        setConvertAmount('');
        // Refresh rewards
        handleLookup();
      } else {
        setError(response.error || 'Conversion failed');
      }
    } catch (err: any) {
      setError(err.message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">My Rewards</h3>
          <p className="text-white/60 text-xs">View your referral rewards balance</p>
        </div>
      </div>

      {!rewards ? (
        <div className="space-y-3">
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 16);
              setAccountNumber(val);
              setError('');
            }}
            placeholder="Enter your 16-digit account number"
            maxLength={16}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono text-center tracking-wider"
          />

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleLookup}
            disabled={accountNumber.length !== 16 || loading}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              accountNumber.length === 16 && !loading
                ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/25'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : (
              'View My Rewards'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Balance */}
          <div className="text-center p-4 bg-gradient-to-r from-amber-500/20 to-green-500/20 rounded-xl border border-amber-500/20">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Points Balance</p>
            <p className="text-4xl font-black text-white">{rewards.balance.toLocaleString()}</p>
            <p className="text-white/50 text-xs mt-1">
              {rewards.totalEarned} earned | {rewards.totalRedeemed} redeemed
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-lg p-2.5 text-center">
              <p className="text-white font-bold text-lg">{rewards.stats.totalReferrals}</p>
              <p className="text-white/50 text-[10px] uppercase">Total</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 text-center">
              <p className="text-green-400 font-bold text-lg">{rewards.stats.completedReferrals}</p>
              <p className="text-white/50 text-[10px] uppercase">Completed</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2.5 text-center">
              <p className="text-amber-400 font-bold text-lg">{rewards.stats.pendingReferrals}</p>
              <p className="text-white/50 text-[10px] uppercase">Pending</p>
            </div>
          </div>

          {/* Convert Points — ON HOLD (UAT): points → Birr conversion is temporarily disabled.
              The handleConvert handler and conversion state above are kept for easy re-enable. */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white/60 text-xs text-center leading-relaxed">
              Points to Birr conversion is temporarily unavailable. Your points remain safe
              and will be redeemable once this feature is re-enabled.
            </p>
          </div>

          {/* Recent Transactions */}
          {rewards.transactions.length > 0 && (
            <div>
              <p className="text-white/70 text-xs font-medium mb-2">Recent Transactions</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {rewards.transactions.slice(0, 10).map((tx) => (
                  <div key={tx.transactionId} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 truncate">{tx.description}</p>
                      <p className="text-white/40 text-[10px]">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-bold ml-2 ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setRewards(null);
              setAccountNumber('');
              setError('');
              setConvertSuccess('');
            }}
            className="w-full py-2 text-white/50 text-xs hover:text-white/70 transition-colors"
          >
            Check another account
          </button>
        </div>
      )}
    </div>
  );
};

export default RewardsDashboard;
