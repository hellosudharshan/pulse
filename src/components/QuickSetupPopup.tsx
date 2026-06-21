/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  X, 
  Mic, 
  MicOff, 
  Sparkles, 
  Bell, 
  Clock, 
  ArrowRight, 
  Loader2, 
  ShieldAlert, 
  Check, 
  Volume2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduledTask } from '../types';
import { getAllAudioFiles, deleteAudioFile } from '../lib/indexedDB';
import SearchableDropdown from './SearchableDropdown';

interface QuickSetupPopupProps {
  onAddTask: (task: Omit<ScheduledTask, 'id' | 'isRunning' | 'remainingTime'>) => void;
}

export default function QuickSetupPopup({ onAddTask }: QuickSetupPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Tab states: 'countdown' | 'alarm'
  const [activeTab, setActiveTab] = useState<'countdown' | 'alarm'>('countdown');

  // Input states
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  
  // Countdown timers (Hours, Minutes, Seconds)
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('5');
  const [seconds, setSeconds] = useState('0');

  // Alarm clock time
  const [alarmHour, setAlarmHour] = useState('09');
  const [alarmMinute, setAlarmMinute] = useState('00');
  const [alarmAmpm, setAlarmAmpm] = useState<'AM' | 'PM'>('AM');
  const [frequency, setFrequency] = useState<'once' | 'daily'>('once');

  // Sound Profile & Binaural Soundscape
  const [selectedAudioProfile, setSelectedAudioProfile] = useState('synth_chime');
  const [binauralSoundscape, setBinauralSoundscape] = useState<'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen'>('off');
  const [enableProgressCues, setEnableProgressCues] = useState(true);

  // IndexedDB tracks
  const [uploadedTracks, setUploadedTracks] = useState<any[]>([]);

  // Speech & Parsing state
  const [promptText, setPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseSuccessMsg, setParseSuccessMsg] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [autoSubmitVoice, setAutoSubmitVoice] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  // Load baseline on component mount
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setParseError('');
        setParseSuccessMsg('');
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error in Quick Popup:', event.error);
        if (event.error === 'not-allowed') {
          setParseError('Microphone access denied.');
        } else if (event.error === 'no-speech') {
          setParseError('No speech detected.');
        } else {
          setParseError(`Audio error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setPromptText(text);
          handleParsePrompt(text);
        }
      };

      recognitionRef.current = rec;
    }

    refreshCustomTracks();
  }, []);

  const refreshCustomTracks = async () => {
    try {
      const tracks = await getAllAudioFiles();
      setUploadedTracks(tracks);
    } catch (e) {
      console.warn('Could not retrieve DB custom tracks', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshCustomTracks();
    }
  }, [isOpen]);

  const handleDeleteCustomTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteAudioFile(id);
      await refreshCustomTracks();
      if (selectedAudioProfile === `custom_${id}`) {
        setSelectedAudioProfile('synth_chime');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete custom track.');
    }
  };

  const toggleListen = () => {
    if (!speechSupported) {
      setParseError('Voice recognition unsupported on this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        setParseError('');
        setParseSuccessMsg('');
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Failed to start speech in popup:', err);
      }
    }
  };

  const handleParsePrompt = async (textToParse: string) => {
    const finalPrompt = textToParse || promptText;
    if (!finalPrompt.trim()) {
      setParseError('Please type or speak a reminder request.');
      return;
    }

    setIsParsing(true);
    setParseError('');
    setParseSuccessMsg('');

    try {
      const res = await fetch('/api/parse-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          referenceTime: new Date().toISOString()
        }),
      });

      if (!res.ok) {
        throw new Error('AI agent failed to parse prompt. Please check your Gemini API key in Settings.');
      }

      const parsed = await res.json();

      // Set Parsed attributes
      const pLabel = parsed.label || (parsed.type === 'countdown' ? 'Countdown Break' : 'Time-of-Day Alarm');
      const pDescription = parsed.description || 'A custom wellness break cycle configured with Pulse Quick Setup.';
      const pAudioProfile = parsed.soundProfile || selectedAudioProfile;

      if (parsed.type === 'countdown') {
        setActiveTab('countdown');
        const sTotal = parsed.durationSeconds !== undefined ? parsed.durationSeconds : 300;
        const h = Math.floor(sTotal / 3600);
        const m = Math.floor((sTotal % 3600) / 60);
        const s = sTotal % 60;
        setHours(String(h));
        setMinutes(String(m));
        setSeconds(String(s));

        if (parsed.label) setLabel(parsed.label);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.soundProfile) setSelectedAudioProfile(parsed.soundProfile);

        if (autoSubmitVoice) {
          onAddTask({
            type: 'countdown',
            label: pLabel,
            description: pDescription,
            duration: sTotal,
            frequency: 'once',
            audioProfileId: pAudioProfile,
            binauralSoundscape,
            enableProgressCues
          });
          // Reset details and close modal window
          setLabel('');
          setDescription('');
          setHours('0');
          setMinutes('5');
          setSeconds('0');
          setPromptText('');
          setParseError('');
          setParseSuccessMsg('');
          setIsOpen(false);
          return;
        }
      } else if (parsed.type === 'alarm') {
        setActiveTab('alarm');
        const pAlarmHour = parsed.alarmHour || '09';
        const pAlarmMinute = parsed.alarmMinute || '00';
        const pAlarmAmpm = parsed.alarmAmpm || 'AM';

        if (parsed.alarmHour) setAlarmHour(parsed.alarmHour);
        if (parsed.alarmMinute) setAlarmMinute(parsed.alarmMinute);
        if (parsed.alarmAmpm) setAlarmAmpm(parsed.alarmAmpm);
        if (parsed.label) setLabel(parsed.label);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.soundProfile) setSelectedAudioProfile(parsed.soundProfile);

        if (autoSubmitVoice) {
          let targetHour = parseInt(pAlarmHour) || 9;
          const targetMinute = String(parseInt(pAlarmMinute) || 0).padStart(2, '0');
          
          let h24 = targetHour;
          if (pAlarmAmpm === 'PM' && h24 < 12) h24 += 12;
          if (pAlarmAmpm === 'AM' && h24 === 12) h24 = 0;
          
          const targetTimeStr = `${String(h24).padStart(2, '0')}:${targetMinute}`;
          const origStr = `${String(targetHour).padStart(2, '0')}:${targetMinute} ${pAlarmAmpm}`;

          onAddTask({
            type: 'alarm',
            label: pLabel,
            description: pDescription,
            duration: 0,
            targetTime: targetTimeStr,
            originalTriggerTime: origStr,
            frequency,
            audioProfileId: pAudioProfile,
            binauralSoundscape: 'off'
          });

          // Reset details and close modal window
          setLabel('');
          setDescription('');
          setHours('0');
          setMinutes('5');
          setSeconds('0');
          setPromptText('');
          setParseError('');
          setParseSuccessMsg('');
          setIsOpen(false);
          return;
        }
      }

      setParseSuccessMsg(`Parsed successfully: Adjusted parameters to "${parsed.label || 'Reminder'}"`);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Error parsing voice command.');
    } finally {
      setIsParsing(false);
    }
  };

  // Predefined quick duration offsets select
  const selectQuickCountdownValue = (minutesValue: number) => {
    setHours('0');
    setMinutes(String(minutesValue));
    setSeconds('0');
  };

  // Submit quick sequence
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalLabel = label.trim() || (activeTab === 'countdown' ? 'Countdown Break' : 'Time-of-Day Alarm');
    const finalDesc = description.trim() || 'A custom wellness break cycle configured with Pulse Quick Setup.';

    if (activeTab === 'countdown') {
      const h = parseInt(hours) || 0;
      const m = parseInt(minutes) || 0;
      const s = parseInt(seconds) || 0;
      const totalSeconds = (h * 3600) + (m * 60) + s;

      if (totalSeconds <= 0) {
        alert('Please enter a positive countdown duration.');
        return;
      }

      onAddTask({
        type: 'countdown',
        label: finalLabel,
        description: finalDesc,
        duration: totalSeconds,
        frequency: 'once',
        audioProfileId: selectedAudioProfile,
        binauralSoundscape,
        enableProgressCues
      });
    } else {
      let targetHour = parseInt(alarmHour) || 9;
      const targetMinute = String(parseInt(alarmMinute) || 0).padStart(2, '0');
      
      let h24 = targetHour;
      if (alarmAmpm === 'PM' && h24 < 12) h24 += 12;
      if (alarmAmpm === 'AM' && h24 === 12) h24 = 0;
      
      const targetTimeStr = `${String(h24).padStart(2, '0')}:${targetMinute}`;
      const origStr = `${String(targetHour).padStart(2, '0')}:${targetMinute} ${alarmAmpm}`;

      onAddTask({
        type: 'alarm',
        label: finalLabel,
        description: finalDesc,
        duration: 0,
        targetTime: targetTimeStr,
        originalTriggerTime: origStr,
        frequency,
        audioProfileId: selectedAudioProfile,
        binauralSoundscape: 'off'
      });
    }

    // Reset details and close modal window
    setLabel('');
    setDescription('');
    setHours('0');
    setMinutes('5');
    setSeconds('0');
    setPromptText('');
    setParseError('');
    setParseSuccessMsg('');
    setIsOpen(false);
  };

  return (
    <>
      {/* 1. FLOATING ACTION ACTION BUTTON (FAB) */}
      <button
        id="quick-floating-action-btn"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full bg-black hover:bg-neutral-800 text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 z-40 border border-neutral-800 cursor-pointer group"
        title="Quick Setup Alarm or Timer"
      >
        <Plus className="h-7 w-7 transition-transform duration-300 group-hover:rotate-90 text-white" />
      </button>

      {/* 2. POPUP MODAL SCREEN */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop slide-in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
              id="quick-setup-backdrop"
            />

            {/* Modal Screen Center lock Container */}
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.23, ease: 'easeOut' }}
                className="relative bg-white border border-gray-200 w-full max-w-lg p-6 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col gap-4 font-sans text-stone-900"
                id="quick-setup-modal-container"
              >
                {/* Visual grid texture on design background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:16px_16px] opacity-10 pointer-events-none" />

                {/* Header Title Bar */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 relative z-10 select-none">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                    <Sparkles className="h-4 w-4 text-black animate-pulse" />
                    Quick Setup Reminder
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center border border-gray-150 transition-colors cursor-pointer text-stone-700 hover:text-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Prompt Speech & Text Natural Language Parsing Bar */}
                <div className="bg-neutral-50 border border-gray-150 p-4 rounded-xl relative z-10 space-y-2.5">
                  <div className="flex items-center justify-between select-none">
                    <span className="font-mono text-[8px] uppercase font-bold text-gray-500 tracking-wider">
                      Voice / Natural Language Input
                    </span>
                    {isParsing ? (
                      <span className="text-[8px] font-mono font-bold text-black animate-pulse">Parsing...</span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-widest flex items-center gap-0.5">
                        <Sparkles className="h-2 w-2 text-emerald-500" /> AI ON
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleListen}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        isListening
                          ? 'bg-red-500 border-red-600 text-white scale-105 ring-2 ring-red-100 animate-pulse'
                          : 'bg-neutral-900 border-black text-white hover:bg-black'
                      }`}
                      title={isListening ? "Stop voice listening" : "Speak reminder text voice input"}
                    >
                      {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder={isListening ? "Listening... speak now..." : "Type e.g., '15 minutes timer for coffee refresh'"}
                        disabled={isListening}
                        className="w-full bg-white border border-gray-200 pl-3 pr-10 py-2.5 font-sans text-xs outline-none focus:border-black font-medium text-black transition-all rounded-lg placeholder-gray-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleParsePrompt(promptText);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleParsePrompt(promptText)}
                        disabled={isParsing || isListening || !promptText.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6.5 w-6.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 text-white rounded-md flex items-center justify-center transition-all cursor-pointer"
                      >
                        {isParsing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ArrowRight className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 select-none relative z-10 pt-1">
                    <input
                      type="checkbox"
                      id="auto-submit-voice-input-pop"
                      checked={autoSubmitVoice}
                      onChange={(e) => setAutoSubmitVoice(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                    />
                    <label 
                      htmlFor="auto-submit-voice-input-pop" 
                      className="font-mono text-[9px] uppercase font-bold text-gray-400 hover:text-black cursor-pointer tracking-wider flex items-center gap-1"
                    >
                      Auto-initiate voice commands upon parsing
                    </label>
                  </div>

                  {parseError && (
                    <div className="text-[10px] text-red-600 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 inline text-red-500" />
                      {parseError}
                    </div>
                  )}

                  {parseSuccessMsg && (
                    <div className="text-[10px] text-emerald-700 bg-emerald-50/50 p-1.5 border border-emerald-100 rounded-md flex items-center gap-1 select-none">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{parseSuccessMsg}</span>
                    </div>
                  )}
                </div>

                {/* Tab select slider */}
                <div className="flex bg-neutral-100 border border-gray-250 p-1 rounded-xl relative z-10 select-none">
                  <button
                    type="button"
                    onClick={() => setActiveTab('countdown')}
                    className={`flex-1 font-mono text-[9px] font-bold uppercase tracking-widest py-2 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'countdown' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Countdown break
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('alarm')}
                    className={`flex-1 font-mono text-[9px] font-bold uppercase tracking-widest py-2 rounded-lg transition-all cursor-pointer ${
                      activeTab === 'alarm' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Specific alarm
                  </button>
                </div>

                {/* Form Elements */}
                <form onSubmit={handleQuickSubmit} className="space-y-4 relative z-10">
                  {/* Basic Input Fields (Goal & Description) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5 gap-y-1 sm:gap-y-3.5">
                    <div>
                      <label className="block font-mono text-[9px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                        Goal Title
                      </label>
                      <input
                        type="text"
                        required
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder={activeTab === 'countdown' ? 'e.g., Hydrate, Walk, Stretch' : 'e.g., Lunch break, Shift end'}
                        className="w-full bg-white border border-gray-200 px-3 py-2 font-sans text-xs outline-none focus:border-black font-medium text-black rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[9px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                        Description / Instruction
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Stand up, breathe deeply."
                        className="w-full bg-white border border-gray-200 px-3 py-2 font-sans text-xs outline-none focus:border-black font-medium text-black rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Dynamic Duration Setup */}
                  <div className="bg-neutral-50 border border-gray-100 p-3.5 rounded-xl">
                    {activeTab === 'countdown' ? (
                      <div className="space-y-3">
                        <label className="block font-mono text-[9px] uppercase font-bold text-gray-500 tracking-wider">
                          Define Duration (Hrs : Mins : Secs)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              max="23"
                              value={hours}
                              onChange={(e) => setHours(e.target.value)}
                              className="w-12 text-center font-mono text-sm font-black bg-white border border-gray-200 py-1.5 focus:border-black outline-none text-black rounded-lg"
                            />
                            <span className="font-mono text-[7px] text-gray-400 font-bold tracking-widest mt-1">HRS</span>
                          </div>
                          <span className="text-gray-300 font-mono">:</span>
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={minutes}
                              onChange={(e) => setMinutes(e.target.value)}
                              className="w-12 text-center font-mono text-sm font-black bg-white border border-gray-200 py-1.5 focus:border-black outline-none text-black rounded-lg"
                            />
                            <span className="font-mono text-[7px] text-gray-400 font-bold tracking-widest mt-1">MINS</span>
                          </div>
                          <span className="text-gray-300 font-mono">:</span>
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={seconds}
                              onChange={(e) => setSeconds(e.target.value)}
                              className="w-12 text-center font-mono text-sm font-black bg-white border border-gray-200 py-1.5 focus:border-black outline-none text-black rounded-lg"
                            />
                            <span className="font-mono text-[7px] text-gray-400 font-bold tracking-widest mt-1">SECS</span>
                          </div>

                          {/* Quick intervals selectors */}
                          <div className="flex-1 flex flex-wrap gap-1 items-center justify-end">
                            <button
                              type="button"
                              onClick={() => selectQuickCountdownValue(1)}
                              className="px-1.5 py-1 text-[8px] font-mono font-bold uppercase tracking-widest bg-white border border-gray-200 hover:border-black rounded text-stone-600 hover:text-black cursor-pointer"
                            >
                              1m
                            </button>
                            <button
                              type="button"
                              onClick={() => selectQuickCountdownValue(5)}
                              className="px-1.5 py-1 text-[8px] font-mono font-bold uppercase tracking-widest bg-white border border-gray-200 hover:border-black rounded text-stone-600 hover:text-black cursor-pointer"
                            >
                              5m
                            </button>
                            <button
                              type="button"
                              onClick={() => selectQuickCountdownValue(15)}
                              className="px-1.5 py-1 text-[8px] font-mono font-bold uppercase tracking-widest bg-white border border-gray-200 hover:border-black rounded text-stone-600 hover:text-black cursor-pointer"
                            >
                              15m
                            </button>
                            <button
                              type="button"
                              onClick={() => selectQuickCountdownValue(25)}
                              className="px-1.5 py-1 text-[8px] font-mono font-bold uppercase tracking-widest bg-white border border-gray-200 hover:border-black rounded text-stone-600 hover:text-black cursor-pointer"
                            >
                              25m
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="block font-mono text-[9px] uppercase font-bold text-gray-500 tracking-wider">
                          Alarm Target Time & Frequency
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={alarmHour}
                              onChange={(e) => setAlarmHour(e.target.value)}
                              className="bg-white border border-gray-200 px-2 py-1.5 font-mono text-xs focus:border-black outline-none font-medium text-black rounded-lg"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            <span className="font-mono text-gray-300">:</span>
                            <select
                              value={alarmMinute}
                              onChange={(e) => setAlarmMinute(e.target.value)}
                              className="bg-white border border-gray-200 px-2 py-1.5 font-mono text-xs focus:border-black outline-none font-medium text-black rounded-lg"
                            >
                              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <select
                              value={alarmAmpm}
                              onChange={(e) => setAlarmAmpm(e.target.value as any)}
                              className="bg-white border border-gray-200 px-2 py-1.5 font-mono text-xs focus:border-black outline-none font-medium text-black rounded-lg"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1 font-mono text-[8.5px] font-bold text-gray-600 tracking-wider cursor-pointer">
                              <input
                                type="radio"
                                name="quick-freq"
                                checked={frequency === 'once'}
                                onChange={() => setFrequency('once')}
                                className="accent-black"
                              />
                              ONCE
                            </label>
                            <label className="inline-flex items-center gap-1 font-mono text-[8.5px] font-bold text-gray-600 tracking-wider cursor-pointer">
                              <input
                                type="radio"
                                name="quick-freq"
                                checked={frequency === 'daily'}
                                onChange={() => setFrequency('daily')}
                                className="accent-black"
                              />
                              DAILY
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sound and Soundscape configs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-mono text-[9px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                        Chime Alarm sound
                      </label>
                      <SearchableDropdown
                        id="sound-profile-selector"
                        value={selectedAudioProfile}
                        groups={[
                          {
                            label: "Hardware Synths",
                            options: [
                              { value: "synth_beep", label: "Classic Synth Beep", description: "Bleeping pitch rhythm" },
                              { value: "synth_chime", label: "Melodic Additive Chime", description: "Warm harmonic ringing tones" },
                              { value: "synth_pulsar", label: "Space Pulsar swoosh", description: "Frequency modulated sweeping wave" },
                              { value: "synth_vibrate", label: "Vibrating Buzz Alarm", description: "Low frequency vibrating burst" },
                              { value: "synth_gong", label: "Metallic Decaying Gong", description: "Deep resonant metallic impact" },
                            ]
                          },
                          ...(uploadedTracks.length > 0 ? [{
                            label: "Uploaded Audio",
                            options: uploadedTracks.map(t => ({
                              value: `custom_${t.id}`,
                              label: t.name,
                              description: "Custom uploaded sound",
                              isCustom: true,
                              trackId: t.id
                            }))
                          }] : [])
                        ]}
                        onChange={setSelectedAudioProfile}
                        onDeleteItem={handleDeleteCustomTrack}
                        placeholder="Search alarms..."
                      />
                    </div>

                    {activeTab === 'countdown' ? (
                      <div>
                        <label className="block font-mono text-[9px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                          Ambient Soundscape (Dry play)
                        </label>
                         <SearchableDropdown
                          id="form-binaural-soundscape"
                          value={binauralSoundscape}
                          groups={[
                            {
                              label: "Calmed Focus Soundscapes",
                              options: [
                                { value: "off", label: "Off (Dry silence)", description: "No background ambient loop is played" },
                                { value: "thunder", label: "Distant Thunder (Zen Storm)", description: "Gentle distant summer thunder with soft low sub-rumble rolls" },
                                { value: "rain", label: "Cozy Foliage Rainfall", description: "Cinematic soothing storm drops & ultra-faint high mist with slow rises" },
                                { value: "ocean", label: "Ocean Swells (Breathing wave)", description: "Slow therapeutic 14-second periodic tide waves for deep breathing" },
                                { value: "white", label: "Gentle White Wind", description: "Calmed high-altitude lowpassed breezeway to mask distractors" },
                                { value: "brown", label: "Warm Deep Cabin Rumble", description: "Very cozy lowpassed Brownian cabin hum for protective focus" },
                                { value: "zen", label: "Zen Harmony & Healing Bells (Signature)", description: "Signature generative pentatonic major bells with slow-swelling attacks & cozy deep warmth" },
                              ]
                            }
                          ]}
                          onChange={(val) => setBinauralSoundscape(val as any)}
                          placeholder="Search soundscapes..."
                        />
                      </div>
                    ) : (
                      <div className="flex items-end">
                        <p className="font-mono text-[8px] leading-tight text-gray-400 uppercase tracking-wider py-1.5">
                          • Time of Day alarms do not play ambient soundscapes loops.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submission Action Grid button */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 py-3 border border-gray-200 bg-white hover:bg-neutral-50 font-mono text-xs uppercase tracking-widest font-black text-stone-700 hover:text-black rounded-lg transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-black hover:bg-neutral-800 text-white font-mono text-xs uppercase tracking-widest font-black rounded-lg transition-all cursor-pointer text-center"
                    >
                      Activate Sequence
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
