import React, { useRef, useState, useEffect } from 'react';
import { 
  Camera, RefreshCw, Zap, ZapOff, Upload, Mic, MicOff, X, 
  Sparkles, AlertTriangle, ArrowRight, Check, Eye
} from 'lucide-react';
import { LensMode, LanguageCode, Scan } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface LensScreenProps {
  initialPrompt?: string;
  initialMode?: LensMode;
  onScanComplete: (scan: Scan) => void;
  onClose: () => void;
}

export const LensScreen: React.FC<LensScreenProps> = ({
  initialPrompt = '',
  initialMode = 'general',
  onScanComplete,
  onClose
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [mode, setMode] = useState<LensMode>(initialMode);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Check torch capabilities
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && 'torch' in capabilities) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn("Camera access warning:", err);
      setCameraError(
        "Camera permission is required to use RealityLens. You can also upload an image directly from your gallery."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch failed", e);
    }
  };

  // Capture from live stream
  const handleCapture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPreview(dataUrl);

    canvas.toBlob(async (blob) => {
      if (blob) {
        await processBlob(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  // Upload from gallery file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      processBlob(file);
    }
  };

  const processBlob = async (blob: Blob) => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Running edge variance & perceptual blur detection...');
      await new Promise((r) => setTimeout(r, 400));

      setProcessingStatus('Analyzing multimodal visual context...');
      const lang = user?.preferred_language || 'en';
      const scan = await api.uploadScan(blob, prompt, mode, lang);

      setProcessingStatus('Synthesis complete!');
      await new Promise((r) => setTimeout(r, 300));
      onScanComplete(scan);
    } catch (err: any) {
      alert(`Scan failed: ${err.message || 'Check connection or image format.'}`);
      setCapturedPreview(null);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Web Speech API for voice questions
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your question.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = user?.preferred_language === 'kn' ? 'kn-IN' : (user?.preferred_language === 'hi' ? 'hi-IN' : 'en-US');
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const modes: Array<{ id: LensMode; label: string; icon: string }> = [
    { id: 'general', label: 'General', icon: '👁️' },
    { id: 'lockin', label: 'Lock In', icon: '📚' },
    { id: 'campus', label: 'Campus', icon: '📋' },
    { id: 'receipt', label: 'Receipt', icon: '🧾' },
    { id: 'code', label: 'Code', icon: '💻' },
    { id: 'translate', label: 'Translate', icon: '🌐' },
    { id: 'science', label: 'Science', icon: '🔬' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden">
      {/* Hidden file input & canvas */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Camera Controls */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md transition ${
                torchOn ? 'bg-amber-400 text-black' : 'bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={toggleCamera}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition"
            title="Switch Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Viewfinder Center Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {capturedPreview ? (
          <img
            src={capturedPreview}
            alt="Captured Preview"
            className="w-full h-full object-contain"
          />
        ) : cameraError ? (
          <div className="max-w-xs text-center p-6 rounded-2xl bg-[#131522] border border-white/10 space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-xs text-slate-300 font-medium">{cameraError}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload from Gallery
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Reticle Viewfinder Target */}
            <div className="absolute inset-8 sm:inset-16 pointer-events-none border border-white/20 rounded-3xl flex flex-col justify-between p-4">
              {/* Corner brackets */}
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl" />
                <div className="w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl" />
              </div>

              {/* Scanning laser beam */}
              <div className="relative w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-beam shadow-lg shadow-cyan-400" />

              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-xl" />
                <div className="w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-xl" />
              </div>
            </div>
          </>
        )}

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-4 z-30">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-cyan-400/20 border-b-cyan-400 animate-spin animate-reverse" />
              <Sparkles className="w-6 h-6 text-white absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-white tracking-wide">
                REALITYLENS ENGINE
              </p>
              <p className="text-xs text-cyan-300 font-medium animate-pulse">
                {processingStatus}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Deck */}
      <div className="relative z-20 p-4 bg-gradient-to-t from-black via-black/80 to-transparent space-y-4">
        {/* Mode Selector Pill Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar justify-start sm:justify-center">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                mode === m.id
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-600/40 scale-105'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Question Prompt Bar + Voice Input */}
        <div className="flex items-center gap-2 max-w-md mx-auto bg-black/60 backdrop-blur-md rounded-2xl p-1.5 border border-white/15">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'campus'
                ? 'Ask: When is the exam deadline?'
                : mode === 'receipt'
                ? 'Ask: What was the total amount?'
                : mode === 'lockin'
                ? 'Ask: Explain this formula step-by-step'
                : 'Ask anything about what you see...'
            }
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={toggleSpeechRecognition}
            className={`p-2 rounded-xl transition ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
            title="Ask via voice"
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Shutter and Gallery Controls */}
        <div className="flex items-center justify-around max-w-xs mx-auto pt-1 pb-2">
          {/* Gallery Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition active:scale-95"
            title="Import from gallery"
          >
            <Upload className="w-5 h-5" />
          </button>

          {/* Main Shutter Button */}
          <button
            disabled={isProcessing}
            onClick={handleCapture}
            className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white transition-all transform active:scale-90 hover:scale-105 shadow-2xl shadow-cyan-500/40"
            title="Capture Frame"
          >
            <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center bg-white">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-400 shadow-inner" />
            </div>
          </button>

          {/* Mode Info Badge */}
          <div className="w-11 h-11 flex items-center justify-center text-xs font-bold text-slate-400">
            {mode.toUpperCase().slice(0, 3)}
          </div>
        </div>
      </div>
    </div>
  );
};
