
import React from 'react';
import { CheckCircle2, Clock, Copy, ArrowRight, Home, Gift, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { OnboardingState } from '../types';

interface Props {
  state: OnboardingState;
  onAmend?: () => void;
}

const SuccessStep: React.FC<Props> = ({ state, onAmend }) => {
  const { result, faydaData } = state;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const status = (result?.status || '').toLowerCase();
  const isApproved = !!result?.success && (status === 'auto_approved' || status === 'approved');
  const needsAction =
    status.includes('reject') ||
    status.includes('return') ||
    status.includes('additional') ||
    (result != null && result.success === false);
  const isPending = !isApproved && !needsAction;

  const isAdditionalInfo = status.includes('additional');
  const referenceId = result?.customerNumber || result?.customerId || 'ZMN-PENDING';

  // ---- Action-required (rejected / returned / additional information requested) ----
  if (needsAction) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-10 text-center text-white bg-amber-500">
          <div className="inline-flex p-4 bg-white/20 rounded-full mb-6">
            <AlertTriangle className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter">
            {isAdditionalInfo ? 'Additional Information Needed' : 'Application Returned'}
          </h1>
          <p className="opacity-90 font-light">
            {isAdditionalInfo
              ? 'Please review and complete the requested details, then resubmit.'
              : 'Your application needs changes before it can be processed.'}
          </p>
        </div>

        <div className="p-8 flex-1 space-y-6">
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2">Reason</p>
            <p className="text-sm text-amber-900 font-medium leading-relaxed">
              {result?.message || 'The reviewing officer has requested changes to your application. Please review your information and resubmit.'}
            </p>
          </div>

          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-3">Application Reference</p>
            <h2 className="text-2xl font-mono font-black text-gray-700 tracking-tighter">{referenceId}</h2>
          </div>
        </div>

        <div className="p-8 border-t border-gray-50 flex flex-col gap-3 bg-gray-50/30">
          {onAmend && (
            <button
              onClick={onAmend}
              className="w-full py-5 bg-brand text-white font-black rounded-2xl shadow-[0_15px_30px_rgb(var(--brand)/0.2)] hover:bg-brand-dark transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <RefreshCw className="w-5 h-5" />
              Review &amp; Resubmit
            </button>
          )}
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 text-gray-500 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // ---- Approved / Pending ----
  return (
    <div className="flex flex-col h-full bg-white">
      <div className={`p-10 text-center text-white ${isApproved ? 'bg-brand' : 'zemen-gradient'}`}>
        <div className="inline-flex p-4 bg-white/20 rounded-full mb-6">
          {isApproved ? <CheckCircle2 className="w-16 h-16" /> : <Clock className="w-16 h-16" />}
        </div>
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter">
          {isApproved ? 'Account Created!' : 'Application Submitted'}
        </h1>
        <p className="opacity-90 font-light">
          {isApproved
            ? `Welcome to Zemen Bank, ${faydaData?.fullName.eng.split(' ')[0]}!`
            : 'Your application has been received and is under review.'}
        </p>
      </div>

      <div className="p-8 flex-1 space-y-8">
        <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">
            {isApproved ? 'Your Customer Number' : 'Application Reference ID'}
          </p>
          <div className="flex items-center justify-center gap-4">
            <h2 className="text-4xl font-mono font-black text-brand tracking-tighter">
              {referenceId}
            </h2>
            <button
              onClick={() => copyToClipboard(result?.customerNumber || result?.customerId || '')}
              className="p-3 bg-white shadow-sm border border-gray-100 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6 font-medium italic">Save this number for future reference</p>
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">Next Steps</h3>
          <div className="space-y-3">
            <StepItem icon="1" text="Watch for confirmation via SMS and email" />
            <StepItem icon="2" text="Operate your account through approved digital banking channels" />
            <StepItem icon="3" text="Complete account regularization at your selected branch within 90 days" />
          </div>
        </div>

        {/* Referral Attribution */}
        {state.referralCode && (
          <div className="p-6 bg-amber-50 border border-amber-200/50 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
              <Gift className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">
                {state.referrerName
                  ? `${state.referrerName} will earn reward points for referring you!`
                  : 'Your referrer will earn reward points!'}
              </p>
              <p className="text-amber-700/70 text-xs mt-1">
                Once you become a customer, you can also refer others and earn points convertible to ETB.
              </p>
            </div>
          </div>
        )}

        <div className="p-6 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex gap-4">
          <div className="w-1.5 h-full bg-brand rounded-full flex-shrink-0" />
          <p className="text-sm text-brand font-medium leading-relaxed">
            {isApproved
              ? 'Your digital account is now active and operates through approved digital banking channels. Confirmation details have been sent to your registered phone and email.'
              : 'Your application is being reviewed by our team. You will be notified of the outcome through your registered phone and email. No further action is required from you at this time.'}
          </p>
        </div>
      </div>

      <div className="p-8 border-t border-gray-50 flex flex-col gap-4 bg-gray-50/30">
        <button
          onClick={() => window.location.href = '/'}
          className="w-full py-5 bg-brand text-white font-black rounded-2xl shadow-[0_15px_30px_rgb(var(--brand)/0.2)] hover:bg-brand-dark transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <Home className="w-5 h-5" />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

const StepItem = ({ icon, text }: { icon: string; text: string }) => (
  <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm group hover:border-brand/30 transition-all cursor-pointer">
    <div className="w-8 h-8 rounded-xl bg-brand text-white text-xs font-black flex items-center justify-center shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <span className="text-sm font-bold text-gray-700">{text}</span>
    <ArrowRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-brand group-hover:translate-x-1 transition-all" />
  </div>
);

export default SuccessStep;
