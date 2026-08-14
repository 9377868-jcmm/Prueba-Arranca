import axios from 'axios';

interface SyncState {
  lastGitHubSync: Date;
  lastGitLabSync: Date;
  itemsSynced: number;
  errors: string[];
}

const syncState: Map<string, SyncState> = new Map();

export class SyncService {
  static async syncIssuesGitHubToGitLab(
    githubRepo: string,
    gitlabProject: number,
    githubToken: string,
    gitlabToken: string,
    gitlabUrl: string
  ): Promise<SyncState> {
    const key = `${githubRepo}-${gitlabProject}`;
    const state: SyncState = {
      lastGitHubSync: new Date(),
      lastGitLabSync: new Date(),
      itemsSynced: 0,
      errors: [],
    };

    try {
      // Obtener issues de GitHub
      const gitHubIssues = await axios.get(
        `https://api.github.com/repos/${githubRepo}/issues?state=all`,
        { headers: { Authorization: `token ${githubToken}` } }
      );

      // Crear issues en GitLab
      for (const issue of gitHubIssues.data) {
        try {
          await axios.post(
            `${gitlabUrl}/api/v4/projects/${gitlabProject}/issues`,
            {
              title: issue.title,
              description: `**De GitHub**: ${issue.body}\n\n[Ver en GitHub](${issue.html_url})`,
              labels: issue.labels.map((l: any) => l.name).join(','),
              state: issue.state === 'open' ? 'opened' : 'closed',
            },
            { headers: { Authorization: `Bearer ${gitlabToken}` } }
          );
          state.itemsSynced++;
        } catch (error: any) {
          state.errors.push(`Issue "${issue.title}": ${error.message}`);
        }
      }

      syncState.set(key, state);
      return state;
    } catch (error: any) {
      state.errors.push(error.message);
      return state;
    }
  }

  static async syncMergeRequestsGitHubToGitLab(
    githubRepo: string,
    gitlabProject: number,
    githubToken: string,
    gitlabToken: string,
    gitlabUrl: string
  ): Promise<SyncState> {
    const key = `mr-${githubRepo}-${gitlabProject}`;
    const state: SyncState = {
      lastGitHubSync: new Date(),
      lastGitLabSync: new Date(),
      itemsSynced: 0,
      errors: [],
    };

    try {
      // Obtener PRs de GitHub
      const gitHubPRs = await axios.get(
        `https://api.github.com/repos/${githubRepo}/pulls?state=all`,
        { headers: { Authorization: `token ${githubToken}` } }
      );

      // Crear MRs en GitLab
      for (const pr of gitHubPRs.data) {
        try {
          await axios.post(
            `${gitlabUrl}/api/v4/projects/${gitlabProject}/merge_requests`,
            {
              title: pr.title,
              description: `**De GitHub**: ${pr.body}\n\n[Ver en GitHub](${pr.html_url})`,
              source_branch: pr.head.ref,
              target_branch: pr.base.ref,
              state: pr.state === 'open' ? 'opened' : 'closed',
            },
            { headers: { Authorization: `Bearer ${gitlabToken}` } }
          );
          state.itemsSynced++;
        } catch (error: any) {
          state.errors.push(`PR "${pr.title}": ${error.message}`);
        }
      }

      syncState.set(key, state);
      return state;
    } catch (error: any) {
      state.errors.push(error.message);
      return state;
    }
  }

  static async syncCommitsGitHubToGitLab(
    githubRepo: string,
    gitlabProject: number,
    githubToken: string,
    gitlabUrl: string
  ): Promise<SyncState> {
    const key = `commits-${githubRepo}-${gitlabProject}`;
    const state: SyncState = {
      lastGitHubSync: new Date(),
      lastGitLabSync: new Date(),
      itemsSynced: 0,
      errors: [],
    };

    try {
      // Obtener commits de GitHub
      const gitHubCommits = await axios.get(
        `https://api.github.com/repos/${githubRepo}/commits`,
        { headers: { Authorization: `token ${githubToken}` } }
      );

      state.itemsSynced = gitHubCommits.data.length;
      syncState.set(key, state);
      return state;
    } catch (error: any) {
      state.errors.push(error.message);
      return state;
    }
  }

  static getSyncState(key: string): SyncState | undefined {
    return syncState.get(key);
  }

  static getAllSyncStates(): Map<string, SyncState> {
    return syncState;
  }

  static clearSyncState(key: string): boolean {
    return syncState.delete(key);
  }

  static async compareRepositories(
    githubRepo: string,
    gitlabProject: number,
    githubToken: string,
    gitlabToken: string,
    gitlabUrl: string
  ): Promise<any> {
    try {
      const [gitHubIssues, gitLabIssues, gitHubPRs, gitLabMRs] = await Promise.all([
        axios.get(`https://api.github.com/repos/${githubRepo}/issues?state=all`, {
          headers: { Authorization: `token ${githubToken}` },
        }),
        axios.get(`${gitlabUrl}/api/v4/projects/${gitlabProject}/issues`, {
          headers: { Authorization: `Bearer ${gitlabToken}` },
        }),
        axios.get(`https://api.github.com/repos/${githubRepo}/pulls?state=all`, {
          headers: { Authorization: `token ${githubToken}` },
        }),
        axios.get(`${gitlabUrl}/api/v4/projects/${gitlabProject}/merge_requests`, {
          headers: { Authorization: `Bearer ${gitlabToken}` },
        }),
      ]);

      return {
        github: {
          issues: gitHubIssues.data.length,
          pullRequests: gitHubPRs.data.length,
        },
        gitlab: {
          issues: gitLabIssues.data.length,
          mergeRequests: gitLabMRs.data.length,
        },
        differences: {
          issuesDiff: gitHubIssues.data.length - gitLabIssues.data.length,
          prsMRsDiff: gitHubPRs.data.length - gitLabMRs.data.length,
        },
      };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
