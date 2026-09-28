import React, { useState } from 'react';
import { referralService } from '../services/api';

const ReferralLinkGenerator: React.FC = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    referralCode: string;
    referralLink: string;
    fullName: string;
    totalReferrals: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    if (accountNumber.length !== 16) {
      setError('Please enter a valid 16-digit account number');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await referralService.verifyAccount(accountNumber);
      if (response.success && response.data) {
        setResult({
          referralCode: response.data.referralCode,
          referralLink: response.data.referralLink,
          fullName: response.data.fullName,
          totalReferrals: response.data.totalReferrals,
        });
      } else {
        setError(response.error || 'Could not verify account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = result.referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Zemen Bank',
          text: `${result.fullName} invites you to open a Zemen Bank account! Use this link to get started:`,
          url: result.referralLink,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Generate Referral Link</h3>
          <p className="text-white/60 text-xs">Enter your 16-digit account number</p>
        </div>
      </div>

      {!result ? (
        <div className="space-y-3">
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 16);
              setAccountNumber(val);
              setError('');
            }}
            placeholder="e.g., 1640015678765678"
            maxLength={16}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono text-center tracking-wider"
          />
          <div className="text-center text-white/40 text-xs">
            {accountNumber.length}/16 digits
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={accountNumber.length !== 16 || loading}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              accountNumber.length === 16 && !loading
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/25'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </span>
            ) : (
              'Generate My Referral Link'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-center">
            <p className="text-green-300 text-sm font-medium">Welcome, {result.fullName}!</p>
            {result.totalReferrals > 0 && (
              <p className="text-green-400/70 text-xs mt-1">You have {result.totalReferrals} referral(s)</p>
            )}
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-white/60 text-xs mb-1">Your Referral Link</p>
            <p className="text-white font-mono text-xs break-all">{result.referralLink}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopy}
              className={`py-2.5 rounded-xl font-medium text-sm transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={handleShare}
              className="py-2.5 rounded-xl font-medium text-sm bg-amber-500 text-white hover:bg-amber-600 transition-all"
            >
              Share Link
            </button>
          </div>

          <button
            onClick={() => {
              setResult(null);
              setAccountNumber('');
            }}
            className="w-full py-2 text-white/50 text-xs hover:text-white/70 transition-colors"
          >
            Use a different account
          </button>
        </div>
      )}
    </div>
  );
};

export default ReferralLinkGenerator;
