# Sport Card

Plataforma para gestionar eventos deportivos cooperativos.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS 10 · TypeORM · Passport |
| Frontend | Angular 19 · Tailwind CSS v3 · Google Material Symbols |
| Base de datos | PostgreSQL 16 |
| Auth | Google OAuth 2.0 + JWT |
| Infraestructura | Docker + Docker Compose |

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) >= 24
- [Node.js](https://nodejs.org/) >= 20 _(solo para desarrollo sin Docker)_
- Cuenta de Google Cloud con un proyecto creado

---

## Levantar en local

### 1. Clonar y configurar variables de entorno

```bash
git clone <url-del-repo>
cd sportcard
cp .env.example .env
```

Edita `.env` y completa los valores reales. Las únicas variables **obligatorias** para que arranque son:

```env
JWT_SECRET=cualquier-cadena-larga-y-secreta
```

Las variables de Google OAuth son opcionales si usas el **Dev Auth** (ver más abajo).

---

### 2. Opción A — Docker (recomendado)

Levanta los tres servicios (PostgreSQL, backend, frontend) con un solo comando:

```bash
docker compose up --build
```

La primera vez descarga las imágenes e instala dependencias (~2-3 min). Las siguientes veces arranca en segundos.

| Servicio | URL |
|---|---|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |
| PostgreSQL | `localhost:5432` · base de datos `sportcard` |

Para detener:
```bash
docker compose down
```

Para detener y borrar los datos de la base de datos:
```bash
docker compose down -v
```

---

### 2. Opción B — Sin Docker (procesos separados)

Requiere tener PostgreSQL corriendo localmente con los datos del `.env`.

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run start:dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm start
```

---

### 3. Dev Auth — entrar sin Google OAuth

Para desarrollo local existe un feature flag que habilita un login con usuario y clave preconfigurada en `.env`, sin necesidad de configurar Google Cloud.

Está activo por defecto. Verifica que `.env` tenga:

```env
DEV_AUTH_ENABLED=true
DEV_AUTH_EMAIL=dev@sportcard.dev
DEV_AUTH_PASSWORD=dev1234
DEV_AUTH_NAME=Dev User
```

En la pantalla de login aparece un formulario debajo del botón de Google:

```
email:    dev@sportcard.dev
password: dev1234
```

> El formulario solo aparece cuando `DEV_AUTH_ENABLED=true` y el build es de desarrollo.
> En producción (`NODE_ENV=production`) el endpoint retorna 403 aunque la variable esté activa.

---

### 4. Configurar Google OAuth (opcional en local)

Solo necesario si quieres probar el flujo real de Google.

1. Ve a [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Crea un **OAuth 2.0 Client ID** de tipo _Web application_
3. Agrega en **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
4. Copia el Client ID y Client Secret en `.env`:
   ```env
   GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
   ```
5. Reinicia el backend:
   ```bash
   # con Docker
   docker compose restart backend

   # sin Docker: Ctrl+C y volver a correr npm run start:dev
   ```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_HOST` | Sí | Host de PostgreSQL (`postgres` en Docker, `localhost` sin Docker) |
| `DATABASE_PORT` | Sí | Puerto de PostgreSQL (default `5432`) |
| `DATABASE_USER` | Sí | Usuario de la base de datos |
| `DATABASE_PASSWORD` | Sí | Contraseña de la base de datos |
| `DATABASE_NAME` | Sí | Nombre de la base de datos |
| `JWT_SECRET` | Sí | Clave secreta para firmar tokens JWT (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | No | Duración del token (default `7d`) |
| `GOOGLE_CLIENT_ID` | No* | Client ID de Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No* | Client Secret de Google OAuth |
| `GOOGLE_CALLBACK_URL` | No* | URL de callback de Google OAuth |
| `FRONTEND_URL` | Sí | URL del frontend para redirecciones (default `http://localhost:4200`) |
| `PORT` | No | Puerto del backend (default `3000`) |
| `NODE_ENV` | No | Entorno (`development` / `production`) |
| `DEV_AUTH_ENABLED` | No | Activa el login con usuario/clave (`true` / `false`) |
| `DEV_AUTH_EMAIL` | No* | Email del usuario de desarrollo |
| `DEV_AUTH_PASSWORD` | No* | Contraseña del usuario de desarrollo |
| `DEV_AUTH_NAME` | No | Nombre visible del usuario de desarrollo |

_(*) Requerida si la funcionalidad correspondiente está activa._

---

## Estructura del proyecto

```
sportcard/
├── .env                     ← variables de entorno (no comitear)
├── .env.example             ← plantilla de variables
├── docker-compose.yml       ← orquestación local
├── backend/                 ← NestJS API
│   ├── src/
│   │   ├── auth/            ← Google OAuth, JWT, Dev Auth
│   │   │   ├── dto/         ← DevLoginDto
│   │   │   ├── guards/      ← GoogleAuthGuard, JwtAuthGuard
│   │   │   └── strategies/  ← google.strategy, jwt.strategy
│   │   ├── users/           ← entidad User, UsersService
│   │   ├── app.module.ts    ← ConfigModule + TypeORM
│   │   └── main.ts
│   └── Dockerfile
└── frontend/                ← Angular 19
    ├── src/
    │   ├── app/
    │   │   ├── core/
    │   │   │   ├── guards/       ← authGuard (protege rutas)
    │   │   │   ├── interceptors/ ← authInterceptor (adjunta JWT)
    │   │   │   └── services/     ← AuthService (signals)
    │   │   └── pages/
    │   │       ├── login/        ← Google OAuth + Dev Auth form
    │   │       ├── auth-callback/← procesa ?token= de la URL
    │   │       └── dashboard/    ← ruta protegida
    │   ├── environments/         ← environment.ts / environment.production.ts
    │   └── styles.scss           ← Tailwind base
    ├── tailwind.config.js
    ├── proxy.conf.json      ← proxea /api → backend en desarrollo
    └── Dockerfile
```

---

## Flujo de autenticación

```
[Login page]
    │
    ├── Dev Auth ──► POST /api/auth/dev-login ──► JWT ──► /auth/callback?token=
    │
    └── Google ────► GET /api/auth/google ──► Google ──► /api/auth/google/callback ──► JWT ──► /auth/callback?token=

[/auth/callback]
    └── guarda token en localStorage ──► GET /api/auth/me ──► /dashboard
```

---

## Comandos útiles

```bash
# Ver logs de un servicio
docker compose logs -f backend
docker compose logs -f frontend

# Reconstruir solo un servicio tras cambios en Dockerfile o package.json
docker compose up --build backend

# Conectarse a la base de datos
docker compose exec postgres psql -U sportcard -d sportcard

# Ejecutar comando en el backend
docker compose exec backend npm run start:debug
```
