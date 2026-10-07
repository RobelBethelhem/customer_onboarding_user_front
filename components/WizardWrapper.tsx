import React, { useEffect, useState } from 'react';
import { Step } from '../types';
import ProgressBar from './ProgressBar';

const BACKGROUND_MAP: Record<number, string> = {
  [Step.Welcome]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2069&auto=format&fit=crop",
  [Step.Branch]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
  [Step.AccountType]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=1974&auto=format&fit=crop",
  [Step.FaydaId]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
  [Step.Otp]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
  [Step.Review]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
  [Step.AdditionalInfo]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2015&auto=format&fit=crop",
  [Step.Documents]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
  [Step.FaceVerify]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
  [Step.Success]: "https://zemenbank.com/storage/2024/11/DSC00533-2-scaled.webp?q=80&w=2070&auto=format&fit=crop",
};

// Interest-Free Banking (Z-Qamar) products use their own background on every step
const IFB_BACKGROUND = '/IFB_background.webp';

const backgroundFor = (step: number, ifb: boolean): string =>
  ifb ? IFB_BACKGROUND : (BACKGROUND_MAP[step] || BACKGROUND_MAP[Step.Welcome]);

interface Props {
  children: React.ReactNode;
  step: number;
  referrerName?: string;
  ifb?: boolean;
  // Another wizard's steps for the progress bar (business accounts, verification link); null hides
  // it. Left out: the individual account steps.
  progress?: { steps: number[]; labels: Record<number, string> } | null;
}

/** Frame of every wizard screen: background, logo, progress bar, referral banner, white card */
const WizardWrapper: React.FC<Props> = ({ children, step, referrerName, ifb = false, progress }) => {
  const targetBg = backgroundFor(step, ifb);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentBg, setCurrentBg] = useState(targetBg);
  const [prevBg, setPrevBg] = useState(targetBg);
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

  // Handle Background Transition to avoid black flickers. Runs only when the target image changes
  // (e.g. switching to/from an IFB product), so the fade timer isn't cleared by its own state update.
  useEffect(() => {
    if (targetBg === currentBg) return;
    setPrevBg(currentBg);
    setCurrentBg(targetBg);
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 1200);
    return () => clearTimeout(timer);
  }, [targetBg]); // eslint-disable-line react-hooks/exhaustive-deps

  const showIndividualProgress = progress === undefined && step > Step.Welcome && step < Step.Success;
  const showOwnProgress = !!progress && progress.steps.includes(step);

  return (
    <div className="relative min-h-screen flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-black">

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

      {/* Header Logo — Z-Qamar for Interest-Free Banking products (white card: the logo has a white background) */}
      <div className="relative z-10 w-full max-w-2xl flex justify-center mb-6 sm:mb-10">
        {ifb ? (
          <div className="bg-white rounded-xl px-3 py-1 shadow-2xl">
            <img
              src="/IFB_logo.png"
              alt="Zemen Bank Z-Qamar Interest-Free Banking"
              className="h-8 sm:h-10 object-contain"
            />
          </div>
        ) : (
          <img
            src="/zblogo.png"
            alt="Zemen Bank"
            className="h-10 object-contain drop-shadow-2xl"
          />
        )}
      </div>

      {/* Progress Indicator */}
      {showIndividualProgress && (
        <div className="relative z-10 w-full max-w-2xl mb-6 sm:mb-14 px-1 sm:px-4">
          <ProgressBar currentStep={step} totalSteps={Step.Success - 1} />
        </div>
      )}
      {showOwnProgress && (
        <div className="relative z-10 w-full max-w-2xl mb-6 sm:mb-14 px-1 sm:px-4">
          <ProgressBar currentStep={step} totalSteps={progress!.steps.length} steps={progress!.steps} labels={progress!.labels} />
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
      <main className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.8)] border border-white/30 overflow-hidden min-h-[500px] flex flex-col transition-all duration-500">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-8 sm:mt-12 text-[10px] font-black uppercase tracking-[0.4em] text-white/60 text-center drop-shadow-md">
        &copy; {new Date().getFullYear()} Zemen Bank S.C.
      </footer>
    </div>
  );
};

export default WizardWrapper;
