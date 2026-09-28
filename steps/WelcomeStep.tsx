
import React, { useState } from 'react';
import { Fingerprint, Timer, LockKeyhole, MoveRight, XCircle, ScrollText } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

// ANNEX I — Terms and Conditions for Digital Consumer Account Opening (Zemen Bank S.C.)
const TERMS_INTRO =
  "The following Terms and Conditions shall govern all customer accounts opened through the Digital Customer Onboarding Platform of Zemen Bank S.C.";

const TERMS_CLAUSES: string[] = [
  "All accounts opened through the Digital Customer Onboarding Platform shall be operated solely by the account holder.",
  "The customer shall ensure that all information, declarations, identification details, contact information, and supporting documents submitted during onboarding are true, accurate, complete, and up to date.",
  "Any request for amendment or update of customer information shall be made by the account holder through procedures prescribed by the Bank.",
  "The Bank reserves the right to debit the customer account to reverse any amount credited erroneously.",
  "The customer agrees that onboarding verification may be conducted through Fayda integration, liveness detection, uploaded video verification, biometric validation, sanctions screening, duplicate CIF detection, fraud screening, and other digital verification mechanisms implemented by the Bank.",
  "The customer authorizes the Bank to conduct sanctions screening, PEP screening, fraud monitoring, customer risk grading, transaction monitoring, and other compliance checks as required by applicable laws, National Bank of Ethiopia directives, and internal procedures.",
  "The customer acknowledges that all digitally on-boarded customers may initially be classified as high-risk customers and may therefore be subject to Enhanced Due Diligence (EDD), ongoing monitoring, and additional verification requirements.",
  "Accounts opened digitally shall initially operate subject to applicable onboarding restrictions, transaction limits, and regulatory controls established by the Bank.",
  "The customer shall complete account regularization requirements, including specimen signature submission and any pending verification requirements, within ninety (90) calendar days from the date of account opening.",
  "Failure to regularize the account within the prescribed timeline may result in account restriction, No Debit status, account freeze, suspension of over-the-counter transaction access, or any other control measure deemed necessary by the Bank.",
  "Until account regularization is completed, the customer may operate the account only through approved digital banking channels subject to applicable transaction limits.",
  "Dedicated digital account products shall only be operated through approved digital banking channels and shall not be eligible for over-the-counter branch transactions until upgraded through physical verification at the customer's selected home branch.",
  "Dedicated digital account products may subsequently be converted into normal branch-operable accounts only after successful physical verification and completion of all pending onboarding requirements.",
  "The customer shall maintain confidentiality of passwords, PINs, OTPs, usernames, and other digital banking credentials and shall take all necessary precautions to prevent unauthorized access.",
  "The customer shall immediately notify the Bank in the event of loss of mobile device, compromise of credentials, suspicious activity, unauthorized access, SIM replacement concerns, or any suspected fraudulent activity.",
  "The Bank shall not be liable for any loss resulting from customer negligence, disclosure of credentials to third parties, or failure to maintain adequate security over digital banking access information.",
  "The Bank may restrict, freeze, suspend, decline, or close the account where suspicious, fraudulent, misleading, forged, inconsistent, or incomplete information is identified during onboarding or subsequent review.",
  "The Bank may place restrictions on the account where the customer is deceased, legally incapacitated, subject to court order, sanctions-related restriction, fraud investigation, regulatory instruction, or any circumstance requiring operational control.",
  "The customer agrees that notifications communicated through SMS, email, mobile application notification, website publication, WhatsApp, Telegram, or other approved electronic channels shall be deemed properly delivered.",
  "Incomplete onboarding applications that are not finalized within seven (7) calendar days may automatically expire from the onboarding system.",
  "The Bank shall not be liable for interruption of onboarding or banking services arising from network interruption, power outage, telecommunication failure, third-party system downtime, cyber incident, force majeure event, or circumstances beyond the Bank's reasonable control.",
  "The customer authorizes the Bank to maintain onboarding records, workflow history, audit logs, electronic consent records, system-generated records, and supporting documents in physical or electronic form.",
  "Customer onboarding and account-related records shall be retained by the Bank for a minimum period of ten (10) years or as otherwise required by applicable laws and regulations.",
  "The Bank reserves the right to amend, revise, supplement, suspend, or update these Terms and Conditions, onboarding requirements, account features, transaction limits, and operational controls at any time in accordance with applicable laws and regulatory requirements.",
  "The customer may lodge complaints or grievances through the Bank's approved customer service and complaint handling channels.",
  "Any notice communicated through the customer's registered contact information shall be considered properly served.",
  "These Terms and Conditions shall be read together with applicable National Bank of Ethiopia directives, Zemen Bank policies and procedures, digital banking terms and conditions, AML/CFT requirements, and any other applicable banking regulations.",
  "By electronically accepting these Terms and Conditions through the onboarding platform, the customer confirms that he/she has fully read, understood, and agreed to be bound by all provisions contained herein.",
];

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="zemen-gradient p-10 text-white text-center">
        <h1 className="text-3xl font-black mb-2 tracking-tighter uppercase">Premium Account Portal</h1>
        <p className="opacity-90 font-light tracking-wide">Enter the next standard of digital banking</p>
      </div>

      <div className="p-8 flex-1">
        <div className="space-y-6">
          <FeatureRow
            icon={<Fingerprint className="w-6 h-6" />}
            title="Biometric Identification"
            desc="Encrypted verification via National Fayda ID"
          />
          <FeatureRow
            icon={<Timer className="w-6 h-6" />}
            title="Real-time Processing"
            desc="Automated validation in under 8 minutes"
          />
          <FeatureRow
            icon={<LockKeyhole className="w-6 h-6" />}
            title="Sovereign Security"
            desc="Multi-factor institutional grade protection"
          />
        </div>

        <div className="mt-10 p-5 bg-[#ed1c24]/5 border border-[#ed1c24]/10 rounded-2xl flex gap-4">
          <div className="w-1.5 h-full bg-[#ed1c24] rounded-full" />
          <p className="text-xs text-[#ed1c24] font-bold leading-relaxed uppercase tracking-wider italic">
            Requirement: Please ensure your 16-digit Fayda National ID is available for authentication.
          </p>
        </div>

        {/* Terms and Conditions */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="welcome-terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#ed1c24] cursor-pointer flex-shrink-0"
            />
            <label htmlFor="welcome-terms" className="text-xs text-gray-700 cursor-pointer leading-relaxed">
              I have read, understood, and agree to the{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-[#ed1c24] font-bold underline underline-offset-2 hover:text-[#ed1c24] transition-colors"
              >
                Terms and Conditions
              </button>{' '}
              of Zemen Bank. I confirm that all information I provide will be accurate and complete, and I authorize
              Zemen Bank to verify my identity and process my account application.
            </label>
          </div>
        </div>
      </div>

      <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex flex-col gap-4">
        <button
          onClick={onNext}
          disabled={!termsAccepted}
          className={`group w-full py-5 font-black rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]
            ${termsAccepted
              ? 'bg-[#ed1c24] text-white shadow-[0_20px_40px_rgba(207,46,46,0.3)] hover:bg-[#B01A3A]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
            }`}
        >
          Initialize Onboarding
          <MoveRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
        </button>
        {!termsAccepted && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 text-center">
            Please accept the Terms and Conditions to proceed
          </p>
        )}
      </div>

      {/* Terms and Conditions Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowTerms(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-[#ed1c24]" />
                <h3 className="text-lg font-bold text-gray-900">Terms and Conditions</h3>
              </div>
              <button onClick={() => setShowTerms(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 text-sm text-gray-700 space-y-4 leading-relaxed">
              <p className="font-semibold text-gray-900">ANNEX I — TERMS AND CONDITIONS FOR DIGITAL CONSUMER ACCOUNT OPENING</p>
              <p>{TERMS_INTRO}</p>
              <ol className="space-y-3 list-decimal pl-5">
                {TERMS_CLAUSES.map((clause, idx) => (
                  <li key={idx} className="leading-relaxed">{clause}</li>
                ))}
              </ol>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setTermsAccepted(true); setShowTerms(false); }}
                className="flex-1 py-2.5 bg-[#ed1c24] text-white font-bold rounded-xl hover:bg-[#B01A3A] transition-colors text-sm"
              >
                I Accept
              </button>
              <button
                onClick={() => setShowTerms(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureRow = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex items-start gap-5 p-5 rounded-2xl border border-gray-50 bg-white hover:border-[#ed1c24]/20 hover:shadow-xl hover:shadow-red-50/50 transition-all duration-300">
    <div className="p-4 bg-red-50 text-[#ed1c24] rounded-xl">
      {icon}
    </div>
    <div>
      <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-400 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default WelcomeStep;
