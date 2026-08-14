# 📋 Guía de Setup Detallada

## Paso 1: Crear OAuth App en GitLab

### Para gitlab.com (GitLab Cloud)

1. Inicia sesión en https://gitlab.com
2. Ve a tu perfil: Click en tu avatar → **Settings**
3. En el menú izquierdo: **Applications**
4. Haz click en **Add new application**

Completa el formulario:
- **Name**: `Prueba Arranca`
- **Redirect URI**: `http://localhost:5000/api/auth/callback`
- **Confidential**: ✅ Marcado
- **Scopes** selecciona:
  - ✅ `read_api` - Acceso a API
  - ✅ `read_repository` - Acceso a repositorios
  - ✅ `read_user` - Información del usuario

5. Haz click en **Save application**

Verás:
- **Application ID** (Client ID)
- **Secret** (Client Secret)

Copia estos valores, los necesitarás en el paso siguiente.

### Para GitLab Self-Hosted

El proceso es similar, solo que accedes a:
`https://tu-gitlab-instance.com/admin/applications`

## Paso 2: Configurar Variables de Entorno

### Crear archivo `.env`

En la raíz del proyecto:

```bash
cp .env.example .env
```

### Editar `.env`

Abre el archivo y completa con tus valores:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
SESSION_SECRET=prueba-arranca-secret-key-2024

# Frontend Configuration  
VITE_API_URL=http://localhost:5000/api
CLIENT_URL=http://localhost:5173

# GitLab OAuth2 (obtén estos de los pasos anteriores)
GITLAB_URL=https://gitlab.com
GITLAB_CLIENT_ID=abc123def456...
GITLAB_CLIENT_SECRET=xyz789uvw123...
GITLAB_REDIRECT_URI=http://localhost:5000/api/auth/callback
```

**⚠️ IMPORTANTE**: Nunca commits el archivo `.env` a Git. Está en `.gitignore`.

## Paso 3: Instalar Dependencias

### Opción A: npm

```bash
# Instalar todo
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Opción B: yarn

```bash
yarn install
cd server && yarn install && cd ..
cd client && yarn install && cd ..
```

### Opción C: pnpm

```bash
pnpm install
cd server && pnpm install && cd ..
cd client && pnpm install && cd ..
```

## Paso 4: Ejecutar en Desarrollo

Desde la raíz del proyecto:

```bash
npm run dev
```

Esto inicia **ambos** servidores:
- ✅ Frontend en `http://localhost:5173`
- ✅ Backend en `http://localhost:5000`

En la terminal verás algo como:

```
> concurrently "npm run dev:server" "npm run dev:client"

[0] 🚀 Server running on http://localhost:5000
[1] 📡 GitLab OAuth configured for: https://gitlab.com
[1] VITE v5.0.8 running at:
[1] > Local:     http://localhost:5173/
```

## Paso 5: Probar la Conexión

1. Abre http://localhost:5173 en tu navegador
2. Verás la página de login con botón **"🔗 Conectar con GitLab"**
3. Haz click en el botón
4. Serás redirigido a GitLab para autorizar
5. Después de autorizar, verás tu dashboard con los proyectos

## Troubleshooting

### ❌ "Error al conectar con GitLab" en la página de login

**Posibles causas:**

1. **Client ID o Secret incorrectos**
   - Verifica en `.env` que coincidan exactamente
   - Copia-pega desde GitLab, no escribas manualmente

2. **GITLAB_URL incorrecta**
   - Debe ser `https://gitlab.com` (con https)
   - O tu URL privada si uses self-hosted

3. **REDIRECT_URI no coincide**
   - En `.env`: `http://localhost:5000/api/auth/callback`
   - En GitLab OAuth App: Exactamente igual

**Solución:**
```bash
# Verifica tu .env
cat .env

# Compara con GitLab:
# 1. GitLab → Settings → Applications
# 2. Busca "Prueba Arranca"
# 3. Verifica Client ID, Secret y Redirect URI
```

### ❌ "No hay proyectos disponibles"

**Posibles causas:**

1. Tu usuario no tiene proyectos
2. Los scopes no incluyen `read_api` o `read_repository`

**Solución:**
- Revoca acceso y crea una nueva OAuth App con scopes correctos

### ❌ CORS Error en consola

Ejemplo: `Access to XMLHttpRequest blocked by CORS policy`

**Solución:**
```env
# Verifica en .env que:
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000/api
```

### ❌ "Cannot find module" errors

**Solución:**
```bash
# Reinstala dependencias
rm -rf node_modules server/node_modules client/node_modules
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### ❌ Port ya en uso

Si el puerto 5000 o 5173 ya está en uso:

```bash
# Cambiar el puerto en .env
PORT=5001

# O matar el proceso que usa el puerto
# En Linux/Mac:
lsof -i :5000
kill -9 <PID>

# En Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## Desarrollo

### Comandos útiles

```bash
# Iniciar servidor backend solo
npm run dev:server

# Iniciar cliente frontend solo
npm run dev:client

# Build para producción
npm run build

# Ver tipos de TypeScript
npm run lint
```

### Estructura de código

```
src/
├── api/
│   └── client.ts          # Configuración de Axios
├── pages/
│   ├── LoginPage.tsx      # Página de autenticación
│   ├── DashboardPage.tsx  # Lista de proyectos
│   └── ProjectPage.tsx    # Detalle de proyecto
├── App.tsx                # Router principal
├── main.tsx               # Entrada React
└── index.css              # Estilos globales
```

### Debugging

En Chrome DevTools:
- Network: Ve las requests a `/api/gitlab/*`
- Console: Errores de JavaScript
- Application → Cookies: Ver sesión

En VS Code:
- Instala "Debugger for Chrome"
- Configura en `.vscode/launch.json`

## Producción

Consulta [DEPLOYMENT.md](./DEPLOYMENT.md) para desplegar en producción.
