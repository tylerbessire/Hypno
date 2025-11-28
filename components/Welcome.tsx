import React from 'react';
import { BrainCircuit, ShieldAlert } from 'lucide-react';

interface WelcomeProps {
  onStart: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 max-w-4xl mx-auto space-y-12">
      
      <div className="space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full"></div>
          <BrainCircuit className="w-24 h-24 text-indigo-400 relative z-10 mx-auto" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-purple-200 to-white tracking-tight">
          HypnoFlow AI
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
          Experience real-time, adaptive hypnosis therapy guided by state-of-the-art generative AI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
          <h3 className="text-indigo-400 font-semibold mb-2">Personalized</h3>
          <p className="text-slate-400 text-sm">Every session is uniquely crafted based on your specific needs using real-time research.</p>
        </div>
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
          <h3 className="text-purple-400 font-semibold mb-2">Immersive</h3>
          <p className="text-slate-400 text-sm">Step into a virtual room with a responsive visualizer and natural voice guidance.</p>
        </div>
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
          <h3 className="text-teal-400 font-semibold mb-2">Grounded</h3>
          <p className="text-slate-400 text-sm">Techniques are based on medical literature sourced via Google Search.</p>
        </div>
      </div>

      <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-4 flex gap-4 text-left max-w-2xl">
        <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
        <p className="text-xs text-red-200/80">
          <strong>Disclaimer:</strong> This is an AI demonstration. It is not a replacement for professional medical treatment or therapy. 
          Do not use if you have a history of psychosis, seizures, or severe mental health conditions.
        </p>
      </div>

      <button 
        onClick={onStart}
        className="group relative px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 transition-all hover:-translate-y-1 overflow-hidden"
      >
        <span className="relative z-10">Start Your Journey</span>
        <div className="absolute inset-0 bg-indigo-50 group-hover:scale-x-100 scale-x-0 transition-transform origin-left duration-500 ease-out z-0 opacity-20"></div>
      </button>

    </div>
  );
};

export default Welcome;