import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Box, Shield, Warehouse } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

// Import Screens (to be implemented next)
import Login from './screens/Login';
import FacilitySelect from './screens/FacilitySelect';
import OrderQueue from './screens/OrderQueue';
import ActivePicklist from './screens/ActivePicklist';

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="app-header">
        <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Box className="logo-icon" />
          <span className="logo-text">PICKING.PWA</span>
        </div>
        
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {facilityId && (
              <span className="facility-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Warehouse size={12} />
                {facilityId}
              </span>
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={12} style={{ color: 'var(--accent)' }} />
              {user.username}
            </span>
            <button 
              onClick={handleLogout} 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', borderRadius: '6px', width: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </header>
      <main className="main-container">
        {children}
      </main>
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

  useEffect(() => {
    if (token) {
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
      } catch (err) {
        handleLogout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const handleLogin = (newToken) => {
    localStorage.setItem('picking_jwt', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('picking_jwt');
    localStorage.removeItem('picking_facility_id');
    setToken(null);
    setUser(null);
    setFacilityId(null);
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
