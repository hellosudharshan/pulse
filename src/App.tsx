/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  HelpCircle, 
  ShieldAlert, 
  Sparkles, 
  Compass, 
  Flame, 
  Activity,
  Award,
  BookOpen,
  Clock,
  CheckCircle
} from 'lucide-react';

import { TimerPreset, ScheduledTask, ComplianceRecord } from './types';
import SplashUnlock from './components/SplashUnlock';
import DashboardHeader from './components/DashboardHeader';
import PresetGrid from './components/PresetGrid';
import FormConfiguration from './components/FormConfiguration';
import TimelineActive from './components/TimelineActive';
import CoachingModal from './components/CoachingModal';
import ComplianceStats from './components/ComplianceStats';
import AlertPopup, { AlertTaskSummary } from './components/AlertPopup';
import QuickSetupPopup from './components/QuickSetupPopup';

import { createBgWorker } from './lib/workerTicker';
import { 
  initAudioEngine, 
  playSynthesizerAlarm, 
  playCustomAudioFile, 
  speakLabel, 
  playProgressCue, 
  startFocusSoundscape, 
  stopFocusSoundscape,
  duckSoundscape
} from './lib/audioEngine';

import { 
  getPresetsDB, 
  savePresetsDB, 
  addComplianceRecord, 
  getComplianceRecords, 
  saveActiveTasksDB, 
  getActiveTasksDB 
} from './lib/indexedDB';

