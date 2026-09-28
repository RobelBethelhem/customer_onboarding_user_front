
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { OnboardingState, Step } from './types';
import ProgressBar from './components/ProgressBar';
import ResumeModal from './components/ResumeModal';
import { saveSession, loadSession, clearSession } from './services/sessionStore';
import { referralService } from './services/api';
import LandingPage from './steps/LandingPage';
import WelcomeStep from './steps/WelcomeStep';
import BranchSelectionStep from './steps/BranchSelectionStep';
import AccountTypeStep from './steps/AccountTypeStep';
import FaydaIdStep from './steps/FaydaIdStep';
import OtpVerificationStep from './steps/OtpVerificationStep';
import DataReviewStep from './steps/DataReviewStep';
import AdditionalInfoStep from './steps/AdditionalInfoStep';
import DocumentUploadStep from './steps/DocumentUploadStep';
import FaceVerificationStep from './steps/FaceVerificationStep';
import FinalReviewStep from './steps/FinalReviewStep';
import SuccessStep from './steps/SuccessStep';

const BACKGROUND_MAP: Record<number, string> = {
  // [Step.Welcome]: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=2069&auto=format&fit=crop",
  // [Step.Branch]: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
  // [Step.AccountType]: "https://images.unsplash.com/photo-1618044733300-947115823856?q=80&w=1974&auto=format&fit=crop",
  // [Step.FaydaId]: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop",
  // [Step.Otp]: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=2070&auto=format&fit=crop",
  // [Step.Review]: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop",
  // [Step.AdditionalInfo]: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
  // [Step.Documents]: "https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?q=80&w=2070&auto=format&fit=crop",
  // [Step.FaceVerify]: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?q=80&w=2070&auto=format&fit=crop",
  // [Step.Success]: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop",
  
  [Step.Welcome]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2069&auto=format&fit=crop",
   [Step.Branch]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
   [Step.AccountType]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=1974&auto=format&fit=crop",
   [Step.FaydaId]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
   [Step.Otp]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
   [Step.Review]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
   [Step.AdditionalInfo]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2015&auto=format&fit=crop",
   [Step.Documents]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
   [Step.FaceVerify]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
   [Step.Success]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webpe?q=80&w=2070&auto=format&fit=crop",
};

const INITIAL_STATE: OnboardingState = {
  currentStep: Step.Landing,
  selectedBranch: null,
  selectedAccountType: null,
  selectedTier: null,
  fcn: '',
  token: '',
  faydaData: null,
  additionalInfo: {
    motherMaidenName: '',
    email: '',
    taxIdentity: '',
    annualIncome: '',
    occupation: '',
    industry: '',
    wealthSource: '',
    otherOccupation: '',
    otherIndustry: '',
    otherWealthSource: '',
    maritalStatus: '',
    promotionType: '',
  },
  documents: [],
  selfiePhoto: '',
  verificationPhotos: {
    faceCenter: '',
    livenessFrames: [],
  },
  livenessConfidence: 0,
  faceMatchScore: 0,
  faceVideoId: '',
  result: null,
  referralCode: '',
  referrerName: '',
};

