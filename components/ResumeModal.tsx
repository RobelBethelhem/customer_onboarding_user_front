
import React from 'react';
import { RotateCcw, PlusCircle, Clock, MapPin, CreditCard, Shield, FileText, Camera, CheckCircle2, Lock } from 'lucide-react';
import { Step } from '../types';

interface Props {
  stepNumber: number;
  savedAt: number;
  onResume: () => void;
  onStartFresh: () => void;
  // business account wizard: its own step name and completed steps (default: individual account steps)
  stepLabel?: string;
  completed?: string[];
}

const STEP_META: Record<number, { label: string; icon: React.ReactNode }> = {
  [Step.Branch]:         { label: 'Branch Selection',       icon: <MapPin className="w-5 h-5" /> },
  [Step.AccountType]:    { label: 'Account Type',           icon: <CreditCard className="w-5 h-5" /> },
  [Step.FaydaId]:        { label: 'Fayda ID Verification',  icon: <Shield className="w-5 h-5" /> },
  [Step.Otp]:            { label: 'OTP Verification',       icon: <Shield className="w-5 h-5" /> },
  [Step.Review]:         { label: 'Data Review',            icon: <FileText className="w-5 h-5" /> },
  [Step.AdditionalInfo]: { label: 'Additional Information', icon: <FileText className="w-5 h-5" /> },
  [Step.Documents]:      { label: 'Document Upload',        icon: <FileText className="w-5 h-5" /> },
  [Step.FaceVerify]:     { label: 'Face Verification',      icon: <Camera className="w-5 h-5" /> },
  [Step.Services]:       { label: 'Additional Services',    icon: <CreditCard className="w-5 h-5" /> },
  [Step.FinalReview]:    { label: 'Review & Submit',        icon: <CheckCircle2 className="w-5 h-5" /> },
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const ResumeModal: React.FC<Props> = ({ stepNumber, savedAt, onResume, onStartFresh, stepLabel, completed }) => {
  const meta = stepLabel
    ? { label: stepLabel, icon: <FileText className="w-5 h-5" /> }
    : STEP_META[stepNumber] || { label: `Step ${stepNumber}`, icon: <FileText className="w-5 h-5" /> };

  // Build a small progress summary showing completed steps
  const completedSteps = completed || Object.entries(STEP_META)
    .filter(([key]) => Number(key) < stepNumber)
    .map(([key, val]) => val.label);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-[2.5rem] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.8)] max-w-md w-full overflow-hidden animate-fade-in border border-white/30"
      >
        {/* Header with Large Centered Logo */}
        <div className="px-10 pt-12 pb-8 text-center flex flex-col items-center">
          {/* Large Centered Zemen Bank Logo */}
          <img
            src="/zblogo.png"
            alt="Zemen Bank"
            className="h-20 object-contain mb-8 drop-shadow-md"
          />
          <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Welcome Back!</h2>
          <p className="text-gray-400 text-sm font-medium">You have an unfinished application</p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Current step info card */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-[#ed1c24]">
                {meta.icon}
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">You were on</div>
                <div className="font-bold text-gray-800 text-lg tracking-tight">{meta.label}</div>
              </div>
            </div>

            {/* Completed steps pills */}
            {completedSteps.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {completedSteps.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Saved {timeAgo(savedAt)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onResume}
              className="w-full py-4 bg-[#ed1c24] text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-[#B01A3A] transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-base"
            >
              <RotateCcw className="w-5 h-5" />
              Resume Application
            </button>
            <button
              onClick={onStartFresh}
              className="w-full py-4 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <PlusCircle className="w-5 h-5" />
              Start Fresh
            </button>
          </div>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-gray-300 font-bold uppercase tracking-widest">
            <Lock className="w-3 h-3" />
            <span>AES-256 encrypted on this device</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;
