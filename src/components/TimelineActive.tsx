/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  BellRing, 
  Headphones, 
  VolumeX, 
  Clock, 
  Sparkles,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { ScheduledTask } from '../types';

interface TimelineActiveProps {
  tasks: ScheduledTask[];
  onTogglePlay: (id: string) => void;
  onResetTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: ScheduledTask) => void;
}

export default function TimelineActive({
  tasks,
  onTogglePlay,
  onResetTask,
  onDeleteTask,
  onUpdateTask
}: TimelineActiveProps) {
  
  // Format seconds into HH:MM:SS or MM:SS
  const formatTime = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const getAudioTagLabel = (profileId: string): string => {
    if (profileId.startsWith('synth_')) {
      const type = profileId.replace('synth_', '');
      return `HARDWARE: ${type.toUpperCase()}`;
    }
    if (profileId.startsWith('custom_')) {
      return 'CUSTOM LOADED MP3';
    }
    return 'DEFAULT CHIME';
  };

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAudioProfile, setEditAudioProfile] = useState('');
  const [editBinauralSoundscape, setEditBinauralSoundscape] = useState<'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen'>('off');
  const [editEnableProgressCues, setEditEnableProgressCues] = useState(true);

  // Countdown duration edit state
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('5');
  const [editSeconds, setEditSeconds] = useState('0');

  // Alarm targetTime edit state
  const [editAlarmHour, setEditAlarmHour] = useState('09');
  const [editAlarmMinute, setEditAlarmMinute] = useState('00');
  const [editAlarmAmpm, setEditAlarmAmpm] = useState<'AM' | 'PM'>('AM');
  const [editFrequency, setEditFrequency] = useState<'once' | 'daily'>('once');

  // List of uploaded tracks
  const [uploadedTracks, setUploadedTracks] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Lazy get uploaded custom tracks from db
    const loadCustomAudioTracks = async () => {
      try {
        const { getAllAudioFiles } = await import('../lib/indexedDB');
        const tracks = await getAllAudioFiles();
        setUploadedTracks(tracks || []);
      } catch (err) {
        console.warn('Could not read audio files in active alarms list:', err);
      }
    };
    loadCustomAudioTracks();
  }, [tasks]);

  const startEditing = (task: ScheduledTask) => {
    setEditingTaskId(task.id);
    setEditLabel(task.label);
    setEditDescription(task.description);
    setEditAudioProfile(task.audioProfileId);
    setEditBinauralSoundscape(task.binauralSoundscape || 'off');
    setEditEnableProgressCues(task.enableProgressCues !== false);

    if (task.type === 'countdown') {
      const h = Math.floor(task.duration / 3600);
      const m = Math.floor((task.duration % 3600) / 60);
      const s = task.duration % 60;
      setEditHours(String(h));
      setEditMinutes(String(m));
      setEditSeconds(String(s));
    } else {
      if (task.targetTime) {
        const [h24Str, mStr] = task.targetTime.split(':');
        const h24 = parseInt(h24Str) || 0;
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        setEditAlarmHour(String(h12).padStart(2, '0'));
        setEditAlarmMinute(mStr || '00');
        setEditAlarmAmpm(ampm);
      }
      setEditFrequency(task.frequency || 'once');
    }
  };

  const saveEditing = (task: ScheduledTask) => {
    let updatedDuration = task.duration;
    let updatedRemainingTime = task.remainingTime;
    let updatedTriggerTimestamp = task.triggerTimestamp;
    let updatedTargetTime = task.targetTime;
    let updatedOriginalTriggerTime = task.originalTriggerTime;

    if (task.type === 'countdown') {
      const hrs = Math.max(0, parseInt(editHours) || 0);
      const mins = Math.max(0, parseInt(editMinutes) || 0);
      const secs = Math.max(0, parseInt(editSeconds) || 0);
      const totalSecs = (hrs * 3600) + (mins * 60) + secs;
      const durationValue = totalSecs > 0 ? totalSecs : 10;
      updatedDuration = durationValue;

      if (durationValue !== task.duration) {
        updatedRemainingTime = durationValue;
        updatedTriggerTimestamp = task.isRunning ? Date.now() + (durationValue * 1000) : undefined;
      } else {
        updatedTriggerTimestamp = task.isRunning ? Date.now() + (task.remainingTime * 1000) : undefined;
      }
    } else {
      const targetHourStr = editAlarmHour;
      let targetHour = parseInt(targetHourStr) || 9;
      const targetMinute = String(parseInt(editAlarmMinute) || 0).padStart(2, '0');
      
      let h24 = targetHour;
      if (editAlarmAmpm === 'PM' && h24 < 12) h24 += 12;
      if (editAlarmAmpm === 'AM' && h24 === 12) h24 = 0;
      
      updatedTargetTime = `${String(h24).padStart(2, '0')}:${targetMinute}`;
      updatedOriginalTriggerTime = `${String(targetHour).padStart(2, '0')}:${targetMinute} ${editAlarmAmpm}`;
    }

    onUpdateTask({
      ...task,
      label: editLabel,
      description: editDescription,
      audioProfileId: editAudioProfile,
      binauralSoundscape: editBinauralSoundscape,
      enableProgressCues: editEnableProgressCues,
      duration: updatedDuration,
      remainingTime: updatedRemainingTime,
      triggerTimestamp: updatedTriggerTimestamp,
      targetTime: updatedTargetTime,
      originalTriggerTime: updatedOriginalTriggerTime,
      frequency: editFrequency
    });

    setEditingTaskId(null);
  };

  return (
    <div id="active-timeline" className="border border-gray-200 bg-white/95 p-6 shadow-sm min-h-[400px] flex flex-col justify-between rounded-2xl">
      <div>
        {/* Header containing Count: X */}
        <div className="flex items-end justify-between border-b border-gray-100 pb-3 mb-4 select-none">
          <div className="flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-black" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
              Scheduled Active Lists
            </h2>
          </div>
          
          <span id="active-tasks-count" className="font-mono text-[9px] font-bold uppercase tracking-widest bg-black text-white px-2.5 py-1">
            ACTIVE: {tasks.length}
          </span>
        </div>

        {tasks.length === 0 ? (
          <div id="empty-timeline-state" className="flex flex-col items-center justify-center py-20 text-center select-none text-neutral-400">
            <BellRing className="h-10 w-10 stroke-1 mb-3 text-neutral-300" />
            <p className="font-sans text-sm font-medium text-gray-400">Your timeline is empty.</p>
            <p className="font-mono text-[9px] uppercase mt-1 tracking-wider text-gray-400">Spin up some countdown intervals above to begin.</p>
          </div>
        ) : (
          <div id="tasks-scroll-container" className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            <AnimatePresence initial={false}>
              {tasks.map((task) => {
                // Calculate percentage for progress line bottom edge
                const percent = task.duration > 0 
                  ? (task.remainingTime / task.duration) * 100 
                  : 100;
                
                const isEditing = editingTaskId === task.id;

                return (
                  <motion.div
                    key={task.id}
                    id={`task-card-${task.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className={`relative border border-gray-200 p-4 bg-white/55 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col justify-between hover:border-black transition-all rounded-2xl ${
                      isEditing ? '' : 'min-h-[145px]'
                    } ${
                      task.isGracePeriod ? 'bg-amber-50/50 animate-pulse border-amber-400' : ''
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Editing Drawer */
                      <div className="relative z-10 space-y-3.5 w-full text-stone-900 select-none">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#949494]">
                            Refining Ongoing {task.type.toUpperCase()}
                          </span>
                          <button 
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-black cursor-pointer"
                            title="Cancel editing"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* Label input */}
                          <div>
                            <label className="block font-mono text-[9px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                              Goal Title
                            </label>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="w-full text-xs font-sans px-3 py-1.5 border border-gray-200 bg-white rounded-xl focus:outline-none focus:border-black font-medium"
                              placeholder="e.g. Hydro-Break"
                            />
                          </div>

                          {/* Description input */}
                          <div>
                            <label className="block font-mono text-[9px] uppercase font-bold text-gray-500 mb-1 tracking-wider">
                              Description / Instruction
                            </label>
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full text-xs font-sans px-3 py-1.5 border border-gray-200 bg-white rounded-xl focus:outline-none focus:border-black font-medium text-gray-700"
                              placeholder="e.g. Relieve stress with 3 deep sips."
                            />
                          </div>

                          {/* Time fields */}
                          {task.type === 'countdown' ? (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                  Hours
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="23"
                                  value={editHours}
                                  onChange={(e) => setEditHours(e.target.value)}
                                  className="w-full text-xs font-mono p-1.5 border border-gray-200 bg-white rounded-xl text-center font-bold"
                                />
                              </div>
                              <div>
                                <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                  Minutes
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={editMinutes}
                                  onChange={(e) => setEditMinutes(e.target.value)}
                                  className="w-full text-xs font-mono p-1.5 border border-gray-200 bg-white rounded-xl text-center font-bold"
                                />
                              </div>
                              <div>
                                <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                  Seconds
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={editSeconds}
                                  onChange={(e) => setEditSeconds(e.target.value)}
                                  className="w-full text-xs font-mono p-1.5 border border-gray-200 bg-white rounded-xl text-center font-bold"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                  Hour
                                </label>
                                <select
                                  value={editAlarmHour}
                                  onChange={(e) => setEditAlarmHour(e.target.value)}
                                  className="w-full text-xs font-mono p-1.5 border border-gray-200 bg-white rounded-xl font-bold"
                                >
                                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                  Min
                                </label>
                                <select
                                  value={editAlarmMinute}
                                  onChange={(e) => setEditAlarmMinute(e.target.value)}
                                  className="w-full text-xs font-mono p-1.5 border border-gray-200 bg-white rounded-xl font-bold"
                                >
                                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                  AM/PM
                                </label>
                                <select
                                  value={editAlarmAmpm}
                                  onChange={(e) => setEditAlarmAmpm(e.target.value as any)}
                                  className="w-full text-xs font-mono p-1.5 border border-gray-200 bg-white rounded-xl font-bold"
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>
                              <div>
                                <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                  Freq
                                </label>
                                <select
                                  value={editFrequency}
                                  onChange={(e) => setEditFrequency(e.target.value as any)}
                                  className="w-full text-xs font-mono p-1.5 border border-gray-200 bg-white rounded-xl font-bold"
                                >
                                  <option value="once">Once</option>
                                  <option value="daily">Daily</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Audio selectors and progress beats */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                            <div>
                              <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                Alert Ring Sound
                              </label>
                              <select
                                value={editAudioProfile}
                                onChange={(e) => setEditAudioProfile(e.target.value)}
                                className="w-full text-xs font-sans p-1.5 border border-gray-200 bg-white rounded-xl"
                              >
                                <optgroup label="Hardware Synthesizers">
                                  <option value="synth_beep">Synth Beep</option>
                                  <option value="synth_chime">Melodic Chime</option>
                                  <option value="synth_pulsar">Space Pulsar swoosh</option>
                                  <option value="synth_vibrate">Buzz Alarm</option>
                                  <option value="synth_gong">Metallic Gong</option>
                                  <option value="synth_custom">Custom Waveform</option>
                                </optgroup>
                                {uploadedTracks.length > 0 && (
                                  <optgroup label="Uploaded Audio files">
                                    {uploadedTracks.map(t => (
                                      <option key={t.id} value={`custom_${t.id}`}>{t.name}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>

                            {task.type === 'countdown' && (
                              <div>
                                <label className="block font-mono text-[8px] uppercase font-bold text-gray-400 mb-1">
                                  Binaural Waves
                                </label>
                                <select
                                  value={editBinauralSoundscape}
                                  onChange={(e) => setEditBinauralSoundscape(e.target.value as any)}
                                  className="w-full text-xs font-sans p-1.5 border border-gray-200 bg-white rounded-xl"
                                >
                                  <option value="off">Off (Dry)</option>
                                  <option value="thunder">Distant Thunder (Zen Storm)</option>
                                  <option value="rain">Cozy Foliage Rainfall</option>
                                  <option value="ocean">Ocean Swells (Breathing rate)</option>
                                  <option value="white">Gentle White Wind</option>
                                  <option value="brown">Warm Deep Cabin Rumble</option>
                                  <option value="zen">Zen Harmony & Healing Bells</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {task.type === 'countdown' && (
                            <div className="flex items-center gap-2 select-none pt-1">
                              <input
                                type="checkbox"
                                id={`edit-cues-${task.id}`}
                                checked={editEnableProgressCues}
                                onChange={(e) => setEditEnableProgressCues(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                              />
                              <label 
                                htmlFor={`edit-cues-${task.id}`} 
                                className="font-mono text-[9px] uppercase font-bold text-gray-400 hover:text-black cursor-pointer tracking-wider"
                              >
                                Enable progress tick chimes (50% / 75%)
                              </label>
                            </div>
                          )}

                          {/* Save & Cancel button footer */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="font-mono text-[9px] uppercase font-bold bg-white border border-gray-200 text-gray-600 hover:text-black hover:border-black px-3 py-1.5 rounded-lg active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEditing(task)}
                              className="font-mono text-[9px] uppercase font-black bg-black border border-black text-white hover:bg-neutral-800 px-4 py-1.5 rounded-lg active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Save className="h-3 w-3 inline" />
                              Save Adjustments
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Standard Card View */
                      <>
                        {/* Visual Card details inside */}
                        <div className="relative z-10">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-mono text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                  task.type === 'countdown' ? 'bg-black text-white' : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {task.type.toUpperCase()}
                                </span>
                                
                                {task.binauralSoundscape !== 'off' && (
                                  <span className="font-mono text-[8px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 uppercase flex items-center gap-0.5 tracking-widest animate-pulse">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {task.binauralSoundscape.toUpperCase()} BEATS
                                  </span>
                                )}
                              </div>

                              <h4 className="font-sans text-sm font-black text-neutral-900 mt-2 leading-tight uppercase tracking-tight">
                                {task.label}
                              </h4>
                              
                              <p className="font-sans text-[11px] text-gray-400 leading-snug mt-1 max-w-sm line-clamp-1">
                                {task.description}
                              </p>
                            </div>

                            {/* Right state metrics */}
                            <div className="text-right flex flex-col items-end">
                              {task.type === 'countdown' ? (
                                <div className="flex flex-col items-end">
                                  <span id={`time-${task.id}`} className="font-mono text-xl font-bold tracking-tight text-neutral-900">
                                    {formatTime(task.remainingTime)}
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                    OF {formatTime(task.duration)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className="font-mono text-[11px] font-bold text-red-650 uppercase tracking-widest flex items-center gap-1">
                                    <VolumeX className="h-3.5 w-3.5 inline text-red-500" />
                                    {task.originalTriggerTime}
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                    TRIGGER: {task.frequency.toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Grace period notification wrapper */}
                          {task.isGracePeriod && (
                            <div className="mt-3 flex items-center gap-1.5 bg-amber-500 text-white px-2.5 py-1.5 text-[9px] font-mono uppercase font-bold tracking-wider animate-pulse rounded-xl">
                              <BellRing className="h-3 w-3" />
                              Grace warning: Alarm triggering in {task.graceRemaining}s...
                            </div>
                          )}
                        </div>

                        {/* Bottom controls row and audio file tag */}
                        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 relative z-10">
                          <span className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[150px] sm:max-w-[180px]">
                            {getAudioTagLabel(task.audioProfileId)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Inline Edit Trigger */}
                            <button
                              type="button"
                              onClick={() => startEditing(task)}
                              className="flex items-center justify-center h-7 w-7 border border-black bg-white hover:bg-black hover:text-white transition-all cursor-pointer text-black rounded-lg"
                              title="EDIT REMINDER/ALARM"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>

                            {task.type === 'countdown' && (
                              <>
                                <button
                                  id={`toggle-${task.id}`}
                                  onClick={() => onTogglePlay(task.id)}
                                  className={`flex items-center justify-center h-7 w-7 border border-black hover:bg-black hover:text-white transition-all cursor-pointer rounded-lg ${
                                    task.isRunning ? 'bg-black text-white' : 'bg-white text-black'
                                  }`}
                                  title={task.isRunning ? 'PAUSE TIMER' : 'START TIMER'}
                                >
                                  {task.isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                </button>

                                <button
                                  id={`reset-${task.id}`}
                                  onClick={() => onResetTask(task.id)}
                                  className="flex items-center justify-center h-7 w-7 border border-black bg-white hover:bg-black hover:text-white transition-all cursor-pointer text-black rounded-lg"
                                  title="RESET TIMER"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </button>
                              </>
                            )}

                            <button
                              id={`delete-${task.id}`}
                              onClick={() => onDeleteTask(task.id)}
                              className="flex items-center justify-center h-7 w-7 border border-black bg-white hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer text-black rounded-lg"
                              title="DELETE TASK FROM TIMELINE"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* DYNAMIC PROGRESS LINE BOTTOM EDGE (Thick, solid black dynamically shrinking from right to left) */}
                        {task.type === 'countdown' && (
                          <div 
                            id={`progress-bar-${task.id}`}
                            className="absolute bottom-0 left-0 h-1 bg-black transition-all ease-linear"
                            style={{ 
                              width: `${percent}%`,
                            }}
                          />
                        )}
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <p className="font-sans text-[9px] text-gray-500 italic mt-4 text-center leading-normal uppercase font-bold tracking-wider">
          Keep this browser window active. Background timers are managed via dynamic Web Workers.
        </p>
      )}
    </div>
  );
}
