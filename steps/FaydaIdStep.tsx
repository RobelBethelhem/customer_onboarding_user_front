
import React, { useState } from 'react';
import { Fingerprint, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { OnboardingState } from '../types';
import { faydaService } from '../services/api';

interface Props {
  state: OnboardingState;
  onUpdate: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const FaydaIdStep: React.FC<Props> = ({ state, onUpdate, onNext, onBack }) => {
  const [fcn, setFcn] = useState(state.fcn || '');
  const [isLoading, setIsLoading] = useState(false);

  const formatFcn = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 16);
    const parts = numbers.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFcn(formatFcn(e.target.value));
  };

  const handleVerify = async () => {
    const cleanFcn = fcn.replace(/-/g, '');
    if (cleanFcn.length !== 16) {
      toast.error('Please enter a valid 16-digit Fayda ID');
      return;
    }

    setIsLoading(true);
    try {
      const response = await faydaService.verifyFcn(cleanFcn);
      onUpdate({ fcn: cleanFcn, token: response.token });
      toast.success('Identity initial verification successful');
      onNext();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please check your ID.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
          <p className="font-semibold text-gray-800">Verifying ID...</p>
        </div>
      )}

      <div className="p-6 sm:p-10 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-6 bg-brand-50 rounded-full mb-4">
          <Fingerprint className="w-12 h-12 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Enter Your Fayda ID</h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Enter your 16-digit Fayda Customer Number (FCN) to verify your identity.
        </p>
      </div>

      <div className="p-6 sm:p-10 flex-1 space-y-8">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
            Fayda Customer Number
          </label>
          <input 
            type="text"
            placeholder="0000-0000-0000-0000"
            value={fcn}
            onChange={handleInputChange}
            className="w-full text-center text-xl sm:text-3xl font-mono py-5 sm:py-6 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand/10 tracking-wider sm:tracking-widest transition-all"
          />
        </div>

        

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Your data is protected with bank-grade encryption. We only use this ID for official identity verification purposes.
          </p>
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
          Verify
        </button>
      </div>
    </div>
  );
};

export default FaydaIdStep;
