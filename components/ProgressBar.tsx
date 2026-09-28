
import React from 'react';
import { Check } from 'lucide-react';
import { Step } from '../types';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_LABELS: Record<number, string> = {
  [Step.ExistingAccount]: "Customer",
  [Step.Branch]: "Branch",
  [Step.AccountType]: "Account",
  [Step.FaydaId]: "Fayda ID",
  [Step.Otp]: "OTP",
  [Step.Review]: "Review",
  [Step.AdditionalInfo]: "Details",
  // [Step.Documents]: "Docs",  // Commented out
  [Step.FaceVerify]: "Face",
  [Step.FinalReview]: "Confirm",
};

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  // We only show steps from Step.ExistingAccount to Step.FinalReview
  const stepsArray = [
    Step.ExistingAccount,
    Step.Branch,
    Step.AccountType,
    Step.FaydaId,
    Step.Otp,
    Step.Review,
    Step.AdditionalInfo,
    // Step.Documents,  // Commented out
    Step.FaceVerify,
    Step.FinalReview
  ];

  return (
    <nav aria-label="Progress" className="w-full">
      <ol role="list" className="flex items-center justify-between w-full">
        {stepsArray.map((step, idx) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isLast = idx === stepsArray.length - 1;

          return (
            <li key={step} className={`relative flex items-center ${!isLast ? 'flex-1' : ''}`}>
              {/* Line connector */}
              {!isLast && (
                <div 
                  className="absolute left-0 top-1/2 w-full h-0.5 -translate-y-1/2 bg-gray-200"
                  aria-hidden="true"
                >
                  <div 
                    className={`h-full transition-all duration-500 ease-in-out bg-brand ${isCompleted ? 'w-full' : 'w-0'}`}
                  />
                </div>
              )}

              {/* Step Circle */}
              <div className="relative flex flex-col items-center group">
                <div 
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 z-10
                    ${isCompleted 
                      ? 'bg-brand border-brand text-white' 
                      : isCurrent 
                        ? 'bg-white border-brand text-brand shadow-sm ring-4 ring-brand-50' 
                        : 'bg-white border-gray-200 text-gray-400'}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Step Label - only show current or nearby steps on mobile to avoid clutter, or all on desktop */}
                <span 
                  className={`
                    absolute top-10 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider transition-colors duration-300
                    ${isCurrent ? 'text-brand' : isCompleted ? 'text-gray-600' : 'text-gray-300'}
                    hidden sm:block
                  `}
                >
                  {STEP_LABELS[step]}
                </span>
                
                {/* Mobile version of label: only show for active step */}
                {isCurrent && (
                  <span className="absolute top-10 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-brand sm:hidden">
                    {STEP_LABELS[step]}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default ProgressBar;
