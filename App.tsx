
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { OnboardingState, Step } from './types';
import { INITIAL_STATE } from './initialState';
import AppShell from './components/AppShell';
import WizardWrapper from './components/WizardWrapper';
import ResumeModal from './components/ResumeModal';
import { saveSession, loadSession, clearSession } from './services/sessionStore';
import { referralService } from './services/api';
import { isIfbAccountType } from './constants';
import LandingPage from './steps/LandingPage';
import WelcomeStep from './steps/WelcomeStep';
import ExistingAccountStep from './steps/ExistingAccountStep';
import BranchSelectionStep from './steps/BranchSelectionStep';
import AccountTypeStep from './steps/AccountTypeStep';
import FaydaIdStep from './steps/FaydaIdStep';
import OtpVerificationStep from './steps/OtpVerificationStep';
import DataReviewStep from './steps/DataReviewStep';
import AdditionalInfoStep from './steps/AdditionalInfoStep';
import DocumentUploadStep from './steps/DocumentUploadStep';
import FaceVerificationStep from './steps/FaceVerificationStep';
import ServicesStep from './steps/ServicesStep';
import FinalReviewStep from './steps/FinalReviewStep';
import SuccessStep from './steps/SuccessStep';
import CorporateApp from './corporate/CorporateApp';
import InviteApp from './corporate/InviteApp';
import StatusPage from './corporate/StatusPage';

// Sessions saved by an older version of the wizard: shift the step number past steps added
// since, so a resumed session opens on the same screen.
function upgradeSavedState(saved: OnboardingState): OnboardingState {
  let state = saved;
  if (state.hasExistingAccount === undefined) {
    // Before the Existing Account step (2): continue as a new customer
    state = {
      ...state,
      currentStep: state.currentStep >= Step.ExistingAccount ? state.currentStep + 1 : state.currentStep,
      hasExistingAccount: false,
      existingAccountNumber: '',
      existingCif: '',
    };
  }
  if (state.requestedServices === undefined) {
    // Before the Additional Services step (11): no services requested
    state = {
      ...state,
      currentStep: state.currentStep >= Step.Services ? state.currentStep + 1 : state.currentStep,
      requestedServices: [],
    };
  }
  // Fields added later (service names, terms, live face check)
  state = {
    ...state,
    selectedServices: state.selectedServices || [],
    serviceTermsAccepted: state.serviceTermsAccepted || [],
    faceVerificationToken: state.faceVerificationToken || '',
    livenessFrames: state.livenessFrames || [],
    faceMatched: state.faceMatched ?? null,
  };
  return state;
}

/** Individual account wizard (the original flow), from the landing page */
const IndividualApp: React.FC<{ onStartBusiness: () => void }> = ({ onStartBusiness }) => {
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<{ state: OnboardingState; savedAt: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload saved session on mount (don't show modal yet)
  useEffect(() => {
    loadSession().then(session => {
      if (!session) return;
      session = { ...session, state: upgradeSavedState(session.state) };
      if (session.state.currentStep >= Step.Branch) {
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

  // Interest-Free Banking product selected: green theme, Z-Qamar logo and background
  const isIfb = isIfbAccountType(state.selectedAccountType);

  const renderStep = useMemo(() => {
    switch (state.currentStep) {
      case Step.Landing:
        return <LandingPage onStart={handleStartOnboarding} onStartBusiness={onStartBusiness} />;
      case Step.Welcome:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <WelcomeStep onNext={nextStep} />
          </WizardWrapper>
        );
      case Step.ExistingAccount:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <ExistingAccountStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.Branch:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <BranchSelectionStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.AccountType:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <AccountTypeStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.FaydaId:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <FaydaIdStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.Otp:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <OtpVerificationStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.Review:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <DataReviewStep state={state} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.AdditionalInfo:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <AdditionalInfoStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      /* Documents step commented out — skipped in flow
      case Step.Documents:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <DocumentUploadStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      */
      case Step.FaceVerify:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <FaceVerificationStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.Services:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <ServicesStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} />
          </WizardWrapper>
        );
      case Step.FinalReview:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <FinalReviewStep state={state} onUpdate={updateState} onNext={nextStep} onBack={prevStep} onEdit={goToStep} />
          </WizardWrapper>
        );
      case Step.Success:
        return (
          <WizardWrapper step={state.currentStep} referrerName={state.referrerName} ifb={isIfb}>
            <SuccessStep state={state} onAmend={amendApplication} />
          </WizardWrapper>
        );
      default:
        return <LandingPage onStart={handleStartOnboarding} onStartBusiness={onStartBusiness} />;
    }
  }, [state, nextStep, prevStep, updateState, handleStartOnboarding, goToStep, amendApplication, onStartBusiness]);

  return (
    // Interest-Free Banking products switch the wizard's brand colour to green (see index.html)
    <AppShell ifb={isIfb}>
      {renderStep}
      {showResumeModal && savedSessionData && (
        <ResumeModal
          stepNumber={savedSessionData.state.currentStep}
          savedAt={savedSessionData.savedAt}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
      )}
    </AppShell>
  );
};

// ─── Which flow to show ─────────────────────────────────────────────────────────────────────
// ?invite=TOKEN          a signatory/director verifying from the SMS link
// ?corporate=ID&key=KEY  the business applicant's status page (link from the SMS)
// otherwise              the landing page / individual wizard; "Business Account" opens the business wizard
type Route =
  | { kind: 'individual' }
  | { kind: 'business' }
  | { kind: 'invite'; token: string }
  | { kind: 'status'; applicationId: string; key: string };

function routeFromUrl(): Route {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get('invite');
  if (invite) return { kind: 'invite', token: invite };
  const applicationId = params.get('corporate');
  const key = params.get('key');
  if (applicationId && key) return { kind: 'status', applicationId, key };
  return { kind: 'individual' };
}

const App: React.FC = () => {
  const [route, setRoute] = useState<Route>(routeFromUrl);

  // Browser back/forward between the status page and the rest
  useEffect(() => {
    const onPop = () => setRoute(routeFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const home = useCallback(() => {
    if (window.location.search) window.history.pushState({}, '', window.location.pathname);
    setRoute({ kind: 'individual' });
    window.scrollTo({ top: 0 });
  }, []);

  const startBusiness = useCallback(() => {
    setRoute({ kind: 'business' });
    window.scrollTo({ top: 0 });
  }, []);

  const openStatus = useCallback((applicationId: string, key: string) => {
    window.history.pushState({}, '', `${window.location.pathname}?corporate=${encodeURIComponent(applicationId)}&key=${encodeURIComponent(key)}`);
    setRoute({ kind: 'status', applicationId, key });
    window.scrollTo({ top: 0 });
  }, []);

  switch (route.kind) {
    case 'invite':
      return <InviteApp token={route.token} onHome={home} />;
    case 'status':
      return <StatusPage key={route.applicationId} applicationId={route.applicationId} accessKey={route.key} onHome={home} />;
    case 'business':
      return <CorporateApp onExit={home} onOpenStatus={openStatus} />;
    default:
      return <IndividualApp onStartBusiness={startBusiness} />;
  }
};

export default App;
