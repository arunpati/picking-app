import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Warehouse, ArrowRight, CornerDownRight } from 'lucide-react';
import { FacilityContext } from '../App';

const COMMON_FACILITIES = [
  { id: 'WebStoreWarehouse', name: 'Web Store Warehouse', desc: 'Primary online fulfillment center' },
  { id: 'MainWarehouse', name: 'Main Warehouse', desc: 'Central inventory depot' },
];

export default function FacilitySelect() {
  const { selectFacility } = useContext(FacilityContext);
  const [customId, setCustomId] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/queue';

  const handleSelect = (id) => {
    if (!id.trim()) return;
    selectFacility(id);
    navigate(from, { replace: true });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '10px 0'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Select Facility</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Choose your active work zone to continue</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {COMMON_FACILITIES.map((facility) => (
          <div
            key={facility.id}
            onClick={() => handleSelect(facility.id)}
            className="glass-panel"
            style={{
              padding: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'between',
              gap: '16px',
            }}
          >
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Warehouse size={20} />
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '2px' }}>{facility.name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{facility.desc} ({facility.id})</p>
            </div>

            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '24px',
        marginTop: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <CornerDownRight size={14} />
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Or enter custom Facility ID</span>
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSelect(customId); }}
          style={{ display: 'flex', gap: '10px', width: '100%' }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="e.g. MyCustomWarehouse1"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            style={{ flex: 1 }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: 'auto', padding: '0 20px' }}
            disabled={!customId.trim()}
          >
            Select
          </button>
        </form>
      </div>
    </div>
  );
}
