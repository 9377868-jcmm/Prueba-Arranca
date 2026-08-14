import { useState } from 'react';
import { api } from '../api/client';

interface SyncConfig {
  githubRepo: string;
  gitlabProject: string;
  githubToken: string;
  gitlabToken: string;
}

interface SyncStatus {
  syncing: boolean;
  completed: boolean;
  itemsSynced: number;
  errors: string[];
}

export default function SyncPage() {
  const [config, setConfig] = useState<SyncConfig>({
    githubRepo: '',
    gitlabProject: '',
    githubToken: '',
    gitlabToken: '',
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    completed: false,
    itemsSynced: 0,
    errors: [],
  });

  const [activeTab, setActiveTab] = useState<'setup' | 'sync' | 'status'>('setup');
  const [comparison, setComparison] = useState<any>(null);

  const handleConfigChange = (field: keyof SyncConfig, value: string) => {
    setConfig({ ...config, [field]: value });
  };

  const handleSetupSync = async () => {
    try {
      setSyncStatus({ syncing: true, completed: false, itemsSynced: 0, errors: [] });

      const response = await api.post('/webhooks/setup', config);

      setSyncStatus({
        syncing: false,
        completed: true,
        itemsSynced: 0,
        errors: [],
      });

      alert(`✅ Sincronización configurada: ${response.data.key}`);
    } catch (error: any) {
      setSyncStatus({
        syncing: false,
        completed: false,
        itemsSynced: 0,
        errors: [error.response?.data?.error || 'Error al configurar'],
      });
    }
  };

  const handleSyncIssues = async () => {
    try {
      setSyncStatus({ syncing: true, completed: false, itemsSynced: 0, errors: [] });

      const response = await api.post('/webhooks/sync/issues', {
        githubRepo: config.githubRepo,
        gitlabProject: config.gitlabProject,
        githubToken: config.githubToken,
        gitlabToken: config.gitlabToken,
      });

      setSyncStatus({
        syncing: false,
        completed: true,
        itemsSynced: response.data.itemsSynced,
        errors: response.data.errors,
      });
    } catch (error: any) {
      setSyncStatus({
        syncing: false,
        completed: false,
        itemsSynced: 0,
        errors: [error.response?.data?.error || 'Error al sincronizar issues'],
      });
    }
  };

  const handleSyncMRs = async () => {
    try {
      setSyncStatus({ syncing: true, completed: false, itemsSynced: 0, errors: [] });

      const response = await api.post('/webhooks/sync/mrs', {
        githubRepo: config.githubRepo,
        gitlabProject: config.gitlabProject,
        githubToken: config.githubToken,
        gitlabToken: config.gitlabToken,
      });

      setSyncStatus({
        syncing: false,
        completed: true,
        itemsSynced: response.data.itemsSynced,
        errors: response.data.errors,
      });
    } catch (error: any) {
      setSyncStatus({
        syncing: false,
        completed: false,
        itemsSynced: 0,
        errors: [error.response?.data?.error || 'Error al sincronizar MRs'],
      });
    }
  };

  const handleCompareRepositories = async () => {
    try {
      const response = await api.post('/webhooks/compare', {
        githubRepo: config.githubRepo,
        gitlabProject: config.gitlabProject,
        githubToken: config.githubToken,
        gitlabToken: config.gitlabToken,
      });

      setComparison(response.data);
    } catch (error: any) {
      setSyncStatus({
        syncing: false,
        completed: false,
        itemsSynced: 0,
        errors: [error.response?.data?.error || 'Error al comparar repositorios'],
      });
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>🔄 Sincronización GitHub ↔ GitLab</h1>

      <div className="tabs">
        <button
          className={activeTab === 'setup' ? 'active' : ''}
          onClick={() => setActiveTab('setup')}
        >
          ⚙️ Configurar
        </button>
        <button
          className={activeTab === 'sync' ? 'active' : ''}
          onClick={() => setActiveTab('sync')}
        >
          🔄 Sincronizar
        </button>
        <button
          className={activeTab === 'status' ? 'active' : ''}
          onClick={() => setActiveTab('status')}
        >
          📊 Estado
        </button>
      </div>

      {activeTab === 'setup' && (
        <div className="card">
          <h2>Configurar Sincronización</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Conecta tu repositorio de GitHub con tu proyecto de GitLab
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              📦 Repositorio GitHub
            </label>
            <input
              type="text"
              placeholder="ej: usuario/repositorio"
              value={config.githubRepo}
              onChange={(e) => handleConfigChange('githubRepo', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #e3e3e3',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              🏗️ Proyecto GitLab
            </label>
            <input
              type="text"
              placeholder="ej: 123456"
              value={config.gitlabProject}
              onChange={(e) => handleConfigChange('gitlabProject', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #e3e3e3',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              🔑 Token GitHub (Personal Access Token)
            </label>
            <input
              type="password"
              placeholder="ghp_..."
              value={config.githubToken}
              onChange={(e) => handleConfigChange('githubToken', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #e3e3e3',
                fontSize: '14px',
              }}
            />
            <small style={{ color: '#999' }}>
              Crea en: GitHub → Settings → Developer settings → Personal access tokens
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              🔑 Token GitLab (Personal Access Token)
            </label>
            <input
              type="password"
              placeholder="glpat-..."
              value={config.gitlabToken}
              onChange={(e) => handleConfigChange('gitlabToken', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #e3e3e3',
                fontSize: '14px',
              }}
            />
            <small style={{ color: '#999' }}>
              Crea en: GitLab → Settings → Access Tokens
            </small>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSetupSync}
            style={{ width: '100%' }}
          >
            ✅ Configurar Sincronización
          </button>
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="card">
          <h2>Sincronizar Ahora</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Sincroniza issues, merge requests y commits entre plataformas
          </p>

          {syncStatus.errors.length > 0 && (
            <div className="error" style={{ marginBottom: '20px' }}>
              {syncStatus.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}

          {syncStatus.completed && (
            <div className="success" style={{ marginBottom: '20px' }}>
              ✅ Se sincronizaron {syncStatus.itemsSynced} elementos
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={handleSyncIssues}
              disabled={syncStatus.syncing}
            >
              📋 Sincronizar Issues
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSyncMRs}
              disabled={syncStatus.syncing}
            >
              🔀 Sincronizar MRs
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCompareRepositories}
              disabled={syncStatus.syncing}
            >
              📊 Comparar
            </button>
          </div>

          {syncStatus.syncing && <div className="loading">Sincronizando...</div>}
        </div>
      )}

      {activeTab === 'status' && (
        <div>
          {comparison ? (
            <div className="card">
              <h2>Comparación de Repositorios</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                  <h3 style={{ color: '#fc6d26' }}>GitHub</h3>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0' }}>
                    {comparison.github.issues}
                  </p>
                  <p style={{ color: '#666' }}>Issues</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>
                    {comparison.github.pullRequests}
                  </p>
                  <p style={{ color: '#666' }}>Pull Requests</p>
                </div>

                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                  <h3 style={{ color: '#fc6d26' }}>GitLab</h3>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0' }}>
                    {comparison.gitlab.issues}
                  </p>
                  <p style={{ color: '#666' }}>Issues</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>
                    {comparison.gitlab.mergeRequests}
                  </p>
                  <p style={{ color: '#666' }}>Merge Requests</p>
                </div>
              </div>

              {comparison.differences && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                  <h3>Diferencias</h3>
                  <p>
                    Issues: <strong>{comparison.differences.issuesDiff > 0 ? '+' : ''}{comparison.differences.issuesDiff}</strong>
                  </p>
                  <p>
                    MRs: <strong>{comparison.differences.prsMRsDiff > 0 ? '+' : ''}{comparison.differences.prsMRsDiff}</strong>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#666' }}>
                Aún no hay datos de comparación. Usa la sección "Sincronizar" para comparar repositorios.
              </p>
            </div>
          )}

          <div className="card" style={{ marginTop: '20px' }}>
            <h3>📝 Información de Webhooks</h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Para sincronización automática en tiempo real, configura webhooks:
            </p>
            <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
              <strong>GitHub Webhook URL:</strong>
              <code style={{ display: 'block', marginTop: '5px', color: '#333' }}>
                {window.location.origin}/api/webhooks/github
              </code>
            </div>
            <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px' }}>
              <strong>GitLab Webhook URL:</strong>
              <code style={{ display: 'block', marginTop: '5px', color: '#333' }}>
                {window.location.origin}/api/webhooks/gitlab
              </code>
            </div>
            <p style={{ color: '#666', marginTop: '15px', fontSize: '12px' }}>
              ✅ Selecciona eventos: Issues, Merge Requests, Push
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
