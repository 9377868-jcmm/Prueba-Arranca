# 🚀 Prueba Arranca - GitLab Connection Platform

Una plataforma fullstack moderna para conectar y gestionar tus proyectos de GitLab. Desarrollada con React, Node.js y OAuth2.

## ✨ Características

- 🔐 **Autenticación OAuth2** con GitLab
- 📚 **Dashboard de Proyectos** - Explora todos tus repositorios
- 📋 **Gestión de Issues** - Visualiza y filtra issues
- 🔀 **Merge Requests** - Seguimiento de cambios en código
- ⚙️ **Pipelines CI/CD** - Monitorea tus builds
- 🔍 **Búsqueda y Filtros** - Encuentra rápidamente lo que necesitas
- 👥 **Colaboración en Equipo** - Comparte información con tu equipo

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React + TypeScript)                               │
│ - SPA con navegación fluida                                  │
│ - UI responsiva con CSS puro                                 │
│ - Axios para comunicación HTTP                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend (Express + TypeScript)                              │
│ - Servidor Node.js con API REST                              │
│ - OAuth2 con GitLab                                          │
│ - Proxy seguro a GitLab API                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
              GitLab API (api.gitlab.com)
```

## 📦 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router DOM
- Axios

### Backend
- Express.js
- TypeScript
- Passport (OAuth2)
- Axios
- dotenv

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 16+ y npm/yarn/pnpm
- Una instancia de GitLab (gitlab.com o privada)
- Crear una OAuth Application en GitLab

### 1. Clonar y Configurar

```bash
# Clonar el repositorio
git clone <repo-url>
cd Prueba-Arranca

# Instalar dependencias
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Crear OAuth App en GitLab

1. Ve a tu perfil de GitLab → Settings → Applications
2. Crea una nueva application con estos datos:
   - **Name**: Prueba Arranca
   - **Redirect URI**: `http://localhost:5000/api/auth/callback`
   - **Scopes**: `read_api`, `read_repository`, `read_user`
3. Copia tu `Application ID` y `Secret`

### 3. Configurar Variables de Entorno

```bash
# Crear .env en la raíz del proyecto
cp .env.example .env
```

Completa el archivo `.env`:

```env
# Server
PORT=5000
NODE_ENV=development
SESSION_SECRET=tu-clave-secreta-aqui

# Client
VITE_API_URL=http://localhost:5000/api
CLIENT_URL=http://localhost:5173

# GitLab OAuth2
GITLAB_URL=https://gitlab.com  # O tu instancia privada
GITLAB_CLIENT_ID=tu_client_id
GITLAB_CLIENT_SECRET=tu_client_secret
GITLAB_REDIRECT_URI=http://localhost:5000/api/auth/callback
```

### 4. Ejecutar en Desarrollo

```bash
# Desde la raíz del proyecto
npm run dev
```

Esto inicia:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

### 5. Build para Producción

```bash
npm run build
npm start
```

## 📚 API Endpoints

### Autenticación
- `GET /api/auth/login` - Obtener URL de login
- `GET /api/auth/callback` - Callback de OAuth
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### GitLab
- `GET /api/gitlab/projects` - Listar proyectos
- `GET /api/gitlab/projects/:id` - Detalle de proyecto
- `GET /api/gitlab/projects/:id/issues` - Issues del proyecto
- `GET /api/gitlab/projects/:id/merge_requests` - MRs del proyecto
- `GET /api/gitlab/projects/:id/pipelines` - Pipelines del proyecto
- `GET /api/gitlab/projects/:id/repository/tree` - Árbol de repositorio
- `GET /api/gitlab/user/events` - Eventos del usuario

## 🗂️ Estructura del Proyecto

```
Prueba-Arranca/
├── server/                 # Backend Express
│   ├── src/
│   │   ├── index.ts       # Entrada principal
│   │   └── routes/        # Rutas de API
│   ├── package.json
│   └── tsconfig.json
├── client/                 # Frontend React
│   ├── src/
│   │   ├── main.tsx       # Entrada principal
│   │   ├── App.tsx        # Componente raíz
│   │   ├── pages/         # Páginas
│   │   ├── api/           # Cliente HTTP
│   │   └── index.css      # Estilos globales
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── public/                 # Archivos estáticos
├── docs/                   # Documentación adicional
├── .env.example           # Variables de ejemplo
├── .gitignore
├── package.json           # Scripts root
└── README.md
```

## 🔐 Seguridad

- Tokens almacenados en localStorage (considera usar httpOnly cookies en producción)
- CORS configurado para localhost (cambiar en producción)
- Headers de autenticación en todas las requests
- Interceptores de Axios para manejar errores 401

### Mejoras de Seguridad Recomendadas

1. Usar `httpOnly` cookies en lugar de localStorage
2. Implementar CSRF protection
3. Validar y sanitizar inputs
4. Rate limiting en el backend
5. HTTPS en producción
6. Secrets en variables de entorno

## 📋 Funcionalidades Futuras

- [ ] Crear/editar issues desde la plataforma
- [ ] Crear merge requests
- [ ] Comentarios en issues/MRs
- [ ] Webhooks para actualizaciones en tiempo real
- [ ] Soporte para múltiples instancias de GitLab
- [ ] Exportar datos a CSV/PDF
- [ ] Dashboard con métricas
- [ ] Notificaciones en tiempo real

## 🐛 Troubleshooting

### "Error al conectar con GitLab"
- Verifica que `GITLAB_CLIENT_ID` y `GITLAB_CLIENT_SECRET` sean correctos
- Confirma que el `REDIRECT_URI` coincida con lo configurado en GitLab
- Asegúrate de que `GITLAB_URL` sea correcto

### CORS errors
- Verifica que `CLIENT_URL` en `.env` sea correcto
- En desarrollo debería ser `http://localhost:5173`

### Token expirado
- La sesión se invalida automáticamente si el token expira
- El usuario será redirigido a login

## 📝 Notas de Desarrollo

- Las credenciales de GitLab NUNCA deben commitirse en el repo
- Usa `.env.local` para configuración local específica
- Los tokens de sesión expiran después de cierto tiempo
- Las request a la API de GitLab se hacen desde el backend (más seguro)

## 🤝 Contribuir

Para el equipo:
1. Crea una rama desde `main`
2. Haz tus cambios
3. Commit con mensajes claros
4. Push y abre un Pull Request
5. Revisa y aprueba

## 📄 Licencia

MIT

## 👥 Equipo

Desarrollado con ❤️ para el equipo de Prueba Arranca

---

¿Necesitas ayuda? Consulta la documentación en `/docs` o contacta al equipo.
