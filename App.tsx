import React, { useState } from 'react';
import Welcome from './components/Welcome';
import Intake, { ThemeType } from './components/Intake';
import LiveSession from './components/LiveSession';
import { SessionPlan } from './services/geminiService';

type ViewState = 'welcome' | 'intake' | 'session';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('welcome');
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [sessionTheme, setSessionTheme] = useState<ThemeType>('sage');
  const [voiceName, setVoiceName] = useState<string>('Zephyr');

  const handleIntakeComplete = (plan: SessionPlan, theme: ThemeType, voice: string) => {
    setSessionPlan(plan);
    setSessionTheme(theme);
    setVoiceName(voice);
    setCurrentView('session');
  };

  const handleEndSession = () => {
    // Reset state to allow new session
    setSessionPlan(null);
    setCurrentView('welcome');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden relative">
      {/* Global decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-10 p-6 flex justify-between items-center backdrop-blur-sm bg-slate-950/30">
        <div className="text-xl font-bold tracking-tighter text-emerald-400">
          HypnoFlow<span className="text-white">.ai</span>
        </div>
        {currentView === 'session' && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Live Session</span>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center">
        {currentView === 'welcome' && (
          <Welcome onStart={() => setCurrentView('intake')} />
        )}

        {currentView === 'intake' && (
          <Intake onPlanReady={handleIntakeComplete} />
        )}

        {currentView === 'session' && sessionPlan && (
          <LiveSession 
            systemInstruction={sessionPlan.systemInstruction} 
            theme={sessionTheme}
            musicConfig={sessionPlan.musicConfig}
            voiceName={voiceName}
            onEndSession={handleEndSession} 
          />
        )}
      </main>
      
      <footer className="relative z-10 py-4 text-center text-slate-600 text-xs">
        <p>&copy; 2024 HypnoFlow AI Demo. Built with Gemini 3 Pro & Live API.</p>
      </footer>
    </div>
  );
};

export default App;