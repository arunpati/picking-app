import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, AlertCircle, Box } from 'lucide-react';
import { AuthContext } from '../App';
import { usePickingApi } from '../hooks/usePickingApi';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const { login: saveToken } = useContext(AuthContext);
  const { login: apiLogin, loading, error: apiError } = usePickingApi();

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !password.trim()) {
      setLocalError('Please enter both username and password.');
      return;
    }

    try {
      // For development/mock bypass: if offline or local testing needs it, we can handle it.
      // But we will try to make the real login call.
      const token = await apiLogin(username, password);
      saveToken(token);
      navigate(from, { replace: true });
    } catch (err) {
      // The error is captured by usePickingApi or thrown here
      setLocalError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleMockLogin = () => {
    // A fallback helper to allow testing the UI without a running backend
    console.warn('Using mock authentication bypass for development');
    
    // Create a mock JWT-like token (header.payload.signature)
    const header = btoa(JSON.stringify({ alg: 'HS512', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      userLoginId: username || 'demo_operator', 
      exp: Math.floor(Date.now() / 1000) + 3600 
    }));
    const mockToken = `${header}.${payload}.signature`;
    
    saveToken(mockToken);
    navigate(from, { replace: true });
  };

  const currentError = localError || apiError;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      width: '100%',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '35px 30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            background: 'var(--accent-glow)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Box size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginTop: '8px' }}>Picking Portal</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sign in to start warehouse run</p>
        </div>

        {currentError && (
          <div style={{
            background: 'var(--error-glow)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            width: '100%',
            color: 'var(--error)',
            fontSize: '0.85rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{currentError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Username
              </span>
            </label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="password">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> Password
              </span>
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '20px'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Connection issues? Try development bypass:</span>
          <button
            onClick={handleMockLogin}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            Bypass with Demo Account
          </button>
        </div>
      </div>
    </div>
  );
}
