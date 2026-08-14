import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface Project {
  id: number;
  name: string;
  description: string;
  web_url: string;
}

interface Issue {
  id: number;
  iid: number;
  title: string;
  state: string;
  author: { name: string };
  created_at: string;
}

interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  state: string;
  author: { name: string };
  created_at: string;
}

interface Pipeline {
  id: number;
  status: string;
  created_at: string;
  ref: string;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'mrs' | 'pipelines'>('issues');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [mrs, setMrs] = useState<MergeRequest[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [projectRes, issuesRes, mrsRes, pipelinesRes] = await Promise.all([
        api.get(`/gitlab/projects/${id}`),
        api.get(`/gitlab/projects/${id}/issues`),
        api.get(`/gitlab/projects/${id}/merge_requests`),
        api.get(`/gitlab/projects/${id}/pipelines`),
      ]);

      setProject(projectRes.data);
      setIssues(issuesRes.data.issues);
      setMrs(mrsRes.data.mergeRequests);
      setPipelines(pipelinesRes.data.pipelines);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar el proyecto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (state: string) => {
    if (state === 'opened') return 'badge-success';
    if (state === 'closed') return 'badge-danger';
    return 'badge-warning';
  };

  const getPipelineStatusBadgeClass = (status: string) => {
    if (status === 'success') return 'badge-success';
    if (status === 'failed') return 'badge-danger';
    return 'badge-warning';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando proyecto...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="error">Proyecto no encontrado</div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px' }}>
        ← Volver
      </button>

      <div className="card" style={{ marginBottom: '30px' }}>
        <h1>{project.name}</h1>
        {project.description && <p style={{ color: '#666', marginTop: '10px' }}>{project.description}</p>}
        <a href={project.web_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ marginTop: '10px' }}>
          Abrir en GitLab →
        </a>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="tabs">
        <button
          className={activeTab === 'issues' ? 'active' : ''}
          onClick={() => setActiveTab('issues')}
        >
          📋 Issues ({issues.length})
        </button>
        <button
          className={activeTab === 'mrs' ? 'active' : ''}
          onClick={() => setActiveTab('mrs')}
        >
          🔀 Merge Requests ({mrs.length})
        </button>
        <button
          className={activeTab === 'pipelines' ? 'active' : ''}
          onClick={() => setActiveTab('pipelines')}
        >
          ⚙️ Pipelines ({pipelines.length})
        </button>
      </div>

      {activeTab === 'issues' && (
        <div>
          {issues.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#666' }}>No hay issues</p>
            </div>
          ) : (
            issues.map((issue) => (
              <div key={issue.id} className="card">
                <h3>{issue.title}</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  #{issue.iid} • {issue.author.name} • {new Date(issue.created_at).toLocaleDateString()}
                </p>
                <span className={`badge ${getStatusBadgeClass(issue.state)}`}>{issue.state}</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'mrs' && (
        <div>
          {mrs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#666' }}>No hay merge requests</p>
            </div>
          ) : (
            mrs.map((mr) => (
              <div key={mr.id} className="card">
                <h3>{mr.title}</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  !{mr.iid} • {mr.author.name} • {new Date(mr.created_at).toLocaleDateString()}
                </p>
                <span className={`badge ${getStatusBadgeClass(mr.state)}`}>{mr.state}</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'pipelines' && (
        <div>
          {pipelines.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#666' }}>No hay pipelines</p>
            </div>
          ) : (
            pipelines.map((pipeline) => (
              <div key={pipeline.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                      Pipeline #{pipeline.id} • {pipeline.ref}
                    </p>
                    <p style={{ color: '#999', fontSize: '12px' }}>
                      {new Date(pipeline.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge ${getPipelineStatusBadgeClass(pipeline.status)}`}>
                    {pipeline.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
