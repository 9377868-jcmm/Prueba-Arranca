# 🚀 Guía de Deployment

## Opciones de Deployment

### 1. Heroku (Más Simple)

#### Requisitos
- Cuenta en heroku.com
- Heroku CLI instalado

#### Pasos

```bash
# Login en Heroku
heroku login

# Crear app
heroku create prueba-arranca

# Configurar variables de entorno
heroku config:set \
  GITLAB_CLIENT_ID="tu_id" \
  GITLAB_CLIENT_SECRET="tu_secret" \
  GITLAB_URL="https://gitlab.com" \
  GITLAB_REDIRECT_URI="https://prueba-arranca.herokuapp.com/api/auth/callback" \
  SESSION_SECRET="random-secret-key" \
  NODE_ENV="production"

# Deploy
git push heroku main

# Ver logs
heroku logs --tail
```

### 2. Vercel (Frontend) + Railway (Backend)

#### Frontend en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd client
vercel

# Configurar en Vercel Dashboard:
# VITE_API_URL=https://your-backend.railway.app/api
```

#### Backend en Railway

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up

# Ver variables de entorno en Railway Dashboard
```

### 3. Docker (Recomendado para Equipos)

#### Crear Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

COPY server ./server
COPY client ./client

WORKDIR /app/server
RUN npm install
RUN npm run build

WORKDIR /app/client
RUN npm install
RUN npm run build

WORKDIR /app

# Exponer puerto
EXPOSE 5000

# Iniciar servidor
CMD ["node", "server/dist/index.js"]
```

#### Usar Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - GITLAB_CLIENT_ID=${GITLAB_CLIENT_ID}
      - GITLAB_CLIENT_SECRET=${GITLAB_CLIENT_SECRET}
      - GITLAB_URL=${GITLAB_URL}
      - GITLAB_REDIRECT_URI=${GITLAB_REDIRECT_URI}
      - SESSION_SECRET=${SESSION_SECRET}
      - CLIENT_URL=http://localhost:5000
      - VITE_API_URL=/api
    volumes:
      - ./:/app
      - /app/node_modules
```

Ejecutar:
```bash
docker-compose up
```

### 4. AWS EC2

#### Setup Básico

```bash
# SSH en tu instancia EC2
ssh -i key.pem ubuntu@your-instance-ip

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar repo
git clone <your-repo>
cd Prueba-Arranca

# Instalar dependencias
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Build
npm run build

# Usar PM2 para ejecutar en background
npm install -g pm2
pm2 start "npm start" --name prueba-arranca
pm2 save
pm2 startup

# Configurar Nginx como proxy reverso
sudo apt-get install nginx
```

#### Nginx Config

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. DigitalOcean App Platform

#### Crear app.yaml

```yaml
name: prueba-arranca
services:
  - name: server
    github:
      repo: your-org/prueba-arranca
      branch: main
    build_command: npm install && cd server && npm install && npm run build
    run_command: npm start
    envs:
      - key: GITLAB_CLIENT_ID
        value: ${GITLAB_CLIENT_ID}
      - key: GITLAB_CLIENT_SECRET
        value: ${GITLAB_CLIENT_SECRET}
      - key: NODE_ENV
        value: production
```

Deploy via GitHub o CLI.

## Consideraciones de Seguridad

### Variables de Entorno

**NUNCA** hagas push de `.env` a Git.

En producción, usa:
- Heroku Secrets
- GitHub Secrets
- AWS Secrets Manager
- Vault

### HTTPS

Siempre usa HTTPS en producción:

```env
# En producción, actualiza:
GITLAB_REDIRECT_URI=https://your-domain.com/api/auth/callback
```

### CORS

En producción, especifica origen exacto:

```typescript
// server/src/index.ts
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://your-domain.com',
  credentials: true,
}));
```

### Rate Limiting

Añade rate limiting para proteger la API:

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

### httpOnly Cookies

Reemplaza localStorage con httpOnly cookies:

```typescript
// server/src/routes/auth.ts
session.cookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24 horas
};
```

## Monitoreo

### Sentry (Error Tracking)

```bash
npm install @sentry/node @sentry/tracing
```

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.errorHandler());
```

### Logs

```bash
# Usar Winston para logging
npm install winston
```

## Performance

### Caching

Implementa caching en proyectos:

```typescript
const projectCache = new Map();

app.get('/api/gitlab/projects/:id', (req, res) => {
  const cached = projectCache.get(req.params.id);
  if (cached) return res.json(cached);
  
  // Fetch desde GitLab...
  projectCache.set(req.params.id, data);
  res.json(data);
});
```

### CDN

Servir archivos estáticos desde CDN:

```bash
# Build incluye hashes de contenido
npm run build
# Subir ./client/dist a CloudFlare, Netlify CDN, etc.
```

## Checklist Pre-Deployment

- [ ] Variables de entorno configuradas
- [ ] HTTPS habilitado
- [ ] CORS configurado para producción
- [ ] Secrets en variables de entorno (NO en código)
- [ ] Build funciona localmente
- [ ] Tests pasan (si hay)
- [ ] Logs configurados
- [ ] Backups configurados
- [ ] Monitoreo activo
- [ ] Plan de rollback

## Troubleshooting

### App funciona localmente pero no en servidor

1. Verifica logs: `heroku logs --tail`
2. Comprueba variables de entorno: `heroku config`
3. Verifica URLs son accesibles: GITLAB_REDIRECT_URI debe resolver

### Errores de conexión a GitLab

```bash
# Testa la conexión
curl "https://gitlab.com/api/v4/user" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Out of Memory

```bash
# Aumentar memory limit en Heroku
heroku ps:scale web=1 --type=Standard-2X
```

---

¿Preguntas? Contacta al equipo DevOps.