const App: React.FC = () => {
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<{ state: OnboardingState; savedAt: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload saved session on mount (don't show modal yet)
  useEffect(() => {
    loadSession().then(session => {
      if (session && session.state.currentStep >= Step.Branch) {
        setSavedSessionData(session);
      }
    });
  }, []);

  // Capture referral code from URL on mount (?ref=REF-XXXXXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode && refCode.startsWith('REF-')) {
      console.log('[Referral] Captured referral code from URL:', refCode);
      // Validate with the referral (dashboard) backend and get the referrer name.
      // Uses referralService (DASHBOARD_URL / api2) — not a hardcoded localhost.
      referralService.validateCode(refCode)
        .then(data => {
          if (data.success && data.valid) {
            setState(prev => ({
              ...prev,
              referralCode: refCode,
              referrerName: data.data?.referrerName || '',
            }));
            if (data.data?.referrerName) {
              toast.success(`Referred by ${data.data.referrerName}`);
            }
          } else {
            // Backend reachable but code not valid — still keep it for attribution
            setState(prev => ({ ...prev, referralCode: refCode }));
          }
        })
        .catch(err => {
          console.log('[Referral] Could not validate code:', err);
          // Still store the code even if validation fails
          setState(prev => ({ ...prev, referralCode: refCode }));
        });
      // Clean URL without reload
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // Auto-save state to IndexedDB on every change (debounced 800ms)
  useEffect(() => {
    // Only save meaningful progress (step 2+), don't save completed flows
    if (state.currentStep < Step.Branch || state.currentStep >= Step.Success) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSession(state);
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state]);

  // Clear saved session when user reaches Success
  useEffect(() => {
    if (state.currentStep === Step.Success) {
      clearSession();
    }
  }, [state.currentStep]);

  // Called when user clicks "Start Onboarding" / "Open Account" on the landing page
  const handleStartOnboarding = useCallback(() => {
    if (savedSessionData) {
      // Saved session exists — ask if they want to resume
      setShowResumeModal(true);
    } else {
      // No saved session — go straight to Welcome
      setState(prev => ({ ...prev, currentStep: Step.Welcome }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [savedSessionData]);

  const handleResume = useCallback(() => {
    if (savedSessionData) {
      // Preserve referral code captured from URL (don't let saved session overwrite it)
      setState(prev => ({
        ...savedSessionData.state,
        referralCode: prev.referralCode || savedSessionData.state.referralCode || '',
        referrerName: prev.referrerName || savedSessionData.state.referrerName || '',
      }));
      toast.success('Application restored successfully');
    }
    setShowResumeModal(false);
  }, [savedSessionData]);

  const handleStartFresh = useCallback(() => {
    clearSession();
    setSavedSessionData(null);
    setShowResumeModal(false);
    // Navigate to Welcome step
    setState(prev => ({ ...prev, currentStep: Step.Welcome }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // When editing a section from the Final Review screen, remember to jump back there
  // after the edited step is confirmed (instead of walking forward through every step).
  const [editReturn, setEditReturn] = useState<number | null>(null);

  // Steps to skip (commented-out steps)
  const SKIPPED_STEPS = new Set([Step.Documents]);

  const nextStep = useCallback(() => {
    setState(prev => {
      if (editReturn !== null) {
        return { ...prev, currentStep: editReturn };
      }
      let next = prev.currentStep + 1;
      while (SKIPPED_STEPS.has(next)) next++;
      return { ...prev, currentStep: next };
    });
    setEditReturn(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [editReturn]);

  const prevStep = useCallback(() => {
    setEditReturn(null);
    setState(prev => {
      let next = prev.currentStep - 1;
      while (SKIPPED_STEPS.has(next) && next > Step.Landing) next--;
      return { ...prev, currentStep: Math.max(Step.Landing, next) };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Jump to a specific step to edit it, then return to Final Review on confirm
  const goToStep = useCallback((step: number) => {
    setEditReturn(Step.FinalReview);
    setState(prev => ({ ...prev, currentStep: step }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // From the Success screen, when changes are required, go back to Final Review to amend & resubmit
  const amendApplication = useCallback(() => {
    setEditReturn(null);
    setState(prev => ({ ...prev, currentStep: Step.FinalReview, result: null }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const renderStep = useMemo(() => {
    switch (state.currentStep) {
      case Step.Landing:
        return <LandingPage onStart={handleStartOnboarding} />;
      case Step.Welcome:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <WelcomeStep onNext={nextStep} />
          </WizardWrapper>
        );
      case Step.Branch:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <BranchSelectionStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.AccountType:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <AccountTypeStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.FaydaId:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <FaydaIdStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.Otp:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <OtpVerificationStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.Review:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <DataReviewStep state={state} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.AdditionalInfo:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <AdditionalInfoStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      /* Documents step commented out — skipped in flow
      case Step.Documents:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <DocumentUploadStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      */
      case Step.FaceVerify:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <FaceVerificationStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.FinalReview:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <FinalReviewStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} onEdit={goToStep} />
          </WizardWrapper>
        );
      case Step.Success:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName}>
            <SuccessStep state={state} onAmend={amendApplication} />
          </WizardWrapper>
        );
      default:
        return <LandingPage onStart={handleStartOnboarding} />;
    }
  }, [state, nextStep, prevStep, updateState, handleStartOnboarding, goToStep, amendApplication]);

  return (
    <div className="min-h-screen">
      <Toaster position="top-center" richColors />
      {renderStep}
      {showResumeModal && savedSessionData && (
        <ResumeModal
          stepNumber={savedSessionData.state.currentStep}
          savedAt={savedSessionData.savedAt}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
      )}
    </div>
  );
};

const WizardWrapper: React.FC<{ children: React.ReactNode; step: number; referrerName?: string }> = ({ children, step, referrerName }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentBg, setCurrentBg] = useState(BACKGROUND_MAP[step] || BACKGROUND_MAP[Step.Welcome]);
  const [prevBg, setPrevBg] = useState(BACKGROUND_MAP[step] || BACKGROUND_MAP[Step.Welcome]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 15,
        y: (e.clientY / window.innerHeight - 0.5) * 15,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle Background Transition to avoid black flickers
  useEffect(() => {
    const nextBg = BACKGROUND_MAP[step] || BACKGROUND_MAP[Step.Welcome];
    if (nextBg !== currentBg) {
      setPrevBg(currentBg);
      setCurrentBg(nextBg);
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [step, currentBg]);

  return (
    <div className="relative min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-black">
      
      {/* Background Layer 1 (Previous/Static) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out opacity-80"
        style={{ 
          backgroundImage: `url("${prevBg}")`,
          transform: `scale(1.1) translate3d(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px, 0)`,
          filter: 'blur(1px) brightness(0.8)'
        }}
      />

      {/* Background Layer 2 (Current/Fading In) */}
      <div 
        className={`absolute inset-0 z-[1] bg-cover bg-center transition-all duration-[1200ms] ease-in-out ${isTransitioning ? 'opacity-100' : 'opacity-100'}`}
        style={{ 
          backgroundImage: `url("${currentBg}")`,
          transform: `scale(1.1) translate3d(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px, 0)`,
          filter: 'blur(1px) brightness(0.8)',
          opacity: isTransitioning ? 0 : 1, // Start hidden during transition then fade in
          animation: isTransitioning ? 'fadeInBG 1.2s forwards' : 'none'
        }}
      />
      
      <style>{`
        @keyframes fadeInBG {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Header Logo */}
      <div className="relative z-10 w-full max-w-2xl flex justify-center mb-10">
        <img 
          src="/zblogo.png"
          alt="Zemen Bank"
          className="h-10 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Progress Indicator */}
      {step > Step.Welcome && step < Step.Success && (
        <div className="relative z-10 w-full max-w-2xl mb-14 px-4">
          <ProgressBar currentStep={step} totalSteps={Step.Success - 1} />
        </div>
      )}

      {/* Referral Banner */}
      {referrerName && step > Step.Landing && step < Step.Success && (
        <div className="relative z-10 w-full max-w-2xl mb-3 px-4">
          <div className="bg-amber-500/90 backdrop-blur-sm text-white rounded-2xl px-5 py-2.5 text-center text-sm font-medium shadow-lg">
            <span className="opacity-80">Referred by</span> <span className="font-bold">{referrerName}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.8)] border border-white/30 overflow-hidden min-h-[500px] flex flex-col transition-all duration-500">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-12 text-[10px] font-black uppercase tracking-[0.4em] text-white/60 text-center drop-shadow-md">
        &copy; {new Date().getFullYear()} Zemen Bank S.C.
      </footer>
    </div>
  );
};

export default App;
