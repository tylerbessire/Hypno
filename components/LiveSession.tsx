import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Play, Mic, MicOff, PhoneOff, AlertCircle, Headphones, Clock, Music, Volume2, Volume1, VolumeX } from 'lucide-react';
import Orb from './Orb';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from '../utils/audioUtils';
import { ThemeType } from './Intake';
import { MusicConfig } from '../services/geminiService';
import { lyria } from '../utils/musicEngine';

interface LiveSessionProps {
  systemInstruction: string;
  theme: ThemeType;
  musicConfig: MusicConfig;
  onEndSession: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ systemInstruction, theme, musicConfig, onEndSession }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [currentVolume, setCurrentVolume] = useState(0); // 0-1 for visualizer
  const [modelState, setModelState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes in seconds
  const [musicVol, setMusicVol] = useState(0.3);

  // Refs for audio context and processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); // To store the session object
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Volume meter refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: any;
    if (isConnected) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onEndSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, onEndSession]);

  // Handle Music Volume
  useEffect(() => {
    lyria.setVolume(musicVol);
  }, [musicVol]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const connectToLiveAPI = useCallback(async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      
      // Explicitly resume contexts (browsers policy)
      await outputCtx.resume();
      await inputCtx.resume();
      
      audioContextRef.current = outputCtx;
      inputContextRef.current = inputCtx;

      // Start Lyria Music Engine
      await lyria.play({
        binauralFreq: musicConfig.binauralFreq,
        baseFreq: musicConfig.baseFreq,
        isochronic: musicConfig.isochronic,
        theme: theme
      });
      lyria.setVolume(musicVol);

      // Setup Input Stream with Production Constraints (Echo Cancellation is key for interruption)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, 
          },
          systemInstruction: systemInstruction,
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Session opened");
            setIsConnected(true);
            setModelState('listening');

            // Setup Audio Processing for Input
            const source = inputCtx.createMediaStreamSource(stream);
            // Buffer size 4096 gives decent latency/performance balance on main thread
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
            processorRef.current = processor;
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setModelState('speaking');
              
              const ctx = audioContextRef.current;
              if (!ctx) return;

              // Ensure we schedule ahead of current time
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(audioData),
                ctx
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              
              // Analyser for output volume (The Orb visualizes the Model's voice)
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 256;
              source.connect(analyser);
              analyser.connect(ctx.destination);
              analyserRef.current = analyser;

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              sourcesRef.current.add(source);
              
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setModelState('listening');
                  analyserRef.current = null;
                  setCurrentVolume(0);
                }
              };
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              console.log("Interrupted");
              // Stop all currently playing sources
              sourcesRef.current.forEach(src => {
                try { src.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              
              // Reset time cursor to now
              if (audioContextRef.current) {
                nextStartTimeRef.current = audioContextRef.current.currentTime;
              }
              setModelState('listening');
            }
          },
          onclose: () => {
            console.log("Session closed");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Session error:", err);
            setError("Connection interrupted.");
            setIsConnected(false);
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start session. Check permissions.");
    }
  }, [systemInstruction, musicConfig, theme, musicVol]);

  // Volume Polling for Visualizer
  useEffect(() => {
    volumeIntervalRef.current = window.setInterval(() => {
      if (analyserRef.current && modelState === 'speaking') {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setCurrentVolume(Math.min(1, avg / 128)); // Normalize roughly
      } else {
         setCurrentVolume(0);
      }
    }, 50);

    return () => {
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    };
  }, [modelState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lyria.stop(); // Stop music
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (inputContextRef.current) {
        inputContextRef.current.close();
      }
      if (sessionRef.current) {
        sessionRef.current.then((s: any) => {
             try { s.close(); } catch(e) {}
        });
      }
    };
  }, []);

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  const getThemeStyles = (t: ThemeType) => {
    switch (t) {
      case 'forest':
        return 'from-emerald-950 via-green-950 to-slate-950';
      case 'ocean':
        return 'from-cyan-950 via-blue-950 to-slate-950';
      case 'sunrise':
        return 'from-orange-950 via-rose-950 to-slate-950';
      case 'nebula':
      default:
        return 'from-slate-900 via-indigo-950 to-slate-900';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full min-h-[80vh] relative">
      
      {/* Background Ambience */}
      <div className={`absolute inset-0 bg-gradient-to-b ${getThemeStyles(theme)} opacity-80 z-0 pointer-events-none transition-colors duration-1000`} />
      
      {/* Headphone Recommendation */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 items-end z-30">
        <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-900/40 px-3 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm">
            <Headphones className="w-3 h-3" />
            <span>Headphones Required for Binaural Beats</span>
        </div>
        {isConnected && (
            <div className="flex items-center gap-2 bg-slate-900/40 px-3 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-sm">
                <Music className="w-3 h-3 text-purple-400" />
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={musicVol} 
                    onChange={(e) => setMusicVol(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        )}
      </div>

      {/* Visualizer */}
      <div className="z-10 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-1000">
        <Orb isActive={isConnected} volume={currentVolume} state={modelState} theme={theme} />
        
        {/* Timer */}
        {isConnected && (
           <div className="flex items-center gap-2 text-slate-400 font-mono text-sm tracking-widest bg-slate-900/40 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-md transition-all">
             <Clock className="w-4 h-4" />
             <span>{formatTime(timeLeft)}</span>
           </div>
        )}

        <div className="text-center space-y-2 max-w-md px-4">
          <h2 className="text-2xl font-light text-slate-200 tracking-wide">
            {isConnected ? (modelState === 'speaking' ? "Guiding..." : "Listening...") : "Initializing Room..."}
          </h2>
          <p className="text-slate-400 text-sm">
            {isConnected 
              ? "Speak naturally. Interrupt if you need to." 
              : "Connecting to secure therapy environment..."}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-8 z-20 flex gap-6 items-center bg-slate-800/80 backdrop-blur-md p-4 rounded-full shadow-2xl border border-slate-700">
        {!isConnected && !error ? (
          <button 
            onClick={connectToLiveAPI}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-4 transition-all hover:scale-105 shadow-lg shadow-indigo-500/20"
          >
            <Play className="w-6 h-6 fill-current" />
          </button>
        ) : (
          <>
            <button 
              onClick={toggleMic}
              className={`rounded-full p-4 transition-all ${micOn ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}
              title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={onEndSession}
              className="bg-red-600 hover:bg-red-500 text-white rounded-full p-4 transition-all hover:scale-105 shadow-lg shadow-red-500/20"
              title="End Session"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-red-200 px-6 py-3 rounded-lg flex items-center gap-3 shadow-xl z-50 backdrop-blur-sm border border-red-800">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:text-white underline text-sm">Dismiss</button>
        </div>
      )}
    </div>
  );
};

export default LiveSession;