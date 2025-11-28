import React, { useState } from 'react';
import { generateSessionPlan, SessionPlan } from '../services/geminiService';
import { Sparkles, ArrowRight, Loader2, BookOpen, Check, TreePine, Waves, Sun, Orbit } from 'lucide-react';

export type ThemeType = 'nebula' | 'forest' | 'ocean' | 'sunrise';

interface IntakeProps {
  onPlanReady: (plan: SessionPlan, theme: ThemeType) => void;
}

const Intake: React.FC<IntakeProps> = ({ onPlanReady }) => {
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('nebula');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) return;
    
    setLoading(true);
    try {
      const generatedPlan = await generateSessionPlan(issue);
      setPlan(generatedPlan);
    } catch (error) {
      alert("Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const themes: { id: ThemeType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'nebula', label: 'Cosmic Void', icon: <Orbit className="w-5 h-5"/>, color: 'bg-indigo-600' },
    { id: 'forest', label: 'Ancient Forest', icon: <TreePine className="w-5 h-5"/>, color: 'bg-emerald-700' },
    { id: 'ocean', label: 'Deep Ocean', icon: <Waves className="w-5 h-5"/>, color: 'bg-cyan-700' },
    { id: 'sunrise', label: 'Morning Light', icon: <Sun className="w-5 h-5"/>, color: 'bg-orange-600' },
  ];

  if (plan) {
    return (
      <div className="w-full max-w-3xl mx-auto p-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-full">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Session Plan Ready</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-2">Therapeutic Approach</h3>
              <p className="text-slate-200 leading-relaxed text-lg">{plan.summary}</p>
            </div>

            {plan.sources.length > 0 && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                <h3 className="text-indigo-400 text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Grounded in Medical Literature
                </h3>
                <ul className="space-y-2">
                  {plan.sources.map((source, idx) => (
                    <li key={idx}>
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-sm text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-2 truncate"
                      >
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0" />
                        {source.title || source.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-6 flex justify-end">
              <button 
                onClick={() => onPlanReady(plan, selectedTheme)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-medium transition-all hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              >
                Enter Virtual Room
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 animate-in fade-in duration-700">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-light text-white mb-3">What brings you here today?</h2>
        <p className="text-slate-400">
          Describe the issue you'd like to work on. Our AI will research clinical protocols and prepare a personalized session.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-slate-900 rounded-2xl p-2 ring-1 ring-slate-700/50">
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="I want to reduce my anxiety about public speaking..."
              className="w-full bg-transparent text-white placeholder-slate-500 p-4 h-32 focus:outline-none resize-none text-lg"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-slate-400 text-sm font-medium uppercase tracking-wider">Choose Environment</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                  ${selectedTheme === theme.id 
                    ? 'bg-slate-800 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                    : 'bg-slate-900 border-slate-700 hover:bg-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}
                `}
              >
                <div className={`p-2 rounded-full ${theme.color} text-white`}>
                  {theme.icon}
                </div>
                <span className="text-xs font-medium text-slate-300">{theme.label}</span>
                {selectedTheme === theme.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Powered by Gemini 2.5
            </div>
            <button
              type="submit"
              disabled={loading || !issue}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all
                ${loading || !issue 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-105'}
              `}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Design Session"}
            </button>
        </div>
      </form>
      
      {loading && (
        <div className="mt-8 text-center space-y-3 animate-in fade-in delay-200">
          <div className="text-indigo-400 text-sm font-medium animate-pulse">
            Consulting medical literature...
          </div>
          <p className="text-slate-500 text-xs">
            Designing a safe, evidence-based hypnosis plan for your virtual room.
          </p>
        </div>
      )}
    </div>
  );
};

export default Intake;