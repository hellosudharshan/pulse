/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Check, X, ShieldAlert, Sparkles, Droplets, Smile, Eye } from 'lucide-react';

interface CoachingModalProps {
  exerciseType: 'eye' | 'stretch' | 'hydrate' | 'focus' | 'other';
  label: string;
  description: string;
  onDismiss: (wasCompleted: boolean) => void;
}

export default function CoachingModal({
  exerciseType,
  label,
  description,
  onDismiss
}: CoachingModalProps) {
  const [breathePhase, setBreathePhase] = useState<'In' | 'Hold' | 'Out'>('In');
  const [timerCount, setTimerCount] = useState(20);

  useEffect(() => {
    // Interactive coaching local timer
    const count = exerciseType === 'eye' ? 20 : (exerciseType === 'hydrate' ? 10 : 30);
    setTimerCount(count);

    const interval = setInterval(() => {
      setTimerCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [exerciseType]);

  useEffect(() => {
    // Breathing cycle loop (4s In, 2s Hold, 4s Out)
    let cycle = 0;
    const breatheInterval = setInterval(() => {
      cycle = (cycle + 1) % 3;
      if (cycle === 0) setBreathePhase('In');
      else if (cycle === 1) setBreathePhase('Hold');
      else setBreathePhase('Out');
    }, 3500);

    return () => clearInterval(breatheInterval);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        id="coaching-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 select-none backdrop-blur-xs"
      >
        <motion.div
          id="coaching-card"
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="relative max-w-md w-full bg-white border border-gray-200 p-6 shadow-md rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
            <span className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-black" />
              PULSE COMPLIANCE COACHING SEQUENCE
            </span>
            <button 
              id="coaching-close"
              onClick={() => onDismiss(false)}
              className="text-gray-400 hover:text-black transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-center">
            
            {/* Visual Icon Badge */}
            <div className="mx-auto h-12 w-12 rounded-xl border border-gray-200 bg-neutral-50 flex items-center justify-center mb-3">
              {exerciseType === 'eye' ? (
                <Eye className="h-5 w-5 text-black" />
              ) : exerciseType === 'hydrate' ? (
                <Droplets className="h-5 w-5 text-sky-500 animate-bounce" />
              ) : (
                <Smile className="h-5 w-5 text-black" />
              )}
            </div>

            <h3 className="font-sans text-sm font-black text-neutral-900 leading-tight uppercase tracking-tight">
              {label}
            </h3>
            
            <p className="font-sans text-[11px] text-neutral-400 px-4 mt-2 leading-relaxed">
              {description}
            </p>

            {/* Guided Animations Box */}
            <div className="my-6 min-h-[160px] bg-neutral-50/50 border border-gray-200 p-4 flex flex-col items-center justify-center relative overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:16px_16px] opacity-15" />
              
              {exerciseType === 'eye' && (
                <div id="eye-shuttle-scene" className="relative group text-center flex flex-col items-center">
                  {/* Eye Focus shuttle pattern */}
                  <div className="flex items-center gap-20">
                    <motion.div
                      id="focal-point-l"
                      className="h-4 w-4 rounded-full border border-black bg-neutral-200 flex items-center justify-center"
                    >
                      <span className="font-mono text-[8px]">NEAR</span>
                    </motion.div>

                    {/* Animated Focal Ball bouncing between left and right */}
                    <motion.div
                      id="moving-iris"
                      animate={{ 
                        x: [-45, 45, -45],
                        scale: [1, 1.4, 1] 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 3, 
                        ease: 'easeInOut' 
                      }}
                      className="absolute h-6.5 w-6.5 rounded-full border-2 border-black bg-white flex items-center justify-center"
                    >
                      <span className="h-2 w-2 rounded-full bg-black" />
                    </motion.div>

                    <motion.div
                      id="focal-point-r"
                      className="h-4 w-4 rounded-full border border-black bg-neutral-200 flex items-center justify-center"
                    >
                      <span className="font-mono text-[8px]">FAR</span>
                    </motion.div>
                  </div>
                  
                  <p className="font-mono text-[9px] text-gray-500 mt-5 uppercase tracking-wider font-bold">
                    SHIFT VISION: TRACK THE BALL 20 FEET AWAY
                  </p>
                </div>
              )}

              {exerciseType === 'stretch' && (
                <div id="stretch-scene" className="flex flex-col items-center text-center">
                  {/* Neck stretch looping dynamic SVG */}
                  <svg className="w-20 h-20 text-black mb-1" viewBox="0 0 100 100">
                    <circle cx="50" cy="30" r="15" fill="none" stroke="black" strokeWidth="2.5" />
                    <motion.path
                      animate={{
                        d: [
                          "M 50 45 L 50 80", // straight
                          "M 50 45 C 40 55, 40 70, 50 80", // left tilt
                          "M 50 45 C 60 55, 60 70, 50 80", // right tilt
                          "M 50 45 L 50 80"
                        ]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 6,
                        ease: 'easeInOut'
                      }}
                      fill="none"
                      stroke="black"
                      strokeWidth="2.5"
                    />
                    <path d="M 30 80 L 70 80" stroke="black" strokeWidth="3" />
                  </svg>
                  
                  <p className="font-mono text-[9px] text-gray-500 mt-2 uppercase tracking-wider font-bold">
                    SLOWLY ROTATE NECK & ROLL SHOULDERS
                  </p>
                </div>
              )}

              {exerciseType === 'hydrate' && (
                <div id="hydrate-scene" className="flex flex-col items-center text-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                    className="h-10 w-10 border border-black bg-sky-50 flex items-center justify-center p-2 mb-2 rounded-xl"
                  >
                    <Droplets className="h-6 w-6 text-sky-500" />
                  </motion.div>
                  
                  <p className="font-mono text-[9px] text-gray-500 mt-1 uppercase tracking-wider font-bold">
                    DRINK 1 FULL CUP OF COLD WATER
                  </p>
                </div>
              )}

              {/* General focus breathing rhythm overlay (Alpha cycles) */}
              {exerciseType !== 'eye' && exerciseType !== 'stretch' && exerciseType !== 'hydrate' && (
                <div id="breathing-coach-scene" className="flex flex-col items-center">
                  {/* Pacing breathing visual guidance */}
                  <motion.div
                    animate={{
                      scale: breathePhase === 'In' ? 2.0 : (breathePhase === 'Hold' ? 2.0 : 1.0),
                      opacity: breathePhase === 'Hold' ? 1.0 : 0.8
                    }}
                    transition={{ duration: 3.5, ease: 'easeInOut' }}
                    className="h-12 w-12 rounded-full border-2 border-black bg-black/10 flex items-center justify-center"
                  >
                    <span className="font-mono text-[9px] font-bold text-black uppercase">
                      {breathePhase}
                    </span>
                  </motion.div>
                  
                  <p className="font-mono text-[9px] text-gray-500 mt-6 uppercase tracking-wider font-bold">
                    BREATHE SLOWLY: {breathePhase === 'In' ? 'Inhale Deeply' : (breathePhase === 'Hold' ? 'Hold breath' : 'Exhale slowly')}
                  </p>
                </div>
              )}
              
            </div>

            {/* Timer visual Countdown tag */}
            <div className="flex items-center justify-between border-t border-gray-150 pt-4 font-mono text-[10px] uppercase text-neutral-800 tracking-wider">
              <span className="font-bold">TIME AT GRACE ACTIVITY</span>
              <span id="coaching-timer" className="font-black text-black border border-black bg-yellow-100 px-2 py-0.5 rounded-lg">
                {timerCount} SECONDS LEFT
              </span>
            </div>

          </div>

          {/* Footer Controls */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2 border-t border-gray-150 pt-4">
            <button
              id="coaching-skip-btn"
              onClick={() => onDismiss(false)}
              className="w-full sm:w-1/3 border border-gray-200 bg-white hover:bg-neutral-50 py-3 font-mono text-xs uppercase tracking-widest font-bold transition-all cursor-pointer text-center rounded-2xl"
            >
              SKIP
            </button>
            <button
              id="coaching-complete-btn"
              onClick={() => onDismiss(true)}
              className="w-full sm:w-2/3 border-2 border-black bg-black text-white hover:bg-neutral-800 py-3 font-mono text-xs uppercase tracking-widest font-bold transition-all hover:text-[#fff] cursor-pointer text-center rounded-2xl"
            >
              RECORD AS COMPLETED
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
