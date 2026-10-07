import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2, Building2, Clock, User, XCircle } from 'lucide-react';
import type { OnboardingState } from '../types';
import { INITIAL_STATE, NO_FACE_CHECK } from '../initialState';
import { saveSession, loadSession, clearSession } from '../services/sessionStore';
import AppShell from '../components/AppShell';
import WizardWrapper from '../components/WizardWrapper';
import FaydaIdStep from '../steps/FaydaIdStep';
import OtpVerificationStep from '../steps/OtpVerificationStep';
import DataReviewStep from '../steps/DataReviewStep';
import FaceVerificationStep from '../steps/FaceVerificationStep';
import type { InviteInfo, InviteResult } from './types';
import { corporateService, identityPayload, CorporateApiError } from './api';
import { EKYC_MAX_AGE_MS, FACE_MAX_AGE_MS, formatDate } from './constants';
import { StepFrame, Row, toDataUri } from './ui';

enum InviteStep { Intro = 0, FaydaId = 1, Otp = 2, Review = 3, FaceVerify = 4, Confirm = 5, Done = 6 }

const PROGRESS = {
  steps: [InviteStep.FaydaId, InviteStep.Otp, InviteStep.Review, InviteStep.FaceVerify, InviteStep.Confirm],
  labels: {
    [InviteStep.FaydaId]: 'Fayda', [InviteStep.Otp]: 'OTP', [InviteStep.Review]: 'You',
    [InviteStep.FaceVerify]: 'Face', [InviteStep.Confirm]: 'Confirm',
  } as Record<number, string>,
};

interface InviteSession {
  token: string;
  step: number;
  identity: OnboardingState;
  verifiedAt: number;
  faceCheckedAt: number;
}

