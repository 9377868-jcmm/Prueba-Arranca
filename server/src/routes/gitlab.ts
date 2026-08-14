import { Router, Request, Response } from 'express';
import axios from 'axios';

export const gitlabRoutes = Router();

const GITLAB_URL = process.env.GITLAB_URL || 'https://gitlab.com';
const API_VERSION = 'v4';

const getAuthHeader = (req: Request) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  return { Authorization: `Bearer ${token}` };
};

const gitlabApi = axios.create({
  baseURL: `${GITLAB_URL}/api/${API_VERSION}`,
});

gitlabRoutes.get('/projects', async (req: Request, res: Response) => {
  try {
    const { page = 1, per_page = 20, search } = req.query;
    const params: any = { page, per_page, simple: true };
    if (search) params.search = search;

    const response = await gitlabApi.get('/projects', {
      headers: getAuthHeader(req),
      params,
    });

    res.json({
      projects: response.data,
      pagination: {
        page: parseInt(page as string),
        perPage: parseInt(per_page as string),
        total: response.headers['x-total'],
      },
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Failed to fetch projects',
    });
  }
});

gitlabRoutes.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await gitlabApi.get(`/projects/${id}`, {
      headers: getAuthHeader(req),
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch project',
    });
  }
});

gitlabRoutes.get('/projects/:id/issues', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, per_page = 20, state = 'opened' } = req.query;

    const response = await gitlabApi.get(`/projects/${id}/issues`, {
      headers: getAuthHeader(req),
      params: { page, per_page, state },
    });

    res.json({
      issues: response.data,
      pagination: {
        page: parseInt(page as string),
        total: response.headers['x-total'],
      },
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch issues',
    });
  }
});

gitlabRoutes.get('/projects/:id/merge_requests', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, per_page = 20, state = 'opened' } = req.query;

    const response = await gitlabApi.get(`/projects/${id}/merge_requests`, {
      headers: getAuthHeader(req),
      params: { page, per_page, state },
    });

    res.json({
      mergeRequests: response.data,
      pagination: {
        page: parseInt(page as string),
        total: response.headers['x-total'],
      },
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch merge requests',
    });
  }
});

gitlabRoutes.get('/projects/:id/pipelines', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, per_page = 20 } = req.query;

    const response = await gitlabApi.get(`/projects/${id}/pipelines`, {
      headers: getAuthHeader(req),
      params: { page, per_page },
    });

    res.json({
      pipelines: response.data,
      pagination: {
        page: parseInt(page as string),
        total: response.headers['x-total'],
      },
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch pipelines',
    });
  }
});

gitlabRoutes.get('/projects/:id/repository/tree', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { path = '', ref = 'main' } = req.query;

    const response = await gitlabApi.get(`/projects/${id}/repository/tree`, {
      headers: getAuthHeader(req),
      params: { path, ref },
    });

    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch repository tree',
    });
  }
});

gitlabRoutes.get('/user/events', async (req: Request, res: Response) => {
  try {
    const { page = 1, per_page = 20 } = req.query;

    const response = await gitlabApi.get('/events', {
      headers: getAuthHeader(req),
      params: { page, per_page },
    });

    res.json({
      events: response.data,
      pagination: {
        page: parseInt(page as string),
        total: response.headers['x-total'],
      },
    });
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch events',
    });
  }
});
