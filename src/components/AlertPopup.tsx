/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BellRing, 
  VolumeX, 
  Volume2, 
  ShieldAlert, 
  Smile, 
  Layers, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export interface AlertTaskSummary {
  id: string;
  label: string;
  description: string;
  type: 'eye' | 'stretch' | 'hydrate' | 'focus' | 'other';
}

interface AlertPopupProps {
  alerts: AlertTaskSummary[];
  calendarGuard: boolean;
  onDismiss: (id: string, wasCompleted: boolean) => void;
  onDismissAll: (wasCompleted: boolean) => void;
}

export default function AlertPopup({
  alerts,
  calendarGuard,
  onDismiss,
  onDismissAll
}: AlertPopupProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  if (alerts.length === 0) return null;

  const isStacked = alerts.length > 1;

  if (isMobile) {
    /* IMMERSIVE FULL-SCREEN MODAL UX FOR MOBILE DEVICES alone */
    return (
      <AnimatePresence>
        <div 
          id="alerts-mobile-fullscreen-modal"
          className="fixed inset-0 bg-neutral-950 text-white z-50 flex flex-col justify-between p-6 md:p-8 select-none"
        >
          {isStacked ? (
            /* Stacked Consolidated View - Mobile Full-screen layout */
            <div className="flex flex-col h-full justify-between gap-6">
              
              {/* Header section */}
              <div className="pt-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                  <span className="font-mono text-[10px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-yellow-400 animate-pulse" />
                    CONSOLIDATED CYCLE NOTIFICATION
                  </span>
                  {calendarGuard && (
                    <span className="font-mono text-[9px] bg-red-950 border border-red-900/60 px-2 py-0.5 uppercase tracking-wider font-bold text-red-300">
                      SILENT
                    </span>
                  )}
                </div>
                
                <h2 className="font-sans text-2xl font-black tracking-tight uppercase leading-tight text-white mb-2">
                  Combined Break Reminder
                </h2>
                <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                  We consolidated multiple active wellness and focus cycle timeouts to save your visual focus and eliminate notification fatigue.
                </p>
              </div>

              {/* Scroller Area of pending items - very readable and clear list */}
              <div id="stacked-items-scroller-mobile" className="flex-1 overflow-y-auto my-2 py-2 pr-1 space-y-3 border-t border-b border-neutral-900">
                {alerts.map((al) => (
                  <div key={al.id} className="bg-neutral-900 p-4 border border-neutral-800">
                    <div className="flex items-center gap-2 justify-between mb-1.5">
                      <span className="font-sans font-black text-neutral-100 uppercase text-xs tracking-tight">{al.label}</span>
                      <span className="font-mono text-[9px] uppercase px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-sm font-bold tracking-wider">{al.type}</span>
                    </div>
                    <p className="font-sans text-xs text-gray-400 leading-normal">{al.description}</p>
                  </div>
                ))}
              </div>

              {/* BOTTOM ACTIONS SECTION: Designed specifically for thumb navigation */}
              <div className="pb-6 space-y-3">
                <button
                  id="btn-dismiss-stacked-complete"
                  onClick={() => onDismissAll(true)}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-mono text-xs uppercase py-4.5 rounded-xl tracking-widest font-black cursor-pointer shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-5 w-5 text-black" />
                  COMPLETE ALL CYCLES ({alerts.length})
                </button>
                <button
                  id="btn-dismiss-stacked-skipped"
                  onClick={() => onDismissAll(false)}
                  className="w-full bg-neutral-900 hover:bg-neutral-850 text-neutral-400 border border-neutral-800 font-mono text-xs uppercase py-4 rounded-xl tracking-widest cursor-pointer font-bold transition-all"
                >
                  SKIP / DISMISS ALL
                </button>
              </div>

            </div>
          ) : (
            /* Single Alarm View - Mobile Full-screen layout */
            alerts.map((al) => (
              <div key={al.id} className="flex flex-col h-full justify-between gap-6">
                
                {/* Header section */}
                <div className="pt-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                      calendarGuard ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {calendarGuard ? (
                        <>
                          <VolumeX className="h-4.5 w-4.5 animate-pulse" />
                          SILENT CALENDAR REMINDER
                        </>
                      ) : (
                        <>
                          <BellRing className="h-4.5 w-4.5 animate-bounce" />
                          WELLNESS COMMAND REMINDER
                        </>
                      )}
                    </span>
                    <span className="font-mono text-[9px] px-2 py-0.5 bg-neutral-900 text-neutral-300 rounded-sm font-bold tracking-wider uppercase">
                      {al.type}
                    </span>
                  </div>
                </div>

                {/* Massive middle layout emphasizing act instruction */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`h-20 w-20 flex items-center justify-center rounded-none mb-6 ${
                      calendarGuard ? 'bg-amber-950/55 border border-amber-800/40' : 'bg-red-950/55 border border-red-805/40'
                    }`}
                  >
                    {calendarGuard ? (
                      <ShieldAlert className="h-10 w-10 text-amber-400" />
                    ) : (
                      <BellRing className="h-10 w-10 text-red-500 animate-pulse" />
                    )}
                  </motion.div>
                  
                  <h1 id="mobile-alarm-title" className="font-sans text-3xl font-black text-white leading-tight uppercase tracking-tight mb-4">
                    {al.label}
                  </h1>
                  
                  <p className="font-sans text-sm text-neutral-400 leading-relaxed max-w-xs">
                    {al.description}
                  </p>
                </div>

                {/* BOTTOM ACTIONS SECTION: Designed specifically for intuitive one-handed thumb navigation */}
                <div className="pb-6 space-y-3">
                  <button
                    id={`alert-complete-${al.id}`}
                    onClick={() => onDismiss(al.id, true)}
                    className={`w-full font-mono text-xs uppercase py-4.5 rounded-xl tracking-widest font-black cursor-pointer shadow-xl transition-all flex items-center justify-center gap-2 ${
                      calendarGuard
                        ? 'bg-amber-400 hover:bg-amber-500 text-neutral-950'
                        : 'bg-white hover:bg-neutral-100 text-black'
                    }`}
                  >
                    <CheckCircle className="h-5 w-5" />
                    COMPLETE ACT
                  </button>
                  <button
                    id={`alert-skip-${al.id}`}
                    onClick={() => onDismiss(al.id, false)}
                    className="w-full bg-neutral-900 hover:bg-neutral-850 text-neutral-400 border border-neutral-850 font-mono text-xs uppercase py-4 rounded-xl tracking-widest cursor-pointer font-bold transition-all"
                  >
                    SKIP / MUTE
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      </AnimatePresence>
    );
  }

  /* STANDARD FLOATING ASIDE TOAST UX FOR DESKTOP VIEW */
  return (
    <AnimatePresence>
      <div 
        id="alerts-sidebar-wrapper"
        className="fixed bottom-6 right-6 z-50 max-w-xs w-full space-y-3"
      >
        {isStacked ? (
          /* Stacked Merged Alarm View */
          <motion.div
            id="stacked-reminders-card"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="border border-neutral-850 bg-neutral-900 text-white p-5 shadow-lg relative overflow-hidden"
          >
            {/* Visual Header indicating a Merge condition */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
              <span className="font-mono text-[8px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1">
                <Layers className="h-3 w-3 inline text-yellow-400" />
                CONSOLIDATED REMINDERS
              </span>
              
              {calendarGuard && (
                <span className="font-mono text-[8px] bg-red-950 border border-red-900/50 px-1.5 py-0.5 uppercase tracking-wider font-bold">
                  Silent Mode
                </span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <BellRing className="h-4.5 w-4.5 text-yellow-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="font-sans text-xs font-black tracking-tight text-white uppercase">
                  Combined Break reminder
                </h4>
                <p className="font-sans text-[11px] text-gray-400 leading-normal mt-1">
                  We consolidated your focus & wellness cycles expiring at the same time to prevent notification fatigue.
                </p>
              </div>
            </div>

            {/* List of individual items in stack */}
            <div id="stacked-items-scroller" className="mt-4 border-t border-b border-neutral-800 py-3 space-y-2 max-h-[155px] overflow-y-auto">
              {alerts.map((al) => (
                <div key={al.id} className="bg-neutral-800/80 p-2.5 border border-neutral-700/60 text-xs">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="font-sans font-bold text-neutral-100 uppercase text-[11px] tracking-tight">{al.label}</span>
                    <span className="font-mono text-[8.5px] uppercase text-gray-400 font-bold tracking-wider">{al.type}</span>
                  </div>
                  <p className="font-sans text-[10px] text-gray-400 mt-1">{al.description}</p>
                </div>
              ))}
            </div>

            {/* Combined Dismiss Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                id="btn-dismiss-stacked-skipped"
                onClick={() => onDismissAll(false)}
                className="flex-1 bg-neutral-850 hover:bg-neutral-800 text-gray-400 border border-neutral-750 font-mono text-[9px] uppercase font-bold py-2.5 tracking-widest cursor-pointer"
              >
                SKIP
              </button>
              <button
                id="btn-dismiss-stacked-complete"
                onClick={() => onDismissAll(true)}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-mono text-[9px] uppercase py-2.5 tracking-widest font-black cursor-pointer"
              >
                COMPLETE STACK
              </button>
            </div>
          </motion.div>
        ) : (
          /* Single Alarm UI card */
          alerts.map((al) => (
            <motion.div
              key={al.id}
              id={`alert-toast-${al.id}`}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className={`border p-4 shadow-lg relative bg-white select-none ${
                calendarGuard ? 'border-amber-400 bg-amber-50/60' : 'border-red-400 bg-red-50/10'
              }`}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                <span className={`font-mono text-[8.5px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                  calendarGuard ? 'text-amber-700' : 'text-red-700'
                }`}>
                  {calendarGuard ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                      SILENT CALENDAR REMINDER
                    </>
                  ) : (
                    <>
                      <BellRing className="h-3.5 w-3.5 animate-bounce" />
                      SYSTEM COMMAND REMINDER
                    </>
                  )}
                </span>
                
                <span className="font-mono text-[8px] text-gray-400 uppercase font-bold tracking-wider">
                  {al.type}
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                {calendarGuard ? (
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <BellRing className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                )}
                
                <div>
                  <h4 className="font-sans text-xs font-black text-neutral-900 leading-tight uppercase tracking-tight">
                    {al.label}
                  </h4>
                  <p className="font-sans text-[11px] text-gray-500 leading-snug mt-1">
                    {al.description}
                  </p>
                </div>
              </div>

              {/* Individual Trigger Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  id={`alert-skip-${al.id}`}
                  onClick={() => onDismiss(al.id, false)}
                  className="flex-1 border border-gray-150 hover:border-black bg-white hover:bg-neutral-50 py-2.5 text-center text-neutral-500 hover:text-black font-mono text-[9px] uppercase tracking-widest cursor-pointer font-bold transition-all"
                >
                  SKIP / MUTE
                </button>
                <button
                  id={`alert-complete-${al.id}`}
                  onClick={() => onDismiss(al.id, true)}
                  className={`flex-1 border text-center font-mono text-[9px] uppercase py-2.5 tracking-widest font-black cursor-pointer transition-all ${
                    calendarGuard 
                      ? 'bg-amber-400 hover:bg-amber-500 border-amber-550 text-neutral-900' 
                      : 'bg-black text-white hover:bg-neutral-800 border-black'
                  }`}
                >
                  COMPLETE ACT
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </AnimatePresence>
  );
}
