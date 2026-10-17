import React from 'react';
import { Home, Camera, Brain, Compass, User as UserIcon, Wifi, WifiOff, Sparkles, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguageCode } from '../types';

interface NavigationProps {
  activeTab: 'home' | 'lens' | 'brain' | 'discover' | 'me';
  setActiveTab: (tab: 'home' | 'lens' | 'brain' | 'discover' | 'me') => void;
  isOnline: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, isOnline }) => {
  const { user, updateUser } = useAuth();

  const handleLanguageChange = (lang: LanguageCode) => {
    if (user) {
      updateUser({ preferred_language: lang });
    }
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#0a0b10]/85 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-600/30">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-sans">
                  REALITY<span className="text-violet-400">LENS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {user?.ai_personality || 'GEN-Z'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-tight -mt-0.5">
                See it. Get it. Do it.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Quick Toggle */}
            <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-white/10 text-xs">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 rounded-md font-medium transition ${
                  (user?.preferred_language || 'en') === 'en'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('kn')}
                className={`px-2 py-1 rounded-md font-medium transition ${
                  user?.preferred_language === 'kn'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="ಕನ್ನಡ (Kannada)"
              >
                ಕನ್ನ
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2 py-1 rounded-md font-medium transition ${
                  user?.preferred_language === 'hi'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="हिन्दी (Hindi)"
              >
                हि
              </button>
            </div>

            {/* Network Liveness Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Floating Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0e17]/90 backdrop-blur-xl border-t border-white/10 px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around relative">
          {/* HOME */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition ${
              activeTab === 'home' ? 'text-violet-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">HOME</span>
          </button>

          {/* BRAIN */}
          <button
            onClick={() => setActiveTab('brain')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition ${
              activeTab === 'brain' ? 'text-violet-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">BRAIN</span>
          </button>

          {/* DOMINANT CENTER LENS BUTTON */}
          <div className="relative -top-5">
            <button
              onClick={() => setActiveTab('lens')}
              className={`group relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 transform active:scale-95 shadow-2xl ${
                activeTab === 'lens'
                  ? 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 shadow-violet-600/60 ring-4 ring-violet-500/30 scale-105'
                  : 'bg-gradient-to-tr from-violet-600 to-indigo-700 shadow-violet-800/40 hover:scale-105'
              }`}
              title="Open RealityLens Camera"
            >
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-violet-400/50 animate-ping opacity-25 pointer-events-none" />
              <Camera className="w-8 h-8 text-white transition-transform group-hover:scale-110" />
            </button>
            <div className="text-center mt-1">
              <span className="text-[10px] font-bold tracking-wider text-violet-300">LENS</span>
            </div>
          </div>

          {/* DISCOVER */}
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition ${
              activeTab === 'discover' ? 'text-violet-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">DISCOVER</span>
          </button>

          {/* ME */}
          <button
            onClick={() => setActiveTab('me')}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition ${
              activeTab === 'me' ? 'text-violet-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">ME</span>
          </button>
        </div>
      </nav>
    </>
  );
};
