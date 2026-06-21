/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioSynthType } from '../types';
import { getAudioFile } from './indexedDB';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// Soundscape nodes
let activeSoundscapeSource: AudioNode | null = null;
let soundscapeGainNode: GainNode | null = null;
let soundscapeType: 'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen' = 'off';

/**
 * Initializes and unlocks the browser Web Audio API context.
 * This MUST be triggered on a user gesture (like the "Let's Begin" splash click).
 */
export function initAudioEngine(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioCtxClass();
    
    // Create master gain
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
    
    // Create soundscape gain node connected to master
    soundscapeGainNode = audioCtx.createGain();
    soundscapeGainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    soundscapeGainNode.connect(masterGain);
    
    console.log('Audio engine initialized & unlocked successfully.');
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  return audioCtx;
}

export function isAudioActive(): boolean {
  return !!audioCtx && audioCtx.state === 'running';
}

/**
 * Utility to create standard CPU-friendly White Noise Buffer
 */
function createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Utility to create standard CPU-friendly Brown Noise Buffer
 */
function createBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Low pass filter white noise to get brownian noise
    data[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5; // Compensate for loss of gain
  }
  return buffer;
}

/**
 * Play a focus soundscape
 */
export function startFocusSoundscape(type: 'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen') {
  if (!audioCtx || !soundscapeGainNode) {
    initAudioEngine();
  }
  
  const ctx = audioCtx!;
  
  // Stop existing soundscape
  stopFocusSoundscape();
  soundscapeType = type;
  
  if (type === 'off') return;
  
  // Reset volume level to standard full range
  soundscapeGainNode!.gain.setTargetAtTime(0.4, ctx.currentTime, 0.1);
  
  if (type === 'white') {
    // Upgraded: Calm White Noise filtered as a soft, gentle high-altitude breezeway
    const buffer = createWhiteNoiseBuffer(ctx);
    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = true;
    
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1000, ctx.currentTime);
    lowpass.Q.setValueAtTime(0.6, ctx.currentTime);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, ctx.currentTime);
    
    bufferSource.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(soundscapeGainNode!);
    bufferSource.start();
    
    activeSoundscapeSource = {
      disconnect: () => {
        try {
          bufferSource.stop();
          bufferSource.disconnect();
          lowpass.disconnect();
          noiseGain.disconnect();
        } catch (e) {}
      }
    } as any;
  } else if (type === 'brown') {
    // Upgraded: Warm Deep Cabin Rumble
    const buffer = createBrownNoiseBuffer(ctx);
    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = true;
    
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(160, ctx.currentTime);
    lowpass.Q.setValueAtTime(0.7, ctx.currentTime);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, ctx.currentTime);
    
    bufferSource.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(soundscapeGainNode!);
    bufferSource.start();
    
    activeSoundscapeSource = {
      disconnect: () => {
        try {
          bufferSource.stop();
          bufferSource.disconnect();
          lowpass.disconnect();
          noiseGain.disconnect();
        } catch (e) {}
      }
    } as any;
  } else if (type === 'thunder') {
    // Upgraded: Soft Distant Summer Thunder - zero shocking strikes!
    // Creates a continuous low-level ambient rain bed with extremely gentle, slow-fading sub rumbles
    const rainBed = ctx.createBufferSource();
    rainBed.buffer = createWhiteNoiseBuffer(ctx);
    rainBed.loop = true;
    
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(700, ctx.currentTime);
    
    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.04, ctx.currentTime);
    
    rainBed.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(soundscapeGainNode!);
    rainBed.start();
    
    const rumbleNoise = ctx.createBufferSource();
    rumbleNoise.buffer = createBrownNoiseBuffer(ctx);
    rumbleNoise.loop = true;
    
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(75, ctx.currentTime);
    
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.01, ctx.currentTime);
    
    rumbleNoise.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(soundscapeGainNode!);
    rumbleNoise.start();
    
    // Distant rumble timer (slow attack of 3.5s, slow decay of 6s)
    let rumbleIntervalId = setInterval(() => {
      if (!audioCtx || soundscapeType !== 'thunder') {
        clearInterval(rumbleIntervalId);
        return;
      }
      const now = ctx.currentTime;
      const attack = 3.0 + Math.random() * 2.0;    // extremely slow onset
      const sustain = 1.0 + Math.random() * 2.5;   // prolonged roll
      const decay = 5.0 + Math.random() * 3.0;     // smooth fadeout
      
      const targetGain = 0.08 + Math.random() * 0.12; // soft volume level
      
      rumbleGain.gain.setValueAtTime(rumbleGain.gain.value, now);
      rumbleGain.gain.linearRampToValueAtTime(targetGain, now + attack);
      rumbleGain.gain.setValueAtTime(targetGain, now + attack + sustain);
      rumbleGain.gain.exponentialRampToValueAtTime(0.005, now + attack + sustain + decay);
      
      // Shift filter resonance to simulate cloud drift
      rumbleFilter.frequency.setValueAtTime(60 + Math.random() * 30, now);
      rumbleFilter.frequency.linearRampToValueAtTime(32, now + attack + sustain + decay);
    }, 11000);
    
    activeSoundscapeSource = {
      disconnect: () => {
        try {
          clearInterval(rumbleIntervalId);
          rainBed.stop();
          rainBed.disconnect();
          rainFilter.disconnect();
          rainGain.disconnect();
          
          rumbleNoise.stop();
          rumbleNoise.disconnect();
          rumbleFilter.disconnect();
          rumbleGain.disconnect();
        } catch (e) {}
      }
    } as any;
  } else if (type === 'rain') {
    // Upgraded: Cinematic Gentle Rainstorm
    // Low passed warm drops & ultra-faint high mist moving with slow wind swells
    const rainNoise = ctx.createBufferSource();
    rainNoise.buffer = createWhiteNoiseBuffer(ctx);
    rainNoise.loop = true;
    
    const rainFilterLow = ctx.createBiquadFilter();
    rainFilterLow.type = 'lowpass';
    rainFilterLow.frequency.setValueAtTime(800, ctx.currentTime);
    
    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.08, ctx.currentTime);
    
    rainNoise.connect(rainFilterLow);
    rainFilterLow.connect(rainGain);
    rainGain.connect(soundscapeGainNode!);
    rainNoise.start();
    
    // Smooth 12s foliage wind wave
    const rainSwell = ctx.createOscillator();
    rainSwell.type = 'sine';
    rainSwell.frequency.setValueAtTime(0.08, ctx.currentTime);
    
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.02, ctx.currentTime);
    
    rainSwell.connect(swellGain);
    swellGain.connect(rainGain.gain);
    rainSwell.start();
    
    // High-pitched mist sizzle
    const mistNoise = ctx.createBufferSource();
    mistNoise.buffer = createWhiteNoiseBuffer(ctx);
    mistNoise.loop = true;
    
    const mistFilter = ctx.createBiquadFilter();
    mistFilter.type = 'bandpass';
    mistFilter.frequency.setValueAtTime(2400, ctx.currentTime);
    mistFilter.Q.setValueAtTime(0.4, ctx.currentTime);
    
    const mistGain = ctx.createGain();
    mistGain.gain.setValueAtTime(0.012, ctx.currentTime);
    
    mistNoise.connect(mistFilter);
    mistFilter.connect(mistGain);
    mistGain.connect(soundscapeGainNode!);
    mistNoise.start();
    
    activeSoundscapeSource = {
      disconnect: () => {
        try {
          rainNoise.stop();
          rainSwell.stop();
          mistNoise.stop();
          
          rainNoise.disconnect();
          rainFilterLow.disconnect();
          rainGain.disconnect();
          rainSwell.disconnect();
          swellGain.disconnect();
          
          mistNoise.disconnect();
          mistFilter.disconnect();
          mistGain.disconnect();
        } catch (e) {}
      }
    } as any;
  } else if (type === 'ocean') {
    // Upgraded: Ultra-calming Breathing Ocean Shore 
    // Designed at a slow therapeutic rate of ~14.2s (0.07Hz LFO) for deep flow state
    const waveNoise = ctx.createBufferSource();
    waveNoise.buffer = createBrownNoiseBuffer(ctx);
    waveNoise.loop = true;
    
    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.setValueAtTime(220, ctx.currentTime);
    waveFilter.Q.setValueAtTime(0.9, ctx.currentTime);
    
    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.05, ctx.currentTime);
    
    waveNoise.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(soundscapeGainNode!);
    waveNoise.start();
    
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.07, ctx.currentTime); // ~14s period
    
    const lfoGainFreq = ctx.createGain();
    lfoGainFreq.gain.setValueAtTime(120, ctx.currentTime); // mod filter between 100Hz and 340Hz
    
    const lfoGainVol = ctx.createGain();
    lfoGainVol.gain.setValueAtTime(0.04, ctx.currentTime); // mod gain between 0.01 and 0.09
    
    lfo.connect(lfoGainFreq);
    lfoGainFreq.connect(waveFilter.frequency);
    
    lfo.connect(lfoGainVol);
    lfoGainVol.connect(waveGain.gain);
    lfo.start();
    
    activeSoundscapeSource = {
      disconnect: () => {
        try {
          waveNoise.stop();
          lfo.stop();
          
          waveNoise.disconnect();
          waveFilter.disconnect();
          waveGain.disconnect();
          lfo.disconnect();
          lfoGainFreq.disconnect();
          lfoGainVol.disconnect();
        } catch (e) {}
      }
    } as any;
  } else if (type === 'zen') {
    // Our own custom soundscape: "Zen Harmony & Healing Bells"
    // Deep backing warm hum with a generative pentatonic chime schedule with absolutely soft, slow-fading attacks and long resonant tails
    const backingSource = ctx.createBufferSource();
    backingSource.buffer = createBrownNoiseBuffer(ctx);
    backingSource.loop = true;
    
    const backingFilter = ctx.createBiquadFilter();
    backingFilter.type = 'lowpass';
    backingFilter.frequency.setValueAtTime(140, ctx.currentTime);
    
    const backingGain = ctx.createGain();
    backingGain.gain.setValueAtTime(0.04, ctx.currentTime);
    
    backingSource.connect(backingFilter);
    backingFilter.connect(backingGain);
    backingGain.connect(soundscapeGainNode!);
    backingSource.start();
    
    const activeBells: OscillatorNode[] = [];
    
    // Scale: D-Major Focus Pentatonic [D3, E4, F#4, A4, B4, D5]
    const scales = [146.83, 329.63, 369.99, 440.00, 493.88, 587.33];
    
    const triggerZenBell = () => {
      if (!audioCtx || soundscapeType !== 'zen') return;
      const t = ctx.currentTime;
      const freq = scales[Math.floor(Math.random() * scales.length)];
      
      const bellOsc = ctx.createOscillator();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(freq, t);
      
      // Detuned chorus element to add dreaminess
      const chorusOsc = ctx.createOscillator();
      chorusOsc.type = 'sine';
      chorusOsc.frequency.setValueAtTime(freq + (Math.random() * 1.5 - 0.75), t);
      
      const bellGain = ctx.createGain();
      // Absolutely soft entry - 1.8 second slow attack so there is NO popping or shocking hammer hit!
      bellGain.gain.setValueAtTime(0, t);
      bellGain.gain.linearRampToValueAtTime(0.12, t + 1.8);
      // Continuous 8 second lazy decay
      bellGain.gain.setValueAtTime(0.12, t + 2.2);
      bellGain.gain.exponentialRampToValueAtTime(0.0002, t + 9.5);
      
      const bellFilter = ctx.createBiquadFilter();
      bellFilter.type = 'lowpass';
      bellFilter.frequency.setValueAtTime(1000, t);
      
      bellOsc.connect(bellFilter);
      chorusOsc.connect(bellFilter);
      bellFilter.connect(bellGain);
      bellGain.connect(soundscapeGainNode!);
      
      bellOsc.start(t);
      chorusOsc.start(t);
      activeBells.push(bellOsc, chorusOsc);
      
      // Auto cleanup active bell oscillators when they expire
      setTimeout(() => {
        try {
          bellOsc.stop();
          chorusOsc.stop();
          bellOsc.disconnect();
          chorusOsc.disconnect();
          bellFilter.disconnect();
          bellGain.disconnect();
        } catch (e) {}
        const idx1 = activeBells.indexOf(bellOsc);
        if (idx1 > -1) activeBells.splice(idx1, 1);
        const idx2 = activeBells.indexOf(chorusOsc);
        if (idx2 > -1) activeBells.splice(idx2, 1);
      }, 10500);
    };
    
    // Initial soothing trigger
    triggerZenBell();
    
    // Soothing trigger loop every 7.5 seconds
    let zenInterval = setInterval(() => {
      triggerZenBell();
    }, 7500);
    
    activeSoundscapeSource = {
      disconnect: () => {
        try {
          clearInterval(zenInterval);
          backingSource.stop();
          backingSource.disconnect();
          backingFilter.disconnect();
          backingGain.disconnect();
          
          activeBells.forEach(bell => {
            try {
              bell.stop();
              bell.disconnect();
            } catch(e){}
          });
        } catch (e) {}
      }
    } as any;
  }
}

