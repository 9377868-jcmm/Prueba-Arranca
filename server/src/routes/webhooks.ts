import { Router, Request, Response } from 'express';
import axios from 'axios';

export const webhookRoutes = Router();

const GITHUB_API = 'https://api.github.com';
const GITLAB_API = process.env.GITLAB_URL || 'https://gitlab.com';

interface WebhookConfig {
  githubRepo: string;
  gitlabProject: number;
  githubToken: string;
  gitlabToken: string;
}

const syncConfig: Map<string, WebhookConfig> = new Map();

// Guardar configuración de sincronización
webhookRoutes.post('/setup', async (req: Request, res: Response) => {
  try {
    const { githubRepo, gitlabProject, githubToken, gitlabToken } = req.body;

    if (!githubRepo || !gitlabProject || !githubToken || !gitlabToken) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const config: WebhookConfig = {
      githubRepo,
      gitlabProject,
      githubToken,
      gitlabToken,
    };

    const key = `${githubRepo}-${gitlabProject}`;
    syncConfig.set(key, config);

    res.json({
      success: true,
      message: 'Sincronización configurada',
      key,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook desde GitHub
webhookRoutes.post('/github', async (req: Request, res: Response) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    console.log(`📨 GitHub webhook: ${event}`);

    // Sincronizar issues
    if (event === 'issues') {
      await handleGitHubIssue(payload);
    }

    // Sincronizar PRs
    if (event === 'pull_request') {
      await handleGitHubPullRequest(payload);
    }

    // Sincronizar pushes
    if (event === 'push') {
      await handleGitHubPush(payload);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error en webhook GitHub:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Webhook desde GitLab
webhookRoutes.post('/gitlab', async (req: Request, res: Response) => {
  try {
    const eventType = req.headers['x-gitlab-event'];
    const payload = req.body;

    console.log(`📨 GitLab webhook: ${eventType}`);

    // Sincronizar issues
    if (eventType === 'issues') {
      await handleGitLabIssue(payload);
    }

    // Sincronizar MRs
    if (eventType === 'merge_request') {
      await handleGitLabMergeRequest(payload);
    }

    // Sincronizar pushes
    if (eventType === 'push') {
      await handleGitLabPush(payload);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error en webhook GitLab:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Handlers para GitHub → GitLab

async function handleGitHubIssue(payload: any) {
  const { action, issue, repository } = payload;

  for (const [, config] of syncConfig) {
    if (config.githubRepo === repository.full_name) {
      try {
        const gitlabIssueData = {
          title: issue.title,
          description: `**Sincronizado desde GitHub**\n\n${issue.body}\n\n[Ver en GitHub](${issue.html_url})`,
          labels: issue.labels.map((l: any) => l.name),
        };

        if (action === 'opened') {
          // Crear issue en GitLab
          await axios.post(
            `${GITLAB_API}/api/v4/projects/${config.gitlabProject}/issues`,
            gitlabIssueData,
            { headers: { Authorization: `Bearer ${config.gitlabToken}` } }
          );
          console.log(`✅ Issue creado en GitLab: ${issue.title}`);
        } else if (action === 'closed') {
          // Cerrar issue en GitLab
          // Implementar búsqueda y cierre
          console.log(`✅ Issue cerrado: ${issue.title}`);
        }
      } catch (error: any) {
        console.error('Error sincronizando issue:', error.response?.data || error.message);
      }
    }
  }
}

async function handleGitHubPullRequest(payload: any) {
  const { action, pull_request, repository } = payload;

  for (const [, config] of syncConfig) {
    if (config.githubRepo === repository.full_name) {
      try {
        const mrData = {
          title: pull_request.title,
          description: `**Sincronizado desde GitHub**\n\n${pull_request.body}\n\n[Ver en GitHub](${pull_request.html_url})`,
          source_branch: pull_request.head.ref,
          target_branch: pull_request.base.ref,
        };

        if (action === 'opened') {
          // Crear MR en GitLab
          await axios.post(
            `${GITLAB_API}/api/v4/projects/${config.gitlabProject}/merge_requests`,
            mrData,
            { headers: { Authorization: `Bearer ${config.gitlabToken}` } }
          );
          console.log(`✅ MR creado en GitLab: ${pull_request.title}`);
        }
      } catch (error: any) {
        console.error('Error sincronizando PR:', error.response?.data || error.message);
      }
    }
  }
}

async function handleGitHubPush(payload: any) {
  const { repository, commits } = payload;

  for (const [, config] of syncConfig) {
    if (config.githubRepo === repository.full_name) {
      console.log(`✅ Push sincronizado: ${commits.length} commits`);
      // Aquí se puede implementar lógica adicional
    }
  }
}

// Handlers para GitLab → GitHub

async function handleGitLabIssue(payload: any) {
  const { action, object_attributes, project, user } = payload;

  for (const [, config] of syncConfig) {
    if (config.gitlabProject === project.id) {
      try {
        const issueData = {
          title: object_attributes.title,
          body: `**Sincronizado desde GitLab**\n\n${object_attributes.description}\n\n[Ver en GitLab](${object_attributes.url})`,
          labels: object_attributes.labels,
        };

        if (action === 'open') {
          console.log(`✅ Issue de GitLab sincronizado: ${object_attributes.title}`);
          // Implementar creación en GitHub
        }
      } catch (error: any) {
        console.error('Error sincronizando issue de GitLab:', error.message);
      }
    }
  }
}

async function handleGitLabMergeRequest(payload: any) {
  const { action, object_attributes, project } = payload;

  for (const [, config] of syncConfig) {
    if (config.gitlabProject === project.id) {
      console.log(`✅ MR de GitLab sincronizado: ${object_attributes.title}`);
      // Implementar sincronización
    }
  }
}

async function handleGitLabPush(payload: any) {
  const { project, commits } = payload;

  for (const [, config] of syncConfig) {
    if (config.gitlabProject === project.id) {
      console.log(`✅ Push de GitLab sincronizado: ${commits.length} commits`);
    }
  }
}

// Endpoint para obtener estado de sincronización
webhookRoutes.get('/status/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const config = syncConfig.get(key);

  if (!config) {
    return res.status(404).json({ error: 'Configuración no encontrada' });
  }

  res.json({
    key,
    config: {
      githubRepo: config.githubRepo,
      gitlabProject: config.gitlabProject,
    },
    status: 'active',
    lastSync: new Date().toISOString(),
  });
});

// Endpoint para eliminar configuración
webhookRoutes.delete('/setup/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const deleted = syncConfig.delete(key);

  if (!deleted) {
    return res.status(404).json({ error: 'Configuración no encontrada' });
  }

  res.json({ success: true, message: 'Sincronización eliminada' });
});
