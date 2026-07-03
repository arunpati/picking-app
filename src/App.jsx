/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Box, Shield, Warehouse, Menu, X, ClipboardList, FileText } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

// Import Screens (to be implemented next)
import Login from './screens/Login';
import FacilitySelect from './screens/FacilitySelect';
import OrderQueue from './screens/OrderQueue';
import ActivePicklist from './screens/ActivePicklist';
import PicklistList from './screens/PicklistList';
import PickingDetail from './screens/PickingDetail';
import SuccessSummary from './screens/SuccessSummary';

// Contexts
export const AuthContext = createContext(null);
export const FacilityContext = createContext(null);

// Route Guard for Authentication
function RequireAuth({ children }) {
  const { token } = useContext(AuthContext);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Route Guard for Facility Selection
function RequireFacility({ children }) {
  const { facilityId } = useContext(FacilityContext);
  const location = useLocation();

  if (!facilityId) {
    return <Navigate to="/facility" state={{ from: location }} replace />;
  }

  return children;
}

// Global Layout wrapper
function Layout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const { facilityId } = useContext(FacilityContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Close mobile sidebar on route switch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarOpen(false);
  }, [location]);

  return (
    <div className="app-root animate-fade-in">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user && (
            <button 
              className="hamburger-btn" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Menu"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <Box className="logo-icon" />
            <span className="logo-text">PICKING.PWA</span>
          </div>
        </div>
        
        {user && facilityId && (
          <span className="facility-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Warehouse size={12} />
            {facilityId}
          </span>
        )}
      </header>

      <div className="app-body">
        {user && (
          <>
            <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
              <div className="sidebar-header">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Active Zone</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: facilityId ? 'var(--accent)' : 'var(--text-muted)' }}>
                  <Warehouse size={18} />
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{facilityId || 'No Facility Selected'}</span>
                </div>
              </div>

              <nav className="sidebar-nav">
                <button
                  onClick={() => navigate('/queue')}
                  disabled={!facilityId}
                  className={`sidebar-nav-item ${isActive('/queue') ? 'active' : ''} ${!facilityId ? 'disabled' : ''}`}
                >
                  <ClipboardList size={18} />
                  Order Queue
                </button>

                <button
                  onClick={() => navigate('/picklists')}
                  disabled={!facilityId}
                  className={`sidebar-nav-item ${isActive('/picklists') ? 'active' : ''} ${!facilityId ? 'disabled' : ''}`}
                >
                  <FileText size={18} />
                  Picklists
                </button>

                <button
                  onClick={() => navigate('/facility')}
                  className={`sidebar-nav-item ${isActive('/facility') ? 'active' : ''}`}
                >
                  <Warehouse size={18} />
                  Change Facility
                </button>
              </nav>

              <div className="sidebar-footer">
                <div className="sidebar-user">
                  <Shield size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: '600' }}>{user.username}</span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-secondary" 
                  style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </aside>
            {isSidebarOpen && (
              <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}
          </>
        )}

        <main className="main-container">
          {children}
        </main>
      </div>
    </div>
  );
}

function MainRoutes() {
  const { token } = useContext(AuthContext);
  const { facilityId } = useContext(FacilityContext);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/facility"
        element={
          <RequireAuth>
            <Layout>
              <FacilitySelect />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/queue"
        element={
          <RequireAuth>
            <RequireFacility>
              <Layout>
                <OrderQueue />
              </Layout>
            </RequireFacility>
          </RequireAuth>
        }
      />
      <Route
        path="/picklists"
        element={
          <RequireAuth>
            <RequireFacility>
              <Layout>
                <PicklistList />
              </Layout>
            </RequireFacility>
          </RequireAuth>
        }
      />
      <Route
        path="/picklist/:picklistId"
        element={
          <RequireAuth>
            <RequireFacility>
              <Layout>
                <ActivePicklist />
              </Layout>
            </RequireFacility>
          </RequireAuth>
        }
      />
      <Route
        path="/picklist/:picklistId/pick"
        element={
          <RequireAuth>
            <RequireFacility>
              <Layout>
                <PickingDetail />
              </Layout>
            </RequireFacility>
          </RequireAuth>
        }
      />
      <Route
        path="/picklist/:picklistId/success"
        element={
          <RequireAuth>
            <RequireFacility>
              <Layout>
                <SuccessSummary />
              </Layout>
            </RequireFacility>
          </RequireAuth>
        }
      />
      {/* Root redirect logic */}
      <Route
        path="/"
        element={
          !token ? (
            <Navigate to="/login" replace />
          ) : !facilityId ? (
            <Navigate to="/facility" replace />
          ) : (
            <Navigate to="/queue" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('picking_jwt'));
  const [user, setUser] = useState(null);
  const [facilityId, setFacilityId] = useState(() => localStorage.getItem('picking_facility_id'));

  const handleLogout = () => {
    localStorage.removeItem('picking_jwt');
    localStorage.removeItem('picking_facility_id');
    setToken(null);
    setUser(null);
    setFacilityId(null);
  };

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(null);
      return;
    }

    const checkTokenExpiration = () => {
      try {
        const decoded = jwtDecode(token);
        // Expiration check
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          handleLogout();
        } else {
          setUser({
            username: decoded.userLoginId || decoded.sub || 'Operator',
            ...decoded
          });
        }
      } catch {
        handleLogout();
      }
    };

    checkTokenExpiration();

    // Check expiration every 10 seconds
    const interval = setInterval(checkTokenExpiration, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogin = (newToken) => {
    localStorage.setItem('picking_jwt', newToken);
    setToken(newToken);
  };

  const handleSelectFacility = (id) => {
    if (id) {
      localStorage.setItem('picking_facility_id', id);
    } else {
      localStorage.removeItem('picking_facility_id');
    }
    setFacilityId(id);
  };

  return (
    <AuthContext.Provider value={{ token, user, login: handleLogin, logout: handleLogout }}>
      <FacilityContext.Provider value={{ facilityId, selectFacility: handleSelectFacility }}>
        <BrowserRouter>
          <MainRoutes />
        </BrowserRouter>
      </FacilityContext.Provider>
    </AuthContext.Provider>
  );
}
