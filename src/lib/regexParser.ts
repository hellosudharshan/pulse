/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedReminderResult {
  type: 'countdown' | 'alarm';
  label: string;
  description: string;
  durationSeconds?: number;
  alarmHour?: string;
  alarmMinute?: string;
  alarmAmpm?: 'AM' | 'PM';
  soundProfile: 'synth_beep' | 'synth_chime' | 'synth_pulsar' | 'synth_vibrate' | 'synth_gong';
}

/**
 * Clean up common fill words to extract a tidy goal label
 */
function cleanLabel(text: string): string {
  let cleaned = text
    .replace(/\b(set a timer for|timer for|set an alarm for|alarm for|remind me at|remind me for|at|remind me to|with|for|seconds|second|minutes|minute|hours|hour|mins|min|secs|sec|hrs|hr|s|m|h|daily|once)\b/gi, '')
    .replace(/\b(synth_chime|synth_beep|synth_pulsar|synth_vibrate|synth_gong|chimes|chime|beeps|beep|pulsar|vibrate|gong)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return "";
  }

  // Capitalize first letter of each word or just first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Offline client-side regex-based natural language scheduler fallback
 */
export function parseWithRegex(prompt: string): ParsedReminderResult {
  const norm = prompt.toLowerCase();
  
  // 1. Determine Sound Profile based on keyword matches
  let soundProfile: 'synth_beep' | 'synth_chime' | 'synth_pulsar' | 'synth_vibrate' | 'synth_gong' = 'synth_chime';
  if (norm.includes('pulsar') || norm.includes('pulsat') || norm.includes('pulse')) {
    soundProfile = 'synth_pulsar';
  } else if (norm.includes('beep')) {
    soundProfile = 'synth_beep';
  } else if (norm.includes('vibrat') || norm.includes('buzz')) {
    soundProfile = 'synth_vibrate';
  } else if (norm.includes('gong')) {
    soundProfile = 'synth_gong';
  } else if (norm.includes('chime') || norm.includes('bell')) {
    soundProfile = 'synth_chime';
  } else {
    // Default fallback
    soundProfile = 'synth_chime';
  }

  // 2. Check for absolute time alarms
  // e.g. "at 4:30 pm", "at 11 am", "at 12:00 am", "wake up at 6 am"
  const alarmRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  const alarmMatch = prompt.match(alarmRegex);

  if (alarmMatch) {
    const rawHour = parseInt(alarmMatch[1], 10);
    const minute = alarmMatch[2] ? alarmMatch[2] : "00";
    const ampm = alarmMatch[3].toUpperCase() as 'AM' | 'PM';
    
    // Format hour as a nice string: "04" etc.
    const hourStr = String(rawHour).padStart(2, '0');
    
    const label = cleanLabel(prompt) || "Time Alarm";
    
    return {
      type: 'alarm',
      label,
      description: `Schedule configured via offline parsing: [At ${rawHour}:${minute} ${ampm}]`,
      alarmHour: hourStr,
      alarmMinute: minute,
      alarmAmpm: ampm,
      soundProfile
    };
  }

  // 3. Fallback to countdown patterns (Relative durations)
  // Check for multi-unit durations, e.g. "15 minutes 30 seconds" or "5m", "10s"
  let totalSeconds = 0;
  let hasMatch = false;

  // Pattern matchers:
  // Hours
  const hrsMatch = prompt.match(/(\d+)\s*(hour|hr|h)\b/i);
  if (hrsMatch) {
    totalSeconds += parseInt(hrsMatch[1], 10) * 3600;
    hasMatch = true;
  }

  // Minutes
  const minsMatch = prompt.match(/(\d+)\s*(minute|min|m)\b/i);
  if (minsMatch) {
    totalSeconds += parseInt(minsMatch[1], 10) * 60;
    hasMatch = true;
  }

  // Seconds
  const secsMatch = prompt.match(/(\d+)\s*(second|sec|s)\b/i);
  if (secsMatch) {
    totalSeconds += parseInt(secsMatch[1], 10);
    hasMatch = true;
  }

  // If no metric was explicitly mentioned but a pure number exists, assume it is minutes
  if (!hasMatch) {
    const numberOnlyMatch = prompt.match(/\b(\d+)\b/);
    if (numberOnlyMatch) {
      totalSeconds = parseInt(numberOnlyMatch[1], 10) * 60; // default to minutes
      hasMatch = true;
    }
  }

  // If we still found absolutely nothing, default to 10 minutes (600 seconds)
  if (!hasMatch || totalSeconds <= 0) {
    totalSeconds = 600;
  }

  const label = cleanLabel(prompt) || "Focus Interval";
  
  // Format clean human read duration
  const hrs = Math.floor(totalSeconds / 3600);
  const mns = Math.floor((totalSeconds % 3600) / 60);
  const scs = totalSeconds % 60;
  const timeDescList: string[] = [];
  if (hrs > 0) timeDescList.push(`${hrs} hour${hrs > 1 ? 's' : ''}`);
  if (mns > 0) timeDescList.push(`${mns} minute${mns > 1 ? 's' : ''}`);
  if (scs > 0) timeDescList.push(`${scs} second${scs > 1 ? 's' : ''}`);
  const formattedDur = timeDescList.join(' ');

  return {
    type: 'countdown',
    label,
    description: `Interval active via offline parsing: [Duration: ${formattedDur || '10 minutes'}]`,
    durationSeconds: totalSeconds,
    soundProfile
  };
}
