# 🔄 Guía de Sincronización GitHub ↔ GitLab

Una guía completa para sincronizar automáticamente issues, merge requests y commits entre GitHub y GitLab.

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Crear Personal Access Tokens](#crear-personal-access-tokens)
3. [Configurar Sincronización](#configurar-sincronización)
4. [Webhooks Automáticos](#webhooks-automáticos)
5. [Sincronización Manual](#sincronización-manual)
6. [Troubleshooting](#troubleshooting)

## Configuración Inicial

### Requisitos

- Acceso a ambas plataformas (GitHub y GitLab)
- Permisos para crear tokens de acceso
- Permisos de administrador en los repositorios

### Paso 1: Obtener IDs de Repositorios

#### GitHub
```bash
# El repo se identifica como: usuario/repositorio
# Ejemplo: 9377868-jcmm/Prueba-Arranca
```

#### GitLab
```bash
# El proyecto se identifica por su ID numérico
# Para obtenerlo:
# 1. Ve al proyecto en GitLab
# 2. Settings → General → Project ID
# Ejemplo: 123456
```

## Crear Personal Access Tokens

### GitHub Personal Access Token

1. Ve a **GitHub Settings** → **Developer settings** → **Personal access tokens**
2. Haz click en **Generate new token (classic)**
3. Dale un nombre: `Prueba-Arranca-Sync`
4. Selecciona estos scopes:
   - ✅ `repo` - Acceso completo a repositorios
   - ✅ `read:repo_hook` - Leer webhooks
   - ✅ `write:repo_hook` - Crear webhooks
   - ✅ `public_repo` - Acceso a repositorios públicos

5. Copia el token (lo necesitarás en el paso siguiente)

**⚠️ IMPORTANTE**: Guarda el token en un lugar seguro. GitHub no lo muestra nuevamente.

### GitLab Personal Access Token

1. Ve a **GitLab** → **Settings** → **Access Tokens**
2. Haz click en **Add new token**
3. Configura:
   - **Name**: `Prueba-Arranca-Sync`
   - **Scopes**:
     - ✅ `api` - Acceso completo a API
     - ✅ `read_api` - Leer datos
     - ✅ `write_repository` - Escribir en repositorio

4. Haz click en **Create personal access token**
5. Copia el token

**⚠️ IMPORTANTE**: Este token también se muestra una sola vez.

## Configurar Sincronización

### Vía Interfaz Web

1. Abre la app en `http://localhost:5173`
2. Inicia sesión con tu cuenta de GitLab
3. Ve a **🔄 Sincronización**
4. En la pestaña **⚙️ Configurar**:
   - **Repositorio GitHub**: `usuario/repositorio`
   - **Proyecto GitLab**: `123456`
   - **Token GitHub**: Pega tu token
   - **Token GitLab**: Pega tu token

5. Haz click en **✅ Configurar Sincronización**

### Vía API

```bash
curl -X POST http://localhost:5000/api/webhooks/setup \
  -H "Content-Type: application/json" \
  -d '{
    "githubRepo": "usuario/repositorio",
    "gitlabProject": 123456,
    "githubToken": "ghp_...",
    "gitlabToken": "glpat-..."
  }'
```

## Webhooks Automáticos

### Configurar Webhook en GitHub

1. Ve a tu repositorio GitHub
2. **Settings** → **Webhooks** → **Add webhook**
3. Configura:
   - **Payload URL**: `https://tu-domain.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: (Opcional, para mayor seguridad)
   - **Events**: Selecciona:
     - ✅ Issues
     - ✅ Pull requests
     - ✅ Pushes
4. Haz click en **Add webhook**

### Configurar Webhook en GitLab

1. Ve a tu proyecto GitLab
2. **Settings** → **Webhooks**
3. Configura:
   - **URL**: `https://tu-domain.com/api/webhooks/gitlab`
   - **Secret token**: (Opcional)
   - **Trigger events**:
     - ✅ Issues events
     - ✅ Merge request events
     - ✅ Push events
4. Haz click en **Add webhook**

### Verificar Webhooks

En la interfaz web, ve a **🔄 Sincronización** → **📊 Estado** para ver las URLs de webhook configuradas.

## Sincronización Manual

### Sincronizar Issues

1. Ve a **🔄 Sincronización** → **🔄 Sincronizar**
2. Haz click en **📋 Sincronizar Issues**
3. Espera a que se complete
4. Los issues de GitHub aparecerán en GitLab

### Sincronizar Merge Requests

1. En la misma sección, haz click en **🔀 Sincronizar MRs**
2. Los PRs de GitHub se crearán como MRs en GitLab

### Comparar Repositorios

Para ver diferencias entre repositorios:

1. Ve a **🔄 Sincronización** → **📊 Estado**
2. Haz click en **📊 Comparar**
3. Verás un resumen lado a lado:
   - Issues en cada plataforma
   - Merge Requests / Pull Requests
   - Diferencias numéricas

## Qué se Sincroniza

### Issues ✅
- Título
- Descripción
- Estado (abierto/cerrado)
- Etiquetas
- Referencias cruzadas

### Merge Requests / Pull Requests ✅
- Título
- Descripción
- Rama origen y destino
- Estado

### Commits ✅
- Información de commits
- Historial

### Limitaciones ⚠️

Lo siguiente **NO** se sincroniza automáticamente:
- Comentarios individuales
- Revisiones de código
- Asignaciones específicas
- Cambios de prioridad

Estos se pueden agregar manualmente en ambas plataformas.

## Flujo de Trabajo Recomendado

### Scenario: Tu equipo usa GitHub

1. **Desarrollo**: Trabaja normalmente en GitHub
2. **Sincronización**: Los issues y PRs se sincronizan automáticamente a GitLab
3. **Visualización**: El equipo puede ver todo en GitLab también

### Scenario: Tu equipo usa ambas plataformas

1. **GitHub** para la mayoría del trabajo
2. **GitLab** como vista centralizada y backup
3. Los webhooks mantienen ambas actualizadas

### Scenario: Migración de GitHub a GitLab

1. Configura la sincronización
2. Haz click en **📋 Sincronizar Issues** y **🔀 Sincronizar MRs**
3. Verifica que todo se copió correctamente
4. Una vez completado, puedes abandonar GitHub si lo deseas

## Troubleshooting

### ❌ "Error: Token inválido"

**Causa**: El token de acceso es incorrecto o ha expirado

**Solución**:
1. Verifica el token en la configuración
2. Si está expirado, crea uno nuevo
3. Reconfigura la sincronización

### ❌ "No se sincroniza nada"

**Posibles causas**:

1. **Webhooks no configurados** - Configúralos según la sección anterior
2. **IDs incorrectos** - Verifica:
   - `githubRepo` está en formato `usuario/repositorio`
   - `gitlabProject` es un número

**Solución**:
```bash
# Testa la conexión a GitHub
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/usuario/repositorio

# Testa la conexión a GitLab
curl -H "Private-Token: YOUR_GITLAB_TOKEN" \
  https://gitlab.com/api/v4/projects/123456
```

### ❌ "CORS error" en la interfaz

**Solución**:
1. Verifica que el servidor está corriendo en puerto 5000
2. Verifica que el cliente está en `http://localhost:5173`
3. Reinicia ambos servicios

### ❌ "Los issues se crearon dos veces"

**Causa**: Los webhooks se activaron y también hiciste sincronización manual

**Solución**:
1. Elimina los duplicados manualmente
2. En el futuro, usa uno u otro:
   - Webhooks para automático
   - Manual para control exacto

### ❌ "Webhook en rojo en GitHub/GitLab"

**Verificar estado**:

En GitHub:
1. Ve al webhook
2. Pestaña **Recent Deliveries**
3. Haz click en un intento
4. Verás el error exacto

En GitLab:
1. Ve al webhook
2. Pestaña **Recent events**
3. Haz click en el evento
4. Verás detalles de la respuesta

**Posibles soluciones**:
- URL incorrecta
- Servidor no está corriendo
- Tokens expirados
- Firewall bloqueando

## Monitoreo

### Ver logs del servidor

```bash
# En el servidor
npm run dev:server

# Verás logs como:
# 📨 GitHub webhook: issues
# ✅ Issue creado en GitLab: "Fix login bug"
```

### Ver actividad de webhooks

Ambas plataformas guardan el historial de entregas de webhooks:

**GitHub**: Settings → Webhooks → Selecciona webhook → Recent Deliveries

**GitLab**: Settings → Webhooks → Selecciona webhook → Recent events

## Mejores Prácticas

1. **Usa tokens específicos** - Crea tokens solo para sincronización
2. **Limita permisos** - Solo selecciona los scopes necesarios
3. **Monitorea regularmente** - Revisa que la sincronización funciona
4. **Backup de tokens** - Guarda en un gestor de contraseñas seguro
5. **Documenta tu setup** - Anota qué se sincroniza dónde

## Casos de Uso

### 📊 Dashboard Centralizado
Tu equipo trabaja en GitHub pero quiere una vista centralizada:
1. Configura la sincronización
2. Todos pueden ver issues/PRs en GitLab
3. Reporting desde GitLab

### 🔀 Código en GitHub, Gestión en GitLab
- Desarrollo en GitHub (PRs, commits)
- Gestión de proyectos en GitLab (issues, épicas)
- Ambas plataformas sincronizadas

### 🚀 Migración Gradual
Migrando de GitHub a GitLab:
1. Sincroniza todo el historial
2. Trabaja en ambas durante el período de transición
3. Mantén sincronización en tiempo real
4. Cuando esté listo, cambia completamente a GitLab

### 👥 Equipos Distribuidos
Diferentes equipos usan diferentes plataformas:
1. Frontend team: GitHub
2. Backend team: GitLab
3. Sincronización automática para coordinación

## Soporte

Si encuentras problemas:
1. Revisa esta documentación
2. Consulta [SETUP.md](./SETUP.md)
3. Revisa [API.md](./API.md)
4. Crea un issue en GitHub o GitLab

---

¡Ahora tu equipo puede trabajar sin importar cuál plataforma usen! 🎉