// 1. Core default preset cards
const DEFAULT_PRESETS: TimerPreset[] = [
  {
    id: 'preset_eye',
    label: '20s Eye Rule',
    duration: 20,
    subtext: 'Relieve pupil and optical nerve fatigue. Shift gaze 20 feet away.',
    iconName: 'Eye',
    audioProfileId: 'synth_chime'
  },
  {
    id: 'preset_stretch',
    label: '5 min Stretch',
    duration: 300,
    subtext: 'Release spine and neck pressure. Roll shoulders and stretch posture.',
    iconName: 'Activity',
    audioProfileId: 'synth_gong'
  },
  {
    id: 'preset_hydrate',
    label: '15 min Hydrate',
    duration: 900,
    subtext: 'Sip a glass of fresh water to restore metabolism and energy.',
    iconName: 'Droplet',
    audioProfileId: 'synth_pulsar'
  },
  {
    id: 'preset_pomodoro',
    label: '25m Pomodoro',
    duration: 1500,
    subtext: 'High-concentration concentrated sprint block for core work priorities.',
    iconName: 'Flame',
    audioProfileId: 'synth_beep'
  }
];

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [presets, setPresets] = useState<TimerPreset[]>(DEFAULT_PRESETS);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([]);
  
  // Custom temporary success popovers
  const [createdTaskNotification, setCreatedTaskNotification] = useState<{ label: string; type: string } | null>(null);
  
  // Mobile adaptive layout view toggles
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<'presets' | 'schedule' | 'compliance'>('presets');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Audio state
  const [binauralSoundscape, setBinauralSoundscape] = useState<'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen'>('off');
  const [calendarGuard, setCalendarGuard] = useState(false);

  // Synchronize ambient soundscape state with actual Web Audio playback
  useEffect(() => {
    if (unlocked) {
      try {
        startFocusSoundscape(binauralSoundscape);
      } catch (err) {
        console.warn('Failed to start focus soundscape:', err);
      }
    } else {
      stopFocusSoundscape();
    }
  }, [binauralSoundscape, unlocked]);

  // Dynamically play the running task's assigned soundscape, if any
  useEffect(() => {
    if (!unlocked) return;
    const runningTaskWithSound = tasks.find(t => t.type === 'countdown' && t.isRunning && t.binauralSoundscape !== 'off');
    if (runningTaskWithSound) {
      setBinauralSoundscape(runningTaskWithSound.binauralSoundscape);
    }
  }, [tasks, unlocked]);
  
  // Alert queues & Coaching Active State
  const [activeAlerts, setActiveAlerts] = useState<AlertTaskSummary[]>([]);
  const [activeCoaching, setActiveCoaching] = useState<{
    id: string;
    type: 'eye' | 'stretch' | 'hydrate' | 'focus' | 'other';
    label: string;
    description: string;
  } | null>(null);

  // User idle watcher
  const [idleStatus, setIdleStatus] = useState(false);

  // Load baseline on mount
  useEffect(() => {
    const bootstrapData = async () => {
      try {
        // Load custom presets
        const cachedPresets = await getPresetsDB();
        if (cachedPresets) {
          setPresets(cachedPresets);
        } else {
          await savePresetsDB(DEFAULT_PRESETS);
        }

        // Load active ongoing countdowns/alarms
        const cachedTasks = await getActiveTasksDB();
        if (cachedTasks) {
          // Re-calculate timestamps to survive refreshes
          const rightNow = Date.now();
          const normalized = cachedTasks.map(t => {
            if (t.type === 'countdown' && t.isRunning && t.triggerTimestamp) {
              const remains = Math.max(0, Math.round((t.triggerTimestamp - rightNow) / 1000));
              return {
                ...t,
                remainingTime: remains,
                triggerTimestamp: rightNow + (remains * 1000)
              };
            }
            return t;
          });
          setTasks(normalized);
        }

        // Load historical transaction logs
        const cachedLogs = await getComplianceRecords();
        setComplianceRecords(cachedLogs);

      } catch (err) {
        console.warn('Bootstrapping cache failed:', err);
      }
    };

    bootstrapData();
  }, []);

  // Keyboard/Mouse activity watch loop (5 minutes idle pause for Pomodoros)
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetIdle = () => {
      setIdleStatus(false);
      clearTimeout(idleTimer);

      // Trigger Idle state after 5 minutes (300,000ms)
      idleTimer = setTimeout(() => {
        setIdleStatus(true);
        
        // Auto pause running active Pomodoro sprints to maintain score compliance
        setTasks(prev => {
          const next = prev.map(t => {
            if (t.type === 'countdown' && t.isRunning && t.label.toLowerCase().includes('pomodoro')) {
              return {
                ...t,
                isRunning: false,
                remainingTime: t.remainingTime // retains current frame
              };
            }
            return t;
          });
          saveActiveTasksDB(next);
          return next;
        });

      }, 300000);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('mousedown', resetIdle);
    window.addEventListener('touchstart', resetIdle);

    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('mousedown', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      clearTimeout(idleTimer);
    };
  }, []);

  // Helper to resolve exercise mapping types dynamically based on labels
  const getRecordCategory = (task: Omit<ScheduledTask, 'id' | 'isRunning' | 'remainingTime'>): 'eye' | 'stretch' | 'hydrate' | 'focus' | 'other' => {
    const text = (task.label + ' ' + task.description).toLowerCase();
    if (text.includes('eye') || text.includes('optical') || text.includes('gaze') || text.includes('blink')) return 'eye';
    if (text.includes('stretch') || text.includes('posture') || text.includes('back') || text.includes('neck')) return 'stretch';
    if (text.includes('hydrate') || text.includes('water') || text.includes('sip') || text.includes('drink')) return 'hydrate';
    if (text.includes('pomodoro') || text.includes('sprint') || text.includes('focus') || text.includes('work')) return 'focus';
    return 'other';
  };

  // Triggering alert popup action and synthesizers
  const triggerAlarmEvent = (task: ScheduledTask) => {
    // Speak custom title aloud via window.speechSynthesis
    if (!calendarGuard) {
      if (task.audioProfileId.startsWith('synth_')) {
        const type = task.audioProfileId.replace('synth_', '');
        playSynthesizerAlarm(type as any, 3500);
      } else if (task.audioProfileId.startsWith('custom_')) {
        const fileId = task.audioProfileId.replace('custom_', '');
        playCustomAudioFile(fileId, 5000);
      }
      let announceText = '';
      const labelLower = task.label.toLowerCase().trim();
      if (labelLower.startsWith('time to') || labelLower.startsWith('time for')) {
        announceText = task.label;
      } else {
        announceText = `Time to ${task.label}`;
      }
      if (task.description && task.description.trim()) {
        if (!announceText.endsWith('.')) {
          announceText += '.';
        }
        announceText += ` ${task.description}`;
      }
      speakLabel(announceText);
    } else {
      // Calendar Guard Silent Notification Trigger
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Pulse: ${task.label}`, {
            body: task.description
          });
        } catch (e) {}
      }
    }

    // Append to active alerts stack
    const cat = getRecordCategory(task);
    setActiveAlerts(prev => {
      if (prev.some(a => a.id === task.id)) return prev;
      return [...prev, {
        id: task.id,
        label: task.label,
        description: task.description,
        type: cat
      }];
    });

    // Auto trigger coaching coach screen
    setActiveCoaching({
      id: task.id,
      type: cat,
      label: task.label,
      description: task.description
    });
  };

  // CORE TICK RUNNER - Maintains absolute deltas verification
  const handleTick = () => {
    const rightNow = Date.now();
    const curDate = new Date();
    
    // Alarms hour-minute format e.g. "09:00"
    const current24hStr = `${String(curDate.getHours()).padStart(2, '0')}:${String(curDate.getMinutes()).padStart(2, '0')}`;
    const currentSecs = curDate.getSeconds();

    setTasks(prevTasks => {
      let isAnyTimerUpdate = false;
      const finishedCountdownIds: string[] = [];

      const nextTasks = prevTasks.map(task => {
        if (task.type === 'countdown') {
          if (!task.isRunning) return task;

          // True difference calculated to survive inactive background states
          const remains = Math.max(0, Math.round((task.triggerTimestamp! - rightNow) / 1000));
          
          if (remains <= 0) {
            finishedCountdownIds.push(task.id);
            isAnyTimerUpdate = true;
            return { ...task, remainingTime: 0, isRunning: false };
          }

          let progressMark50 = task.progressMark50;
          let progressMark75 = task.progressMark75;
          const ratio = remains / task.duration;

          // Dispatch progress clicks/chimes
          if (task.duration >= 20 && task.enableProgressCues !== false) {
            if (ratio <= 0.5 && !progressMark50) {
              playProgressCue(50);
              progressMark50 = true;
              isAnyTimerUpdate = true;
            }
            if (ratio <= 0.25 && !progressMark75) {
              playProgressCue(75);
              progressMark75 = true;
              isAnyTimerUpdate = true;
            }
          }

          // Adaptive grace warning 5 seconds block
          let isGracePeriod = task.isGracePeriod;
          let graceRemaining = task.graceRemaining;
          if (remains <= 5 && task.duration >= 15 && !isGracePeriod) {
            isGracePeriod = true;
            graceRemaining = remains;
            isAnyTimerUpdate = true;
          } else if (isGracePeriod) {
            graceRemaining = remains;
            isAnyTimerUpdate = true;
          }

          if (remains !== task.remainingTime) {
            isAnyTimerUpdate = true;
            return {
              ...task,
              remainingTime: remains,
              isGracePeriod,
              graceRemaining,
              progressMark50,
              progressMark75
            };
          }
          return task;
        } else {
          // Time based specific Alarm trigger matching
          // Check match target HH:MM and precise second 00 (triggers once per matching minute)
          if (current24hStr === task.targetTime && currentSecs === 0) {
            triggerAlarmEvent(task);
            
            // If alarm is One-time Only, it self-prunes from timeline list.
            if (task.frequency === 'once') {
              finishedCountdownIds.push(task.id);
              isAnyTimerUpdate = true;
            }
          }
          return task;
        }
      });

      // Fire completed countdown alerts
      prevTasks.forEach(task => {
        if (task.type === 'countdown' && task.isRunning) {
          const remains = Math.max(0, Math.round((task.triggerTimestamp! - rightNow) / 1000));
          if (remains <= 0) {
            triggerAlarmEvent(task);
          }
        }
      });

      if (isAnyTimerUpdate) {
        // Prune the triggered countdown timers from current Active list
        const filtered = nextTasks.filter(t => !finishedCountdownIds.includes(t.id));
        saveActiveTasksDB(filtered);
        return filtered;
      }

      return prevTasks;
    });
  };

  // Wire back ground Web Worker tick
  useEffect(() => {
    let fallbackInterval: NodeJS.Timeout | null = null;
    const worker = createBgWorker();

    if (worker) {
      worker.postMessage('start');
      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          handleTick();
        }
      };
    } else {
      fallbackInterval = setInterval(() => {
        handleTick();
      }, 1000);
    }

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, []);

  // Soundscapes trigger selector
  const [activeSoundscape, setActiveSoundscape] = useState<'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown'>('off');
  const handleSoundscapeChange = (type: 'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown') => {
    setBinauralSoundscape(type);
  };

  // Add a task from Configuration Panel
  const handleAddTask = (newTask: Omit<ScheduledTask, 'id' | 'isRunning' | 'remainingTime'>) => {
    const id = 'task_' + Date.now();
    const task: ScheduledTask = {
      ...newTask,
      id,
      isRunning: newTask.type === 'countdown', // Autoplay countdowns upon spin up
      remainingTime: newTask.duration,
      triggerTimestamp: newTask.type === 'countdown' ? Date.now() + (newTask.duration * 1000) : undefined
    };

    setTasks(prev => {
      const updated = [...prev, task];
      saveActiveTasksDB(updated);
      return updated;
    });

    setCreatedTaskNotification({ label: newTask.label, type: newTask.type });
    setTimeout(() => {
      setCreatedTaskNotification(null);
    }, 2800);
  };

  // Timed list control triggers
  const handleTogglePlay = (id: string) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === id && t.type === 'countdown') {
          const toggledState = !t.isRunning;
          return {
            ...t,
            isRunning: toggledState,
            // Re-calculate target completion absolute timestamp upon restarts
            triggerTimestamp: toggledState ? Date.now() + (t.remainingTime * 1000) : undefined
          };
        }
        return t;
      });
      saveActiveTasksDB(next);
      return next;
    });
  };

  const handleResetTask = (id: string) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === id && t.type === 'countdown') {
          return {
            ...t,
            remainingTime: t.duration,
            isGracePeriod: false,
            graceRemaining: undefined,
            progressMark50: false,
            progressMark75: false,
            triggerTimestamp: t.isRunning ? Date.now() + (t.duration * 1000) : undefined
          };
        }
        return t;
      });
      saveActiveTasksDB(next);
      return next;
    });
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => {
      const filtered = prev.filter(t => t.id !== id);
      saveActiveTasksDB(filtered);
      return filtered;
    });
  };

  const handleUpdateTask = (updatedTask: ScheduledTask) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === updatedTask.id ? updatedTask : t);
      saveActiveTasksDB(next);
      return next;
    });
  };

  // Quick preset launch starts instantly
  const handleStartPreset = (preset: TimerPreset) => {
    const selectedSound = preset.audioProfileId || 'synth_chime';
    const defaultSoundscape = preset.label.toLowerCase().includes('pomodoro') ? 'rain' : 'off';

    handleAddTask({
      type: 'countdown',
      label: preset.label,
      description: preset.subtext,
      duration: preset.duration,
      frequency: 'once',
      audioProfileId: selectedSound,
      binauralSoundscape: defaultSoundscape
    });
  };

  // Preset Custom Editing panel
  const handleUpdatePreset = (updated: TimerPreset) => {
    setPresets(prev => {
      const next = prev.map(p => p.id === updated.id ? updated : p);
      savePresetsDB(next);
      return next;
    });
  };

  const handleAddPreset = (newPreset: TimerPreset) => {
    setPresets(prev => {
      const next = [...prev, newPreset];
      savePresetsDB(next);
      return next;
    });
  };

  const handleDeletePreset = (id: string) => {
    setPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      savePresetsDB(next);
      return next;
    });
  };

  // Sidebar Alert Dismiss actions
  const handleDismissAlert = (id: string, wasCompleted: boolean) => {
    // Clear the specific active alerts slot
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
    
    // If coaching is pointing to this element, clear it
    if (activeCoaching?.id === id) {
      setActiveCoaching(null);
    }

    // Log the transaction results
    const matchingTask = tasks.find(t => t.id === id);
    if (matchingTask) {
      const rec: ComplianceRecord = {
        id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 100),
        date: new Date().toISOString().split('T')[0],
        type: getRecordCategory(matchingTask),
        label: matchingTask.label,
        status: wasCompleted ? 'completed' : 'skipped',
        timestamp: Date.now()
      };

      addComplianceRecord(rec).then(() => {
        getComplianceRecords().then(setComplianceRecords);
      });
    }

    // Re-warm focus soundscapes
    duckSoundscape(false);
  };

  const handleDismissAllAlerts = (wasCompleted: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Log all active transactions in bulk
    activeAlerts.forEach((al) => {
      const rec: ComplianceRecord = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: today,
        type: al.type,
        label: al.label,
        status: wasCompleted ? 'completed' : 'skipped',
        timestamp: Date.now()
      };
      
      addComplianceRecord(rec);
    });

    // Refresh history
    setTimeout(() => {
      getComplianceRecords().then(setComplianceRecords);
    }, 200);

    setActiveAlerts([]);
    setActiveCoaching(null);
    duckSoundscape(false);
  };

  // Coaching panel action dispatcher
  const handleDismissCoaching = (wasCompleted: boolean) => {
    if (activeCoaching) {
      handleDismissAlert(activeCoaching.id, wasCompleted);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Erase all local transaction compliance history logs?')) {
      // Direct local storage clearing for DB
      try {
        const req = window.indexedDB.deleteDatabase('PulseDB');
        req.onsuccess = () => {
          setComplianceRecords([]);
          window.location.reload();
        };
      } catch (e) {
        localStorage.removeItem('pulse_compliance_fallback');
        setComplianceRecords([]);
      }
    }
  };

  return (
    <div 
      id="app-root-container" 
      className="min-h-screen bg-[#F9F9F9] text-black selection:bg-black selection:text-white pb-24 md:pb-16 relative"
      style={{ backgroundImage: 'radial-gradient(#E0E0E0 1.5px, transparent 0)', backgroundSize: '24px 24px' }}
    >
      
      {/* 1. Mobile unlock interlock gateway overlay */}
      <SplashUnlock onUnlockCompleted={() => setUnlocked(true)} />

      {/* Primary Dashboard Container */}
      {unlocked && (
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-6">
          
          {/* Header Panel */}
          <DashboardHeader
            binauralSoundscape={binauralSoundscape}
            onSoundscapeChange={handleSoundscapeChange}
            complianceScore={activeAlerts.length}
            calendarGuard={calendarGuard}
            onCalendarGuardToggle={() => setCalendarGuard(prev => !prev)}
            idleStatus={idleStatus}
          />

          {isMobile ? (
            /* Mobile View Screen Switcher */
            <div className="space-y-6">
              {mobileTab === 'presets' && (
                <>
                  <PresetGrid
                    presets={presets}
                    onStartPreset={handleStartPreset}
                    onUpdatePreset={handleUpdatePreset}
                    onAddPreset={handleAddPreset}
                    onDeletePreset={handleDeletePreset}
                  />
                  <TimelineActive
                    tasks={tasks}
                    onTogglePlay={handleTogglePlay}
                    onResetTask={handleResetTask}
                    onDeleteTask={handleDeleteTask}
                    onUpdateTask={handleUpdateTask}
                  />
                </>
              )}

              {mobileTab === 'schedule' && (
                <FormConfiguration onAddTask={handleAddTask} />
              )}

              {mobileTab === 'compliance' && (
                <ComplianceStats 
                  records={complianceRecords} 
                  onClearHistory={handleClearHistory}
                />
              )}
            </div>
          ) : (
            /* Standard Responsive Desktop View Layout */
            <>
              {/* Quick Presets Grid Block */}
              <PresetGrid
                presets={presets}
                onStartPreset={handleStartPreset}
                onUpdatePreset={handleUpdatePreset}
                onAddPreset={handleAddPreset}
                onDeletePreset={handleDeletePreset}
              />

              {/* Two-Column Bento Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Wing bento layout (Alarm & schedule inputs) */}
                <div className="lg:col-span-7 space-y-6">
                  <FormConfiguration onAddTask={handleAddTask} />
                </div>

                {/* Right Wing bento layout (Live listed timelines) */}
                <div className="lg:col-span-12 lg:col-span-5">
                  <TimelineActive
                    tasks={tasks}
                    onTogglePlay={handleTogglePlay}
                    onResetTask={handleResetTask}
                    onDeleteTask={handleDeleteTask}
                    onUpdateTask={handleUpdateTask}
                  />
                </div>

              </div>

              {/* Core Analytics Dashboard (Historical compliance compiling widgets) */}
              <ComplianceStats 
                records={complianceRecords} 
                onClearHistory={handleClearHistory}
              />
            </>
          )}

          {/* Moved QuickSetupPopup to root level to avoid parent container stacking context restrictions */}
        </div>
      )}

      {/* Floating Action Quick Setup Trigger and Modal view */}
      {unlocked && (
        <QuickSetupPopup onAddTask={handleAddTask} />
      )}

      {/* 1.5. Floating success notification toast */}
      <AnimatePresence>
        {createdTaskNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-[200] flex items-center gap-3.5 bg-[#0e0e0e] text-white px-5 py-4 shadow-2xl rounded-2xl border border-neutral-800 font-sans max-w-[90vw] sm:max-w-md select-none"
          >
            <div className="bg-green-500 text-white p-2 rounded-xl flex items-center justify-center shadow-sm animate-pulse">
              <CheckCircle className="h-4.5 w-4.5 stroke-[3.5px]" />
            </div>
            <div>
              <div className="text-[8px] font-mono font-bold tracking-[0.2em] text-[#9CA3AF] uppercase">
                Sequence Initiated
              </div>
              <div className="text-[11px] font-black tracking-wider uppercase text-white mt-0.5 truncate max-w-[220px]">
                {createdTaskNotification.label || 'New Reminder'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Side Sliding alerts modal queues */}
      <AlertPopup
        alerts={activeAlerts}
        calendarGuard={calendarGuard}
        onDismiss={handleDismissAlert}
        onDismissAll={handleDismissAllAlerts}
      />

      {/* 3. Therapeutic Breathing & exercise coaching overlays */}
      {activeCoaching && (
        <CoachingModal
          exerciseType={activeCoaching.type}
          label={activeCoaching.label}
          description={activeCoaching.description}
          onDismiss={handleDismissCoaching}
        />
      )}

      {/* 4. Bottom Tab Switcher for Mobile View Alone */}
      {isMobile && unlocked && (
        <div id="mobile-bottom-tabs" className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 z-40 py-3 px-4 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button
            id="tab-presets"
            type="button"
            onClick={() => setMobileTab('presets')}
            className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 outline-none ${
              mobileTab === 'presets' ? 'text-black scale-105 font-black' : 'text-gray-400 hover:text-gray-600 scale-100 font-semibold'
            }`}
          >
            <Flame className="h-5 w-5" />
            <span className="font-mono text-[9px] tracking-wider uppercase">Presets</span>
          </button>

          <button
            id="tab-schedule"
            type="button"
            onClick={() => setMobileTab('schedule')}
            className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 outline-none ${
              mobileTab === 'schedule' ? 'text-black scale-105 font-black' : 'text-gray-400 hover:text-gray-600 scale-100 font-semibold'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="font-mono text-[9px] tracking-wider uppercase">Schedule</span>
          </button>

          <button
            id="tab-compliance"
            type="button"
            onClick={() => setMobileTab('compliance')}
            className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 outline-none ${
              mobileTab === 'compliance' ? 'text-black scale-105 font-black' : 'text-gray-400 hover:text-gray-600 scale-100 font-semibold'
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            <span className="font-mono text-[9px] tracking-wider uppercase font-bold">Score</span>
          </button>
        </div>
      )}

    </div>
  );
}
