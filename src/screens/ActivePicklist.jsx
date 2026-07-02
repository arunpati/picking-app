import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Check, AlertCircle, MapPin, ChevronLeft, Award, Package, ShoppingBag, ArrowRight } from 'lucide-react';
import { usePickingApi } from '../hooks/usePickingApi';

export default function ActivePicklist() {
  const { picklistId } = useParams();
  const navigate = useNavigate();
  const { getPicklistDetails, recordPick, loading, error } = usePickingApi();

  const [items, setItems] = useState([]);
  const [pickedQuantities, setPickedQuantities] = useState({}); // { itemId: quantity }
  const [actionLoading, setActionLoading] = useState({}); // { itemId: boolean }
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const getItemId = (item) => `${item.picklistBinId}-${item.orderId}-${item.orderItemSeqId}`;

  useEffect(() => {
    const fetchPicklist = async () => {
      // Real API fetch
      try {
        const response = await getPicklistDetails(picklistId);
        if (response && response.picklistDetails && response.picklistDetails.items) {
          const fetchedItems = response.picklistDetails.items;
          setItems(fetchedItems);

          // Pre-populate picked item states
          const initialPicks = {};
          fetchedItems.forEach(item => {
            if (item.itemStatusId === 'PICKITEM_COMPLETED') {
              const itemId = getItemId(item);
              initialPicks[itemId] = item.quantity;
            }
          });
          setPickedQuantities(initialPicks);
        } else {
          setItems([]);
        }
      } catch (err) {
        setErrorMessage(err.message || 'Failed to retrieve picklist details.');
      }
    };

    if (picklistId) {
      fetchPicklist();
    }
  }, [picklistId, getPicklistDetails]);

  // Sorting items by Aisle -> Section -> Level (walking path optimization)
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

  const handleConfirmPick = async (item) => {
    const itemId = getItemId(item);
    setActionLoading((prev) => ({ ...prev, [itemId]: true }));
    setErrorMessage(null);

    try {
      await recordPick(item.picklistBinId, item.orderItemSeqId, item.orderId, item.shipGroupSeqId, item.inventoryItemId, item.quantity);
      setPickedQuantities((prev) => ({
        ...prev,
        [itemId]: item.quantity
      }));
    } catch (err) {
      setErrorMessage(err.message || `Failed to record pick for product ${item.productId}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const isItemPicked = (item) => {
    const itemId = getItemId(item);
    return pickedQuantities[itemId] >= item.quantity;
  };

  const totalItemsCount = sortedItems.length;
  const pickedItemsCount = sortedItems.filter(isItemPicked).length;
  const progressPercent = totalItemsCount > 0 ? (pickedItemsCount / totalItemsCount) * 100 : 0;
  const isRunComplete = totalItemsCount > 0 && pickedItemsCount === totalItemsCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px' }}>

      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/queue')}
          className="btn btn-secondary"
          style={{ width: 'auto', padding: '10px' }}
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '700' }}>Active Picklist</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Run ID: {picklistId}</p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>PICK RUN PROGRESS</span>
          <span style={{ color: 'var(--accent)', fontWeight: '700' }}>
            {pickedItemsCount} / {totalItemsCount} Items Picked
          </span>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', height: '8px', width: '100%', overflow: 'hidden' }}>
          <div style={{
            background: 'var(--accent)',
            height: '100%',
            width: `${progressPercent}%`,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 8px 0 var(--accent)'
          }}></div>
        </div>
      </div>

      {/* Error Message */}
      {(error || errorMessage) && (
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
          <span>{error || errorMessage}</span>
        </div>
      )}

      {/* Item List sorted by Aisle */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '15px' }}>
          <div style={{ animation: 'spin 1.5s linear infinite', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent)', borderRadius: '50%', width: '40px', height: '40px' }}></div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Retrieving items...</span>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No items found in this picklist.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sortedItems.map((item) => {
            const itemId = getItemId(item);
            const isPicked = isItemPicked(item);
            const isLoading = actionLoading[itemId];

            // Build human-readable location label
            const locationStr = item.aisle
              ? `Aisle ${item.aisle} • Sec ${item.section || '-'} • Lvl ${item.level || '-'}`
              : item.locationSeqId || 'Default Area';

            return (
              <div
                key={itemId}
                className="glass-panel"
                style={{
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  borderColor: isPicked ? 'rgba(16, 185, 129, 0.25)' : 'var(--glass-border)',
                  background: isPicked ? 'rgba(16, 185, 129, 0.02)' : 'var(--glass-bg)',
                  opacity: isPicked ? 0.75 : 1,
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Location Badge & Order Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isPicked ? 'rgba(16, 185, 129, 0.1)' : 'var(--accent-glow)',
                    border: `1px solid ${isPicked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                    color: isPicked ? 'var(--success)' : 'var(--accent)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    <MapPin size={12} />
                    {locationStr}
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    Order: {item.orderId}
                  </span>
                </div>

                {/* Product Name & ID */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: isPicked ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                    {item.productName || 'Unnamed Product'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    SKU: {item.productId}
                  </span>
                </div>

                {/* Quantity and Confirm Action */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '12px',
                  marginTop: '4px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QTY REQUIRED</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: isPicked ? 'var(--success)' : 'var(--text-primary)' }}>
                      {item.quantity} units
                    </span>
                  </div>

                  <button
                    onClick={() => handleConfirmPick(item)}
                    disabled={isPicked || isLoading}
                    className={`btn ${isPicked ? 'btn-secondary' : 'btn-primary'}`}
                    style={{
                      width: 'auto',
                      padding: '10px 18px',
                      fontSize: '0.85rem',
                      background: isPicked ? 'rgba(16, 185, 129, 0.1)' : undefined,
                      borderColor: isPicked ? 'rgba(16, 185, 129, 0.2)' : undefined,
                      color: isPicked ? 'var(--success)' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isLoading ? (
                      <div style={{ animation: 'spin 1s linear infinite', border: '2px solid transparent', borderTopColor: 'currentColor', borderRadius: '50%', width: '14px', height: '14px' }}></div>
                    ) : isPicked ? (
                      <>
                        <Check size={14} /> Picked
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" /> Confirm Pick
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Completion Bar */}
      {isRunComplete && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'sticky',
          bottom: '20px',
          left: '0',
          right: '0',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'rgba(10, 20, 15, 0.95)',
          zIndex: 90,
          boxShadow: '0 10px 40px 0 rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)' }}>
            <Award size={24} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>All Items Picked</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Ready to close pick run</span>
            </div>
          </div>

          <button
            onClick={() => setShowSuccessModal(true)}
            className="btn"
            style={{ flex: 1, padding: '12px', background: 'var(--success)', color: '#000', fontWeight: '700' }}
          >
            Complete Run
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 200,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            boxShadow: '0 20px 50px 0 rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{
              background: 'var(--success-glow)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '50%',
              padding: '16px',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Check size={40} />
            </div>

            <div>
              <h3 className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Run Completed!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Picklist <strong>{picklistId}</strong> has been successfully pick-completed. Items are grouped and ready for packaging.
              </p>
            </div>

            <div style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-around',
              fontSize: '0.8rem',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Package size={16} style={{ color: 'var(--accent)', marginBottom: '4px' }} />
                <span>{totalItemsCount} Items</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ShoppingBag size={16} style={{ color: 'var(--accent)', marginBottom: '4px' }} />
                <span>Ready to Ship</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/queue');
              }}
              className="btn btn-primary"
            >
              Back to Order Queue
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
