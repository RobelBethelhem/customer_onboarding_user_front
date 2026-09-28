
import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Timer, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { OnboardingState } from '../types';
import { faydaService } from '../services/api';



function mapToFaydaCustomerData(response: any): FaydaCustomerData {
  const identity = response.identity;

  return {
    uin: response.psut, // ✅ ONLY change: psut → uin

    fullName: {
      eng: identity.name_eng,
      amh: identity.name_amh,
    },

    dateOfBirth: identity.dob,

    gender: {
      eng: identity.gender_eng,
      amh: identity.gender_amh,
    },

    phone: identity.phone,
    email: identity.email,

    region: {
      eng: identity.region_eng,
      amh: identity.region_amh,
    },

    zone: {
      eng: identity.zone_eng,
      amh: identity.zone_amh,
    },

    woreda: {
      eng: identity.woreda_eng,
      amh: identity.woreda_amh,
    },

    residenceStatus: {
      eng: identity.residenceStatus_eng,
      amh: identity.residenceStatus_amh,
    },

    photo: identity.photo,
  };
}


interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const OtpVerificationStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const inputs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
      if (timeLeft === 540) setCanResend(true); // Allow resend after 1 min
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      // Focus last filled input
      const focusIdx = Math.min(pasted.length, 5);
      inputs.current[focusIdx]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const rawResponse  = await faydaService.validateOtp(otpString, state.fcn, state.token);
      
      const customerData = mapToFaydaCustomerData(rawResponse);


      
      // Sanctions screening
      const nameParts = customerData.fullName.eng.split(' ');
      const screeningResult = await faydaService.screeningCheck({
        firstName: nameParts[0] || '',
        middleName: nameParts[1] || '',
        lastName: nameParts.slice(2).join(' ') || '',
        dateOfBirth: customerData.dateOfBirth,
        nationality: 'ET'
      });

      const screening: any = ( screeningResult as any).data || screeningResult;

      // Only a real sanctions / NBE-banned / terminated high-risk hit blocks onboarding.
      // PEP (and other non-blocking) matches are allowed to continue — the application is
      // auto-escalated to a senior approver for second-level review at submission.
      if (screening.blocked) {
        setShowBlocked(true);
        setIsLoading(false);
        return;
      }

      onUpdate({ faydaData: customerData });
      if (screening.hasPEP || screening.requiresSecondLevelApproval) {
        toast.info('Additional verification required — your application will undergo enhanced review.');
      } else {
        toast.success('Identity verified successfully');
      }
      onNext();
    } catch (err: any) {
      toast.error(err.message || 'OTP Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (showBlocked) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="p-6 bg-red-100 rounded-full mb-6">
          <AlertCircle className="w-16 h-16 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Account Opening Blocked</h2>
        <p className="text-gray-600 mb-8 max-w-sm">
          We are unable to open an account at this time due to regulatory requirements. 
          Please contact our nearest branch for assistance.
        </p>
        <button 
          onClick={onBack}
          className="px-8 py-3 bg-brand text-white font-bold rounded-xl"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
          <p className="font-semibold text-gray-800">Verifying Identity...</p>
        </div>
      )}

      <div className="p-10 text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-brand-50 px-4 py-2 rounded-full mb-2">
          <ShieldCheck className="w-4 h-4 text-brand" />
          <span className="text-xs font-bold text-brand">Fayda ID: {state.fcn.replace(/(.{4})/g, '$1-').slice(0, -1)}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Enter the 6-digit code sent to your registered mobile number.
        </p>
      </div>

      <div className="p-10 flex-1 flex flex-col items-center justify-center space-y-8">
        <div className="flex gap-3">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={el => inputs.current[idx] = el!}
              type="text"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className="otp-input w-12 h-14 text-center text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl transition-all"
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className={`flex items-center gap-2 text-sm font-medium ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
            <Timer className="w-4 h-4" />
            <span>Expires in {formatTime(timeLeft)}</span>
          </div>

          <button 
            disabled={!canResend}
            className={`flex items-center gap-2 text-sm font-bold ${canResend ? 'text-brand hover:underline' : 'text-gray-300'}`}
          >
            <RefreshCw className="w-4 h-4" />
            Resend OTP
          </button>
        </div>
      </div>

      <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
        <button onClick={onBack} className="flex-1 py-4 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button 
          onClick={handleVerify}
          className="flex-[2] py-4 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-dark transition-all"
        >
          Verify OTP
        </button>
      </div>
    </div>
  );
};

export default OtpVerificationStep;
