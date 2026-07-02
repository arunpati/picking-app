import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * React Component that wraps Html5Qrcode for camera-based barcode/QR scanning.
 */
export function CameraScanner({ onScan, onClose, onError }) {
  const containerId = 'camera-qr-reader';
  const html5QrCodeRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const html5QrCode = new Html5Qrcode(containerId);
    html5QrCodeRef.current = html5QrCode;

    const startScanning = async () => {
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15, // Increase scan frame rate
            qrbox: (width, height) => {
              // Wide horizontal rectangle optimized for 1D barcodes
              return {
                width: Math.floor(width * 0.85),
                height: Math.floor(height * 0.35),
              };
            },
            // Provide advanced camera resolution constraints here in the configuration object
            videoConstraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            // Specify barcode formats explicitly for higher decoding success rate
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_39
            ]
          },
          (decodedText) => {
            if (isMounted) {
              onScan(decodedText);
            }
          },
          () => {} // Silent ignore of frame scan failures
        );
      } catch (err) {
        if (isMounted) {
          console.error("Failed to start camera scanner", err);
          setErrorMsg(err.message || "Failed to access camera.");
          if (onError) onError(err);
        }
      }
    };

    // Delay start slightly to allow DOM container to render fully
    const timer = setTimeout(() => {
      startScanning();
    }, 100);

    return () => {
      clearTimeout(timer);
      isMounted = false;
      if (html5QrCodeRef.current) {
        const stopScanner = async () => {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
          } catch (err) {
            console.error("Failed to stop scanner", err);
          } finally {
            try {
              html5QrCodeRef.current.clear();
            } catch {
              // Ignore clear errors
            }
          }
        };
        stopScanner();
      }
    };
  }, [onScan, onError]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
      background: 'rgba(10, 10, 12, 0.95)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-color)',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
    }}>
      <div id={containerId} style={{ width: '100%', minHeight: '280px', background: '#000' }}></div>
      
      {errorMsg && (
        <div style={{
          padding: '12px 16px',
          color: 'var(--error)',
          fontSize: '0.85rem',
          textAlign: 'center',
          background: 'var(--error-glow)',
          borderBottom: '1px solid rgba(244, 63, 94, 0.2)'
        }}>
          {errorMsg}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: 'var(--bg-secondary)' }}>
        <button 
          onClick={onClose}
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '10px 24px' }}
        >
          Cancel Scan
        </button>
      </div>
    </div>
  );
}
