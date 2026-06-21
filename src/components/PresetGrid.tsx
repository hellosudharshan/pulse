/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  Activity, 
  Droplet, 
  Flame, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Smile, 
  Clock, 
  Volume2,
  FileAudio
} from 'lucide-react';
import { TimerPreset } from '../types';

// Map icon strings to actual Lucide component structures
export const iconMap: Record<string, React.ComponentType<any>> = {
  Eye: Eye,
  Activity: Activity,
  Droplet: Droplet,
  Flame: Flame,
  Smile: Smile,
  Clock: Clock
};

interface PresetGridProps {
  presets: TimerPreset[];
  onStartPreset: (preset: TimerPreset) => void;
  onUpdatePreset: (updated: TimerPreset) => void;
  onAddPreset: (newPreset: TimerPreset) => void;
  onDeletePreset: (id: string) => void;
}

export default function PresetGrid({
  presets,
  onStartPreset,
  onUpdatePreset,
  onAddPreset,
  onDeletePreset
}: PresetGridProps) {
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activePresetLaunchId, setActivePresetLaunchId] = useState<string | null>(null);
  
  // Temporary edit states
  const [tempLabel, setTempLabel] = useState('');
  const [tempDurationText, setTempDurationText] = useState('0'); // stored in minutes/seconds for formatting comfort
  const [tempUnit, setTempUnit] = useState<'sec' | 'min'>('min');
  const [tempSubtext, setTempSubtext] = useState('');
  const [tempIconName, setTempIconName] = useState('Clock');
  const [tempAudioProfileId, setTempAudioProfileId] = useState('synth_chime');

  // List of custom uploaded tracks
  const [uploadedTracks, setUploadedTracks] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadCustomAudioTracks = async () => {
      try {
        const { getAllAudioFiles } = await import('../lib/indexedDB');
        const tracks = await getAllAudioFiles();
        setUploadedTracks(tracks || []);
      } catch (err) {
        console.warn('Could not read audio files in presets:', err);
      }
    };
    loadCustomAudioTracks();
  }, [presets]);

  const handlePresetTrigger = (preset: TimerPreset) => {
    setActivePresetLaunchId(preset.id);
    onStartPreset(preset);
    setTimeout(() => {
      setActivePresetLaunchId(null);
    }, 1800);
  };

  const startEdit = (e: React.MouseEvent, preset: TimerPreset) => {
    e.stopPropagation(); // Avoid triggering immediate timer
    setEditingPresetId(preset.id);
    setIsAddingNew(false);
    
    setTempLabel(preset.label);
    if (preset.duration >= 60 && preset.duration % 60 === 0) {
      setTempDurationText(String(preset.duration / 60));
      setTempUnit('min');
    } else {
      setTempDurationText(String(preset.duration));
      setTempUnit('sec');
    }
    setTempSubtext(preset.subtext);
    setTempIconName(preset.iconName);
    setTempAudioProfileId(preset.audioProfileId || 'synth_chime');
  };

  const startAdd = () => {
    setEditingPresetId(null);
    setIsAddingNew(true);
    setTempLabel('New Rule');
    setTempDurationText('10');
    setTempUnit('min');
    setTempSubtext('Micro wellness activity.');
    setTempIconName('Clock');
    setTempAudioProfileId('synth_chime');
  };

  const cancelEdit = () => {
    setEditingPresetId(null);
    setIsAddingNew(false);
  };

  const saveEdit = () => {
    if (!tempLabel.trim() || !tempDurationText) return;
    const num = Math.max(1, parseInt(tempDurationText) || 10);
    const calculatedDuration = tempUnit === 'min' ? num * 60 : num;

    if (editingPresetId) {
      onUpdatePreset({
        id: editingPresetId,
        label: tempLabel,
        duration: calculatedDuration,
        subtext: tempSubtext,
        iconName: tempIconName,
        audioProfileId: tempAudioProfileId
      });
    } else if (isAddingNew) {
      onAddPreset({
        id: 'preset_' + Date.now(),
        label: tempLabel,
        duration: calculatedDuration,
        subtext: tempSubtext,
        iconName: tempIconName,
        audioProfileId: tempAudioProfileId
      });
    }
    
    setEditingPresetId(null);
    setIsAddingNew(false);
  };

  return (
    <div id="presets-component" className="border border-gray-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm rounded-2xl">
      <div className="flex items-end justify-between border-b border-gray-100 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-black" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
            Instant Timer Presets
          </h2>
        </div>
        
        <button
          id="add-preset-btn"
          onClick={startAdd}
          className="text-[10px] uppercase font-bold border-b border-black tracking-widest pb-0.5 hover:text-neutral-600 hover:border-neutral-600 transition-all cursor-pointer"
        >
          Manage Presets
        </button>
      </div>

      {/* Preset cards grid listing */}
      <div id="presets-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {presets.map((preset) => {
          const PresetIcon = iconMap[preset.iconName] || Clock;
          const isCurrentEditing = editingPresetId === preset.id;
          
          const getAudioTagLabel = (id: string) => {
            if (id.startsWith('custom_')) {
              const dbId = id.replace('custom_', '');
              const tr = uploadedTracks.find(t => t.id === dbId);
              return tr ? tr.name : 'CUSTOM FILE';
            }
            if (id === 'synth_beep') return 'BEEP TONE';
            if (id === 'synth_chime') return 'CHIME';
            if (id === 'synth_pulsar') return 'PULS THETA';
            if (id === 'synth_vibrate') return 'BUZZ RING';
            if (id === 'synth_gong') return 'BELL GONG';
            if (id === 'synth_custom') return 'CHIP WAVE';
            return 'CHIME';
          };

          return (
            <motion.div
              key={preset.id}
              whileHover={{ y: -3 }}
              id={`preset-card-${preset.id}`}
              onClick={() => handlePresetTrigger(preset)}
              className={`group relative flex flex-col justify-between border border-gray-200 p-4 bg-white hover:border-black transition-all cursor-pointer select-none min-h-[140px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-2xl`}
            >
              <AnimatePresence>
                {activePresetLaunchId === preset.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#fbfbfb]/95 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-2xl z-20 pointer-events-none border border-neutral-900"
                  >
                    <div className="bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                      <Check className="h-3.5 w-3.5 stroke-[3.5px] text-green-400" />
                      <span className="font-mono text-[9px] uppercase font-black tracking-wider">SEQUENCE INITIATED</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <div className="flex items-start justify-between">
                  <div className="rounded-xl border border-gray-200 p-1.5 bg-neutral-50 group-hover:bg-black group-hover:text-white transition-colors duration-200">
                    <PresetIcon className="h-4.5 w-4.5" />
                  </div>
                  
                  {/* Preset modifier widgets */}
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-preset-btn-${preset.id}`}
                      onClick={(e) => startEdit(e, preset)}
                      className="p-1 text-gray-400 hover:text-black transition-colors"
                      title="Edit preset config"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    {presets.length > 1 && (
                      <button
                        id={`delete-preset-btn-${preset.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                           onDeletePreset(preset.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete preset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                
                <h4 className="font-sans text-sm font-black text-neutral-900 mt-3 leading-tight uppercase tracking-tight">
                  {preset.label}
                </h4>
                
                <p className="font-sans text-[10px] leading-tight text-gray-400 font-medium mt-1 line-clamp-2">
                  {preset.subtext}
                </p>
              </div>

              {/* Bottom display tracker */}
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 font-mono text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                <span className="flex items-center gap-1 text-gray-400 font-bold max-w-[125px] truncate">
                  <Volume2 className="h-3 w-3 inline text-black animate-pulse" />
                  {preset.audioProfileId ? getAudioTagLabel(preset.audioProfileId) : 'CHIME'}
                </span>
                <span className="text-black font-extrabold font-mono text-xs">
                  {preset.duration >= 60 
                    ? `${preset.duration / 60}m` 
                    : `${preset.duration}s`
                  }
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Editor Collapse Expansion Box */}
      <AnimatePresence>
        {(editingPresetId || isAddingNew) && (
          <motion.div
            id="preset-editing-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 border border-gray-300 bg-neutral-50/50 backdrop-blur-sm p-5 relative overflow-hidden rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <span className="font-mono text-xs font-bold text-neutral-900 uppercase tracking-wider">
                {isAddingNew ? 'CREATE NEW PRESET CARD' : 'EDIT INTEGRATION PRESET'}
              </span>
              <button 
                onClick={cancelEdit} 
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inputs column */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block font-mono text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider">
                    Label Name
                  </label>
                  <input
                    id="preset-edit-label"
                    type="text"
                    value={tempLabel}
                    onChange={(e) => setTempLabel(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3 py-2 font-sans text-xs focus:border-black outline-none font-medium rounded-xl"
                    placeholder="e.g. 20s Eye Rule"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider">
                    Duration Size
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="preset-edit-duration"
                      type="number"
                      min="1"
                      value={tempDurationText}
                      onChange={(e) => setTempDurationText(e.target.value)}
                      className="w-24 bg-white border border-gray-200 px-3 py-2 font-mono text-xs focus:border-black outline-none font-medium rounded-xl"
                    />
                    <select
                      id="preset-edit-unit"
                      value={tempUnit}
                      onChange={(e) => setTempUnit(e.target.value as any)}
                      className="bg-white border border-gray-200 px-2 py-2 font-mono text-xs focus:border-black outline-none font-medium rounded-xl"
                    >
                      <option value="sec">Seconds (s)</option>
                      <option value="min">Minutes (m)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider">
                    Icon Theme Badge
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(iconMap).map((icName) => {
                      const IconComp = iconMap[icName];
                      return (
                        <button
                          key={icName}
                          onClick={() => setTempIconName(icName)}
                          className={`p-2 border transition-all rounded-xl ${
                            tempIconName === icName
                              ? 'border-black bg-black text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black'
                          }`}
                        >
                          <IconComp className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Subtext description & validation col */}
              <div className="flex flex-col justify-between gap-3">
                <div>
                  <label className="block font-mono text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider">
                    Card Subtext Descriptors
                  </label>
                  <textarea
                    id="preset-edit-subtext"
                    value={tempSubtext}
                    onChange={(e) => setTempSubtext(e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-gray-200 px-3 py-2 font-sans text-xs focus:border-black outline-none resize-none font-medium rounded-xl"
                    placeholder="Short description guiding user focus..."
                  />
                </div>

                <div className="mt-2 text-stone-900 leading-snug font-sans text-xs">
                  <label className="block font-mono text-[10px] text-[#717171] uppercase font-bold mb-1.5 tracking-wider">
                    Alert Ring Sound (Ringtone)
                  </label>
                  <select
                    value={tempAudioProfileId}
                    onChange={(e) => setTempAudioProfileId(e.target.value)}
                    className="w-full bg-white border border-gray-200 px-3 py-2 font-sans text-xs focus:border-black outline-none font-medium rounded-xl"
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

                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    id="preset-edit-cancel-btn"
                    onClick={cancelEdit}
                    className="border border-gray-200 py-1.5 px-4 font-mono text-xs uppercase hover:bg-neutral-100 transition-colors cursor-pointer rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    id="preset-edit-save-btn"
                    onClick={saveEdit}
                    className="border border-black bg-black py-1.5 px-4 font-mono text-xs uppercase text-white hover:bg-neutral-800 transition-colors cursor-pointer rounded-xl"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
