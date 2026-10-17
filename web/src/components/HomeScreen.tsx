import React, { useEffect, useState } from 'react';
import { Camera, Sparkles, ArrowRight, Clock, ShieldAlert, BookOpen, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Scan, LensMode } from '../types';

interface HomeScreenProps {
  onOpenLens: (presetPrompt?: string, presetMode?: LensMode) => void;
  onSelectScan: (scan: Scan) => void;
  onNavigateTab: (tab: 'home' | 'lens' | 'brain' | 'discover' | 'me') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenLens, onSelectScan, onNavigateTab }) => {
  const { user } = useAuth();
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentScans();
  }, []);

  const loadRecentScans = async () => {
    try {
      setLoading(true);
      const data = await api.getScans();
      setRecentScans(data);
    } catch (err) {
      // Offline or error
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts: Array<{ label: string; mode: LensMode; icon: string }> = [
    { label: 'What TF is this?', mode: 'general', icon: '❓' },
    { label: 'Explain this', mode: 'lockin', icon: '🧠' },
    { label: 'Translate this', mode: 'translate', icon: '🌐' },
    { label: 'Read notice', mode: 'campus', icon: '📋' },
    { label: 'Scan receipt', mode: 'receipt', icon: '🧾' },
    { label: 'Analyze code', mode: 'code', icon: '💻' },
    { label: 'Fix this', mode: 'science', icon: '🔧' },
    { label: 'Help me study', mode: 'lockin', icon: '📚' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.full_name ? `, ${user.full_name}` : '';
    if (hour < 12) return `Good morning${name}`;
    if (hour < 18) return `Good afternoon${name}`;
    return `Good evening${name}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-28 space-y-7 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20">
            Multimodal Visual Assistant
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          {getGreeting()}
        </h1>
        <p className="text-lg text-slate-300 font-medium">
          What are we looking at?
        </p>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <button
          onClick={() => onOpenLens()}
          className="relative overflow-hidden group flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-base shadow-xl shadow-violet-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg leading-tight font-extrabold">OPEN LENS</div>
              <div className="text-xs text-violet-200 font-normal">Point camera at reality</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigateTab('brain')}
          className="group flex items-center justify-between p-5 rounded-2xl bg-[#121522] border border-white/10 hover:border-violet-500/40 text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="text-lg leading-tight font-extrabold">ASK BRAIN</div>
              <div className="text-xs text-slate-400 font-normal">Search your saved knowledge</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Quick Intent Prompts */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Lenses
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => onOpenLens(qp.label, qp.mode)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141724] border border-white/5 hover:border-violet-500/40 text-slate-200 hover:text-white text-xs font-semibold transition-all hover:bg-violet-950/20 active:scale-95"
            >
              <span>{qp.icon}</span>
              <span>{qp.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity (Zero Fake Data) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Clock className="w-4 h-4" />
            <span>Recent Lens Scans</span>
          </div>
          {recentScans.length > 0 && (
            <span className="text-xs text-violet-400 font-medium">
              {recentScans.length} verified scans
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-2" />
            Loading your verified captures...
          </div>
        ) : recentScans.length === 0 ? (
          /* Honest Empty State */
          <div className="text-center py-12 px-6 rounded-2xl bg-[#11131e] border border-white/5 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400">
              <Camera className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                Your Lens history will appear here.
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No scans yet. Point your camera at an object, document, or code to start your real-world feed.
              </p>
            </div>
            <button
              onClick={() => onOpenLens()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/40 text-violet-300 text-xs font-bold border border-violet-500/30 transition"
            >
              Take First Scan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentScans.slice(0, 6).map((scan) => (
              <div
                key={scan.id}
                onClick={() => onSelectScan(scan)}
                className="group cursor-pointer flex items-center gap-3 p-3 rounded-2xl bg-[#121522] border border-white/5 hover:border-violet-500/40 transition hover:bg-[#161a2b]"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
                  <img
                    src={scan.thumbnail_url || scan.image_url}
                    alt={scan.mode}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      // Fallback if image path is not yet written
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {scan.is_blurry && (
                    <div className="absolute top-1 right-1 p-0.5 bg-amber-500/80 rounded" title="Blurry scan">
                      <ShieldAlert className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                      {scan.mode}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 truncate mt-1">
                    {scan.vision_result?.observed_facts?.[0]?.description ||
                     scan.vision_result?.observed_facts?.[0] ||
                     `Capture (${scan.width}x${scan.height})`}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {scan.is_saved_to_brain ? 'Saved to Brain' : 'Temporary scan'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
