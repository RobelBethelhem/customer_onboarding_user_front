import React, { useState } from 'react';
import { applicationService, ApplicationStatusResult } from '../services/api';

interface Props {
  /** Called when the applicant chooses to continue & amend a returned/rejected application */
  onContinue: () => void;
}

const ApplicationStatusChecker: React.FC<Props> = ({ onContinue }) => {
  const [appId, setAppId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<NonNullable<ApplicationStatusResult['data']> | null>(null);

  const handleCheck = async () => {
    if (!appId.trim() || phone.replace(/\D/g, '').length < 4) {
      setError('Enter your Application ID and phone number');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await applicationService.checkStatus(appId.trim(), phone.trim());
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || 'Could not find your application');
      }
    } catch (err: any) {
      setError(err.message || 'Could not find your application');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setAppId('');
    setPhone('');
    setError('');
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Track Your Application</h3>
          <p className="text-white/60 text-xs">Check status or continue a returned application</p>
        </div>
      </div>

      {!result ? (
        <div className="space-y-3">
          <input
            type="text"
            value={appId}
            onChange={(e) => { setAppId(e.target.value); setError(''); }}
            placeholder="Application ID (e.g. ZB000123)"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-center tracking-wider"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); }}
            placeholder="Registered phone number"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-center"
          />

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleCheck}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Status</p>
            <p className="text-2xl font-black text-white">{result.statusLabel}</p>
            <p className="text-white/50 text-xs mt-1">{result.applicationId} · {result.fullName}</p>
          </div>

          {result.reason && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl">
              <p className="text-amber-200/80 text-[10px] uppercase tracking-wider mb-1">Reviewer note</p>
              <p className="text-amber-100 text-sm">{result.reason}</p>
            </div>
          )}

          {result.canAmend && (
            <button
              onClick={onContinue}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-[#ed1c24] text-white hover:bg-[#B01A3A] transition-all shadow-lg shadow-red-500/25"
            >
              Continue &amp; Amend Application
            </button>
          )}

          <button
            onClick={reset}
            className="w-full py-2 text-white/50 text-xs hover:text-white/70 transition-colors"
          >
            Check another application
          </button>
        </div>
      )}
    </div>
  );
};

export default ApplicationStatusChecker;
