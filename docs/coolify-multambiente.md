# Sport Card — Despliegue multi-ambiente en Coolify

Dos ambientes independientes sobre el mismo VPS y el mismo repositorio GitHub.

| Ambiente | Rama | Dominio ejemplo |
|---|---|---|
| Producción | `main` | `app.tudominio.com` / `api.tudominio.com` |
| Desarrollo | `dev` | `app-dev.tudominio.com` / `api-dev.tudominio.com` |

---

## Arquitectura final

```
GitHub (repo sportcard)
    ├── rama: main  ──►  Coolify PROJECT: sportcard-prod
    │                        ├── sportcard-prod-backend   (api.tudominio.com)
    │                        ├── sportcard-prod-frontend  (app.tudominio.com)
    │                        └── sportcard-prod-db        (red interna)
    │
    └── rama: dev   ──►  Coolify PROJECT: sportcard-dev
                             ├── sportcard-dev-backend    (api-dev.tudominio.com)
                             ├── sportcard-dev-frontend   (app-dev.tudominio.com)
                             └── sportcard-dev-db         (red interna)
```

Cada proyecto tiene su propia red Docker interna, su propia base de datos y sus propias variables de entorno. Los despliegues son completamente independientes.

---

## Parte 1 — Preparar el repositorio

### 1.1 Crear la rama `dev`

```bash
git checkout -b dev
git push -u origin dev
```

### 1.2 Configurar protección de ramas en GitHub

Ve a **Settings → Branches → Add branch ruleset** y configura:

**Rama `main`**
- Require pull request before merging: ✅
- Required approvals: 1
- Require status checks to pass: ✅ (cuando tengas CI)
- Do not allow direct pushes: ✅

**Rama `dev`**
- Require pull request before merging: opcional en esta etapa
- Permite push directo para desarrollo ágil

### 1.3 Flujo de trabajo entre ramas

```
feature/xxx  ──►  dev  ──►  main
   (local)       (staging)  (producción)
```

---

## Parte 2 — Crear los proyectos en Coolify

Coolify permite agrupar servicios en **Proyectos**. Cada proyecto tiene su propio namespace de red.

### 2.1 Crear proyecto de producción

1. Panel lateral → **Projects → New Project**
2. Nombre: `sportcard-prod`
3. Descripción: `Sport Card — Producción (rama main)`
4. **Save**

### 2.2 Crear proyecto de desarrollo

1. **Projects → New Project**
2. Nombre: `sportcard-dev`
3. Descripción: `Sport Card — Desarrollo (rama dev)`
4. **Save**

---

## Parte 3 — Configurar ambiente de DESARROLLO (rama `dev`)

Empieza por dev. Es más seguro equivocarse aquí.

### 3.1 Base de datos — Dev

Dentro del proyecto `sportcard-dev`:

1. **New Resource → PostgreSQL**
2. Configura:

   | Campo | Valor |
   |---|---|
   | Name | `sportcard-dev-db` |
   | Version | `16` |
   | DB Name | `sportcard_dev` |
   | User | `sportcard_dev` |
   | Password | *(genera con el botón)* |

3. **Save → Start**
4. Una vez iniciada, copia la **Internal Database URL** — la necesitarás en el paso 3.3.

   Formato: `postgresql://sportcard_dev:PASSWORD@sportcard-dev-db:5432/sportcard_dev`

### 3.2 Backend — Dev

Dentro del proyecto `sportcard-dev`:

1. **New Resource → Application**
2. Fuente: tu repositorio GitHub `sportcard`
3. Configura:

   | Campo | Valor |
   |---|---|
   | Name | `sportcard-dev-backend` |
   | Build Pack | `Dockerfile` |
   | Base Directory | `/backend` |
   | Dockerfile Location | `/backend/Dockerfile` |
   | **Watch Branch** | `dev` |
   | Dockerfile Target | `production` |
   | Port | `3000` |

4. En **Domains**:
   ```
   api-dev.tudominio.com
   ```