export function stopFocusSoundscape() {
  if (activeSoundscapeSource) {
    try {
      if ('stop' in activeSoundscapeSource) {
        (activeSoundscapeSource as any).stop();
      }
      activeSoundscapeSource.disconnect();
    } catch (e) {}
    activeSoundscapeSource = null;
  }
  soundscapeType = 'off';
}

/**
 * Gradually ducks the soundscape volume down when an alarm triggers, and restores it when dismissed.
 */
export function duckSoundscape(on: boolean) {
  if (!soundscapeGainNode || !audioCtx) return;
  const targetVal = on ? 0.04 : 0.4; // Duck to 10% volume, or restore to 100% (0.4)
  soundscapeGainNode.gain.setTargetAtTime(targetVal, audioCtx.currentTime, 0.3);
}

/**
 * Text-To-Speech (TTS) custom label speak
 */
export function speakLabel(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      // Cancel any ongoing speaking immediately
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS Speech failed:', err);
    }
  }
}

/**
 * Synthesizer Tone Player
 */
export function playSynthesizerAlarm(type: AudioSynthType, durationMs: number = 3000) {
  if (!audioCtx || !masterGain) {
    initAudioEngine();
  }
  
  const ctx = audioCtx!;
  const currentTime = ctx.currentTime;
  
  // Make sure to duck any focus soundscapes
  duckSoundscape(true);
  
  // Create an alarm-specific GainNode
  const alarmGainNode = ctx.createGain();
  alarmGainNode.gain.setValueAtTime(0, currentTime);
  alarmGainNode.connect(masterGain!);
  
  // Create and play synth components
  const activeNodes: (OscillatorNode | BiquadFilterNode)[] = [];
  
  if (type === 'beep') {
    // Repeating sharp high-pitched beeps
    alarmGainNode.gain.linearRampToValueAtTime(0.7, currentTime + 0.05);
    
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, currentTime);
    osc.connect(alarmGainNode);
    osc.start(currentTime);
    activeNodes.push(osc);
    
    // Program alternating frequency or silence pulses
    const pulseCount = Math.floor(durationMs / 300);
    for (let i = 0; i < pulseCount; i++) {
      const pulseTime = currentTime + (i * 0.3);
      if (pulseTime < currentTime + (durationMs / 1000)) {
        alarmGainNode.gain.setValueAtTime(0.7, pulseTime);
        alarmGainNode.gain.setValueAtTime(0, pulseTime + 0.15);
      }
    }
  } 
  else if (type === 'chime') {
    // Dual bell ring with exponent decay
    alarmGainNode.gain.linearRampToValueAtTime(0.8, currentTime + 0.05);
    alarmGainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + (durationMs / 1000));
    
    // Add harmonic frequencies
    const f1 = 880; // A5
    const f2 = 1100; // C#6
    const f3 = 1320; // E6
    
    [f1, f2, f3].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, currentTime);
      
      const multiplierGain = ctx.createGain();
      multiplierGain.gain.setValueAtTime(idx === 0 ? 0.6 : (idx === 1 ? 0.3 : 0.15), currentTime);
      
      osc.connect(multiplierGain);
      multiplierGain.connect(alarmGainNode);
      osc.start(currentTime);
      activeNodes.push(osc);
    });
  } 
  else if (type === 'pulsar') {
    // Space sci-fi frequency sweep swoosh
    alarmGainNode.gain.linearRampToValueAtTime(0.6, currentTime + 0.1);
    
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.connect(alarmGainNode);
    osc.start(currentTime);
    activeNodes.push(osc);
    
    // Low pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(10, currentTime);
    
    osc.disconnect(alarmGainNode);
    osc.connect(filter);
    filter.connect(alarmGainNode);
    activeNodes.push(filter);
    
    const pulseCount = Math.floor(durationMs / 400);
    for (let i = 0; i < pulseCount; i++) {
      const t = currentTime + (i * 0.4);
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.3);
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
    }
  } 
  else if (type === 'vibrate') {
    // Telephone rapid buzzing vibrating tone
    alarmGainNode.gain.linearRampToValueAtTime(0.8, currentTime + 0.05);
    
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, currentTime);
    osc.connect(alarmGainNode);
    osc.start(currentTime);
    activeNodes.push(osc);
    
    const buzzCount = Math.floor(durationMs / 100);
    for (let i = 0; i < buzzCount; i++) {
      const t = currentTime + (i * 0.1);
      alarmGainNode.gain.setValueAtTime(i % 2 === 0 ? 0.8 : 0.05, t);
    }
  } 
  else if (type === 'gong') {
    // Deep oriental gong rumble
    alarmGainNode.gain.linearRampToValueAtTime(0.9, currentTime + 0.01);
    alarmGainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + (durationMs / 1000));
    
    const pitches = [120, 180, 240, 290, 360];
    pitches.forEach((p, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(p, currentTime);
      
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(idx === 0 ? 0.5 : 0.25, currentTime);
      
      osc.connect(subGain);
      subGain.connect(alarmGainNode);
      osc.start(currentTime);
      activeNodes.push(osc);
    });
  } 
  else {
    // Standard Custom sweep beep
    alarmGainNode.gain.linearRampToValueAtTime(0.7, currentTime + 0.1);
    alarmGainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + (durationMs / 1000));
    
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, currentTime + 0.5);
    osc.connect(alarmGainNode);
    osc.start(currentTime);
    activeNodes.push(osc);
  }
  
  // Cleanup synth oscillators to avoid sound leaks & overflow
  setTimeout(() => {
    activeNodes.forEach(node => {
      try {
        if ('stop' in node) {
          (node as any).stop();
        }
        node.disconnect();
      } catch (e) {}
    });
    try {
      alarmGainNode.disconnect();
    } catch (e) {}
    
    // Restore soundscapes after the alarm synth clears
    duckSoundscape(false);
  }, durationMs + 200);
}

