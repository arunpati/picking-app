import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Trash2, 
  Play, 
  Loader2, 
  Calendar, 
  AlertCircle, 
  ClipboardList,
  Search,
  X
} from 'lucide-react';
import { FacilityContext } from '../App';
import { usePickingApi } from '../hooks/usePickingApi';

export default function PicklistList() {
  const { facilityId } = useContext(FacilityContext);
  const navigate = useNavigate();
  const { getPickingPicklists, cancelPickingPicklist, getPickingPicklistPdf, error: apiError } = usePickingApi();

  const [picklists, setPicklists] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ACTIVE' or 'COMPLETED'
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores picklistId if performing an action

  const loadPicklists = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const statusIdParam = statusFilter === 'ACTIVE' ? null : 'COMPLETED';
      const data = await getPickingPicklists(facilityId, statusIdParam, searchQuery);
      setPicklists(data?.picklistList || []);
    } catch (err) {
      console.error('Failed to load picklists', err);
    } finally {
      setLoading(false);
    }
  }, [facilityId, statusFilter, searchQuery, getPickingPicklists]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPicklists();
  }, [loadPicklists]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handlePrint = async (picklistId) => {
    setActionLoading({ type: 'print', id: picklistId });
    try {
      const response = await getPickingPicklistPdf(picklistId);
      if (response && response.pdfBase64) {
        // Decode Base64 string into a Blob
        const byteCharacters = atob(response.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        // Open in a new window/tab
        const fileURL = URL.createObjectURL(blob);
        const newWindow = window.open(fileURL, '_blank');
        if (newWindow) {
          newWindow.focus();
        } else {
          // If popup is blocked, download it
          const link = document.createElement('a');
          link.href = fileURL;
          link.download = `picklist_${picklistId}.pdf`;
          link.click();
        }
        
        // Refresh list to show updated status (e.g. from Input to Printed)
        loadPicklists();
      } else {
        alert('Failed to generate PDF - empty response from server.');
      }
    } catch (err) {
      console.error('Print PDF failed', err);
      alert('Error printing picklist PDF: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (picklistId) => {
    if (!window.confirm('Are you sure you want to cancel this picklist run? This will cancel all unpicked items.')) {
      return;
    }
    setActionLoading({ type: 'cancel', id: picklistId });
    try {
      await cancelPickingPicklist(picklistId);
      loadPicklists();
    } catch (err) {
      console.error('Cancel picklist failed', err);
      alert('Error cancelling picklist: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatStatus = (statusId) => {
    switch (statusId) {
      case 'PICKLIST_INPUT':
        return { label: 'Input', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'PICKLIST_PRINTED':
        return { label: 'Printed', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
      case 'PICKLIST_PICKED':
        return { label: 'Picked', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'PICKLIST_CANCELLED':
        return { label: 'Cancelled', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' };
      default:
        return { label: statusId?.replace('PICKLIST_', '') || 'Unknown', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px 0' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Picklists</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Manage and execute pick runs for facility: <strong style={{ color: 'var(--accent)' }}>{facilityId}</strong>
        </p>
      </div>

      {/* Search Input Bar Form */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <Search size={18} />
          </span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by Picklist ID or Order ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ paddingLeft: '44px', paddingRight: searchInput ? '40px' : '14px' }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
          Search
        </button>
      </form>

      {/* Status Segment Tabs Filter */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        width: '100%',
        gap: '4px'
      }}>
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className="btn"
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '0.85rem',
            borderRadius: '8px',
            background: statusFilter === 'ACTIVE' ? 'var(--accent)' : 'transparent',
            color: statusFilter === 'ACTIVE' ? 'var(--bg-primary)' : 'var(--text-secondary)',
            fontWeight: statusFilter === 'ACTIVE' ? '700' : '500',
            border: 'none',
            boxShadow: 'none'
          }}
        >
          Active
        </button>
        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className="btn"
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '0.85rem',
            borderRadius: '8px',
            background: statusFilter === 'COMPLETED' ? 'var(--accent)' : 'transparent',
            color: statusFilter === 'COMPLETED' ? 'var(--bg-primary)' : 'var(--text-secondary)',
            fontWeight: statusFilter === 'COMPLETED' ? '700' : '500',
            border: 'none',
            boxShadow: 'none'
          }}
        >
          Completed
        </button>
      </div>

      {/* Capping & Results Count Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span>
          {searchQuery ? (
            <span>Search results for: <strong style={{ color: 'var(--accent)' }}>"{searchQuery}"</strong></span>
          ) : (
            <span>Showing top 20 recent {statusFilter.toLowerCase()} picklists</span>
          )}
        </span>
        {searchQuery && (
          <button 
            onClick={handleClearSearch}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
          >
            Clear Search
          </button>
        )}
      </div>

      {apiError && (
        <div className="glass-panel" style={{ padding: '16px', borderColor: 'var(--error)', background: 'rgba(244, 63, 94, 0.05)', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--error)' }}>{apiError}</div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
          <Loader2 size={36} className="logo-icon" style={{ animation: 'spin 1.5s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading picklists...</span>
        </div>
      ) : picklists.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '50%', padding: '16px', color: 'var(--text-muted)' }}>
            <ClipboardList size={36} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>No Picklists Found</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto', marginBottom: '16px' }}>
              {searchQuery 
                ? `No picklists matched your search query "${searchQuery}" in this facility.`
                : statusFilter === 'ACTIVE'
                  ? 'There are no active picking runs in this facility. Try creating one from the Order Queue.'
                  : 'No completed or cancelled picklist records are available for this facility.'}
            </p>
            {statusFilter === 'ACTIVE' && !searchQuery && (
              <button
                onClick={() => navigate('/queue')}
                className="btn btn-primary"
                style={{ width: 'auto', display: 'inline-flex', margin: '0 auto' }}
              >
                Go to Order Queue
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {picklists.map((run) => {
            const status = formatStatus(run.statusId);
            const progress = run.totalItems > 0 ? Math.round((run.pickedItems / run.totalItems) * 100) : 0;
            const isFinished = run.statusId === 'PICKLIST_PICKED' || run.statusId === 'PICKLIST_CANCELLED';

            return (
              <div 
                key={run.picklistId}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  borderLeft: `4px solid ${status.color}`
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: '700', letterSpacing: '0.02em' }}>
                        Run #{run.picklistId}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        color: status.color,
                        background: status.bg,
                        border: `1px solid ${status.color}20`
                      }}>
                        {status.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <Calendar size={12} />
                      <span>{new Date(run.picklistDate).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    <div><strong>{run.totalOrders}</strong> {run.totalOrders === 1 ? 'order' : 'orders'}</div>
                  </div>
                </div>

                {/* Progress Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Progress: {run.pickedItems} / {run.totalItems} items</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      background: progress === 100 ? 'var(--success)' : 'var(--accent)',
                      transition: 'width 0.3s ease',
                      boxShadow: progress === 100 ? '0 0 8px var(--success-glow)' : '0 0 8px var(--accent-glow)'
                    }} />
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '4px' }}>
                  {!isFinished && (
                    <button
                      onClick={() => navigate(`/picklist/${run.picklistId}`)}
                      className="btn btn-primary"
                      style={{ flex: 1, minWidth: '140px', padding: '10px 16px', fontSize: '0.85rem' }}
                    >
                      <Play size={14} />
                      Resume Picking
                    </button>
                  )}

                  <button
                    onClick={() => handlePrint(run.picklistId)}
                    disabled={actionLoading !== null}
                    className="btn btn-secondary"
                    style={{ 
                      flex: isFinished ? 1 : 'none', 
                      width: isFinished ? '100%' : 'auto',
                      padding: '10px 16px', 
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {actionLoading?.type === 'print' && actionLoading?.id === run.picklistId ? (
                      <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                    ) : (
                      <Printer size={14} />
                    )}
                    Print PDF
                  </button>

                  {!isFinished && (
                    <button
                      onClick={() => handleCancel(run.picklistId)}
                      disabled={actionLoading !== null}
                      className="btn btn-secondary"
                      style={{ 
                        padding: '10px', 
                        borderColor: 'rgba(244, 63, 94, 0.2)',
                        color: 'var(--error)',
                        background: 'rgba(244, 63, 94, 0.02)',
                        width: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Cancel Picklist Run"
                    >
                      {actionLoading?.type === 'cancel' && actionLoading?.id === run.picklistId ? (
                        <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
