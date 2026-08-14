import { Router, Request, Response } from 'express';
import axios from 'axios';

export const authRoutes = Router();

interface SessionWithUser extends Express.Session {
  userId?: string;
  accessToken?: string;
  user?: any;
}

const GITLAB_URL = process.env.GITLAB_URL || 'https://gitlab.com';
const CLIENT_ID = process.env.GITLAB_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GITLAB_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GITLAB_REDIRECT_URI || 'http://localhost:5000/api/auth/callback';

authRoutes.get('/login', (req: Request, res: Response) => {
  const scope = 'read_api read_repository read_user';
  const authUrl = `${GITLAB_URL}/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.json({ url: authUrl });
});

authRoutes.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const response = await axios.post(
      `${GITLAB_URL}/oauth/token`,
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }
    );

    const { access_token, refresh_token } = response.data;

    const userResponse = await axios.get(`${GITLAB_URL}/api/v4/user`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const session = req.session as SessionWithUser;
    session.userId = userResponse.data.id;
    session.accessToken = access_token;
    session.user = userResponse.data;

    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard?token=${access_token}`);
  } catch (error: any) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

authRoutes.get('/me', (req: Request, res: Response) => {
  const session = req.session as SessionWithUser;
  if (!session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(session.user);
});

authRoutes.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});
