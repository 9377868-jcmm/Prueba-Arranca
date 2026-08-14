import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from './api/client';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import SyncPage from './pages/SyncPage';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      setToken(urlToken);
      api.setToken(urlToken);
      navigate('/dashboard');
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (token) {
      api.setToken(token);
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setToken(null);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <Header user={user} onLogout={handleLogout} isLoggedIn={!!token} />
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route
          path="/dashboard"
          element={token ? <DashboardPage /> : <Navigate to="/" />}
        />
        <Route
          path="/project/:id/*"
          element={token ? <ProjectPage /> : <Navigate to="/" />}
        />
        <Route
          path="/sync"
          element={token ? <SyncPage /> : <Navigate to="/" />}
        />
      </Routes>
    </div>
  );
}

interface HeaderProps {
  user: any;
  onLogout: () => void;
  isLoggedIn: boolean;
}

function Header({ user, onLogout, isLoggedIn }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">🚀 Prueba Arranca</div>
          <div className="nav">
            {isLoggedIn && user && (
              <>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/dashboard');
                  }}
                  style={{
                    textDecoration: 'none',
                    color: location.pathname === '/dashboard' ? '#fc6d26' : '#333',
                  }}
                >
                  📚 Proyectos
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/sync');
                  }}
                  style={{
                    textDecoration: 'none',
                    color: location.pathname === '/sync' ? '#fc6d26' : '#333',
                  }}
                >
                  🔄 Sincronización
                </a>
                <span>👤 {user.name}</span>
                <button className="btn btn-secondary" onClick={onLogout}>
                  Salir
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
