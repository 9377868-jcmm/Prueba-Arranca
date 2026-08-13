import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface Project {
  id: number;
  name: string;
  description: string;
  web_url: string;
  path_with_namespace: string;
  last_activity_at: string;
  star_count: number;
  forks_count: number;
  visibility: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/gitlab/projects', {
        params: { per_page: 50 },
      });
      setProjects(response.data.projects);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar los proyectos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.path_with_namespace.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>📚 Mis Proyectos</h1>

      {error && <div className="error">{error}</div>}

      <div style={{ marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar proyectos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '4px',
            border: '1px solid #e3e3e3',
            fontSize: '16px',
          }}
        />
      </div>

      {loading ? (
        <div className="loading">Cargando proyectos...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666' }}>
            {projects.length === 0
              ? 'No hay proyectos disponibles'
              : 'No se encontraron resultados'}
          </p>
        </div>
      ) : (
        <div className="grid">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="card project-card"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <h3>{project.name}</h3>
              <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                {project.path_with_namespace}
              </p>
              {project.description && (
                <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                  {project.description.substring(0, 100)}
                  {project.description.length > 100 ? '...' : ''}
                </p>
              )}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <span className="badge badge-success">⭐ {project.star_count}</span>
                <span className="badge badge-warning">🍴 {project.forks_count}</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <span className="badge badge-danger">{project.visibility}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
