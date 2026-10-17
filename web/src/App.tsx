import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation } from './components/Navigation';
import { HomeScreen } from './components/HomeScreen';
import { LensScreen } from './components/LensScreen';
import { BrainScreen } from './components/BrainScreen';
import { DiscoverScreen } from './components/DiscoverScreen';
import { MeScreen } from './components/MeScreen';
import { AnalysisModal } from './components/AnalysisModal';
import { AuthModal } from './components/AuthModal';
import { Scan, LensMode } from './types';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'lens' | 'brain' | 'discover' | 'me'>('home');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Active scan detail modal
  const [activeScanModal, setActiveScanModal] = useState<Scan | null>(null);

  // Preset parameters for opening Lens from quick actions
  const [presetPrompt, setPresetPrompt] = useState<string>('');
  const [presetMode, setPresetMode] = useState<LensMode>('general');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOpenLens = (prompt?: string, mode?: LensMode) => {
    setPresetPrompt(prompt || '');
    setPresetMode(mode || 'general');
    setActiveTab('lens');
  };

  const handleScanCompleted = (scan: Scan) => {
    setActiveTab('home');
    setActiveScanModal(scan);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080d] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 animate-pulse flex items-center justify-center shadow-xl shadow-violet-600/40">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs text-slate-400 mt-4 tracking-widest uppercase font-mono">
          RealityLens Initializing...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col selection:bg-violet-500 selection:text-white">
      {/* Top Header & Bottom Bar Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
      />

      {/* Main Tab Screen Switcher */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeScreen
            onOpenLens={handleOpenLens}
            onSelectScan={(scan) => setActiveScanModal(scan)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'lens' && (
          <LensScreen
            initialPrompt={presetPrompt}
            initialMode={presetMode}
            onScanComplete={handleScanCompleted}
            onClose={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'brain' && <BrainScreen />}

        {activeTab === 'discover' && (
          <DiscoverScreen onOpenLens={handleOpenLens} />
        )}

        {activeTab === 'me' && <MeScreen />}
      </main>

      {/* Visual Context & Multi-turn Chat Modal */}
      {activeScanModal && (
        <AnalysisModal
          scan={activeScanModal}
          onClose={() => setActiveScanModal(null)}
          onSavedToBrain={() => {
            // Updated in brain
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
