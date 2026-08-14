import { useState } from 'react';
import { api } from '../api/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/auth/login');
      window.location.href = response.data.url;
    } catch (err: any) {
      setError('Error al conectar con GitLab. Verifica tu configuración.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '600px',
        }}
      >
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '10px' }}>🚀 Prueba Arranca</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Conecta con tu instancia de GitLab
          </p>

          {error && <div className="error">{error}</div>}

          <button
            className="btn btn-primary"
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', fontSize: '16px', padding: '12px' }}
          >
            {loading ? 'Conectando...' : '🔗 Conectar con GitLab'}
          </button>

          <div style={{ marginTop: '30px', textAlign: 'left', color: '#666', fontSize: '14px' }}>
            <h3 style={{ marginBottom: '10px', color: '#333' }}>Requisitos:</h3>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
              <li>Configurar variables de entorno (.env)</li>
              <li>Crear una OAuth App en tu GitLab</li>
              <li>Tener permisos de lectura en repositorios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
