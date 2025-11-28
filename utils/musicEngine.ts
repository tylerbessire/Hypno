// Lyria 2 Audio Engine
// Handles real-time generation of Ambient Pads, Binaural Beats, and Isochronic Tones using Web Audio API

export class LyriaEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Nodes
  private binauralLeft: OscillatorNode | null = null;
  private binauralRight: OscillatorNode | null = null;
  private isochronicOsc: OscillatorNode | null = null;
  private isochronicLFO: OscillatorNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  
  private isPlaying: boolean = false;

  constructor() {
    // Initialized on play to adhere to browser autoplay policies
  }

  private async init() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.5; // Default volume
  }

  public async play(config: { binauralFreq: number; baseFreq: number; isochronic: boolean; theme: string }) {
    if (!this.ctx) await this.init();
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
    
    this.stop(); // Clear previous
    this.isPlaying = true;

    const t = this.ctx!.currentTime;

    // --- 1. Ambient Pad (Noise + Filters) ---
    // Generate 5 seconds of noise and loop it through filters
    const bufferSize = this.ctx!.sampleRate * 5; 
    const buffer = this.ctx!.createBuffer(2, bufferSize, this.ctx!.sampleRate);
    
    let lastOut = 0;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        // Pinkish noise
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Compensate for gain loss
      }
    }

    this.ambientSource = this.ctx!.createBufferSource();
    this.ambientSource.buffer = buffer;
    this.ambientSource.loop = true;

    // Filter to make it "Ambient"
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400; // Deep sound
    filter.Q.value = 1;

    // Slow LFO for filter movement
    const filterLFO = this.ctx!.createOscillator();
    filterLFO.frequency.value = 0.1; // Slow breathing
    const lfoGain = this.ctx!.createGain();
    lfoGain.gain.value = 200; 
    filterLFO.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    filterLFO.start(t);

    const ambientGain = this.ctx!.createGain();
    ambientGain.gain.value = 0.15; // Subtle background

    this.ambientSource.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(this.masterGain!);
    this.ambientSource.start(t);


    // --- 2. Binaural Beats ---
    // Left Ear: Base
    // Right Ear: Base + Beat
    
    const merger = this.ctx!.createChannelMerger(2);
    
    this.binauralLeft = this.ctx!.createOscillator();
    this.binauralLeft.type = 'sine';
    this.binauralLeft.frequency.value = config.baseFreq;
    
    this.binauralRight = this.ctx!.createOscillator();
    this.binauralRight.type = 'sine';
    this.binauralRight.frequency.value = config.baseFreq + config.binauralFreq;

    // Connect to channels for stereo separation
    // Channel 0 is Left, Channel 1 is Right
    this.binauralLeft.connect(merger, 0, 0); 
    this.binauralRight.connect(merger, 0, 1);

    const binauralGain = this.ctx!.createGain();
    binauralGain.gain.value = 0.1; // Quiet

    merger.connect(binauralGain);
    binauralGain.connect(this.masterGain!);

    this.binauralLeft.start(t);
    this.binauralRight.start(t);


    // --- 3. Isochronic Tones (Optional) ---
    if (config.isochronic) {
      this.isochronicOsc = this.ctx!.createOscillator();
      this.isochronicOsc.type = 'sine';
      this.isochronicOsc.frequency.value = 150; // Lower tone

      this.isochronicLFO = this.ctx!.createOscillator();
      this.isochronicLFO.type = 'square'; // On/Off pulse
      this.isochronicLFO.frequency.value = config.binauralFreq; // Sync with beats

      const isoGain = this.ctx!.createGain();
      const lfoGainNode = this.ctx!.createGain();
      lfoGainNode.gain.value = 1.0; 

      // Modulate amplitude
      this.isochronicLFO.connect(lfoGainNode);
      lfoGainNode.connect(isoGain.gain);
      
      this.isochronicOsc.connect(isoGain);
      isoGain.connect(this.masterGain!);

      // Set initial gain 0, LFO will open it up. 
      // Actually for AM synthesis: Gain node base value 0, LFO adds to it.
      // Or: Gain node base value 0.5, LFO +/- 0.5. 
      // Square wave goes -1 to 1. 
      // Easier: Connect LFO to a gain node that controls the signal volume.
      
      isoGain.gain.value = 0;
      this.isochronicLFO.connect(isoGain.gain); // Modulate gain directly

      this.isochronicOsc.start(t);
      this.isochronicLFO.start(t);
    }
  }

  public setVolume(val: number) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx!.currentTime, 0.1);
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.ambientSource) { try { this.ambientSource.stop(); } catch(e){} this.ambientSource = null; }
    if (this.binauralLeft) { try { this.binauralLeft.stop(); } catch(e){} this.binauralLeft = null; }
    if (this.binauralRight) { try { this.binauralRight.stop(); } catch(e){} this.binauralRight = null; }
    if (this.isochronicOsc) { try { this.isochronicOsc.stop(); } catch(e){} this.isochronicOsc = null; }
    if (this.isochronicLFO) { try { this.isochronicLFO.stop(); } catch(e){} this.isochronicLFO = null; }
  }

  public destroy() {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const lyria = new LyriaEngine();