5. En **Environment Variables**:

   ```
   DATABASE_HOST        = sportcard-dev-db
   DATABASE_PORT        = 5432
   DATABASE_USER        = sportcard_dev
   DATABASE_PASSWORD    = <password generado en 3.1>
   DATABASE_NAME        = sportcard_dev
   GOOGLE_CLIENT_ID     = <tu client id>
   GOOGLE_CLIENT_SECRET = <tu client secret>
   GOOGLE_CALLBACK_URL  = https://api-dev.tudominio.com/api/auth/google/callback
   JWT_SECRET           = <secreto dev — diferente al de prod>
   JWT_EXPIRES_IN       = 7d
   PORT                 = 3000
   FRONTEND_URL         = https://app-dev.tudominio.com
   NODE_ENV             = development
   DEV_AUTH_ENABLED     = true
   DEV_AUTH_EMAIL       = dev@sportcard.dev
   DEV_AUTH_PASSWORD    = <contraseña dev>
   DEV_AUTH_NAME        = Dev User
   ```

6. **Save → Deploy**

### 3.3 Frontend — Dev

Dentro del proyecto `sportcard-dev`:

1. **New Resource → Application**
2. Mismo repositorio `sportcard`
3. Configura:

   | Campo | Valor |
   |---|---|
   | Name | `sportcard-dev-frontend` |
   | Build Pack | `Dockerfile` |
   | Base Directory | `/frontend` |
   | Dockerfile Location | `/frontend/Dockerfile` |
   | **Watch Branch** | `dev` |
   | Dockerfile Target | `production` |
   | Port | `80` |

4. En **Domains**:
   ```
   app-dev.tudominio.com
   ```

5. En **Environment Variables**:

   ```
   API_URL = https://api-dev.tudominio.com
   ```

6. **Save → Deploy**

---

## Parte 4 — Configurar ambiente de PRODUCCIÓN (rama `main`)

Mismo proceso, distintos valores.

### 4.1 Base de datos — Prod

Dentro del proyecto `sportcard-prod`:

1. **New Resource → PostgreSQL**
2. Configura:

   | Campo | Valor |
   |---|---|
   | Name | `sportcard-prod-db` |
   | Version | `16` |
   | DB Name | `sportcard` |
   | User | `sportcard` |
   | Password | *(genera uno diferente al de dev)* |

3. **Save → Start**
4. Copia la **Internal Database URL**:

   `postgresql://sportcard:PASSWORD@sportcard-prod-db:5432/sportcard`

### 4.2 Backend — Prod

Dentro del proyecto `sportcard-prod`:

1. **New Resource → Application**
2. Mismo repositorio `sportcard`
3. Configura:

   | Campo | Valor |
   |---|---|
   | Name | `sportcard-prod-backend` |
   | Build Pack | `Dockerfile` |
   | Base Directory | `/backend` |
   | Dockerfile Location | `/backend/Dockerfile` |
   | **Watch Branch** | `main` |
   | Dockerfile Target | `production` |
   | Port | `3000` |

4. En **Domains**:
   ```
   api.tudominio.com
   ```

5. En **Environment Variables**:

   ```
   DATABASE_HOST        = sportcard-prod-db
   DATABASE_PORT        = 5432
   DATABASE_USER        = sportcard
   DATABASE_PASSWORD    = <password generado en 4.1>
   DATABASE_NAME        = sportcard
   GOOGLE_CLIENT_ID     = <tu client id>
   GOOGLE_CLIENT_SECRET = <tu client secret>
   GOOGLE_CALLBACK_URL  = https://api.tudominio.com/api/auth/google/callback
   JWT_SECRET           = <secreto prod — diferente al de dev>
   JWT_EXPIRES_IN       = 7d
   PORT                 = 3000
   FRONTEND_URL         = https://app.tudominio.com
   NODE_ENV             = production
   DEV_AUTH_ENABLED     = false
   ```

   > `DEV_AUTH_ENABLED=false` desactiva el login de desarrollo en producción.

6. **Save → Deploy**

### 4.3 Frontend — Prod

Dentro del proyecto `sportcard-prod`:

1. **New Resource → Application**
2. Mismo repositorio `sportcard`
3. Configura:

   | Campo | Valor |
   |---|---|
   | Name | `sportcard-prod-frontend` |
   | Build Pack | `Dockerfile` |
   | Base Directory | `/frontend` |
   | Dockerfile Location | `/frontend/Dockerfile` |
   | **Watch Branch** | `main` |
   | Dockerfile Target | `production` |
   | Port | `80` |

