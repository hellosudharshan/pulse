/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Creates and returns an active Web Worker that ticks every second.
 * This ensures browser interval throttling does not silence the countdown loops.
 */
export function createBgWorker(): Worker | null {
  if (typeof window === 'undefined' || !window.Worker || !window.Blob || !window.URL) {
    console.warn('Web Workers are not fully supported in this context. Falling back to local loops.');
    return null;
  }

  const workerCode = `
    let timerId = null;
    
    self.onmessage = function(e) {
      const data = e.data;
      
      if (data === 'start') {
        if (!timerId) {
          timerId = setInterval(() => {
            self.postMessage('tick');
          }, 1000);
        }
      } else if (data === 'stop') {
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
      }
    };
  `;

  try {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerURL = URL.createObjectURL(blob);
    return new Worker(workerURL);
  } catch (err) {
    console.warn('Failed to build inline worker:', err);
    return null;
  }
}
