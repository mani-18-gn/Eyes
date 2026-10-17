import React, { useState, useEffect } from 'react';
import { 
  Compass, BookOpen, GraduationCap, Code, Receipt, Globe, 
  HelpCircle, Sprout, ArrowRight, DollarSign, Plus
} from 'lucide-react';
import { LensMode, Expense } from '../types';
import { api } from '../services/api';

interface DiscoverScreenProps {
  onOpenLens: (presetPrompt?: string, presetMode?: LensMode) => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ onOpenLens }) => {
  const [activeSubTab, setActiveSubTab] = useState<'modes' | 'expenses'>('modes');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'expenses') {
      loadExpenses();
    }
  }, [activeSubTab]);

  const loadExpenses = async () => {
    try {
      setLoadingExpenses(true);
      const [expList, summary] = await Promise.all([
        api.getExpenses(),
        api.getExpenseSummary()
      ]);
      setExpenses(expList);
      setExpenseSummary(summary);
    } catch (e) {
      console.warn("Could not load expenses", e);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const discoveryModes: Array<{
    id: LensMode;
    title: string;
    tagline: string;
    description: string;
    icon: any;
    badge: string;
    presetPrompt: string;
  }> = [
    {
      id: 'lockin',
      title: 'LOCK IN — Student Mode',
      tagline: 'Deep study, proofs & viva prep',
      description: 'Point at textbook equations, circuit diagrams, or lecture notes. Generates hints, step-by-step breakdowns, and viva questions.',
      icon: GraduationCap,
      badge: 'Academic',
      presetPrompt: 'Teach me this step-by-step with formulas and a viva quiz question.'
    },
    {
      id: 'campus',
      title: 'CampusLens',
      tagline: 'Notices, circulars & deadlines',
      description: 'Reads college noticeboards, extracts timetable schedules and exam deadlines, and pushes reminders to your calendar.',
      icon: BookOpen,
      badge: 'College',
      presetPrompt: 'Extract all dates, deadlines, and requirements from this notice.'
    },
    {
      id: 'code',
      title: 'CodeLens',
      tagline: 'Syntax & bug analyzer',
      description: 'Point camera at code on screens or paper. Explains complexity, catches obvious syntax bugs, and generates test cases.',
      icon: Code,
      badge: 'Developer',
      presetPrompt: 'Analyze this code: explain complexity, point out potential bugs, and provide test cases.'
    },
    {
      id: 'receipt',
      title: 'Receipt / MoneyLens',
      tagline: 'Scan receipts & bills',
      description: 'Extracts merchant, line items, taxes, currency, and total amount. With one tap, confirms entry into your expense tracker.',
      icon: Receipt,
      badge: 'Finance',
      presetPrompt: 'Extract merchant, total amount, and date from this receipt.'
    },
    {
      id: 'general',
      title: 'What TF Is This?',
      tagline: 'Instant curiosity solver',
      description: 'Identify unknown gadgets, obscure cables, insects, architectural landmarks, or strange components in seconds.',
      icon: HelpCircle,
      badge: 'Explore',
      presetPrompt: 'What is this? Explain what it does, why it matters, and where it is used.'
    },
    {
      id: 'translate',
      title: 'Translate Lens',
      tagline: 'Signboards & notices',
      description: 'Bilingual text transcription with instant translation to Kannada, English, or Hindi, keeping original context.',
      icon: Globe,
      badge: 'Bilingual',
      presetPrompt: 'Transcribe this text and translate it into Kannada and English.'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20">
            Specialized Capabilities
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white mt-1">
          Discover
        </h1>
        <p className="text-xs text-slate-400">
          Modular visual intelligence built for students, builders, and everyday life.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-white/10 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('modes')}
          className={`pb-2.5 px-4 transition border-b-2 ${
            activeSubTab === 'modes'
              ? 'border-violet-500 text-violet-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Reality Modes
        </button>
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`pb-2.5 px-4 transition border-b-2 ${
            activeSubTab === 'expenses'
              ? 'border-violet-500 text-violet-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          MoneyLens (Expenses)
        </button>
      </div>

      {activeSubTab === 'modes' ? (
        /* Discovery Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {discoveryModes.map((dm) => {
            const IconComponent = dm.icon;
            return (
              <div
                key={dm.id}
                onClick={() => onOpenLens(dm.presetPrompt, dm.id)}
                className="group cursor-pointer p-4 rounded-2xl bg-[#121522] border border-white/5 hover:border-violet-500/40 transition hover:bg-[#151929] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-violet-600/15 text-violet-400 border border-violet-500/20">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                      {dm.badge}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                      {dm.title}
                    </h2>
                    <p className="text-xs text-violet-400/90 font-medium">
                      {dm.tagline}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {dm.description}
                  </p>
                </div>

                <div className="flex items-center justify-end text-xs font-bold text-violet-400 group-hover:translate-x-1 transition-transform">
                  <span>Launch Lens</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MoneyLens Expenses View */
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#121522] border border-white/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Tracked
              </span>
              <div className="text-2xl font-black text-emerald-400">
                ₹{expenseSummary?.total_amount || 0}
              </div>
              <span className="text-[11px] text-slate-500">
                From {expenseSummary?.count || 0} confirmed receipts
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121522] border border-white/5 flex flex-col justify-center">
              <button
                onClick={() => onOpenLens('Extract merchant and total amount from this bill', 'receipt')}
                className="w-full py-2.5 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Receipt className="w-4 h-4" /> Scan Receipt
              </button>
            </div>
          </div>

          {/* Expenses List */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recent Transactions
            </div>

            {loadingExpenses ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Loading expenses...
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-[#11131e] border border-white/5 space-y-2">
                <p className="text-xs font-semibold text-slate-300">No expenses recorded yet.</p>
                <p className="text-[11px] text-slate-500">
                  Scan a receipt with Lens or ask the Reality Agent to record one.
                </p>
              </div>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#121522] border border-white/5"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">{exp.merchant}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-white/5">{exp.category}</span>
                      <span>{exp.date}</span>
                    </div>
                  </div>
                  <div className="text-sm font-black text-emerald-400">
                    ₹{exp.amount}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
