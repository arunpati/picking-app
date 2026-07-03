import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, ArrowRight, ClipboardList, Check, ShoppingBag, Package, FileText } from 'lucide-react';
import { usePickingApi } from '../hooks/usePickingApi';
import { FacilityContext } from '../App';

export default function SuccessSummary() {
  const { picklistId } = useParams();
  const navigate = useNavigate();
  const { getPicklistDetails, getPickingPicklists, loading } = usePickingApi();
  const { facilityId } = useContext(FacilityContext);

  const [stats, setStats] = useState({ totalItems: 0, totalQty: 0, orderCount: 0 });
  const [nextPicklistId, setNextPicklistId] = useState(null);
  const [confetti, setConfetti] = useState([]);

  // Generate Confetti Pieces
  useEffect(() => {
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];
    const tempConfetti = [];
    for (let i = 0; i < 50; i++) {
      const left = Math.random() * 100 + 'vw';
      const delay = Math.random() * 2 + 's';
      const duration = Math.random() * 3 + 2.5 + 's';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 6 + 'px';
      const shape = Math.random() > 0.5 ? '50%' : '2px'; // circles and rectangles
      tempConfetti.push({
        id: i,
        left,
        delay,
        duration,
        color,
        size,
        shape
      });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfetti(tempConfetti);
  }, []);

  // Fetch current stats and check if there's a next active picklist
  useEffect(() => {
    const loadStatsAndNextRun = async () => {
      try {
        // 1. Load completed picklist details to calculate stats
        const response = await getPicklistDetails(picklistId);
        if (response && response.picklistDetails && response.picklistDetails.items) {
          const items = response.picklistDetails.items;
          const totalItems = items.length;
          
          let totalQty = 0;
          const uniqueOrders = new Set();
          items.forEach(item => {
            totalQty += item.quantity || 0;
            if (item.orderId) uniqueOrders.add(item.orderId);
          });

          setStats({
            totalItems,
            totalQty,
            orderCount: uniqueOrders.size
          });
        }

        // 2. Fetch active picklists to find the next pick run shortcut
        if (facilityId) {
          const picklistResponse = await getPickingPicklists(facilityId, '', '');
          if (picklistResponse && picklistResponse.picklistList) {
            // Find another active picklist (status: input or printed) excluding the current one
            const nextActive = picklistResponse.picklistList.find(
              p => p.picklistId !== picklistId && (p.statusId === 'PICKLIST_INPUT' || p.statusId === 'PICKLIST_PRINTED')
            );
            if (nextActive) {
              setNextPicklistId(nextActive.picklistId);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load summary stats:", err);
      }
    };

    if (picklistId) {
      loadStatsAndNextRun();
    }
  }, [picklistId, facilityId, getPicklistDetails, getPickingPicklists]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px 80px',
      minHeight: '80vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Self-contained CSS Confetti Animation */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
        }
        .confetti-element {
          position: fixed;
          top: -20px;
          z-index: 100;
          pointer-events: none;
          animation: confettiFall linear forwards;
        }
        .summary-stat-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          alignItems: center;
          padding: 16px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          text-align: center;
        }
      `}</style>

      {/* Render Confetti */}
      {confetti.map(c => (
        <div
          key={c.id}
          className="confetti-element"
          style={{
            left: c.left,
            animationDelay: c.delay,
            animationDuration: c.duration,
            backgroundColor: c.color,
            width: c.size,
            height: c.size,
            borderRadius: c.shape
          }}
        />
      ))}

      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
        zIndex: 10,
        position: 'relative'
      }}>
        {/* Animated Trophy Icon */}
        <div style={{
          background: 'var(--success-glow)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '50%',
          padding: '20px',
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px 0 rgba(16, 185, 129, 0.15)',
          animation: 'pulse 2s infinite'
        }}>
          <Award size={48} />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: '700', marginBottom: '8px' }}>
            Run Completed!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Picklist <strong>#{picklistId}</strong> is pick-complete. All items are grouped and ready to pack.
          </p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <div style={{ animation: 'spin 1.5s linear infinite', border: '2px solid transparent', borderTopColor: 'var(--accent)', borderRadius: '50%', width: '24px', height: '24px' }}></div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <div className="summary-stat-box">
              <Package size={20} style={{ color: 'var(--accent)', marginBottom: '8px' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lines Picked</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '4px' }}>{stats.totalItems}</strong>
            </div>

            <div className="summary-stat-box" style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
              <ShoppingBag size={20} style={{ color: 'var(--accent)', marginBottom: '8px' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Qty</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '4px' }}>{stats.totalQty}</strong>
            </div>

            <div className="summary-stat-box">
              <Check size={20} style={{ color: 'var(--accent)', marginBottom: '8px' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orders</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '4px' }}>{stats.orderCount}</strong>
            </div>
          </div>
        )}

        {/* Actions loop */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '10px' }}>
          {nextPicklistId ? (
            <button
              onClick={() => navigate(`/picklist/${nextPicklistId}/pick`)}
              className="btn btn-primary animate-fade-in"
              style={{
                width: '100%',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                fontWeight: '700',
                background: 'var(--success)',
                color: '#000',
                borderColor: 'var(--success)'
              }}
            >
              Scan Next Picklist (#{nextPicklistId})
              <ArrowRight size={16} />
            </button>
          ) : null}

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button
              onClick={() => navigate('/queue')}
              className="btn btn-secondary"
              style={{
                flex: 1,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              <ClipboardList size={16} />
              Order Queue
            </button>

            <button
              onClick={() => navigate('/picklists')}
              className="btn btn-secondary"
              style={{
                flex: 1,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              <FileText size={16} />
              Picklists
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
