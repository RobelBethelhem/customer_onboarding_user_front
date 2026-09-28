
import React, { useEffect, useState, useRef } from 'react';
import {
  MoveRight,
  ShieldCheck,
  Zap,
  Globe2,
  Nfc,
  CreditCard,
  ChevronDown,
  Medal,
  Users2,
  BarChart3,
  Building2,
  LockKeyhole,
  Smartphone,
  Briefcase,
  Cpu,
  Plane,
  Factory,
  Wifi,
  History,
  ArrowUpRight,
  Bell,
  Fingerprint,
  Gift
} from 'lucide-react';
import ReferralLinkGenerator from '../components/ReferralLinkGenerator';
import RewardsDashboard from '../components/RewardsDashboard';
import ApplicationStatusChecker from '../components/ApplicationStatusChecker';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [scrollY, setScrollY] = useState(0);
  const [isIntroFinished, setIsIntroFinished] = useState(false);
  const [appBooted, setAppBooted] = useState(false);
  
  const personalRef = useRef<HTMLElement>(null);
  const businessRef = useRef<HTMLElement>(null);
  const digitalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Intro sequence timer
    const timer = setTimeout(() => setIsIntroFinished(true), 2500);
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Check if digital section is in view to 'boot' the app mockup
      if (digitalRef.current) {
        const rect = digitalRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.7) {
          setAppBooted(true);
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Calculate parallax offsets for digital section
  const digitalStart = digitalRef.current?.offsetTop || 0;
  const digitalOffset = scrollY - digitalStart;
  const isDigitalInView = digitalOffset > -1000 && digitalOffset < 1000;

  return (
    <div className="bg-white text-[#1a1a1a] overflow-x-hidden selection:bg-[#ed1c24] selection:text-white">
      
      {/* INITIAL SOVEREIGN REVEAL OVERLAY */}
      {!isIntroFinished && (
        <div className="fixed inset-0 z-[200] bg-[#ed1c24] flex items-center justify-center overflow-hidden">
          <div className="relative flex flex-col items-center">
            {/* Logo Pulse */}
            <div className="mb-12 animate-pulse transition-all duration-1000 scale-125">
              <img 
                src="/zblogo.png"
                alt="Zemen"
                className="h-12" 
              />
            </div>
            
            {/* Phone Frame Portal Animation */}
            <div className="w-[180px] h-[360px] border-[3px] border-white/30 rounded-[2.5rem] relative overflow-hidden animate-[bounce_3s_infinite] shadow-2xl">
               <div className="absolute top-0 inset-x-0 h-4 bg-white/10 rounded-b-xl w-20 mx-auto mt-2" />
               <div className="absolute inset-4 border border-white/10 rounded-[1.5rem] flex items-center justify-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full animate-ping" />
               </div>
            </div>
            
            <div className="mt-12 text-white/40 text-[10px] font-black uppercase tracking-[0.8em] animate-pulse">
              Initializing Sovereign Experience
            </div>
          </div>
          
          {/* Sweep Overlay */}
          <div className="absolute inset-0 bg-white translate-y-full animate-[reveal-sweep_2.5s_ease-in-out_forwards]" />
        </div>
      )}

      {/* Navigation - Floating Glassmorphism */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] px-6 py-4 transition-all duration-700 ${isIntroFinished ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className={`max-w-7xl mx-auto px-8 py-3 rounded-2xl flex justify-between items-center transition-all duration-500 ${scrollY > 50 ? 'bg-white/90 backdrop-blur-xl shadow-lg border border-gray-100' : 'bg-transparent'}`}>
          <img 
            src="/zblogo.png"
            alt="Zemen Logo"
            className={`h-8 transition-all ${scrollY > 50 ? '' : ''}`} 
          />
          <div className="hidden md:flex items-center gap-10 text-[11px] font-black uppercase tracking-[0.2em]">
            <button onClick={() => scrollToSection(personalRef)} className={`transition-colors ${scrollY > 50 ? 'text-gray-900 hover:text-[#ed1c24]' : 'text-white/80 hover:text-white'}`}>Personal</button>
            <button onClick={() => scrollToSection(businessRef)} className={`transition-colors ${scrollY > 50 ? 'text-gray-900 hover:text-[#ed1c24]' : 'text-white/80 hover:text-white'}`}>Business</button>
            <button onClick={() => scrollToSection(digitalRef)} className={`transition-colors ${scrollY > 50 ? 'text-gray-900 hover:text-[#ed1c24]' : 'text-white/80 hover:text-white'}`}>Digital</button>
            <button 
              onClick={onStart}
              className="px-8 py-3 bg-[#ed1c24] text-white rounded-xl hover:bg-[#B01A3A] transition-all shadow-md active:scale-95"
            >
              Open Account
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Zemen HQ Theme */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
        <div 
          className={`absolute inset-0 z-0 opacity-70 transition-all duration-[2000ms] ease-out ${isIntroFinished ? 'scale-100 blur-0' : 'scale-150 blur-xl'}`}
          style={{
            backgroundImage: 'url("/customeronboarding.avif")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `translate3d(0, ${scrollY * 0.4}px, 0) scale(${1.1 + scrollY * 0.0005})`,
          }}
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/80 via-transparent to-black" />
        
        <div 
          className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white transition-all duration-1000"
          style={{
            transform: `translate3d(0, ${scrollY * -0.15}px, 0)`,
            opacity: isIntroFinished ? Math.max(0, 1 - scrollY / 700) : 0
          }}
        >
          <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-10 transition-all duration-1000 delay-300 ${isIntroFinished ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <Building2 className="w-4 h-4 text-[#ed1c24]" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase">ZEMEN BANK S.C.</span>
          </div>
          
          <h1 className={`text-5xl sm:text-6xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tighter transition-all duration-1000 delay-500 ${isIntroFinished ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Elevate Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ed1c24] to-[#ed1c24]">Financial State</span>
          </h1>
          
          <p className={`text-lg sm:text-xl md:text-2xl text-white/70 mb-10 sm:mb-14 max-w-2xl mx-auto font-light leading-relaxed transition-all duration-1000 delay-700 ${isIntroFinished ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            The pinnacle of modern banking has arrived. <br/>
            Welcome to Zemen Bank Customer Onboarding System.
          </p>
          
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-6 transition-all duration-1000 delay-1000 ${isIntroFinished ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <button onClick={onStart} className="group relative px-10 py-5 bg-[#ed1c24] text-white font-bold rounded-2xl overflow-hidden shadow-2xl transition-all hover:scale-105 active:scale-95">
              <span className="relative z-10 flex items-center gap-3 text-lg">Start Onboarding <MoveRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-3 text-white/40 animate-bounce">
          <span className="text-[10px] font-bold uppercase tracking-[0.5em]">Scroll Down</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* Personal Excellence Section - High End Banking Hall */}
      <section ref={personalRef} className="py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="flex-1 space-y-10">
              <div className="space-y-4">
                <span className="text-[#ed1c24] font-black tracking-widest uppercase text-xs">For Individuals</span>
                <h2 className="text-5xl md:text-7xl font-black text-gray-900 leading-[0.9] tracking-tighter">
                  Personal <br/><span className="text-[#ed1c24]">Excellence.</span>
                </h2>
              </div>
              <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-lg">
                Bespoke financial services designed for those who demand more. Our 32-story headquarters serves as the heartbeat of Ethiopian innovation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <VerticalFeature icon={<Medal />} title="Z-Club Savings" desc="Tiered yields up to 9%." />
                <VerticalFeature icon={<CreditCard />} title="Elite Cards" desc="Platinum globally accepted." />
                <VerticalFeature icon={<Plane />} title="Travel Perks" desc="Lounge access & insurance." />
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl aspect-square">
                <img src="https://zemenbank.com/wp-content/uploads/2025/02/431057663_734585085538362_8069848902784093331_n-3-1-1-768x581-1.webp?q=80&w=2070&auto=format&fit=crop" alt="Banking Hall" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent" />
              </div>
              {/* <div className="absolute -right-10 -bottom-10 p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 hidden lg:block">
                <div className="text-4xl font-black text-[#ed1c24]">9.0%</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Interest Rate</div>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Business Section - Addis Skyline Theme */}
      <section ref={businessRef} className="py-40 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-32">
            <span className="text-[#ed1c24] font-black tracking-widest uppercase text-xs">For Enterprises</span>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mt-4 tracking-tighter">Institutional Strength</h2>
            <div className="h-1.5 w-24 bg-gradient-to-r from-[#ed1c24] to-[#ed1c24] mx-auto rounded-full mt-8" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <ModernBusinessCard 
              icon={<Briefcase />} 
              title="Corporate Banking" 
              desc="Headquartered in the heart of Addis Ababa's financial district, serving global enterprises."
              imageUrl="https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=1974&auto=format&fit=crop"
            />
            <ModernBusinessCard 
              icon={<Factory />} 
              title="Trade Finance" 
              desc="Expert advisory and financing for major infrastructure projects across the nation."
              imageUrl="https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=2069&auto=format&fit=crop"
            />
            <ModernBusinessCard 
              icon={<Globe2 />} 
              title="SME Solutions" 
              desc="Empowering the next generation of Ethiopian entrepreneurs with institutional capital."
              imageUrl="https://images.unsplash.com/photo-1454165833767-027ffea9e77b?q=80&w=2070&auto=format&fit=crop"
            />
          </div>
        </div>
      </section>

      {/* Financial Intelligence Section (Digital) */}
      <section ref={digitalRef} className="py-40 bg-[#0a0a0a] text-white relative overflow-hidden">
        {/* Animated background glows */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#ed1c24]/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#ed1c24]/10 rounded-full blur-[120px]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-24 items-center">
            
            {/* Interactive Mobile Mockup */}
            <div className="flex-1 order-2 lg:order-1 perspective-[2000px]">
              <div 
                className="relative mx-auto w-[320px] h-[660px] transition-transform duration-500 ease-out"
                style={{ 
                  transform: isDigitalInView 
                    ? `translateY(${digitalOffset * 0.05}px) rotateX(${digitalOffset * 0.01}deg) rotateY(${digitalOffset * -0.01}deg)` 
                    : 'none'
                }}
              >
                {/* Phone Frame */}
                <div className="absolute inset-0 bg-[#1a1a1a] rounded-[3.5rem] border-[12px] border-[#2a2a2a] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden z-20 transition-all duration-1000">
                  
                  {/* Internal Content (App screen) */}
                  <div className={`relative h-full w-full bg-gradient-to-b from-[#111] to-[#000] p-6 pt-10 flex flex-col gap-6 overflow-hidden transition-all duration-1000 ${appBooted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    
                    {/* Boot Glow Overlay */}
                    {!appBooted && <div className="absolute inset-0 bg-white/5 animate-pulse z-50" />}

                    {/* Status Bar */}
                    <div className="flex justify-between items-center px-2 opacity-50">
                      <div className="text-[10px] font-bold">9:41</div>
                      <div className="flex gap-1.5 items-center">
                        <Wifi className="w-3 h-3" />
                        <div className="w-5 h-2.5 bg-white/40 rounded-sm" />
                      </div>
                    </div>

                    {/* App Header */}
                    <div className={`flex justify-between items-center mt-2 transition-all duration-700 delay-300 ${appBooted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Good Morning,</div>
                        <div className="text-lg font-black tracking-tight">Elias Zewde</div>
                      </div>
                      <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 relative">
                        <Bell className="w-4 h-4 text-white" />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-[#ed1c24] rounded-full border-2 border-black" />
                      </div>
                    </div>

                    {/* Wallet Card */}
                    <div 
                      className={`relative bg-gradient-to-br from-[#ed1c24] via-[#8B1631] to-[#600C20] p-6 rounded-[2rem] shadow-2xl transition-all duration-700 delay-500 ${appBooted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                      style={{ transform: `translateY(${digitalOffset * -0.02}px)` }}
                    >
                      <div className="flex justify-between items-start mb-10">
                         <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                            <Nfc className="w-5 h-5 text-white" />
                         </div>
                         <img src="/zblogo.png" className="h-4 opacity-40" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Available Balance</div>
                        <div className="text-2xl font-black text-white">450,230.00 <span className="text-xs font-medium text-white/50">ETB</span></div>
                      </div>
                      <div className="mt-8 flex justify-between items-center">
                        <div className="text-xs font-mono tracking-widest text-white/40">•••• 4829</div>
                        <div className="p-2 bg-white/10 rounded-full">
                           <ArrowUpRight className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Action Grid */}
                    <div 
                      className={`grid grid-cols-4 gap-4 transition-all duration-700 delay-700 ${appBooted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
                      style={{ transform: `translateY(${digitalOffset * -0.04}px)` }}
                    >
                       <QuickAction icon={<Zap />} label="Pay" />
                       <QuickAction icon={<History />} label="History" />
                       <QuickAction icon={<Medal />} label="Clubs" />
                       <QuickAction icon={<Users2 />} label="Team" />
                    </div>

                    {/* Recent Transactions */}
                    <div 
                       className={`space-y-4 transition-all duration-700 delay-1000 ${appBooted ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}
                       style={{ transform: `translateY(${digitalOffset * -0.06}px)` }}
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-gray-500 px-1">Recent Activity</div>
                      <div className="space-y-3">
                        <TransactionRow title="Bole Fuel Station" amount="-1,200.00" date="Today, 10:24 AM" />
                        <TransactionRow title="Z-Club Interest" amount="+3,450.00" date="Yesterday" isPlus />
                        <TransactionRow title="ATM Withdrawal" amount="-5,000.00" date="Oct 24" />
                      </div>
                    </div>

                    {/* Biometric Prompt */}
                    <div className={`absolute bottom-8 inset-x-0 flex flex-col items-center gap-2 transition-all duration-1000 delay-[1500ms] ${appBooted ? 'opacity-30' : 'opacity-0'}`}>
                       <Fingerprint className="w-8 h-8" />
                       <div className="text-[8px] font-black uppercase tracking-[0.4em]">Secure Session</div>
                    </div>
                  </div>
                </div>

                {/* Floating Shadow */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-10 bg-black/50 blur-3xl z-10" />
              </div>
            </div>

            {/* Content Side */}
            <div className="flex-1 space-y-12 order-1 lg:order-2">
              <div className="space-y-4">
                <span className="text-[#ed1c24] font-black tracking-widest uppercase text-xs">Digital Transformation</span>
                <h2 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter">
                  Financial <br/><span className="text-[#ed1c24]">Intelligence.</span>
                </h2>
              </div>
              <p className="text-xl text-gray-400 font-medium leading-relaxed">
                Seamlessly manage your wealth across all devices. Our proprietary Zemen Mobile and Internet Banking platforms put the power in your hands.
              </p>
              <div className="space-y-6">
                <DigitalRow icon={<Smartphone />} title="Zemen Mobile App" desc="Instant transfers and bill payments 24/7." />
                <DigitalRow icon={<Wifi />} title="Internet Banking" desc="Sophisticated dashboard for total control." />
                <DigitalRow icon={<Cpu />} title="ATM & POS Network" desc="Widespread access points nationwide." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Refer & Earn Section */}
      <section className="py-32 bg-gradient-to-b from-[#0a0a0a] to-[#1a0a10] text-white relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-[20%] left-[-5%] w-[30%] h-[60%] bg-amber-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[50%] bg-[#ed1c24]/10 rounded-full blur-[100px]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
              <Gift className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-400">Referral Program</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter">
              Refer & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-[#ed1c24]">Earn</span>
            </h2>
            <p className="text-xl text-gray-400 font-medium leading-relaxed mt-6 max-w-xl mx-auto">
              Share your referral link with friends and family. When they open a Zemen Bank account, you earn reward points convertible to ETB.
            </p>
          </div>

          {/* How It Works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-amber-400 font-black text-xl">1</span>
              </div>
              <h4 className="font-bold text-white text-sm mb-2">Generate Link</h4>
              <p className="text-gray-500 text-xs">Enter your account number to get your unique referral link</p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-amber-400 font-black text-xl">2</span>
              </div>
              <h4 className="font-bold text-white text-sm mb-2">Share with Friends</h4>
              <p className="text-gray-500 text-xs">Send your link via SMS, WhatsApp, or any messaging app</p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-amber-400 font-black text-xl">3</span>
              </div>
              <h4 className="font-bold text-white text-sm mb-2">Earn Rewards</h4>
              <p className="text-gray-500 text-xs">Get reward points when your referral opens an account, then convert to ETB</p>
            </div>
          </div>

          {/* Generator + Dashboard Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <ReferralLinkGenerator />
            <RewardsDashboard />
          </div>

          {/* Track / continue an existing application */}
          <div className="max-w-md mx-auto mt-8">
            <ApplicationStatusChecker onContinue={onStart} />
          </div>
        </div>
      </section>

      {/* High-Impact CTA - Zemen HQ Panorama */}
      <section className="relative py-48 overflow-hidden bg-white">
        <div 
          className="absolute inset-0 z-0 opacity-5 grayscale hover:grayscale-0 transition-all duration-1000"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black mb-12 tracking-tighter leading-tight text-gray-900 text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-[#ed1c24] to-gray-900">
            CLAIM YOUR <br/>PREMIUM LEGACY
          </h2>
          <button 
            onClick={onStart}
            className="group px-12 py-6 bg-[#ed1c24] text-white font-black rounded-2xl text-xl shadow-2xl hover:scale-105 transition-all flex items-center gap-4 mx-auto"
          >
            Start Account Opening <MoveRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
          </button>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="bg-white border-t border-gray-100 py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="md:col-span-5 space-y-8">
            <img src="/zblogo.png" alt="Zemen Logo" className="h-10" />
            <p className="text-gray-500 text-lg font-light leading-relaxed max-w-sm">
              Ethiopia’s first corporate-focused commercial bank, delivering high-end financial services from our landmark 32-story headquarters.
            </p>
          </div>
          <div className="md:col-span-3 space-y-6">
            <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest">Navigation</h4>
            <ul className="space-y-4 text-gray-400 text-sm font-bold">
              <li><button onClick={() => scrollToSection(personalRef)} className="hover:text-[#ed1c24] transition-colors">Personal Banking</button></li>
              <li><button onClick={() => scrollToSection(businessRef)} className="hover:text-[#ed1c24] transition-colors">Corporate Accounts</button></li>
              <li><button onClick={() => scrollToSection(digitalRef)} className="hover:text-[#ed1c24] transition-colors">Digital Solutions</button></li>
            </ul>
          </div>
          <div className="md:col-span-4 space-y-8 text-right">
            <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest text-right">Head Office</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Zemen Bank S.C. Headquarters<br/>
              Joseph Tito St, Addis Ababa<br/>
              Institutional Support: 8055
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-gray-50 text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em]">
          &copy; {new Date().getFullYear()} Zemen Bank S.C. | Sovereign Digital Division
        </div>
      </footer>
    </div>
  );
};

// UI Components for the Mockup
const QuickAction = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
    <div className="w-full aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
       {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 text-white' })}
    </div>
    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
  </div>
);

const TransactionRow = ({ title, amount, date, isPlus = false }: { title: string; amount: string; date: string; isPlus?: boolean }) => (
  <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
     <div className="space-y-0.5">
        <div className="text-[10px] font-bold tracking-tight">{title}</div>
        <div className="text-[8px] text-gray-500">{date}</div>
     </div>
     <div className={`text-[10px] font-black ${isPlus ? 'text-green-500' : 'text-white'}`}>
        {amount}
     </div>
  </div>
);

const VerticalFeature = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="p-3 bg-red-50 text-[#ed1c24] rounded-xl">
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
    </div>
    <div>
      <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight">{title}</h4>
      <p className="text-xs text-gray-400 font-medium">{desc}</p>
    </div>
  </div>
);

const ModernBusinessCard = ({ icon, title, desc, imageUrl }: { icon: React.ReactNode; title: string; desc: string; imageUrl: string }) => (
  <div className="p-0 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden">
    <div className="h-48 overflow-hidden relative">
       <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
       <div className="absolute bottom-4 left-4 p-2 bg-white/10 backdrop-blur-md rounded-xl text-white">
          {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
       </div>
    </div>
    <div className="p-8">
      <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tighter">{title}</h3>
      <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);

const DigitalRow = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex gap-6 items-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
    <div className="p-4 bg-[#ed1c24] text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform">
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
    </div>
    <div>
      <h4 className="font-black text-lg tracking-tight">{title}</h4>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  </div>
);

export default LandingPage;
