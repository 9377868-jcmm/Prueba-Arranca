# 📚 API Documentation

Base URL: `http://localhost:5000/api`

## Authentication Endpoints

### 1. Get Login URL
Obtiene la URL de login para OAuth2.

```
GET /auth/login
```

**Response:**
```json
{
  "url": "https://gitlab.com/oauth/authorize?client_id=..."
}
```

### 2. OAuth Callback
Maneja el callback de OAuth2 de GitLab.

```
GET /auth/callback?code=<authorization_code>
```

**Behavior:**
- Intercambia el código por un token de acceso
- Obtiene información del usuario
- Almacena sesión
- Redirige a `/dashboard?token=<access_token>`

### 3. Get Current User
Obtiene información del usuario autenticado.

```
GET /auth/me

Headers:
  Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 123,
  "username": "john_doe",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "https://...",
  "web_url": "https://gitlab.com/john_doe"
}
```

### 4. Logout
Cierra la sesión del usuario.

```
POST /auth/logout

Headers:
  Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

---

## GitLab API Endpoints

Todos estos endpoints requieren autenticación:

```
Headers:
  Authorization: Bearer <token>
```

### Projects

#### List Projects
Lista todos los proyectos del usuario.

```
GET /gitlab/projects?page=1&per_page=20&search=query
```

**Query Parameters:**
- `page` (default: 1) - Número de página
- `per_page` (default: 20) - Proyectos por página
- `search` (optional) - Buscar por nombre

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "My Project",
      "path_with_namespace": "group/project",
      "description": "Project description",
      "web_url": "https://gitlab.com/group/project",
      "visibility": "private",
      "star_count": 5,
      "forks_count": 2,
      "last_activity_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 45
  }
}
```

#### Get Project Details
Obtiene información detallada de un proyecto.

```
GET /gitlab/projects/:id
```

**Parameters:**
- `id` - Project ID

**Response:**
```json
{
  "id": 1,
  "name": "My Project",
  "description": "Project description",
  "web_url": "https://gitlab.com/group/project",
  "path_with_namespace": "group/project",
  "visibility": "private",
  "owner": {
    "id": 123,
    "username": "john_doe",
    "name": "John Doe"
  },
  "created_at": "2023-01-01T00:00:00Z",
  "last_activity_at": "2024-01-15T10:30:00Z",
  "star_count": 5,
  "forks_count": 2
}
```

### Issues

#### List Issues
Lista los issues de un proyecto.

```
GET /gitlab/projects/:id/issues?page=1&per_page=20&state=opened
```

**Parameters:**
- `id` - Project ID

**Query Parameters:**
- `page` (default: 1) - Página
- `per_page` (default: 20) - Issues por página
- `state` (default: "opened") - Estado: opened, closed, all

**Response:**
```json
{
  "issues": [
    {
      "id": 1,
      "iid": 1,
      "title": "Fix login bug",
      "description": "Issue description",
      "state": "opened",
      "author": {
        "id": 123,
        "name": "John Doe"
      },
      "assignees": [],
      "labels": ["bug", "high-priority"],
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 23
  }
}
```

### Merge Requests

#### List Merge Requests
Lista los merge requests de un proyecto.

```
GET /gitlab/projects/:id/merge_requests?page=1&per_page=20&state=opened
```

**Parameters:**
- `id` - Project ID

**Query Parameters:**
- `page` (default: 1) - Página
- `per_page` (default: 20) - MRs por página
- `state` (default: "opened") - Estado: opened, closed, merged, all

**Response:**
```json
{
  "mergeRequests": [
    {
      "id": 1,
      "iid": 5,
      "title": "Add new feature",
      "description": "Adds authentication support",
      "state": "opened",
      "source_branch": "feature/auth",
      "target_branch": "main",
      "author": {
        "id": 123,
        "name": "John Doe"
      },
      "reviewers": [],
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 12
  }
}
```

### Pipelines

#### List Pipelines
Lista los pipelines de un proyecto.

```
GET /gitlab/projects/:id/pipelines?page=1&per_page=20
```

**Parameters:**
- `id` - Project ID

**Query Parameters:**
- `page` (default: 1) - Página
- `per_page` (default: 20) - Pipelines por página

**Response:**
```json
{
  "pipelines": [
    {
      "id": 123,
      "iid": 5,
      "project_id": 1,
      "sha": "abc123def456",
      "ref": "main",
      "status": "success",
      "web_url": "https://gitlab.com/group/project/-/pipelines/123",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 89
  }
}
```

**Status values:**
- `success` - Pipeline completó exitosamente
- `failed` - Pipeline falló
- `running` - Pipeline en ejecución
- `pending` - Pipeline pendiente
- `canceled` - Pipeline cancelado
- `skipped` - Pipeline saltado

### Repository

#### Get Repository Tree
Obtiene la estructura de un repositorio.

```
GET /gitlab/projects/:id/repository/tree?path=&ref=main
```

**Parameters:**
- `id` - Project ID

**Query Parameters:**
- `path` (default: "") - Ruta en el repositorio
- `ref` (default: "main") - Branch o tag

**Response:**
```json
[
  {
    "id": "abc123",
    "name": "src",
    "type": "tree",
    "path": "src",
    "mode": "040000"
  },
  {
    "id": "def456",
    "name": "README.md",
    "type": "blob",
    "path": "README.md",
    "mode": "100644"
  }
]
```

### Events

#### Get User Events
Obtiene eventos del usuario (actividad reciente).

```
GET /gitlab/user/events?page=1&per_page=20
```

**Query Parameters:**
- `page` (default: 1) - Página
- `per_page` (default: 20) - Eventos por página

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "user_id": 123,
      "created_at": "2024-01-15T10:30:00Z",
      "action_name": "opened",
      "resource_type": "Issue",
      "resource_id": 456,
      "target_id": 789,
      "target_type": "Project",
      "author": {
        "id": 123,
        "name": "John Doe"
      },
      "project": {
        "id": 789,
        "name": "My Project"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "total": 150
  }
}
```

---

## Error Responses

Todos los errores devuelven un status code HTTP apropriado:

### 400 Bad Request
```json
{
  "error": "Missing authorization code"
}
```

### 401 Unauthorized
```json
{
  "error": "Not authenticated"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Los endpoints de GitLab respetan los límites de rate limit de la API de GitLab:

- **Requests autenticados**: 600 requests/min
- **Requests sin autenticar**: 300 requests/min

Verifica los headers de respuesta:

```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 599
X-RateLimit-Reset: 1705319400
```

---

## Testing

### Usar cURL

```bash
# Obtener URL de login
curl http://localhost:5000/api/auth/login

# Obtener usuario actual (necesita token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/auth/me

# Listar proyectos
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/gitlab/projects

# Con jq para formato bonito
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/gitlab/projects | jq .
```

### Usar Postman

1. Importar las URLs en Postman
2. Crear variable: `token` = tu token de acceso
3. Usar `{{token}}` en headers: `Authorization: Bearer {{token}}`

---

## Notas

- Todos los timestamps están en formato ISO 8601 (UTC)
- Los IDs son números enteros
- Los "iid" (internal IDs) son únicos por proyecto, los "id" son globales
- La paginación comienza desde página 1
- Para requests POST/PUT/DELETE, implementar en el futuro

---

¿Preguntas? Revisa [SETUP.md](./SETUP.md) para configuración o contacta al equipo.