/** A signatory or director verifying from the SMS link (?invite=TOKEN) */
const InviteApp: React.FC<{ token: string; onHome: () => void }> = ({ token, onHome }) => {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState<number>(InviteStep.Intro);
  const [identity, setIdentity] = useState<OnboardingState>({ ...INITIAL_STATE });
  const [verifiedAt, setVerifiedAt] = useState(0);
  const [faceCheckedAt, setFaceCheckedAt] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    setLoadError('');
    corporateService.invite(token)
      .then(setInfo)
      .catch((e: CorporateApiError) => setLoadError(e.message || 'This link could not be opened.'));
  }, [token]);

  useEffect(() => {
    load();
    // Continue where this person left off on this device (same link only)
    loadSession<InviteSession>('invite').then(session => {
      const s = session?.state;
      if (!s || s.token !== token || s.step <= InviteStep.Intro || s.step >= InviteStep.Done) return;
      if (Date.now() - s.verifiedAt > EKYC_MAX_AGE_MS) return;
      const faceOk = s.faceCheckedAt > 0 && Date.now() - s.faceCheckedAt < FACE_MAX_AGE_MS;
      setIdentity({ ...INITIAL_STATE, ...s.identity, ...(faceOk ? {} : NO_FACE_CHECK) });
      setVerifiedAt(s.verifiedAt);
      setFaceCheckedAt(faceOk ? s.faceCheckedAt : 0);
      setStep(faceOk ? s.step : Math.min(s.step, InviteStep.FaceVerify));
    });
  }, [load, token]);

  useEffect(() => {
    if (step < InviteStep.Review || step >= InviteStep.Done) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSession<InviteSession>({ token, step, identity, verifiedAt, faceCheckedAt }, 'invite'), 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [token, step, identity, verifiedAt, faceCheckedAt]);

  const updateIdentity = useCallback((u: Partial<OnboardingState>) => {
    setIdentity(prev => ({ ...prev, ...u, ...('ekycToken' in u ? NO_FACE_CHECK : {}) }));
    if ('ekycToken' in u) { setVerifiedAt(Date.now()); setFaceCheckedAt(0); }
    if ('faceVerificationToken' in u) setFaceCheckedAt(Date.now());
  }, []);

  const go = (s: number) => { setStep(s); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const next = () => go(step + 1);
  const back = () => go(Math.max(InviteStep.Intro, step - 1));

  const confirm = async () => {
    if (Date.now() - verifiedAt > EKYC_MAX_AGE_MS) {
      toast.error('Your Fayda verification has expired. Please verify again.');
      go(InviteStep.FaydaId);
      return;
    }
    if (!faceCheckedAt || Date.now() - faceCheckedAt > FACE_MAX_AGE_MS) {
      toast.error('Please do the face check again.');
      setIdentity(prev => ({ ...prev, ...NO_FACE_CHECK }));
      go(InviteStep.FaceVerify);
      return;
    }
    setSending(true);
    try {
      const r = await corporateService.verifyInvite(token, identityPayload(identity));
      setResult(r);
      clearSession('invite');
      go(InviteStep.Done);
    } catch (e: any) {
      const err = e as CorporateApiError;
      toast.error(err.message || 'Your verification could not be saved. Please try again.');
      if (err.status === 401) go(InviteStep.FaydaId);
      else if (err.status === 404 || err.status === 409 || err.status === 410) load();
    } finally {
      setSending(false);
    }
  };

  // ── Screens ─────────────────────────────────────────────────────────────────────────────
  const identityProps = { state: identity, onUpdate: updateIdentity, onNext: next, onBack: back };
  let screen: React.ReactNode;

  const message = (icon: React.ReactNode, title: string, text: React.ReactNode, tone = 'bg-gray-50 text-gray-500') => (
    <StepFrame title="Business Account Verification" onNext={onHome} nextLabel="Zemen Bank Home">
      <div className="flex flex-col items-center text-center py-8 space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${tone}`}>{icon}</div>
        <h3 className="text-xl font-black text-gray-900">{title}</h3>
        <div className="text-sm text-gray-600 max-w-md">{text}</div>
      </div>
    </StepFrame>
  );

  if (step === InviteStep.Done && result) {
    screen = message(<CheckCircle2 className="w-8 h-8" />, `Thank you, ${result.fullName.split(' ')[0]}`, (
      <>
        You are verified for the business account application of <b>{result.organizationName}</b> ({result.applicationId}).
        <br /><br />
        {result.allVerified
          ? 'Everyone has now verified — the application goes to our team for review.'
          : 'We are waiting for the others to verify; then our team reviews the application.'}
      </>
    ), 'bg-green-50 text-green-500');
  } else if (loadError) {
    screen = message(<XCircle className="w-8 h-8" />, 'Link not valid', loadError, 'bg-red-50 text-red-500');
  } else if (!info) {
    screen = (
      <StepFrame title="Business Account Verification">
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Opening the link…</div>
      </StepFrame>
    );
  } else if (info.verified) {
    screen = message(<CheckCircle2 className="w-8 h-8" />, 'Already verified',
      <>{info.verifiedName || info.fullName} has already verified for <b>{info.organizationName}</b>. Thank you!</>, 'bg-green-50 text-green-500');
  } else if (!info.open) {
    screen = message(<AlertTriangle className="w-8 h-8" />, 'No verification needed',
      <>The application of <b>{info.organizationName}</b> is no longer waiting for verification. If you have questions, please contact {info.applicantName || 'the person who applied'}.</>,
      'bg-amber-50 text-amber-500');
  } else if (info.expired) {
    screen = message(<Clock className="w-8 h-8" />, 'Link expired',
      <>This link has expired. Ask {info.applicantName || 'the person who applied'} to send you a new one from their application page.</>,
      'bg-amber-50 text-amber-500');
  } else {
    switch (step) {
      case InviteStep.Intro:
        screen = (
          <StepFrame title="Verify Your Identity" subtitle="For a Zemen Bank business account" onNext={() => go(InviteStep.FaydaId)} nextLabel="Start">
            <div className="p-5 rounded-2xl bg-brand-50/40 border border-brand/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand text-white"><Building2 className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-800">{info.organizationName}</div>
                  <div className="text-xs text-gray-500">{info.categoryName} · {info.applicationId}</div>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                Dear <b>{info.fullName}</b>, {info.applicantName || 'the representative'} added you as <b>{info.roleText}</b> of
                this organization on its account application. The bank needs to verify your identity.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" /> Your Fayda ID number and the phone registered with it (for the OTP)</li>
              <li className="flex gap-2"><User className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" /> A short live face check with your phone's camera</li>
            </ul>
            {info.expiresAt && <p className="text-xs text-gray-400">This link works until {formatDate(info.expiresAt)}.</p>}
            <p className="text-xs text-gray-400">If you do not know this organization or did not expect this, do not continue.</p>
          </StepFrame>
        );
        break;
      case InviteStep.FaydaId: screen = <FaydaIdStep {...identityProps} />; break;
      case InviteStep.Otp: screen = <OtpVerificationStep {...identityProps} />; break;
      case InviteStep.Review: screen = <DataReviewStep state={identity} onNext={next} onBack={back} />; break;
      case InviteStep.FaceVerify: screen = <FaceVerificationStep {...identityProps} />; break;
      case InviteStep.Confirm:
        screen = (
          <StepFrame title="Confirm" subtitle="Send your verification to the bank" onBack={back}
            onNext={confirm} nextLabel={sending ? 'Sending…' : 'Confirm'} busy={sending}>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50">
              {identity.faydaData?.photo && <img src={toDataUri(identity.faydaData.photo)} alt="" className="w-14 h-16 rounded-lg object-cover" />}
              <div className="min-w-0">
                <div className="font-bold text-gray-800">{identity.faydaData?.fullName.eng}</div>
                <div className="text-[10px] font-bold uppercase text-green-600 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified with Fayda</div>
              </div>
            </div>
            <div className="space-y-2">
              <Row label="Organization" value={info.organizationName} />
              <Row label="Application" value={info.applicationId} />
              <Row label="Your role" value={info.roleText} />
              <Row label="Name given by the applicant" value={info.fullName} />
            </div>
            <p className="text-xs text-gray-500">
              By confirming, you agree that Zemen Bank uses your Fayda identity for this organization's account
              as {info.roleText}.
            </p>
          </StepFrame>
        );
        break;
      default:
        screen = null;
    }
  }

  return (
    <AppShell>
      <WizardWrapper step={step} progress={PROGRESS}>
        {screen}
      </WizardWrapper>
    </AppShell>
  );
};

export default InviteApp;
