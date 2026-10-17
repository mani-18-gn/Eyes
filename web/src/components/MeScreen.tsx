import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Key, ShieldCheck, Sparkles, LogOut, CheckCircle2, 
  HelpCircle, Settings, Award, Globe, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AIPersonality, LanguageCode, HealthStatus } from '../types';

export const MeScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [wrapped, setWrapped] = useState<any | null>(null);

  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [keySavedMessage, setKeySavedMessage] = useState('');
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      const [hRes, wRes] = await Promise.all([
        api.getHealth(),
        api.getRealityWrapped()
      ]);
      setHealth(hRes);
      setWrapped(wRes);
    } catch (e) {
      console.warn("Could not load settings data", e);
    }
  };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKey && !openaiKey) return;
    try {
      setIsSavingKeys(true);
      await api.updateAPIKeys(geminiKey || undefined, openaiKey || undefined);
      setKeySavedMessage("API credentials verified and activated in live engine runtime!");
      setGeminiKey('');
      setOpenaiKey('');
      await loadSettingsData();
      setTimeout(() => setKeySavedMessage(''), 4000);
    } catch (e: any) {
      alert(`Key update failed: ${e.message}`);
    } finally {
      setIsSavingKeys(false);
    }
  };

  const personalities: Array<{ id: AIPersonality; label: string; desc: string }> = [
    { id: 'gen_z', label: 'GEN Z', desc: 'Sharp, concise, high-energy, modern terminology.' },
    { id: 'student', label: 'STUDENT', desc: 'Explains underlying principles, formulas, and viva questions.' },
    { id: 'professional', label: 'PROFESSIONAL', desc: 'Executive tone, bullet points, and actionable takeaways.' },
    { id: 'desi', label: 'DESI / CONVERSATIONAL', desc: 'Bilingual code-switching (Kannada/Hindi + English words).' },
    { id: 'teacher', label: 'TEACHER', desc: 'Patient pedagogical breakdowns with simple analogies.' },
    { id: 'simple', label: 'SIMPLE (ELI5)', desc: 'Ultra-simple, zero jargon, everyday relatable examples.' }
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-28 space-y-7 animate-in fade-in duration-300">
      {/* Profile Header */}
      <div className="flex items-center justify-between p-5 rounded-3xl bg-[#121522] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-violet-600/30">
            {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-0.5">
            <h1 className="text-base font-bold text-white">
              {user?.full_name || 'RealityLens User'}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {user?.email}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                {user?.ai_personality}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                LANG: {user?.preferred_language}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Reality Wrapped Section (Section 48 - Zero Fake Stats) */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-950/40 via-[#121522] to-cyan-950/20 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
            <Award className="w-4 h-4 text-cyan-400" />
            <span>Your Reality Wrapped</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">GROUND TRUTH ONLY</span>
        </div>

        {wrapped?.has_enough_activity ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
              <div className="text-2xl font-black text-cyan-400">{wrapped.stats.total_scans}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 mt-1">Scans</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
              <div className="text-2xl font-black text-violet-400">{wrapped.stats.saved_memories}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 mt-1">Memories</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
              <div className="text-2xl font-black text-emerald-400">{wrapped.stats.tracked_expenses}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 mt-1">Expenses</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-center">
              <div className="text-2xl font-black text-amber-400">{wrapped.stats.executed_actions}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 mt-1">Agent Actions</div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {wrapped?.message || "Not enough activity yet for your Wrapped. Start by scanning with Lens!"}
          </p>
        )}
      </div>

      {/* AI Personality Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>AI Personality Mode</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {personalities.map((p) => (
            <button
              key={p.id}
              onClick={() => updateUser({ ai_personality: p.id })}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                user?.ai_personality === p.id
                  ? 'bg-violet-600/20 border-violet-500 shadow-md shadow-violet-900/20'
                  : 'bg-[#121522] border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{p.label}</span>
                {user?.ai_personality === p.id && (
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* External AI Provider & API Keys Configuration */}
      <div className="p-5 rounded-3xl bg-[#121522] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>AI Provider & API Keys</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              health?.gemini_configured || health?.openai_configured
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {health?.gemini_configured || health?.openai_configured
              ? `LIVE: ${health.ai_provider.toUpperCase()}`
              : 'DETERMINISTIC LOCAL INSPECTION'}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          RealityLens supports direct cloud multimodal reasoning with Google Gemini or OpenAI GPT-4o. When no key is configured, it operates in strict deterministic inspection mode without faking outputs.
        </p>

        {keySavedMessage && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{keySavedMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveKeys} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={health?.gemini_configured ? "•••••••••••••••••••• (Configured)" : "Enter Gemini API Key..."}
              className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={health?.openai_configured ? "•••••••••••••••••••• (Configured)" : "Enter OpenAI API Key..."}
              className="w-full bg-[#181c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingKeys || (!geminiKey && !openaiKey)}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              {isSavingKeys ? "Saving..." : "Save AI Credentials"}
            </button>
          </div>
        </form>
      </div>

      {/* Privacy & Retention Governance */}
      <div className="p-5 rounded-3xl bg-[#121522] border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Privacy & Data Sovereignty</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          RealityLens never continuously streams your camera feed to any server. Images are only processed upon explicit capture or upload. User memory and brain documents are protected with tenant-level authorization and are never shared across accounts.
        </p>
      </div>
    </div>
  );
};
