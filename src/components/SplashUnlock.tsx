/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Radio, Volume2, Key, Info, CheckCircle2 } from 'lucide-react';
import { initAudioEngine } from '../lib/audioEngine';

interface SplashUnlockProps {
  onUnlockCompleted: () => void;
}

export default function SplashUnlock({ onUnlockCompleted }: SplashUnlockProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('pulse_user_gemini_api_key') || '');
  const [showKeyInfo, setShowKeyInfo] = useState(false);

  const handleBegin = () => {
    try {
      // Save Gemini API key to localStorage if entered
      const trimmed = userApiKey.trim();
      if (trimmed) {
        localStorage.setItem('pulse_user_gemini_api_key', trimmed);
      } else {
        localStorage.removeItem('pulse_user_gemini_api_key');
      }

      // Warm up real AudioContext
      initAudioEngine();
      
      // Request Native Notifications
      if ('Notification' in window) {
        Notification.requestPermission();
      }
    } catch (e) {
      console.warn('Warming AudioContext on splash failed:', e);
    }
    
    setIsUnlocked(true);
    setTimeout(() => {
      onUnlockCompleted();
    }, 600); // Wait for exit motion
  };

  return (
    <AnimatePresence>
      {!isUnlocked && (
        <motion.div
          id="splash-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F9F9F9] px-6 text-center select-none overflow-y-auto"
          style={{ backgroundImage: 'radial-gradient(#E0E0E0 1.5px, transparent 0)', backgroundSize: '24px 24px' }}
        >
          
          <div className="relative flex flex-col items-center max-w-sm w-full bg-white/95 border border-gray-200 p-8 shadow-sm my-8">
            {/* Visual Icon */}
            <motion.div
              id="splash-logo-container"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.9, 1, 0.9]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2.5, 
                ease: 'easeInOut' 
              }}
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-none border border-gray-200 bg-white"
            >
              <Activity className="h-8 w-8 text-black" />
            </motion.div>
            
            <h1 className="font-sans text-3xl font-black tracking-[0.2em] text-black mb-2 uppercase">
              PULSE
            </h1>
            
            <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400 max-w-xs mb-6 leading-relaxed">
              Intelligent alarm, interval micro-break coaching, and habit synchronization dashboard.
            </p>

            {/* Custom Gemini API Key UI Input (Requested) */}
            <div className="w-full text-left mb-6 border-t border-gray-150 pt-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <Key className="h-3 w-3 text-black" />
                  Gemini API Key (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setShowKeyInfo(!showKeyInfo)}
                  className="text-gray-400 hover:text-black hover:scale-105 transition-all"
                  title="What is this?"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              {showKeyInfo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-neutral-50 border border-gray-200 p-2.5 rounded mb-3 text-[10px] text-gray-500 leading-relaxed font-sans"
                >
                  <p className="font-bold text-black mb-1">💡 What does the API Key do?</p>
                  <p className="mb-1.5">
                    An API key enables **Gemini AI** to parse complex, conversational reminders (like <span className="font-mono text-black font-semibold">"every 2 hours alarm chime for posture checks"</span>) on the fly!
                  </p>
                  <p className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    If left blank, the app will automatically fall back to our fast, regex-based offline parser for instant commands!
                  </p>
                </motion.div>
              )}

              <input
                id="user-gemini-key-input"
                type="password"
                placeholder="AIzaSy..."
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                className="w-full bg-white border border-gray-250 hover:border-gray-405 focus:border-black py-2.5 px-3 text-xs font-mono text-black focus:outline-none transition-colors placeholder-gray-400"
              />
              <p className="text-[9px] text-gray-400 mt-1 leading-snug font-mono">
                {!userApiKey.trim() 
                  ? "✓ Local regex offline fallback activated" 
                  : "✓ Gemini AI key will power advanced reminders"}
              </p>
            </div>
            
            <motion.button
              id="begin-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBegin}
              className="flex w-full items-center justify-center gap-3 bg-black py-4 px-6 font-black text-xs uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
            >
              <Volume2 className="h-4 w-4 animate-pulse" />
              LET'S BEGIN & UNLOCK HARDWARE
            </motion.button>
            
            <div className="mt-6 flex items-center gap-2 font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" />
              SYSTEM ACTIVE & CALIBRATED
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
