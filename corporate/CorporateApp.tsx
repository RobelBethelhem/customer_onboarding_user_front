import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { OnboardingState } from '../types';
import { INITIAL_STATE, NO_FACE_CHECK } from '../initialState';
import { isIfbAccountType } from '../constants';
import { saveSession, loadSession, clearSession } from '../services/sessionStore';
import AppShell from '../components/AppShell';
import WizardWrapper from '../components/WizardWrapper';
import ResumeModal from '../components/ResumeModal';
import FaydaIdStep from '../steps/FaydaIdStep';
import OtpVerificationStep from '../steps/OtpVerificationStep';
import DataReviewStep from '../steps/DataReviewStep';
import FaceVerificationStep from '../steps/FaceVerificationStep';
import BranchSelectionStep from '../steps/BranchSelectionStep';
import AccountTypeStep from '../steps/AccountTypeStep';
import { CorporateStep, documentsFor } from './types';
import type { CorporateCatalog, CorporateState, UploadedFile } from './types';
import { corporateService, identityPayload, rememberApplication, CorporateApiError } from './api';
import { EMPTY_ORGANIZATION, EMPTY_ADDRESS, EKYC_MAX_AGE_MS, FACE_MAX_AGE_MS, normalizeMobile, entriesOf } from './constants';
import { firstIncomplete } from './validation';
import { StepFrame } from './ui';
import IntroStep from './steps/IntroStep';
import CategoryStep from './steps/CategoryStep';
import OrganizationStep from './steps/OrganizationStep';
import ContactStep from './steps/ContactStep';
import PeopleStep from './steps/PeopleStep';
import DocumentsStep from './steps/DocumentsStep';
import CorporateReviewStep from './steps/CorporateReviewStep';
import SubmittedStep from './steps/SubmittedStep';

const PROGRESS = {
  steps: [
    CorporateStep.FaydaId, CorporateStep.Otp, CorporateStep.Review, CorporateStep.FaceVerify, CorporateStep.Category,
    CorporateStep.Organization, CorporateStep.Contact, CorporateStep.Branch, CorporateStep.Account,
    CorporateStep.People, CorporateStep.Documents, CorporateStep.FinalReview,
  ],
  labels: {
    [CorporateStep.FaydaId]: 'Fayda', [CorporateStep.Otp]: 'OTP', [CorporateStep.Review]: 'You',
    [CorporateStep.FaceVerify]: 'Face', [CorporateStep.Category]: 'Type', [CorporateStep.Organization]: 'Details',
    [CorporateStep.Contact]: 'Contact', [CorporateStep.Branch]: 'Branch', [CorporateStep.Account]: 'Account',
    [CorporateStep.People]: 'People', [CorporateStep.Documents]: 'Docs', [CorporateStep.FinalReview]: 'Submit',
  } as Record<number, string>,
};

// For the resume dialog
const STEP_NAMES: Record<number, string> = {
  [CorporateStep.FaydaId]: 'Fayda ID', [CorporateStep.Otp]: 'OTP verification', [CorporateStep.Review]: 'Your details',
  [CorporateStep.FaceVerify]: 'Face verification', [CorporateStep.Category]: 'Type of organization',
  [CorporateStep.Organization]: 'Organization details', [CorporateStep.Contact]: 'Contact & address',
  [CorporateStep.Branch]: 'Branch', [CorporateStep.Account]: 'Account type', [CorporateStep.People]: 'Signatories & directors',
  [CorporateStep.Documents]: 'Documents', [CorporateStep.FinalReview]: 'Review & submit',
};

const freshState = (): CorporateState => ({
  currentStep: CorporateStep.Intro,
  identity: { ...INITIAL_STATE },
  verifiedAt: 0,
  faceCheckedAt: 0,
  organization: { ...EMPTY_ORGANIZATION, registeredAddress: { ...EMPTY_ADDRESS }, correspondenceAddress: { ...EMPTY_ADDRESS } },
  applicant: { phone: '', roles: ['signatory'], signature: null },
  people: [],
  signingRule: 'single',
  signingRuleOther: '',
  documents: {},
  declaration: false,
  result: null,
});

const ekycFresh = (s: CorporateState) => !!s.identity.ekycToken && Date.now() - s.verifiedAt < EKYC_MAX_AGE_MS;
const faceFresh = (s: CorporateState) => s.faceCheckedAt > 0 && !!s.identity.selfiePhoto && Date.now() - s.faceCheckedAt < FACE_MAX_AGE_MS;

