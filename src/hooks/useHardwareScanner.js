import { useEffect, useRef } from 'react';

/**
 * Custom React hook for capturing input from hardware/Bluetooth barcode scanners.
 * Filters out manual keyboard input using a character typing interval threshold.
 * 
 * @param {Function} onScan - Callback function triggered when a barcode is scanned.
 */
export function useHardwareScanner(onScan) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keypresses if the operator is actively typing in an input/textarea
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Enter key signals the end of the barcode scan
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        if (barcode.length > 0) {
          onScan(barcode);
          bufferRef.current = '';
        }
        return;
      }

      // Capture single printable characters
      if (e.key.length === 1) {
        // If the typing delay between characters is too long (> 100ms),
        // we assume it is slow human manual typing rather than scanner input,
        // and we clear the buffer.
        if (bufferRef.current.length > 0 && timeDiff > 100) {
          bufferRef.current = '';
        }
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan]);
}
