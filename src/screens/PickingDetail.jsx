import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Check, AlertCircle, Scan, Volume2, VolumeX, Keyboard, SkipForward } from 'lucide-react';
import { usePickingApi } from '../hooks/usePickingApi';
import { useHardwareScanner } from '../hooks/useHardwareScanner';
import { CameraScanner } from '../utils/ScannerManager';

export default function PickingDetail() {
  const { picklistId } = useParams();
  const navigate = useNavigate();
  const { getPicklistDetails, recordPick, loading } = usePickingApi();

  const [items, setItems] = useState([]);
  const [completedItemIds, setCompletedItemIds] = useState(new Set());
  const [skippedItemIds, setSkippedItemIds] = useState([]); // Array to maintain skipped order
  
  // Local picking state for current item
  const [scannedQty, setScannedQty] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const getItemId = (item) => `${item.picklistBinId}-${item.orderId}-${item.orderItemSeqId}-${item.shipGroupSeqId}-${item.inventoryItemId}`;

  // Fetch picklist details
  const fetchPicklist = useCallback(async () => {
    try {
      const response = await getPicklistDetails(picklistId);
      if (response && response.picklistDetails && response.picklistDetails.items) {
        const fetchedItems = response.picklistDetails.items;
        setItems(fetchedItems);

        // Track completed items from server status
        const completed = new Set();
        fetchedItems.forEach(item => {
          if (item.itemStatusId === 'PICKITEM_COMPLETED') {
            completed.add(getItemId(item));
          }
        });
        setCompletedItemIds(completed);
      } else {
        setItems([]);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to retrieve picklist details.');
    }
  }, [picklistId, getPicklistDetails]);

  useEffect(() => {
    if (picklistId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPicklist();
    }
  }, [picklistId, fetchPicklist]);

  // Sort items by walking path (Aisle -> Section -> Level)
  const sortedItems = [...items].sort((a, b) => {
    const aisleA = a.aisle || '';
    const aisleB = b.aisle || '';
    if (aisleA !== aisleB) return aisleA.localeCompare(aisleB);

    const secA = a.section || '';
    const secB = b.section || '';
    if (secA !== secB) return secA.localeCompare(secB);

    const lvlA = a.level || '';
    const lvlB = b.level || '';
    return lvlA.localeCompare(lvlB);
  });

  // Determine the list of active (incomplete) items
  const incompleteItems = sortedItems.filter(item => !completedItemIds.has(getItemId(item)));

  // Find current item based on skipping and completeness
  // We prioritize incomplete items that are NOT skipped.
  // If all non-skipped items are completed, we cycle back to skipped items.
  const getActiveItem = () => {
    if (incompleteItems.length === 0) return null;
    
    // Find first incomplete item that hasn't been skipped
    const nextItem = incompleteItems.find(item => !skippedItemIds.includes(getItemId(item)));
    if (nextItem) return nextItem;

    // Fallback: If all remaining incomplete items have been skipped, pick the first skipped one
    const firstSkippedItem = incompleteItems.find(item => skippedItemIds.includes(getItemId(item)));
    return firstSkippedItem || null;
  };

  const currentItem = getActiveItem();

  // Reset local scanned count when target item changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScannedQty(0);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [currentItem?.productId]);

  // Redirect to success summary screen when all items are picked
  useEffect(() => {
    if (items.length > 0 && completedItemIds.size === items.length) {
      navigate(`/picklist/${picklistId}/success`, { replace: true });
    }
  }, [items.length, completedItemIds.size, picklistId, navigate]);

  // Trigger web audio beep on scan
  const playBeep = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'complete') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        // Double beep
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(880, ctx.currentTime);
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 120);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('AudioContext beep failed to play', e);
    }
  }, [soundEnabled]);

  // Submit completed item pick to backend
  const submitPick = useCallback(async (item, quantityToRecord) => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await recordPick(
        item.picklistBinId,
        item.orderItemSeqId,
        item.orderId,
        item.shipGroupSeqId,
        item.inventoryItemId,
        quantityToRecord
      );
      
      playBeep('complete');
      setSuccessMessage(`Successfully picked ${quantityToRecord} units of ${item.productName}`);
      
      // Update completed items state
      setCompletedItemIds(prev => {
        const next = new Set(prev);
        next.add(getItemId(item));
        return next;
      });

      // Remove from skipped list if it was in there
      setSkippedItemIds(prev => prev.filter(id => id !== getItemId(item)));
      
    } catch (err) {
      playBeep('error');
      setErrorMessage(err.message || 'Failed to record pick on the server.');
    } finally {
      setActionLoading(false);
    }
  }, [recordPick, playBeep]);

  // Handle a barcode scan (either from camera or hardware)
  const handleBarcodeScan = useCallback((barcode) => {
    if (!currentItem) return;
    
    // Clean code comparison (ignore spaces/casing)
    const scannedCode = barcode.trim().toUpperCase();
    const expectedCode = currentItem.productId.trim().toUpperCase();
    
    if (scannedCode === expectedCode) {
      setErrorMessage(null);
      const nextQty = scannedQty + 1;
      
      if (nextQty >= currentItem.quantity) {
        // Fully picked!
        setScannedQty(currentItem.quantity);
        submitPick(currentItem, currentItem.quantity);
        setCameraActive(false);
      } else {
        // Increment scan count
        setScannedQty(nextQty);
        playBeep('success');
        setSuccessMessage(`Scanned unit ${nextQty}/${currentItem.quantity}`);
      }
    } else {
      playBeep('error');
      setErrorMessage(`Incorrect SKU: Scanned "${barcode}" instead of "${currentItem.productId}"`);
      setSuccessMessage(null);
    }
  }, [currentItem, scannedQty, submitPick, playBeep]);

  // Connect the hardware scanner listener hook
  useHardwareScanner(handleBarcodeScan);

  // Manual Confirmation
  const handleManualConfirm = () => {
    if (!currentItem) return;
    submitPick(currentItem, currentItem.quantity);
  };

  // Skip item
  const handleSkipItem = () => {
    if (!currentItem) return;
    const itemId = getItemId(currentItem);
    
    // Add to skipped list and rotate it to the end
    setSkippedItemIds(prev => {
      if (prev.includes(itemId)) {
        // Move to end of skipped
        return [...prev.filter(id => id !== itemId), itemId];
      }
      return [...prev, itemId];
    });
    
    setSuccessMessage(`Skipped product ${currentItem.productId}. It will reappear later.`);
  };

  // UI state for total progress
  const totalCount = sortedItems.length;
  const pickedCount = completedItemIds.size;
  const progressPercent = totalCount > 0 ? (pickedCount / totalCount) * 100 : 0;

  // Render scan overlay/modal
  const renderCameraScanner = () => {
    if (!cameraActive) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 300,
      }}>
        <CameraScanner 
          onScan={(code) => {
            handleBarcodeScan(code);
          }}
          onClose={() => setCameraActive(false)}
          onError={(err) => {
            setErrorMessage(`Camera error: ${err.message || err}`);
            setCameraActive(false);
          }}
        />
      </div>
    );
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {renderCameraScanner()}

      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(`/picklist/${picklistId}`)}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '10px' }}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Scan Picking</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Run: {picklistId}</p>
          </div>
        </div>

        <button 
          onClick={() => setSoundEnabled(!soundEnabled)} 
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '10px' }}
          title={soundEnabled ? "Mute audio feedback" : "Unmute audio feedback"}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
          <span style={{ color: 'var(--text-secondary)' }}>SCAN RUN PROGRESS</span>
          <span style={{ color: 'var(--accent)' }}>{pickedCount} / {totalCount} Items Done</span>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{
            background: 'var(--accent)',
            height: '100%',
            width: `${progressPercent}%`,
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      {/* Error & Success Messages */}
      {errorMessage && (
        <div style={{
          background: 'var(--error-glow)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--error)',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          background: 'var(--success-glow)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--success)',
          fontSize: '0.85rem'
        }}>
          <Check size={16} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Current Picking Card */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', gap: '15px' }}>
          <div style={{ animation: 'spin 1.5s linear infinite', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent)', borderRadius: '50%', width: '40px', height: '40px' }}></div>
          <span style={{ color: 'var(--text-secondary)' }}>Loading picking target...</span>
        </div>
      ) : currentItem ? (
        <div className="glass-panel" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Walking Path Locator (Aisle • Sec • Lvl) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--accent-glow)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: 'var(--accent)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '700'
            }}>
              <MapPin size={14} />
              {currentItem.aisle
                ? `Aisle ${currentItem.aisle} • Sec ${currentItem.section || '-'} • Lvl ${currentItem.level || '-'}`
                : currentItem.locationSeqId || 'Default Area'}
            </span>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Bin: {currentItem.picklistBinId}
            </span>
          </div>

          {/* Product Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {currentItem.productName || 'Unnamed Product'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)'
              }}>
                SKU: {currentItem.productId}
              </span>
            </div>
          </div>

          {/* Scanned/Picked Tracker UI */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SCANNED QUANTITY
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '3rem', fontWeight: '800', color: scannedQty > 0 ? 'var(--success)' : 'var(--text-primary)', transition: 'color 0.2s' }}>
                {scannedQty}
              </span>
              <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/</span>
              <span style={{ fontSize: '1.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                {currentItem.quantity}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              units required
            </span>
          </div>

          {/* Hardware scan status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            background: 'rgba(16, 185, 129, 0.04)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            padding: '8px',
            borderRadius: '6px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 6px var(--success)',
              animation: 'pulse 1.8s infinite'
            }}></div>
            <Keyboard size={12} />
            <span>Hardware Scanner active. Scan product barcode directly.</span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setCameraActive(true)}
              className="btn btn-primary"
              style={{
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.95rem'
              }}
            >
              <Scan size={18} />
              Open Camera Scanner
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSkipItem}
                disabled={actionLoading}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.85rem'
                }}
              >
                <SkipForward size={14} />
                Skip Item
              </button>

              <button
                onClick={handleManualConfirm}
                disabled={actionLoading}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  borderColor: 'rgba(255, 255, 255, 0.15)'
                }}
              >
                {actionLoading ? (
                  <div style={{ animation: 'spin 1s linear infinite', border: '2px solid transparent', borderTopColor: 'currentColor', borderRadius: '50%', width: '14px', height: '14px' }}></div>
                ) : (
                  <>
                    <Check size={14} />
                    Confirm Manual
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No target items available.
        </div>
      )}
    </div>
  );
}