/** The applicant verifies again; everything else they entered is kept */
const withoutVerification = (s: CorporateState, step: CorporateStep): CorporateState => ({
  ...s,
  currentStep: step,
  identity: { ...s.identity, ...NO_FACE_CHECK, ...(step === CorporateStep.FaydaId ? { ekycToken: '' } : {}) },
  ...(step === CorporateStep.FaydaId ? { verifiedAt: 0 } : {}),
  faceCheckedAt: 0,
});

interface Props {
  onExit: () => void;                                      // back to the landing page
  onOpenStatus: (applicationId: string, key: string) => void;
}

/** Business account application wizard (the organization's representative) */
const CorporateApp: React.FC<Props> = ({ onExit, onOpenStatus }) => {
  const [state, setState] = useState<CorporateState>(freshState);
  const [catalog, setCatalog] = useState<CorporateCatalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [saved, setSaved] = useState<{ state: CorporateState; savedAt: number } | null>(null);
  const [showResume, setShowResume] = useState(false);
  // Editing from the review screen: go back there after the edited step
  const [editReturn, setEditReturn] = useState<number | null>(null);
  // Verifying again (expired result): after the face check, go back here instead of walking through every step
  const [returnAfterFace, setReturnAfterFace] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCatalog = useCallback(() => {
    setCatalogError('');
    corporateService.catalog()
      .then(c => setCatalog(c))
      .catch(e => setCatalogError(e?.message || 'We could not load the business account options.'));
  }, []);

  useEffect(() => {
    loadCatalog();
    loadSession<CorporateState>('business').then(session => {
      if (session && session.state.currentStep > CorporateStep.Intro && session.state.currentStep < CorporateStep.Submitted) {
        setSaved(session);
      }
    });
  }, [loadCatalog]);

  // Save progress on this device (encrypted), once the applicant has verified with Fayda
  useEffect(() => {
    if (state.currentStep < CorporateStep.Review || state.currentStep >= CorporateStep.Submitted) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSession(state, 'business'), 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const update = useCallback((u: Partial<CorporateState>) => setState(prev => ({ ...prev, ...u })), []);

  /** Updates from the reused individual-account steps (Fayda, OTP, face check, branch, account) */
  const updateIdentity = useCallback((u: Partial<OnboardingState>) => {
    setState(prev => {
      let identity: OnboardingState = { ...prev.identity, ...u };
      const extra: Partial<CorporateState> = {};
      if ('ekycToken' in u) {
        // New Fayda verification: the face check is done again for it
        identity = { ...identity, ...NO_FACE_CHECK };
        extra.verifiedAt = Date.now();
        extra.faceCheckedAt = 0;
        const samePerson = prev.identity.faydaData?.uin && prev.identity.faydaData.uin === u.faydaData?.uin;
        if (!samePerson) {
          // someone else verified: their phone, not the previous person's signature
          extra.applicant = { ...prev.applicant, phone: normalizeMobile(u.faydaData?.phone || ''), signature: null };
        } else if (!prev.applicant.phone) {
          extra.applicant = { ...prev.applicant, phone: normalizeMobile(u.faydaData?.phone || '') };
        }
      }
      if ('faceVerificationToken' in u) extra.faceCheckedAt = Date.now();
      return { ...prev, identity, ...extra };
    });
  }, []);

  const goTo = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
    scrollTop();
  }, []);

  const nextStep = useCallback(() => {
    const fromFace = state.currentStep === CorporateStep.FaceVerify;
    setState(prev => {
      if (editReturn !== null) return { ...prev, currentStep: editReturn };
      if (prev.currentStep === CorporateStep.FaceVerify && returnAfterFace !== null) return { ...prev, currentStep: returnAfterFace };
      let next = prev.currentStep + 1;
      if (next === CorporateStep.FaceVerify && faceFresh(prev)) next++;
      return { ...prev, currentStep: next };
    });
    setEditReturn(null);
    if (fromFace) setReturnAfterFace(null);
    scrollTop();
  }, [editReturn, returnAfterFace, state.currentStep]);

  const prevStep = useCallback(() => {
    setEditReturn(null);
    setState(prev => {
      let p = prev.currentStep - 1;
      if (p === CorporateStep.FaceVerify && faceFresh(prev)) p--;
      return { ...prev, currentStep: Math.max(CorporateStep.Intro, p) };
    });
    scrollTop();
  }, []);

  const editStep = useCallback((step: number) => {
    setEditReturn(CorporateStep.FinalReview);
    goTo(step);
  }, [goTo]);

  // ── Resume ──────────────────────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (saved) setShowResume(true);
    else goTo(CorporateStep.FaydaId);
  };

  const handleResume = () => {
    if (!saved) return;
    const base = freshState();
    let s: CorporateState = {
      ...base, ...saved.state,
      identity: { ...INITIAL_STATE, ...saved.state.identity },
      organization: { ...base.organization, ...saved.state.organization },
      applicant: { ...base.applicant, ...saved.state.applicant },
      result: null,
    };
    if (s.currentStep > CorporateStep.Otp && !ekycFresh(s)) {
      // the Fayda result is valid 7 days: verify again, then continue where they were
      setReturnAfterFace(s.currentStep);
      s = withoutVerification(s, CorporateStep.FaydaId);
      toast.info('For your security, please verify with Fayda again. Everything else you entered is kept.');
    } else if (s.currentStep > CorporateStep.FaceVerify && !faceFresh(s)) {
      setReturnAfterFace(s.currentStep);
      s = withoutVerification(s, CorporateStep.FaceVerify);
      toast.info('Please do the face check again. Everything else you entered is kept.');
    } else {
      toast.success('Application restored');
    }
    setState(s);
    setShowResume(false);
    scrollTop();
  };

  const handleStartFresh = () => {
    clearSession('business');
    setSaved(null);
    setShowResume(false);
    setState({ ...freshState(), currentStep: CorporateStep.FaydaId });
    scrollTop();
  };

  // ── Submit ──────────────────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!catalog || submitting) return;
    const incomplete = firstIncomplete(state, catalog);
    if (incomplete) {
      toast.error(incomplete.message);
      editStep(incomplete.step);
      return;
    }
    if (!ekycFresh(state)) {
      toast.error('Your Fayda verification has expired. Please verify again — everything else is kept.');
      setReturnAfterFace(CorporateStep.FinalReview);
      setState(prev => withoutVerification(prev, CorporateStep.FaydaId));
      scrollTop();
      return;
    }
    if (!faceFresh(state)) {
      toast.error('Please do the face check again — it is valid for 48 hours.');
      setReturnAfterFace(CorporateStep.FinalReview);
      setState(prev => withoutVerification(prev, CorporateStep.FaceVerify));
      scrollTop();
      return;
    }

    const { identity, organization: org, applicant } = state;
    const category = catalog.categories.find(c => c.id === org.categoryId);
    const docIds = new Set(documentsFor(category, org.subtypeId).map(d => d.id));
    const fileRef = (f: { fileId: string; fileKey: string } | null, signs: boolean) =>
      f && signs ? { fileId: f.fileId, fileKey: f.fileKey } : undefined;
    const payload = {
      applicant: {
        ...identityPayload(identity),
        phone: normalizeMobile(applicant.phone),
        roles: applicant.roles,
        signature: fileRef(applicant.signature, applicant.roles.includes('signatory')),
      },
      organization: {
        ...org,
        name: org.name.trim(),
        tin: org.tin.replace(/\s/g, ''),
        mobile: org.mobile ? normalizeMobile(org.mobile) : '',
        email: org.email.trim(),
        annualIncome: Number(org.annualIncome.replace(/,/g, '')) || 0,
      },
      branchCode: identity.selectedBranch?.branchCode || '',
      accountTypeId: identity.selectedAccountType?.id || '',
      accountClassCode: identity.selectedTier?.code || '',
      signingRule: state.signingRule,
      signingRuleOther: state.signingRule === 'other' ? state.signingRuleOther.trim() : '',
      people: state.people.map(p => ({
        fullName: p.fullName.trim(),
        phone: normalizeMobile(p.phone),
        roles: p.roles,
        signature: fileRef(p.signature, p.roles.includes('signatory')),
      })),
      documents: entriesOf<UploadedFile>(state.documents)
        .filter(([docId]) => docIds.has(docId))
        .map(([docId, f]) => ({ docId, fileId: f.fileId, fileKey: f.fileKey })),
    };

    setSubmitting(true);
    try {
      const result = await corporateService.submit(payload);
      rememberApplication({
        applicationId: result.applicationId, accessKey: result.accessKey,
        organizationName: result.view.organizationName, submittedAt: Date.now(),
      });
      clearSession('business');
      setSaved(null);
      setState(prev => ({ ...prev, result, currentStep: CorporateStep.Submitted }));
      scrollTop();
    } catch (e: any) {
      const err = e as CorporateApiError;
      toast.error(err.message || 'The application could not be sent. Please try again.');
      if (err.fileId) {
        // An upload expired or was already used: ask for that one again
        setState(prev => ({
          ...prev,
          documents: Object.fromEntries(entriesOf<UploadedFile>(prev.documents).filter(([, f]) => f.fileId !== err.fileId)),
          applicant: prev.applicant.signature?.fileId === err.fileId ? { ...prev.applicant, signature: null } : prev.applicant,
          people: prev.people.map(p => (p.signature?.fileId === err.fileId ? { ...p, signature: null } : p)),
        }));
        editStep(CorporateStep.Documents);
      } else if (err.status === 401) {
        setReturnAfterFace(CorporateStep.FinalReview);
        setState(prev => withoutVerification(prev, CorporateStep.FaydaId));
        scrollTop();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Screens ─────────────────────────────────────────────────────────────────────────────
  const isIfb = isIfbAccountType(state.identity.selectedAccountType);
  const step = state.currentStep;
  const stepProps = { state, update, onNext: nextStep, onBack: prevStep };
  const identityProps = { state: state.identity, onUpdate: updateIdentity, onNext: nextStep, onBack: prevStep };

  const needsCatalog = step >= CorporateStep.Category && step <= CorporateStep.FinalReview;
  let screen: React.ReactNode;
  if (needsCatalog && !catalog) {
    screen = (
      <StepFrame title="Business Account" onBack={prevStep}>
        {catalogError ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              {catalogError}
              <button onClick={loadCatalog} className="mt-2 flex items-center gap-1.5 text-xs font-bold underline">
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
        )}
      </StepFrame>
    );
  } else {
    switch (step) {
      case CorporateStep.Intro:
        screen = <IntroStep catalog={catalog} catalogError={catalogError} onRetry={loadCatalog} onStart={handleStart} onExit={onExit} />;
        break;
      case CorporateStep.FaydaId: screen = <FaydaIdStep {...identityProps} />; break;
      case CorporateStep.Otp: screen = <OtpVerificationStep {...identityProps} />; break;
      case CorporateStep.Review: screen = <DataReviewStep state={state.identity} onNext={nextStep} onBack={prevStep} />; break;
      case CorporateStep.FaceVerify: screen = <FaceVerificationStep {...identityProps} />; break;
      case CorporateStep.Category: screen = <CategoryStep {...stepProps} catalog={catalog!} />; break;
      case CorporateStep.Organization: screen = <OrganizationStep {...stepProps} />; break;
      case CorporateStep.Contact: screen = <ContactStep {...stepProps} />; break;
      case CorporateStep.Branch: screen = <BranchSelectionStep {...identityProps} />; break;
      case CorporateStep.Account: screen = <AccountTypeStep {...identityProps} audience="organization" />; break;
      case CorporateStep.People: screen = <PeopleStep {...stepProps} catalog={catalog!} />; break;
      case CorporateStep.Documents: screen = <DocumentsStep {...stepProps} catalog={catalog!} />; break;
      case CorporateStep.FinalReview:
        screen = (
          <CorporateReviewStep state={state} catalog={catalog!} update={update} onEdit={editStep}
            onBack={prevStep} onSubmit={submit} submitting={submitting} />
        );
        break;
      case CorporateStep.Submitted:
        screen = state.result ? (
          <SubmittedStep result={state.result} onHome={onExit}
            onOpenStatus={() => onOpenStatus(state.result!.applicationId, state.result!.accessKey)} />
        ) : null;
        break;
      default:
        screen = null;
    }
  }

  return (
    <AppShell ifb={isIfb}>
      <WizardWrapper step={step} ifb={isIfb} progress={PROGRESS}>
        {screen}
      </WizardWrapper>
      {showResume && saved && (
        <ResumeModal
          stepNumber={saved.state.currentStep}
          savedAt={saved.savedAt}
          stepLabel={STEP_NAMES[saved.state.currentStep] || 'Business account'}
          completed={PROGRESS.steps.filter(s => s < saved.state.currentStep).map(s => STEP_NAMES[s])}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
      )}
    </AppShell>
  );
};

export default CorporateApp;