/**
 * Plays a discrete, subtle progress beep (low click cue) 
 * at the 50% and 75% thresholds of a sprint countdown to enrich user spatial cognition.
 */
export function playProgressCue(percent: 50 | 75) {
  if (!audioCtx || !masterGain) return;
  
  const ctx = audioCtx;
  const t = ctx.currentTime;
  
  const node = ctx.createOscillator();
  const cueGain = ctx.createGain();
  
  node.type = 'sine';
  node.frequency.setValueAtTime(percent === 50 ? 523.25 : 659.25, t); // C5 or E5
  
  cueGain.gain.setValueAtTime(0, t);
  cueGain.gain.linearRampToValueAtTime(0.2, t + 0.02);
  cueGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  
  node.connect(cueGain);
  cueGain.connect(masterGain);
  
  node.start(t);
  
  setTimeout(() => {
    try {
      node.stop();
      node.disconnect();
      cueGain.disconnect();
    } catch (e) {}
  }, 300);
}

/**
 * Play custom uploaded audio tracks fetched from IndexedDB
 */
export async function playCustomAudioFile(id: string, durationMs: number = 5000): Promise<AudioBufferSourceNode | null> {
  if (!audioCtx || !masterGain) {
    initAudioEngine();
  }
  
  const ctx = audioCtx!;
  duckSoundscape(true);
  
  const fileData = await getAudioFile(id);
  if (!fileData) {
    console.warn(`Custom audio file ${id} not found in IndexedDB store.`);
    return null;
  }
  
  try {
    // Copy the ArrayBuffer before decoding because decodeAudioData consumes the buffer
    const bufferCopy = fileData.data.slice(0);
    const audioBuffer = await ctx.decodeAudioData(bufferCopy);
    
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.8, ctx.currentTime);
    
    sourceNode.connect(gainNode);
    gainNode.connect(masterGain!);
    
    sourceNode.start(0);
    
    // Graceful fade out and stop
    setTimeout(() => {
      try {
        gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        setTimeout(() => {
          try {
            sourceNode.stop();
            sourceNode.disconnect();
            gainNode.disconnect();
          } catch(e){}
          duckSoundscape(false);
        }, 1500);
      } catch (e) {
        duckSoundscape(false);
      }
    }, durationMs);
    
    return sourceNode;
  } catch (err) {
    console.error('Decoding error or playback crash for custom audio:', err);
    duckSoundscape(false);
    return null;
  }
}
