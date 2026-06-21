/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Volume2, Play, Square, Headphones, Settings, ShieldAlert, CheckCircle, Flame, Download, Smartphone, Monitor, Info, Share2, PlusSquare, HelpCircle } from 'lucide-react';
import { playSynthesizerAlarm, startFocusSoundscape, stopFocusSoundscape, isAudioActive } from '../lib/audioEngine';

interface DashboardHeaderProps {
  binauralSoundscape: 'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen';
  onSoundscapeChange: (type: 'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen') => void;
  complianceScore: number;
  calendarGuard: boolean;
  onCalendarGuardToggle: () => void;
  idleStatus: boolean; // Tracking user inactive
}

export default function DashboardHeader({
  binauralSoundscape,
  onSoundscapeChange,
  complianceScore,
  calendarGuard,
  onCalendarGuardToggle,
  idleStatus
}: DashboardHeaderProps) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isSynthActive, setIsSynthActive] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // PWA states
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const checkStandalone = () => {
      const standaloneCheck = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      setIsStandalone(!!standaloneCheck);
    };
    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const onChange = () => {
      setIsStandalone(mediaQuery.matches);
    };
    mediaQuery.addEventListener('change', onChange);

    // Detect user platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Capture standard PWA installation prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      mediaQuery.removeEventListener('change', onChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  useEffect(() => {
    // Dynamic Clock Ticker
    const updateTime = () => {
      const now = new Date();
      
      // Build date representation e.g. Sunday, June 21, 2026
      const dateOptions: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      setDateStr(now.toLocaleDateString('en-US', dateOptions));

      // Build time formatting with hours, minutes, seconds and AM/PM
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // conversion of 0 to 12
      const hrsStr = String(hours).padStart(2, '0');

      setTimeStr(`${hrsStr}:${minutes}:${seconds} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Keep checking if Web Audio synthesizer is active
    const checkSynthStatus = () => {
      setIsSynthActive(isAudioActive());
    };
    checkSynthStatus();
    const interval = setInterval(checkSynthStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleTestSpeakers = () => {
    setIsTesting(true);
    playSynthesizerAlarm('chime', 1200);
    setTimeout(() => {
      setIsTesting(false);
    }, 1300);
  };

  return (
    <div id="dashboard-header" className="relative border border-gray-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm rounded-2xl">
      {/* Decorative Top Accent Tag */}
      <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-3 py-0.5 text-center">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-white">
          PULSE
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        
        {/* Left Aspect: Live UTC/Local clock and Calendar */}
        <div className="flex-1 flex flex-col items-start">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-gray-400 mb-1">
            <span>{dateStr || 'Loading Date...'}</span>
            <span>•</span>
            <span className="text-black flex items-center gap-1 font-bold">
              {idleStatus ? (
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              ) : (
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
              {idleStatus ? 'IDLE' : 'ACTIVE'}
            </span>
          </div>
          
          <h2 id="clock-display" className="font-mono text-4xl md:text-5xl font-black tabular-nums tracking-tighter text-black leading-none py-1">
            {timeStr || '00:00:00 AM'}
          </h2>
          
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white text-[10px] font-bold tracking-widest uppercase rounded-full">
              <span className={`inline-block h-2 w-2 rounded-full ${isSynthActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {isSynthActive ? 'Synthesizer Active' : 'Speaker Standby'}
            </span>
            
            <button
              id="test-speakers-btn"
              onClick={handleTestSpeakers}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 border-2 border-black hover:bg-black hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isTesting ? 'SOUNDING...' : 'TEST SPEAKERS'}
            </button>
          </div>

          {/* PWA Integration Panel */}
          <div className="mt-4 border border-dashed border-gray-200 rounded-2xl p-3.5 bg-neutral-50/50 max-w-md">
            <div className="flex items-center justify-between gap-3 mb-2 select-none">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-black animate-pulse" />
                PWA Standalone Engine
              </span>
              
              {isStandalone ? (
                <span className="text-[8px] font-mono leading-none font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Standalone Active
                </span>
              ) : (
                <span className="text-[8px] font-mono leading-none font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                  Browser Sandboxed
                </span>
              )}
            </div>

            {isStandalone ? (
              <div className="flex items-start gap-2 text-xs text-gray-600 font-sans leading-snug select-none">
                <CheckCircle className="h-4 w-4 inlines text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-black text-[11px] uppercase tracking-wide font-mono">Pulse Running as Native App</p>
                  <p className="text-[10px] mt-0.5 text-gray-500">Perfect offline protection with persistent in-browser database &amp; sound synthesizers.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Install Pulse to your Home Screen or Desktop for custom full-screen standalone application layout without browser navigation rails.
                </p>

                {/* Android / Desktop Install Prompt Triggers */}
                {deferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install Pulse App
                  </button>
                ) : (
                  platform === 'ios' ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowIosGuide(!showIosGuide)}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        {showIosGuide ? "Close Instructions" : "How to Install on iPhone"}
                      </button>

                      {showIosGuide && (
                        <div className="bg-white border border-gray-150 p-3 rounded-lg text-[11px] text-gray-600 font-sans leading-relaxed mt-1 shadow-inner animate-in fade-in slide-in-from-top-1 select-none">
                          <p className="font-bold text-black mb-1.5 flex items-center gap-1 font-mono uppercase text-[9px] tracking-wider">
                            <Info className="h-3.5 w-3.5 text-emerald-600" />
                            Safari Mobile Steps:
                          </p>
                          <ol className="list-decimal pl-4.5 space-y-1.5 text-gray-700 font-medium">
                            <li>Tap the Safari <span className="font-bold text-black inline-flex items-center gap-0.5">Share <Share2 className="h-3 w-3 inline text-blue-500" /></span> option in browser navigation.</li>
                            <li>Scroll list and tap <span className="font-bold text-black">Add to Home Screen <PlusSquare className="h-3 w-3 inline text-gray-700" /></span>.</li>
                            <li>Click <span className="font-bold text-black">Add</span> in top right. Pulse launches in full-screen standalone mode.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] font-sans font-medium text-gray-500 bg-neutral-50 border border-gray-200/60 p-2 rounded-xl">
                      <span className="flex items-center gap-1.5 font-mono uppercase text-[9px] font-bold text-gray-400">
                        <Monitor className="h-3.5 w-3.5 text-gray-400" />
                        Sync Engine Ready
                      </span>
                      <span className="text-[8px] bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono text-gray-400">
                        Browser Menu &gt; Install
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Aspect: Focus Soundscapes And Calendar Guard controls */}
        <div className="flex flex-col gap-4 border-t border-gray-100 md:border-t-0 pt-4 md:pt-0">
          
          {/* Calendar Guard Slider/Toggle */}
          <div className="flex items-center justify-between gap-6 bg-neutral-50/50 border border-gray-200 p-3 rounded-xl">
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert className="h-3.5 w-3.5 text-black" />
                CALENDAR GUARD
              </span>
              <span className="font-sans text-[10px] text-gray-500">
                Silences loud bells in meetings. Displays silent badges.
              </span>
            </div>
            
            <button
              id="calendar-guard-toggle"
              onClick={onCalendarGuardToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border border-black p-0.5 transition-colors cursor-pointer ${
                calendarGuard ? 'bg-black' : 'bg-white'
              }`}
            >
              <span
                className={`inline-block h-4.5 w-4.5 rounded-full bg-neutral-200 border border-neutral-400 transition-transform ${
                  calendarGuard ? 'translate-x-5 bg-white border-black' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          
          {/* Binaural Soundscape selection */}
          <div className="flex flex-col border border-gray-200 p-3 bg-white/50 rounded-xl">
            <span className="font-mono text-xs font-bold text-gray-800 mb-2 uppercase flex items-center gap-1.5 tracking-wider">
              <Headphones className="h-3.5 w-3.5 text-black" />
              FOCUS SOUNDSCAPES
            </span>
            
            <div className="flex flex-wrap gap-1">
              {(['off', 'thunder', 'rain', 'ocean', 'white', 'brown', 'zen'] as const).map((type) => (
                <button
                  key={type}
                  id={`soundscape-${type}`}
                  onClick={() => {
                    onSoundscapeChange(type);
                    startFocusSoundscape(type);
                  }}
                  className={`font-mono text-[9px] px-2.5 py-1.5 uppercase tracking-wider transition-all cursor-pointer rounded-lg font-bold ${
                    binauralSoundscape === type
                      ? 'bg-black text-white hover:bg-neutral-800'
                      : 'border border-gray-200 text-gray-500 hover:border-black hover:text-black hover:bg-neutral-50'
                  }`}
                >
                  {type === 'thunder' ? 'Thunder' : type === 'rain' ? 'Rain' : type === 'ocean' ? 'Ocean' : type === 'white' ? 'White Wind' : type === 'brown' ? 'Cabin Rumble' : type === 'zen' ? 'Zen Harmony' : 'Off'}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