4. En **Domains**:
   ```
   app.tudominio.com
   ```

5. En **Environment Variables**:

   ```
   API_URL = https://api.tudominio.com
   ```

6. **Save → Deploy**

---

## Parte 5 — DNS

Crea cuatro registros tipo **A** en tu proveedor de dominio, todos apuntando a la misma IP del VPS:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `api` | `TU_VPS_IP` |
| A | `app` | `TU_VPS_IP` |
| A | `api-dev` | `TU_VPS_IP` |
| A | `app-dev` | `TU_VPS_IP` |

Coolify/Traefik distingue los servicios por el header `Host` y emite un certificado SSL individual para cada dominio.

> La propagación DNS puede tardar hasta 24h. Puedes verificar con:
> ```bash
> dig api.tudominio.com
> dig api-dev.tudominio.com
> ```

---

## Parte 6 — Despliegue automático (webhooks)

### 6.1 Activar auto-deploy en cada aplicación

Para cada uno de los 4 servicios (backend-dev, frontend-dev, backend-prod, frontend-prod):

1. Abre el servicio en Coolify
2. Ve a **Settings → Deployments**
3. Activa **Auto Deploy on Push → ON**
4. Copia el **Webhook URL** generado

### 6.2 Registrar los webhooks en GitHub

En tu repositorio GitHub → **Settings → Webhooks → Add webhook**:

Repite para cada uno de los 4 webhooks:

| Campo | Valor |
|---|---|
| Payload URL | El webhook URL copiado de Coolify |
| Content type | `application/json` |
| SSL verification | Enable |
| Events | Just the push event |

> Coolify solo despliega cuando el push coincide con la rama configurada en **Watch Branch**. Los 4 webhooks pueden registrarse en el mismo repositorio — cada uno filtra por su propia rama.

---

## Parte 7 — Verificar los despliegues

### Ambiente dev
```bash
curl https://api-dev.tudominio.com/api/health
# → {"status":"ok"}

curl https://api-dev.tudominio.com/api
# → {"status":"ok","service":"Sport Card API","environment":"development",...}
```
Abre `https://app-dev.tudominio.com` → debe mostrar el formulario de Dev Auth.

### Ambiente prod
```bash
curl https://api.tudominio.com/api/health
# → {"status":"ok"}

curl https://api.tudominio.com/api
# → {"status":"ok","service":"Sport Card API","environment":"production",...}
```
Abre `https://app.tudominio.com` → solo debe mostrar el botón de Google (sin formulario de dev).

---

## Parte 8 — Flujo de trabajo diario

```
1. Desarrollas en rama feature/xxx (local con Docker)
         │
         ▼
2. Pull Request → dev
         │
         ▼
3. Merge → rama dev
         │
         ▼
4. Coolify detecta push en dev
   → build sportcard-dev-backend
   → build sportcard-dev-frontend
         │
         ▼
5. Pruebas en https://app-dev.tudominio.com
         │
         ▼
6. Pull Request → main (con review)
         │
         ▼
7. Merge → rama main
         │
         ▼
8. Coolify detecta push en main
   → build sportcard-prod-backend
   → build sportcard-prod-frontend
         │
         ▼
9. https://app.tudominio.com actualizado
```

---

## Resumen rápido

| Recurso | Proyecto Coolify | Rama | Dominio |
|---|---|---|---|
| sportcard-dev-db | sportcard-dev | — | red interna |
| sportcard-dev-backend | sportcard-dev | `dev` | api-dev.tudominio.com |
| sportcard-dev-frontend | sportcard-dev | `dev` | app-dev.tudominio.com |
| sportcard-prod-db | sportcard-prod | — | red interna |
| sportcard-prod-backend | sportcard-prod | `main` | api.tudominio.com |
| sportcard-prod-frontend | sportcard-prod | `main` | app.tudominio.com |

**Variables que SÍ deben diferir entre ambientes:**

- `NODE_ENV` — `development` vs `production`
- `DEV_AUTH_ENABLED` — `true` vs `false`
- `DATABASE_*` — bases de datos separadas
- `JWT_SECRET` — secretos distintos
- `FRONTEND_URL` / `GOOGLE_CALLBACK_URL` / `API_URL` — dominios distintos
