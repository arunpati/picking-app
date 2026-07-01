import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, PlusCircle, AlertCircle, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import { FacilityContext } from '../App';
import { usePickingApi } from '../hooks/usePickingApi';

export default function OrderQueue() {
  const { facilityId } = useContext(FacilityContext);
  const { getOrdersToPick, createPicklist, loading, error } = usePickingApi();
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [creationLoading, setCreationLoading] = useState(false);
  const [creationError, setCreationError] = useState(null);
  
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const response = await getOrdersToPick(facilityId);
      if (response && response.orderList) {
        setOrders(response.orderList);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('API Error: falling back or showing error', err);
    }
  };

  useEffect(() => {
    if (facilityId) {
      fetchOrders();
    }
  }, [facilityId]);

  const handleToggleSelect = (orderId) => {
    setSelectedIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.orderId));
    }
  };

  const handleCreatePicklist = async () => {
    if (selectedIds.length === 0) return;
    setCreationLoading(true);
    setCreationError(null);

    try {
      const response = await createPicklist(selectedIds, facilityId);
      if (response && response.picklistId) {
        navigate(`/picklist/${response.picklistId}`);
      } else {
        throw new Error('No picklistId returned from server');
      }
    } catch (err) {
      setCreationError(err.message || 'Failed to create picklist. Please try again.');
    } finally {
      setCreationLoading(false);
    }
  };

  // Generate mock orders for dev validation
  const handleLoadMockOrders = () => {
    const mockOrders = [
      { orderId: 'WS-10042', orderDate: new Date(Date.now() - 3600000 * 2).toISOString(), statusId: 'ORDER_APPROVED', grandTotal: 124.50 },
      { orderId: 'WS-10043', orderDate: new Date(Date.now() - 3600000 * 4).toISOString(), statusId: 'ORDER_APPROVED', grandTotal: 89.99 },
      { orderId: 'WS-10044', orderDate: new Date(Date.now() - 3600000 * 6).toISOString(), statusId: 'ORDER_APPROVED', grandTotal: 345.00 },
      { orderId: 'WS-10045', orderDate: new Date(Date.now() - 3600000 * 12).toISOString(), statusId: 'ORDER_APPROVED', grandTotal: 15.20 },
      { orderId: 'WS-10046', orderDate: new Date(Date.now() - 3600000 * 24).toISOString(), statusId: 'ORDER_APPROVED', grandTotal: 250.75 },
    ];
    setOrders(mockOrders);
  };

  const handleMockCreatePicklist = () => {
    if (selectedIds.length === 0) return;
    setCreationLoading(true);
    
    // Save selected mock orders temporarily in localStorage to populate active picklist
    const mockPicklistItems = [];
    let binIdCounter = 1000;
    
    selectedIds.forEach((orderId) => {
      const binId = `PLB-${binIdCounter++}`;
      // Add items based on order
      if (orderId === 'WS-10042') {
        mockPicklistItems.push(
          { picklistBinId: binId, orderId, orderItemSeqId: '00001', productId: 'PROD_MOCK_A', productName: 'Stainless Steel Utility Tool', quantity: 2, aisle: 'A', section: '3', level: '1' },
          { picklistBinId: binId, orderId, orderItemSeqId: '00002', productId: 'PROD_MOCK_B', productName: 'Hardened Lock Collar', quantity: 1, aisle: 'A', section: '5', level: '2' }
        );
      } else if (orderId === 'WS-10043') {
        mockPicklistItems.push(
          { picklistBinId: binId, orderId, orderItemSeqId: '00001', productId: 'PROD_MOCK_C', productName: 'Heavy Duty Caster Wheel', quantity: 4, aisle: 'B', section: '1', level: '3' }
        );
      } else if (orderId === 'WS-10044') {
        mockPicklistItems.push(
          { picklistBinId: binId, orderId, orderItemSeqId: '00001', productId: 'PROD_MOCK_D', productName: 'Industrial Safety Mask', quantity: 10, aisle: 'A', section: '1', level: '2' },
          { picklistBinId: binId, orderId, orderItemSeqId: '00002', productId: 'PROD_MOCK_B', productName: 'Hardened Lock Collar', quantity: 3, aisle: 'A', section: '5', level: '2' },
          { picklistBinId: binId, orderId, orderItemSeqId: '00003', productId: 'PROD_MOCK_E', productName: 'LED Worklight Bar', quantity: 1, aisle: 'C', section: '2', level: '4' }
        );
      } else {
        // Fallback item for other orders
        mockPicklistItems.push(
          { picklistBinId: binId, orderId, orderItemSeqId: '00001', productId: 'PROD_GENERIC', productName: 'Generic Warehouse Supply', quantity: 1, aisle: 'D', section: '1', level: '1' }
        );
      }
    });

    const mockPicklistId = `PL-${Math.floor(100000 + Math.random() * 900000)}`;
    localStorage.setItem(`mock_picklist_${mockPicklistId}`, JSON.stringify({
      picklistId: mockPicklistId,
      items: mockPicklistItems
    }));

    setTimeout(() => {
      setCreationLoading(false);
      navigate(`/picklist/${mockPicklistId}`);
    }, 800);
  };

  const showMockCreation = error || orders.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={20} style={{ color: 'var(--accent)' }} />
            Order Picking Queue
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {orders.length} orders ready to pack in this facility
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="btn btn-secondary"
          style={{ width: 'auto', padding: '10px' }}
          disabled={loading}
          title="Refresh Queue"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Error Banner */}
      {(error || creationError) && (
        <div style={{
          background: 'var(--error-glow)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          color: 'var(--error)',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: '600' }}>{error ? 'API connection failed' : 'Picklist creation failed'}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>{error || creationError}</p>
        </div>
      )}

      {/* Empty State / Loading */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '15px' }}>
          <div style={{ animation: 'spin 1.5s linear infinite', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent)', borderRadius: '50%', width: '40px', height: '40px' }}></div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fetching orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          gap: '20px'
        }}>
          <ClipboardList size={48} style={{ color: 'var(--text-muted)' }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>No Orders Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
              All orders have been picklisted, or no inventory matches are available.
            </p>
          </div>
          <button
            onClick={handleLoadMockOrders}
            className="btn btn-secondary"
            style={{ width: 'auto', fontSize: '0.85rem' }}
          >
            Load Demo Picking Orders
          </button>
        </div>
      ) : (
        /* Order Cards List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* List Headers / Select All */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 8px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <button
              onClick={handleToggleAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={14} />
              {selectedIds.length === orders.length ? 'Deselect All' : 'Select All'}
            </button>
            <span>{selectedIds.length} of {orders.length} Selected</span>
          </div>

          {/* Orders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {orders.map((order) => {
              const isSelected = selectedIds.includes(order.orderId);
              return (
                <div
                  key={order.orderId}
                  onClick={() => handleToggleSelect(order.orderId)}
                  className="glass-panel"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    borderColor: isSelected ? 'rgba(245, 158, 11, 0.4)' : 'var(--glass-border)',
                    boxShadow: isSelected ? '0 0 15px 0 rgba(245, 158, 11, 0.05)' : 'none',
                    background: isSelected ? 'rgba(245, 158, 11, 0.03)' : 'var(--glass-bg)'
                  }}
                >
                  {/* Custom Checkbox */}
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}>
                    {isSelected && <span style={{ color: 'var(--bg-primary)', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                  </div>

                  {/* Order Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{order.orderId}</span>
                      <span style={{ fontWeight: '600', fontSize: '0.95rem', color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                        ${order.grandTotal.toFixed(2)}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>Date: {new Date(order.orderDate).toLocaleString()}</span>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        fontSize: '0.65rem',
                        fontWeight: '600'
                      }}>
                        {order.statusId?.replace('ORDER_', '') || 'APPROVED'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Bottom Bar for actions */}
      {selectedIds.length > 0 && (
        <div className="glass-panel" style={{
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
          border: '1px solid rgba(245, 158, 11, 0.25)',
          background: 'rgba(22, 22, 26, 0.95)',
          zIndex: 90,
          animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 10px 40px 0 rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Layers size={18} style={{ color: 'var(--accent)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {selectedIds.length} Order{selectedIds.length > 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: '0.7rem' }}>Grouping into new Picklist</span>
            </div>
          </div>
          
          <button
            onClick={showMockCreation ? handleMockCreatePicklist : handleCreatePicklist}
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px' }}
            disabled={creationLoading}
          >
            <PlusCircle size={16} />
            {creationLoading ? 'Creating Picklist...' : 'Create Picklist'}
          </button>
        </div>
      )}
    </div>
  );
}
