/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Radio, Volume2 } from 'lucide-react';
import { initAudioEngine } from '../lib/audioEngine';

interface SplashUnlockProps {
  onUnlockCompleted: () => void;
}

export default function SplashUnlock({ onUnlockCompleted }: SplashUnlockProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleBegin = () => {
    try {
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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F9F9F9] px-6 text-center select-none"
          style={{ backgroundImage: 'radial-gradient(#E0E0E0 1.5px, transparent 0)', backgroundSize: '24px 24px' }}
        >
          
          <div className="relative flex flex-col items-center max-w-sm w-full bg-white/95 border border-gray-200 p-8 shadow-sm">
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
              className="mb-8 flex h-16 w-16 items-center justify-center rounded-none border border-gray-200 bg-white"
            >
              <Activity className="h-8 w-8 text-black" />
            </motion.div>
            
            <h1 className="font-sans text-3xl font-black tracking-[0.2em] text-black mb-2 uppercase">
              PULSE
            </h1>
            
            <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-gray-400 max-w-xs mb-8 leading-relaxed">
              Intelligent alarm, interval micro-break coaching, and habit synchronization dashboard.
            </p>
            
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
