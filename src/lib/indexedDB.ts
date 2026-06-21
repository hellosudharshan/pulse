/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimerPreset, AudioProfile, CustomAudioFile, ScheduledTask, ComplianceRecord } from '../types';

const DB_NAME = 'PulseDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
const memoryAudioStore: Record<string, CustomAudioFile> = {};

// Fallback checking & setup
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this device.'));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Custom audio tracks storage
        if (!db.objectStoreNames.contains('audioFiles')) {
          db.createObjectStore('audioFiles', { keyPath: 'id' });
        }
        
        // Custom interactive countdown/alarm presets
        if (!db.objectStoreNames.contains('presets')) {
          db.createObjectStore('presets', { keyPath: 'id' });
        }
        
        // User historical analytics logs for Compliance Score card
        if (!db.objectStoreNames.contains('compliance')) {
          db.createObjectStore('compliance', { keyPath: 'id' });
        }
        
        // Active alarm and timer tasks listing to survive reload
        if (!db.objectStoreNames.contains('activeTasks')) {
          db.createObjectStore('activeTasks', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        console.warn('IndexedDB failed to initialize:', e);
        reject(request.error || new Error('Database open error'));
      };
    } catch (err) {
      console.warn('Blocked or crashed opening IndexedDB, fallback active:', err);
      reject(err);
    }
  });
}

// 1. Storage Operations for Custom Audio Files
export async function saveAudioFile(file: CustomAudioFile): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('audioFiles', 'readwrite');
      const store = transaction.objectStore('audioFiles');
      const request = store.put(file);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Saving to memory-only representation:', err);
    memoryAudioStore[file.id] = file;
  }
}

export async function getAudioFile(id: string): Promise<CustomAudioFile | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('audioFiles', 'readonly');
      const store = transaction.objectStore('audioFiles');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Fetching from memory-only store:', err);
    return memoryAudioStore[id] || null;
  }
}

export async function getAllAudioFiles(): Promise<{ id: string; name: string }[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('audioFiles', 'readonly');
      const store = transaction.objectStore('audioFiles');
      const request = store.getAll();

      request.onsuccess = () => {
        const files = request.result || [];
        resolve(files.map(f => ({ id: f.id, name: f.name })));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return Object.values(memoryAudioStore).map(f => ({ id: f.id, name: f.name }));
  }
}

export async function deleteAudioFile(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('audioFiles', 'readwrite');
      const store = transaction.objectStore('audioFiles');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    delete memoryAudioStore[id];
  }
}


// 2. Storage Operations for Customizable Presets
export async function savePresetsDB(presets: TimerPreset[]): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction('presets', 'readwrite');
    const store = transaction.objectStore('presets');
    
    // Clear old presets
    store.clear();
    for (const preset of presets) {
      store.put(preset);
    }
  } catch (err) {
    localStorage.setItem('pulse_presets_fallback', JSON.stringify(presets));
  }
}

export async function getPresetsDB(): Promise<TimerPreset[] | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('presets', 'readonly');
      const store = transaction.objectStore('presets');
      const request = store.getAll();

      request.onsuccess = () => {
        const res = request.result || [];
        resolve(res.length > 0 ? res : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    const raw = localStorage.getItem('pulse_presets_fallback');
    return raw ? JSON.parse(raw) : null;
  }
}


// 3. Storage Operations for Compliance Records
export async function addComplianceRecord(record: ComplianceRecord): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('compliance', 'readwrite');
      const store = transaction.objectStore('compliance');
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    const fallbackList = JSON.parse(localStorage.getItem('pulse_compliance_fallback') || '[]');
    fallbackList.push(record);
    localStorage.setItem('pulse_compliance_fallback', JSON.stringify(fallbackList));
  }
}

export async function getComplianceRecords(): Promise<ComplianceRecord[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('compliance', 'readonly');
      const store = transaction.objectStore('compliance');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return JSON.parse(localStorage.getItem('pulse_compliance_fallback') || '[]');
  }
}


// 4. Storage Operations for List of Active Countdown/Alarms Tasks
export async function saveActiveTasksDB(tasks: ScheduledTask[]): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction('activeTasks', 'readwrite');
    const store = transaction.objectStore('activeTasks');
    store.clear();
    for (const task of tasks) {
      store.put(task);
    }
  } catch (err) {
    localStorage.setItem('pulse_active_tasks_fallback', JSON.stringify(tasks));
  }
}

export async function getActiveTasksDB(): Promise<ScheduledTask[] | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('activeTasks', 'readonly');
      const store = transaction.objectStore('activeTasks');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    const raw = localStorage.getItem('pulse_active_tasks_fallback');
    return raw ? JSON.parse(raw) : null;
  }
}
