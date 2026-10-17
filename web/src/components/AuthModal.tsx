import React, { useState } from 'react';
import { Camera, Sparkles, ArrowRight, Eye, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AIPersonality, LanguageCode } from '../types';

export const AuthModal: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [personality, setPersonality] = useState<AIPersonality>('gen_z');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, fullName, language, personality);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoAccount = async () => {
    setError(null);
    setLoading(true);
    const demoEmail = `explorer_${Date.now().toString().slice(-4)}@realitylens.ai`;
    try {
      await register(demoEmail, 'RealityLensDemo2026!', 'Explorer', 'en', 'gen_z');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07080d]/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#101322] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Branding Header */}
        <div className="text-center space-y-2 relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-violet-600/40">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              REALITY<span className="text-violet-400">LENS</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              "See it. Get it. Do it."
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 relative">
          {isRegister && (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              minLength={6}
              className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {isRegister && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Personality
                </label>
                <select
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value as AIPersonality)}
                  className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="gen_z">GEN Z</option>
                  <option value="student">STUDENT</option>
                  <option value="desi">DESI</option>
                  <option value="professional">PROFESSIONAL</option>
                  <option value="teacher">TEACHER</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Create Account' : 'Sign In to RealityLens'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-[#101322] px-3 text-[10px] uppercase font-bold text-slate-500">
            Or Instant Onboarding
          </span>
        </div>

        <button
          onClick={handleQuickDemoAccount}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>Explore Instantly Without Registration</span>
        </button>

        <div className="text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-violet-400 hover:underline"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
