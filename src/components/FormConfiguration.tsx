/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Clock, 
  HelpCircle, 
  FileAudio, 
  ArrowRight, 
  Loader2, 
  ShieldAlert, 
  Upload, 
  Sparkles,
  Volume2,
  Mic,
  MicOff,
  CheckCircle2,
  MessageSquareCode
} from 'lucide-react';
import { ScheduledTask, AudioSynthType, AudioProfile } from '../types';
import { saveAudioFile, getAllAudioFiles, deleteAudioFile } from '../lib/indexedDB';
import { parseWithRegex } from '../lib/regexParser';
import SearchableDropdown, { DropdownGroup } from './SearchableDropdown';

interface FormConfigurationProps {
  onAddTask: (task: Omit<ScheduledTask, 'id' | 'isRunning' | 'remainingTime'> & { duration: number }) => void;
}

export default function FormConfiguration({ onAddTask }: FormConfigurationProps) {
  const [activeTab, setActiveTab] = useState<'countdown' | 'alarm'>('countdown');

  // Form Fields
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  
  // Countdown fields
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('10');
  const [seconds, setSeconds] = useState('0');
  
  // Alarm fields
  const [alarmHour, setAlarmHour] = useState('09');
  const [alarmMinute, setAlarmMinute] = useState('00');
  const [alarmAmpm, setAlarmAmpm] = useState<'AM' | 'PM'>('AM');
  const [frequency, setFrequency] = useState<'once' | 'daily'>('once');
  
  // Audio selection fields
  const [selectedAudioProfile, setSelectedAudioProfile] = useState<string>('synth_chime');
  const [binauralSoundscape, setBinauralSoundscape] = useState<'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen'>('off');
  const [enableProgressCues, setEnableProgressCues] = useState(true);

  // Upload fields
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadedTracks, setUploadedTracks] = useState<{ id: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Upload Name Editor field
  const [namingFile, setNamingFile] = useState<{ id: string; name: string; type: string; buffer: ArrayBuffer } | null>(null);
  const [customTrackNameInput, setCustomTrackNameInput] = useState('');

  // Voice & Prompt parsing states
  const [promptText, setPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseSuccessMsg, setParseSuccessMsg] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [autoSubmitVoice, setAutoSubmitVoice] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Simplicity and progressive disclosure states
  const [showAiVoice, setShowAiVoice] = useState(false);
  const [showAudioUpload, setShowAudioUpload] = useState(false);

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
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setParseError('Microphone permission denied. Grant mic access or type prompt manually.');
        } else if (event.error === 'no-speech') {
          setParseError('No speech detected. Please try speaking again.');
        } else {
          setParseError(`Audio error occurred: ${event.error}`);
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
  }, []);

  const toggleListen = () => {
    if (!speechSupported) {
      setParseError('Speech recognition is not fully supported on this browser. Try typing instead.');
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
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  const handleParsePrompt = async (textToParse: string) => {
    const finalPrompt = textToParse || promptText;
    if (!finalPrompt.trim()) {
      setParseError('Please enter a natural language command or use the mic to speak one.');
      return;
    }

    setIsParsing(true);
    setParseError('');
    setParseSuccessMsg('');

    let parsed: any = null;
    let fallbackUsed = false;

    try {
      const userApiKey = localStorage.getItem('pulse_user_gemini_api_key') || '';
      const res = await fetch('/api/parse-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          referenceTime: new Date().toISOString(),
          userApiKey: userApiKey
        }),
      });

      if (!res.ok) {
        throw new Error('API server failed');
      }

      parsed = await res.json();
      if (parsed.error === 'GEMINI_NOT_CONFIGURED') {
        throw new Error('Gemini key not configured');
      }
    } catch (err) {
      console.warn('AI parsing offline or unconfigured. Triggering local smart parser:', err);
      parsed = parseWithRegex(finalPrompt);
      fallbackUsed = true;
    }

    if (!parsed) {
      setParseError('Failed to process text command.');
      setIsParsing(false);
      return;
    }

    try {
      if (fallbackUsed) {
        setParseSuccessMsg('✓ Command parsed instantly with local offline system');
      } else {
        setParseSuccessMsg('✓ Advanced parsing powered by Gemini AI');
      }

      // Apply the fields dynamically
      const selectedLabel = parsed.label || (parsed.type === 'countdown' ? 'Countdown focus' : 'Time-based Alarm');
      const selectedDesc = parsed.description || 'A standard Pulse wellness cycle reminder.';
      const selectedSound = parsed.soundProfile || selectedAudioProfile;

      if (parsed.type === 'countdown') {
        setActiveTab('countdown');
        const sTotal = parsed.durationSeconds !== undefined ? parsed.durationSeconds : 600;
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
            label: selectedLabel,
            description: selectedDesc,
            duration: sTotal,
            frequency: 'once',
            audioProfileId: selectedSound,
            binauralSoundscape,
            enableProgressCues
          });
          
          // Reset Countdown specific fields
          setLabel('');
          setDescription('');
          setHours('0');
          setMinutes('10');
          setSeconds('0');
          setPromptText('');
          setParseError('');
          setParseSuccessMsg('');
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
            label: selectedLabel,
            description: selectedDesc,
            duration: 0,
            targetTime: targetTimeStr,
            originalTriggerTime: origStr,
            frequency,
            audioProfileId: selectedSound,
            binauralSoundscape: 'off'
          });

          // Reset Alarm specific fields
          setLabel('');
          setDescription('');
          setPromptText('');
          setParseError('');
          setParseSuccessMsg('');
          return;
        }
      }

      setParseSuccessMsg(`${fallbackUsed ? '✓ Offline text parser:' : '✓ Gemini AI parsed:'} configured "${parsed.label}" (${parsed.type === 'countdown' ? `${parsed.durationSeconds}s` : `${parsed.alarmHour}:${parsed.alarmMinute} ${parsed.alarmAmpm}`}). Review and press "Initialize Sequence" to launch!`);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Error occurred while configuring parsed inputs.');
    } finally {
      setIsParsing(false);
    }
  };

  // Load custom tracks list from IndexedDB
  const refreshCustomTracks = async () => {
    try {
      const tracks = await getAllAudioFiles();
      setUploadedTracks(tracks);
    } catch (e) {
      console.warn('Failed to load custom tracks from IndexedDB:', e);
    }
  };

  useEffect(() => {
    refreshCustomTracks();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Process dropped/selected audio files
  const processAudioFile = async (file: File) => {
    if (!file) return;
    const isAudioType = file.type.startsWith('audio/');
    const hasAudioExt = /\.(mp3|wav|opus|ogg|m4a|aac|webm|weba|flac|caf)$/i.test(file.name);
    if (!isAudioType && !hasAudioExt) {
      alert('Supported formats: MP3, WAV, OPUS, OGG, M4A, AAC, FLAC, WEBM and other web-compatible audio!');
      return;
    }

    setUploadProgress(true);
    try {
      const fileId = 'track_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          setNamingFile({
            id: fileId,
            name: nameWithoutExt,
            type: file.type,
            buffer: e.target.result
          });
          setCustomTrackNameInput(nameWithoutExt);
        }
        setUploadProgress(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      alert('Unpacking of file failed.');
      setUploadProgress(false);
    }
  };

  const handleSaveCustomTrack = async () => {
    if (!namingFile) return;
    const finalName = customTrackNameInput.trim() || namingFile.name;
    setUploadProgress(true);
    try {
      await saveAudioFile({
        id: namingFile.id,
        name: finalName,
        data: namingFile.buffer,
        type: namingFile.type
      });
      await refreshCustomTracks();
      setSelectedAudioProfile(`custom_${namingFile.id}`);
      setNamingFile(null);
      setCustomTrackNameInput('');
    } catch (err) {
      console.error(err);
      alert('Failed to save audio track.');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processAudioFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAudioFile(file);
    }
  };

  const handleDeleteCustomTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('Delete this uploaded sound file?')) {
      await deleteAudioFile(id);
      await refreshCustomTracks();
      if (selectedAudioProfile === `custom_${id}`) {
        setSelectedAudioProfile('synth_chime');
      }
    }
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedLabel = label.trim() || (activeTab === 'countdown' ? 'Countdown focus' : 'Time-based Alarm');
    const selectedDesc = description.trim() || 'A standard Pulse wellness cycle reminder.';

    if (activeTab === 'countdown') {
      const h = parseInt(hours) || 0;
      const m = parseInt(minutes) || 0;
      const s = parseInt(seconds) || 0;
      const totalSeconds = (h * 3600) + (m * 60) + s;

      if (totalSeconds <= 0) {
        alert('Please specify a positive countdown duration.');
        return;
      }

      onAddTask({
        type: 'countdown',
        label: selectedLabel,
        description: selectedDesc,
        duration: totalSeconds,
        frequency: 'once',
        audioProfileId: selectedAudioProfile,
        binauralSoundscape,
        enableProgressCues
      });
      
      // Reset Countdown specific fields
      setLabel('');
      setDescription('');
      setHours('0');
      setMinutes('10');
      setSeconds('0');

    } else {
      // Alarm configuration
      let targetHour = parseInt(alarmHour) || 9;
      const targetMinute = String(parseInt(alarmMinute) || 0).padStart(2, '0');
      
      // 24 hour representation translation
      let h24 = targetHour;
      if (alarmAmpm === 'PM' && h24 < 12) h24 += 12;
      if (alarmAmpm === 'AM' && h24 === 12) h24 = 0;
      
      const targetTimeStr = `${String(h24).padStart(2, '0')}:${targetMinute}`;
      const origStr = `${String(targetHour).padStart(2, '0')}:${targetMinute} ${alarmAmpm}`;

      onAddTask({
        type: 'alarm',
        label: selectedLabel,
        description: selectedDesc,
        duration: 0, // static alarm doesn't have an initial ticking count, will map dynamically
        targetTime: targetTimeStr,
        originalTriggerTime: origStr,
        frequency,
        audioProfileId: selectedAudioProfile,
        binauralSoundscape: 'off' // soundscapes only running active during countdown triggers
      });

      // Reset Alarm specific fields
      setLabel('');
      setDescription('');
    }
  };

  return (
    <div id="form-config-panel" className="border border-gray-200 bg-white/95 p-6 shadow-sm rounded-2xl">
      {/* Title block */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
        <Bell className="h-4.5 w-4.5 text-black" />
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
          Schedule a wellness Core Command
        </h3>
      </div>

      {/* AI Voice & Natural Language Command Center (Always Visible) */}
      <div id="ai-voice-command-center" className="bg-neutral-50/70 border border-gray-200 p-4.5 rounded-2xl mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:16px_16px] opacity-10 pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 select-none relative z-10">
          <span className="font-mono text-[9px] uppercase font-black text-gray-500 tracking-[0.15em] flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-emerald-600 animate-pulse" />
            AI Voice & Natural Language Command
          </span>
          {isParsing ? (
            <span className="text-[8px] font-mono font-black text-black bg-neutral-200 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
              Parsing...
            </span>
          ) : (
            <span className="text-[8px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 font-sans">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Gemini Active
            </span>
          )}
        </div>

        {/* Content Layout */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 relative z-10">
          
          {/* Circular Microphone Trigger Button */}
          <div className="flex flex-col items-center justify-center bg-white border border-gray-200 p-4 rounded-xl min-w-[120px] select-none text-center">
            <button
              type="button"
              id="voice-mic-trigger-btn"
              onClick={toggleListen}
              className={`h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 border cursor-pointer relative ${
                isListening 
                  ? 'bg-red-500 border-red-600 text-white shadow-lg scale-105 ring-4 ring-red-100' 
                  : 'bg-neutral-900 border-black hover:bg-black text-white hover:scale-105'
              }`}
              title={isListening ? "Stop listening voice input" : "Start speaking reminder with voice"}
            >
              {isListening ? (
                <MicOff className="h-6 w-6 animate-pulse" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
              {isListening && (
                <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75" />
              )}
            </button>
            <span className="font-mono text-[8px] font-black uppercase tracking-wider text-gray-500 mt-2.5">
              {isListening ? 'LISTENING...' : 'TAP MIC & TALK'}
            </span>
            
            {/* Visual audio wave representation */}
            {isListening ? (
              <div id="mic-waveforms" className="flex items-center gap-0.5 mt-2 h-3.5 px-2">
                <div className="w-1 bg-red-500 rounded animate-[bounce_0.6s_infinite_100ms] h-1.5" />
                <div className="w-1 bg-red-500 rounded animate-[bounce_0.6s_infinite_200ms] h-3.5" />
                <div className="w-1 bg-red-100 rounded animate-[bounce_0.6s_infinite_300ms] h-1" />
                <div className="w-1 bg-red-500 rounded animate-[bounce_0.6s_infinite_400ms] h-4" />
                <div className="w-1 bg-red-500 rounded animate-[bounce_0.6s_infinite_500ms] h-2" />
              </div>
            ) : (
              <div className="flex items-center gap-0.5 mt-2 h-3.5 px-2 opacity-25">
                <div className="w-1 h-1 bg-gray-400 rounded" />
                <div className="w-1 h-1 bg-gray-400 rounded" />
                <div className="w-1 h-1 bg-gray-400 rounded" />
                <div className="w-1 h-1 bg-gray-400 rounded" />
                <div className="w-1 h-1 bg-gray-400 rounded" />
              </div>
            )}
          </div>

          {/* Text Input, Prompt Bar, & Status Feed */}
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="relative">
              <input
                type="text"
                id="voice-prompt-input"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={isListening ? "Listening... Speak your reminder clearly..." : "Type e.g., 'Set an alarm for 3:30 pm for coffee break'..."}
                disabled={isListening}
                className="w-full bg-white border border-gray-200 pl-3.5 pr-12 py-3.5 font-sans text-xs outline-none focus:border-black font-medium text-black transition-all rounded-xl shadow-sm placeholder-gray-400 disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleParsePrompt(promptText);
                  }
                }}
              />
              <button
                type="button"
                id="submit-prompt-btn"
                onClick={() => handleParsePrompt(promptText)}
                disabled={isParsing || isListening || !promptText.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer"
                title="Send command to AI scheduler"
              >
                {isParsing ? (
                  <Loader2 className="h-4 w-4 animate-spin animate-pulse" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 select-none relative z-10 pt-0.5">
              <input
                type="checkbox"
                id="auto-submit-voice-input-form"
                checked={autoSubmitVoice}
                onChange={(e) => setAutoSubmitVoice(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
              />
              <label 
                htmlFor="auto-submit-voice-input-form" 
                className="font-mono text-[9px] uppercase font-bold text-gray-400 hover:text-black cursor-pointer tracking-wider flex items-center gap-1"
              >
                Auto-initiate voice commands upon parsing
              </label>
            </div>

            {/* Quick Presets row */}
            <div className="flex flex-wrap items-center gap-1.5 select-none text-[8px] font-mono leading-none font-bold uppercase text-gray-400 tracking-wider">
              <span>SAMPLES:</span>
              <button
                type="button"
                onClick={() => {
                  setPromptText('Set a timer for 15 minutes to rest eye rules with chimes');
                  handleParsePrompt('Set a timer for 15 minutes to rest eye rules with chimes');
                }}
                className="px-2 py-1 border border-gray-200 bg-white hover:border-black text-gray-500 hover:text-black rounded-md transition-colors cursor-pointer"
              >
                15m Eye Rest
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromptText('Water reminder for 45 seconds with a pulsating beep');
                  handleParsePrompt('Water reminder for 45 seconds with a pulsating beep');
                }}
                className="px-2 py-1 border border-gray-200 bg-white hover:border-black text-gray-500 hover:text-black rounded-md transition-colors cursor-pointer"
              >
                45s Water Break
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromptText('Remind me at 4:30 pm daily for post-work stretch cycles');
                  handleParsePrompt('Remind me at 4:30 pm daily for post-work stretch cycles');
                }}
                className="px-2 py-1 border border-gray-200 bg-white hover:border-black text-gray-500 hover:text-black rounded-md transition-colors cursor-pointer"
              >
                4:30 PM Stretch
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Status message feeds */}
        {parseError && (
          <div id="ai-parse-error-toast" className="mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-[11px] font-sans rounded-xl flex items-start gap-2 select-none">
            <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Parsing failed:</span> {parseError}
            </div>
          </div>
        )}

        {parseSuccessMsg && (
          <div id="ai-parse-success-toast" className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-sans rounded-xl flex items-start gap-2 select-none">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Acknowledge parsed parameters:</span> {parseSuccessMsg}
            </div>
          </div>
        )}
      </div>

      {/* Tabs list (Countdown vs Alarm) */}
      <div className="flex border border-gray-200 mb-6 select-none bg-neutral-100 p-1 rounded-xl">
        <button
          type="button"
          id="tab-countdown"
          onClick={() => setActiveTab('countdown')}
          className={`flex-1 font-mono text-[10px] font-bold uppercase tracking-widest py-2.5 transition-all duration-200 cursor-pointer rounded-lg ${
            activeTab === 'countdown'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-500 hover:text-black hover:bg-white/55'
          }`}
        >
          Countdown Duration
        </button>
        <button
          type="button"
          id="tab-alarm"
          onClick={() => setActiveTab('alarm')}
          className={`flex-1 font-mono text-[10px] font-bold uppercase tracking-widest py-2.5 transition-all duration-200 cursor-pointer rounded-lg ${
            activeTab === 'alarm'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-500 hover:text-black hover:bg-white/55'
          }`}
        >
          Time-Of-Day Alarm
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Row 1: Label and description box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">
              Goal Label / Title
            </label>
            <input
              id="form-title"
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={activeTab === 'countdown' ? 'e.g., Hydration Cycle, Focus block' : 'e.g., Stand up stretch, Lunch'}
              className="w-full bg-white border border-gray-200 px-3 py-2.5 font-sans text-xs outline-none focus:border-black font-medium text-black transition-all rounded-xl"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">
              Custom Description Instruction
            </label>
            <input
              id="form-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Drink full glass, do 10 shoulder rolls now."
              className="w-full bg-white border border-gray-200 px-3 py-2.5 font-sans text-xs outline-none focus:border-black font-medium text-black transition-all rounded-xl"
            />
          </div>
        </div>

        {/* Row 2: Dynamic time configuration based on active tab */}
        <div className="bg-neutral-50/40 border border-gray-100 p-4 rounded-2xl">
          {activeTab === 'countdown' ? (
            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wider">
                Set Timer Countdown offset (Hrs : Mins : Secs)
              </label>
              
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <input
                    id="countdown-h"
                    type="number"
                    min="0"
                    max="23"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-16 text-center font-mono text-lg font-black bg-white border border-gray-200 py-2.5 focus:border-black outline-none text-black rounded-xl"
                  />
                  <span className="font-mono text-[8px] font-bold tracking-widest text-[#9c9c9c] mt-1.5">HOURS</span>
                </div>
                <div className="font-mono text-xl text-neutral-300">:</div>
                <div className="flex flex-col items-center">
                  <input
                    id="countdown-m"
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-16 text-center font-mono text-lg font-black bg-white border border-gray-200 py-2.5 focus:border-black outline-none text-black rounded-xl"
                  />
                  <span className="font-mono text-[8px] font-bold tracking-widest text-[#9c9c9c] mt-1.5">MINUTES</span>
                </div>
                <div className="font-mono text-xl text-neutral-300">:</div>
                <div className="flex flex-col items-center">
                  <input
                    id="countdown-s"
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                    className="w-16 text-center font-mono text-lg font-black bg-white border border-gray-200 py-2.5 focus:border-black outline-none text-black rounded-xl"
                  />
                  <span className="font-mono text-[8px] font-bold tracking-widest text-[#9c9c9c] mt-1.5">SECONDS</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">
                  Select Specific Time-Of-Day (HH : MM AM/PM)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="alarm-h"
                    value={alarmHour}
                    onChange={(e) => setAlarmHour(e.target.value)}
                    className="bg-white border border-gray-200 px-3 py-2 font-mono text-xs focus:border-black outline-none font-medium text-black rounded-xl"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="font-mono text-neutral-300">:</span>
                  <select
                    id="alarm-m"
                    value={alarmMinute}
                    onChange={(e) => setAlarmMinute(e.target.value)}
                    className="bg-white border border-gray-200 px-3 py-2 font-mono text-xs focus:border-black outline-none font-medium text-black rounded-xl"
                  >
                    {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    id="alarm-ampm"
                    value={alarmAmpm}
                    onChange={(e) => setAlarmAmpm(e.target.value as any)}
                    className="bg-white border border-gray-200 px-3 py-2 font-mono text-xs focus:border-black outline-none font-medium text-black rounded-xl"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">
                  Interval Frequency Repeater
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-gray-700 cursor-pointer tracking-wider">
                    <input
                      type="radio"
                      name="frequency"
                      checked={frequency === 'once'}
                      onChange={() => setFrequency('once')}
                      className="accent-black"
                    />
                    ONE-TIME ONLY
                  </label>
                  <label className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-gray-700 cursor-pointer tracking-wider">
                    <input
                      type="radio"
                      name="frequency"
                      checked={frequency === 'daily'}
                      onChange={() => setFrequency('daily')}
                      className="accent-black"
                    />
                    REPEATS DAILY
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Sound profiling & Ambient background loop config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Sounds profile selection dropdown list */}
          <div>
            <label className="block font-mono text-[10px] uppercase font-bold text-gray-500 mb-1.5 tracking-wider">
              Sound Chimes & Synthesizers
            </label>
            <SearchableDropdown
              id="sound-profile-selector"
              value={selectedAudioProfile}
              groups={[
                {
                  label: "Web Audio hardware Synths",
                  options: [
                    { value: "synth_beep", label: "Classic Synth Beep", description: "Bleeping pitch rhythm" },
                    { value: "synth_chime", label: "Melodic Additive Chime", description: "Warm harmonic ringing tones" },
                    { value: "synth_pulsar", label: "Space Pulsar swoosh", description: "Frequency modulated sweeping wave" },
                    { value: "synth_vibrate", label: "Vibrating Buzz Alarm", description: "Low frequency vibrating burst" },
                    { value: "synth_gong", label: "Metallic Decaying Gong", description: "Deep resonant metallic impact" },
                    { value: "synth_custom", label: "Custom Oscillators", description: "Raw microtone wave generator" },
                  ]
                },
                ...(uploadedTracks.length > 0 ? [{
                  label: "IndexedDB Uploaded tracks",
                  options: uploadedTracks.map(t => ({
                    value: `custom_${t.id}`,
                    label: t.name,
                    description: "Personalized audio file",
                    isCustom: true,
                    trackId: t.id
                  }))
                }] : [])
              ]}
              onChange={setSelectedAudioProfile}
              onDeleteItem={handleDeleteCustomTrack}
              placeholder="Search chime alarms..."
            />
          </div>

          {/* Binaural ambient soundscape while timer is running */}
          {activeTab === 'countdown' ? (
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-gray-500 mb-1.5 flex items-center gap-1 tracking-wider">
                  Binaural Dynamic Soundscape
                  <Sparkles className="h-3 w-3 text-emerald-600 animate-pulse" />
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
                  placeholder="Search background loops..."
                />
              </div>

              <div className="flex items-center gap-2 select-none border border-gray-100 p-3 bg-neutral-50/30 rounded-xl">
                <input
                  type="checkbox"
                  id="enable-progress-cues"
                  checked={enableProgressCues}
                  onChange={(e) => setEnableProgressCues(e.target.checked)}
                  className="accent-black h-4 w-4 border-gray-300 rounded cursor-pointer animate-pulse"
                />
                <label htmlFor="enable-progress-cues" className="font-mono text-[9px] uppercase font-bold text-gray-500 cursor-pointer tracking-widest leading-none">
                  Enable 50% & 75% Progress Audio Cues
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-end">
              <div className="bg-neutral-50 border border-gray-150 text-[9px] font-mono leading-relaxed text-gray-400 p-3 uppercase tracking-wider font-bold rounded-xl">
                • Specific alarms trigger instantaneous alerts but do not play long focus soundscapes.
              </div>
            </div>
          )}
        </div>

        {/* Row 4: IndexedDB Custom Audio Upload sandbox (Collapsible for simplicity) */}
        <div className="border border-gray-200 p-4 bg-white relative rounded-2xl select-none">
          <button
            type="button"
            onClick={() => setShowAudioUpload(!showAudioUpload)}
            className="w-full flex items-center justify-between font-mono text-[9px] uppercase font-bold text-gray-500 hover:text-black tracking-widest cursor-pointer focus:outline-none"
          >
            <span className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-black" />
              Upload Personal Alarm Sounds ({uploadedTracks.length} saved offline)
            </span>
            <span className="py-1 px-2 bg-neutral-100 border border-gray-200 text-black font-semibold text-[8px] tracking-wider rounded-lg shadow-sm transition-all">
              {showAudioUpload ? 'CLOSE' : 'MANAGE FILES'}
            </span>
          </button>

          {showAudioUpload && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <label className="block font-mono text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                Select custom sound file (Saved offline in your indexeddb cache)
              </label>

              {/* Audio Naming Editor Panel (when a file is staged but not saved yet) */}
              {namingFile && (
                <div id="naming-file-editor" className="mb-4.5 p-4 bg-neutral-900 text-white rounded-xl space-y-3 shadow-lg relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase font-bold text-gray-300 tracking-wider flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-white animate-pulse" />
                      Name Your Uploaded Chime Track
                    </span>
                    <button
                      type="button"
                      onClick={() => setNamingFile(null)}
                      className="text-[10px] text-gray-400 hover:text-white uppercase font-bold font-mono tracking-widest cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTrackNameInput}
                      onChange={(e) => setCustomTrackNameInput(e.target.value)}
                      placeholder="Enter custom track display name..."
                      className="flex-1 bg-neutral-800 border border-neutral-700 px-3 py-2 text-xs text-white outline-none focus:border-white font-medium rounded-lg"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveCustomTrack();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomTrack}
                      className="bg-white hover:bg-neutral-100 text-black px-4 py-2 font-mono text-[10px] uppercase font-black tracking-wider transition-colors rounded-lg cursor-pointer shrink-0"
                    >
                      Save Solid
                    </button>
                  </div>
                </div>
              )}
              
              <div
                id="audio-upload-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer hover:bg-neutral-50 transition-colors border-2 border-dashed flex flex-col items-center justify-center p-4 text-center rounded-xl ${
                  dragOver ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-200 bg-neutral-50/70'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="audio/*,video/*,.mp3,.wav,.opus,.ogg,.m4a,.aac,.flac,.caf,.webm,.weba,application/octet-stream"
                  className="hidden"
                />
                
                {uploadProgress ? (
                  <div id="uploading-spinner" className="flex flex-col items-center gap-2 font-mono text-[10px] uppercase font-bold text-neutral-800 font-sans">
                    <Loader2 className="h-5 w-5 animate-spin text-black" />
                    SAVING AUDIO BUFFER TO INDEXEDDB...
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-neutral-500 font-sans text-xs">
                    <Upload className="h-4.5 w-4.5 text-neutral-800" />
                    <span className="font-bold">Drag & drop personalized audio file here, or click to browse</span>
                    <span className="text-[9px] text-[#919191] font-mono leading-none tracking-wider font-bold">SUPPORTED: MP3, WAV, OPUS, M4A, OGG, AAC, FLAC.</span>
                  </div>
                )}
              </div>

              {/* List of uploaded custom files with deletion option */}
              {uploadedTracks.length > 0 && (
                <div id="uploaded-tracks-list" className="mt-3.5 space-y-1 bg-white border border-gray-100 max-h-32 overflow-y-auto rounded-xl">
                  {uploadedTracks.map(track => (
                    <div key={track.id} className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 last:border-b-0">
                      <span className="font-mono text-[10px] text-gray-600 truncate max-w-xs flex items-center gap-1">
                        <FileAudio className="h-3 w-3 inline text-black" />
                        {track.name}
                      </span>
                      <button
                        id={`delete-custom-track-${track.id}`}
                        type="button"
                        onClick={(e) => handleDeleteCustomTrack(track.id, e)}
                        className="font-mono text-[9px] uppercase hover:text-red-500 hover:underline tracking-wider font-bold cursor-pointer"
                      >
                        EXCISE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          id="add-to-timeline-btn"
          className="mt-4 w-full py-4 bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-widest text-xs transition-all cursor-pointer rounded-xl"
        >
          Initialize Sequence
        </button>
      </form>
    </div>
  );
}
