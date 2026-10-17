import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Volume2, VolumeX, Send, Brain, BookmarkCheck, Calendar, 
  Receipt, Sparkles, AlertCircle, Share2, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Scan, Message, LanguageCode } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AnalysisModalProps {
  scan: Scan;
  onClose: () => void;
  onSavedToBrain?: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ scan, onClose, onSavedToBrain }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedToBrain, setSavedToBrain] = useState(scan.is_saved_to_brain);
  const [showFullImage, setShowFullImage] = useState(false);
  const [pendingToolTask, setPendingToolTask] = useState<any | null>(null);
  const [toolExecuting, setToolExecuting] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const vr = scan.vision_result;

  useEffect(() => {
    initChat();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [scan.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initChat = async () => {
    try {
      const convs = await api.request<any[]>('/chat/conversations');
      const matchingConv = convs.find((c) => c.scan_id === scan.id);
      if (matchingConv) {
        setConversationId(matchingConv.id);
        setMessages(matchingConv.messages || []);
      } else {
        // Fallback: initial message from vision result
        if (vr) {
          setMessages([
            {
              id: 'init_msg',
              conversation_id: 'local',
              sender: 'assistant',
              content: vr.response_markdown,
              epistemic_class: 'INFERRED',
              sources: [{ type: 'vision_result', provider: vr.provider_used }],
              created_at: scan.created_at,
            },
          ]);
        }
      }
    } catch (e) {
      console.warn("Could not load conversation", e);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text || isSending) return;

    setInputMessage('');
    setIsSending(true);

    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      conversation_id: conversationId || '',
      sender: 'user',
      content: text,
      epistemic_class: 'USER_PROVIDED',
      sources: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      if (!conversationId) {
        throw new Error('Visual context conversation not established.');
      }
      const response = await api.sendMessage(conversationId, text, user?.preferred_language);
      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        conversation_id: conversationId || '',
        sender: 'assistant',
        content: `Error retrieving response: ${err.message}`,
        epistemic_class: 'UNCERTAIN',
        sources: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Text-To-Speech Narration
  const toggleTTS = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = vr?.response_markdown || 'No content to read.';
    const cleanText = textToSpeak.replace(/[#*`>-]/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (user?.preferred_language === 'kn') {
      utterance.lang = 'kn-IN';
    } else if (user?.preferred_language === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Save to Brain
  const handleSaveToBrain = async () => {
    try {
      await api.saveScanToBrain(scan.id);
      setSavedToBrain(true);
      onSavedToBrain?.();
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    }
  };

  // Handle Suggested Agent Actions
  const handleTriggerAction = async (action: { label: string; action: string; payload: any }) => {
    if (action.action === 'SAVE_BRAIN') {
      await handleSaveToBrain();
      return;
    }

    try {
      setToolExecuting(true);
      if (action.action === 'CREATE_EXPENSE' || action.action === 'ADD_EXPENSE') {
        const extractedAmount = vr?.structured_entities?.amounts?.[0] || 0.0;
        const task = await api.executeTool('ADD_EXPENSE', {
          merchant: 'Receipt Vendor',
          amount: extractedAmount > 0 ? extractedAmount : 100.0,
          currency: 'INR',
          category: 'Food',
          date: new Date().toISOString().split('T')[0],
        });
        setPendingToolTask(task);
      } else if (action.action === 'CREATE_CALENDAR_EVENT') {
        const detectedDeadline = vr?.structured_entities?.deadlines?.[0] || 'Notice Deadline';
        const detectedDate = vr?.structured_entities?.dates?.[0] || new Date().toISOString().split('T')[0];
        const task = await api.executeTool('CREATE_CALENDAR_EVENT', {
          title: detectedDeadline,
          date: detectedDate,
          time: '10:00',
          duration_minutes: 60,
        });
        setPendingToolTask(task);
      }
    } catch (e: any) {
      alert(`Tool error: ${e.message}`);
    } finally {
      setToolExecuting(false);
    }
  };

  const handleConfirmTool = async (approved: boolean) => {
    if (!pendingToolTask) return;
    try {
      setToolExecuting(true);
      const res = await api.confirmTool(pendingToolTask.id, approved);
      setPendingToolTask(res);
      setTimeout(() => {
        setPendingToolTask(null);
      }, 2500);
    } catch (e: any) {
      alert(`Tool confirmation failed: ${e.message}`);
    } finally {
      setToolExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl h-[92vh] flex flex-col bg-[#0c0e17] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#101322]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-300 border border-violet-500/30">
              {scan.mode}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {scan.is_blurry && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Blur Warning
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTTS}
              className={`p-2 rounded-xl transition ${
                isSpeaking
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
              title={isSpeaking ? 'Mute Speech' : 'Listen with Audio'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleSaveToBrain}
              disabled={savedToBrain}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                savedToBrain
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {savedToBrain ? <BookmarkCheck className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              <span>{savedToBrain ? 'In Brain' : 'Save to Brain'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scanned Image Preview Drawer */}
        <div className="border-b border-white/5 bg-[#090b12]">
          <div
            onClick={() => setShowFullImage(!showFullImage)}
            className="flex items-center justify-between px-4 py-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200"
          >
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Captured Visual Frame ({scan.width}x{scan.height})</span>
            </div>
            {showFullImage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>

          {showFullImage && (
            <div className="p-3 bg-black flex justify-center max-h-56 overflow-hidden">
              <img
                src={scan.image_url}
                alt="Scan Context"
                className="max-h-52 object-contain rounded-xl border border-white/10"
              />
            </div>
          )}
        </div>

        {/* Tool Confirmation Banner (Section 42 & 44) */}
        {pendingToolTask && (
          <div className="p-4 bg-gradient-to-r from-violet-950 to-indigo-950 border-b border-violet-500/30 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>CONFIRMATION REQUIRED: {pendingToolTask.tool_name}</span>
              </div>
              <p className="text-xs text-slate-300">
                {pendingToolTask.tool_name === 'ADD_EXPENSE'
                  ? `Record ₹${pendingToolTask.payload?.amount} for ${pendingToolTask.payload?.merchant}?`
                  : `Schedule "${pendingToolTask.payload?.title}" on ${pendingToolTask.payload?.date}?`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pendingToolTask.status === 'PENDING_CONFIRMATION' ? (
                <>
                  <button
                    disabled={toolExecuting}
                    onClick={() => handleConfirmTool(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                  </button>
                  <button
                    disabled={toolExecuting}
                    onClick={() => handleConfirmTool(false)}
                    className="px-3 py-1.5 bg-rose-600/40 hover:bg-rose-600/60 text-white rounded-lg text-xs font-bold transition"
                  >
                    Decline
                  </button>
                </>
              ) : (
                <span className="text-xs font-bold text-emerald-400">
                  Status: {pendingToolTask.status}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Chat / Analysis Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Epistemic Badges & Suggested Actions */}
          {vr?.suggested_actions && vr.suggested_actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
              {vr.suggested_actions.map((act, i) => (
                <button
                  key={i}
                  onClick={() => handleTriggerAction(act)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{act.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-violet-600 text-white rounded-br-none shadow-md'
                    : 'bg-[#141726] border border-white/10 text-slate-200 rounded-bl-none'
                }`}
              >
                {/* Epistemic Header */}
                {m.sender === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        m.epistemic_class === 'OBSERVED'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : m.epistemic_class === 'UNCERTAIN'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-violet-500/20 text-violet-300'
                      }`}
                    >
                      {m.epistemic_class || 'INFERRED'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {m.sources?.[0]?.provider || 'RealityLens Core'}
                    </span>
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans">
                  {m.content}
                </div>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
              <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Reasoning over visual context...
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Follow-up Chips */}
        <div className="px-4 py-2 bg-[#0a0c14] border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleSendMessage('Explain like I am 10')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] whitespace-nowrap"
          >
            Explain like I'm 10
          </button>
          <button
            onClick={() => handleSendMessage('Explain in Kannada (ಕನ್ನಡ)')}
            className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-[11px] whitespace-nowrap font-medium"
          >
            ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸಿ
          </button>
          <button
            onClick={() => handleSendMessage('What does this do?')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] whitespace-nowrap"
          >
            What does it do?
          </button>
          <button
            onClick={() => handleSendMessage('Are there any warnings or risks?')}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] whitespace-nowrap"
          >
            Any warnings?
          </button>
        </div>

        {/* Bottom Message Input Bar */}
        <div className="p-3 bg-[#101322] border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a follow-up about this image..."
              className="flex-1 bg-[#181c2e] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
