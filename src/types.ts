/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TimerPreset {
  id: string;
  label: string;
  duration: number; // in seconds
  subtext: string;
  iconName: string; // e.g., 'Eye', 'Accessibility', 'Compass', 'Droplet', 'Activity'
  audioProfileId?: string; // Optional custom audio profile id
}

export type AudioSynthType = 'beep' | 'chime' | 'pulsar' | 'vibrate' | 'gong' | 'custom';

export interface AudioProfile {
  id: string;
  name: string;
  type: 'synth' | 'custom';
  synthType?: AudioSynthType;
  customFileId?: string; // pointer in IndexedDB
}

export interface CustomAudioFile {
  id: string;
  name: string;
  data: ArrayBuffer; // Direct array buffer stored in IndexedDB
  type: string;      // mime type e.g. 'audio/mp3'
}

export interface ScheduledTask {
  id: string;
  type: 'countdown' | 'alarm';
  label: string;
  description: string;
  duration: number; // in seconds (max duration for progress bar)
  remainingTime: number; // in seconds (remaining for countdown)
  targetTime?: string; // 'HH:MM' (24h format for alarm scheduling)
  originalTriggerTime?: string; // '08:30 AM'
  frequency: 'once' | 'daily';
  audioProfileId: string;
  isRunning: boolean;
  binauralSoundscape: 'off' | 'thunder' | 'rain' | 'ocean' | 'white' | 'brown' | 'zen';
  enableProgressCues?: boolean;
  triggerTimestamp?: number; // absolute epoch millisecond timestamp target
  isGracePeriod?: boolean;
  graceRemaining?: number; // 5 to 0 seconds
  progressMark50?: boolean;
  progressMark75?: boolean;
}

export interface ComplianceRecord {
  id: string;
  date: string; // 'YYYY-MM-DD'
  type: 'eye' | 'stretch' | 'hydrate' | 'focus' | 'other';
  label: string;
  status: 'completed' | 'skipped';
  timestamp: number;
}

export interface DailySummary {
  date: string;
  eyeCompleted: number;
  eyeSkipped: number;
  stretchCompleted: number;
  stretchSkipped: number;
  hydrateCompleted: number;
  hydrateSkipped: number;
  focusCompleted: number;
  focusSkipped: number;
}
