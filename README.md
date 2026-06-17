# Sport Card

Plataforma para gestionar eventos deportivos cooperativos.

El monorepo contiene dos aplicaciones Angular independientes:

| App | Puerto | Descripción |
|---|---|---|
| `frontend/` | 4200 | App principal — jugadores y participantes |
| `frontend-torneos/` | 4201 | Portal de gestión — coaches y organizadores |

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS 10 · TypeORM · Passport |
| Frontend (app principal) | Angular 19 · Tailwind CSS v3 · Google Material Symbols |
| Frontend (portal torneos) | Angular 19 · Tailwind CSS v3 · Google Material Symbols |
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

Levanta todos los servicios (PostgreSQL, backend, `frontend`, `frontend-torneos`) con un solo comando:

```bash
docker compose up --build
```

La primera vez descarga las imágenes e instala dependencias (~2-3 min). Las siguientes veces arranca en segundos.

| Servicio | URL |
|---|---|
| Frontend (app principal) | http://localhost:4200 |
| Portal de torneos | http://localhost:4201 |
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

**Terminal 2 — Frontend (app principal):**
```bash
cd frontend
npm install
npm start
```

**Terminal 3 — Portal de torneos (opcional):**
```bash
cd frontend-torneos
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

## Portal de Torneos (`frontend-torneos/`)

Aplicación Angular 19 independiente orientada a **coaches y organizadores**. Funciona con el mismo backend y base de datos. Se sirve en el puerto **4201**.

### Levantar en local

**Con Docker (recomendado)** — el portal ya está incluido en `docker-compose.yml`:

```bash
docker compose up --build
# → http://localhost:4201
```

**Sin Docker** — instala dependencias y arranca el servidor de desarrollo:

```bash
cd frontend-torneos
npm install
npm start
# → http://localhost:4201
```

El servidor de desarrollo proxea `/api` al backend en `http://localhost:3000` (configurado en `proxy.conf.json`).

### URLs en local

| Servicio | URL |
|---|---|
| App principal (jugadores) | http://localhost:4200 |
| Portal de torneos (coaches) | http://localhost:4201 |
| Backend API | http://localhost:3000/api |

### Autenticación

Usa el mismo flujo JWT que la app principal. El Dev Auth está disponible con las mismas credenciales (`dev@sportcard.dev` / `dev1234`).

Después de login, `frontend-torneos` redirige siempre a `/dashboard` (no tiene paso de onboarding).

### Páginas disponibles

| Ruta | Descripción |
|---|---|
| `/login` | Login con Google o Dev Auth |
| `/dashboard` | Resumen: equipos y torneos activos |
| `/teams` | Lista de equipos (como coach o jugador) |
| `/teams/new` | Crear equipo |
| `/teams/:id` | Detalle: nómina de jugadores, buscar y agregar miembros |
| `/tournaments` | Lista de torneos (organizados o participando) |
| `/tournaments/new` | Crear torneo (formato, deporte, fechas, aprobación) |
| `/tournaments/:id` | Detalle con 4 pestañas: Equipos · Fixture · Bracket/Tabla · Resultados |
| `/tournaments/t/:shareToken` | Vista pública del torneo (sin login) |

### Pestaña Fixture — generación y programación

1. El torneo debe tener al menos **2 equipos aprobados**.
2. El organizador presiona **Generar fixture** en la pestaña Fixture.
3. Por cada partido se puede presionar **Programar** para asignar fecha/hora y lugar.
4. Al registrar resultados en la pestaña Resultados, la tabla de posiciones o el bracket se actualizan automáticamente.

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
├── docker-compose.yml       ← orquestación local (backend + frontend + postgres)
├── backend/                 ← NestJS API
│   ├── src/
│   │   ├── auth/            ← Google OAuth, JWT, Dev Auth
│   │   ├── users/           ← entidad User, UsersService
│   │   ├── events/          ← eventos deportivos y participantes
│   │   ├── teams/           ← equipos y nómina de jugadores
│   │   ├── tournaments/     ← torneos, inscripciones, fixture
│   │   ├── fixtures/        ← generación de partidos y resultados
│   │   ├── notifications/   ← notificaciones (broadcast, event, team, match)
│   │   ├── migrations/      ← migraciones TypeORM con timestamp
│   │   ├── app.module.ts    ← ConfigModule + TypeORM
│   │   └── main.ts
│   └── Dockerfile
├── frontend/                ← Angular 19 · app principal (puerto 4200)
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/       ← authGuard, adminGuard
│   │   │   │   ├── interceptors/ ← authInterceptor (adjunta JWT)
│   │   │   │   └── services/     ← AuthService, EventsService, NotificationsService
│   │   │   ├── pages/
│   │   │   │   ├── events/       ← feed, detalle, crear, vista pública
│   │   │   │   ├── teams/        ← perfil público de equipo
│   │   │   │   ├── tournaments/  ← vista pública de torneo
│   │   │   │   ├── notifications/← bandeja con acciones por tipo
│   │   │   │   └── onboarding/   ← wizard 4 pasos
│   │   │   └── shared/           ← bottom-nav, header
│   │   └── environments/
│   ├── proxy.conf.json      ← proxea /api → backend en desarrollo
│   └── Dockerfile
└── frontend-torneos/        ← Angular 19 · portal coaches/organizadores (puerto 4201)
    ├── src/
    │   ├── app/
    │   │   ├── core/
    │   │   │   ├── guards/       ← authGuard
    │   │   │   ├── interceptors/ ← authInterceptor
    │   │   │   └── services/     ← AuthService, TeamsService,
    │   │   │                        TournamentsService, FixturesService
    │   │   ├── pages/
    │   │   │   ├── dashboard/    ← resumen equipos y torneos activos
    │   │   │   ├── teams/        ← lista · crear · detalle (nómina + buscar jugadores)
    │   │   │   └── tournaments/  ← lista · crear · detalle (4 tabs) · pública (shareToken)
    │   │   └── shared/
    │   │       ├── sidebar/      ← sidebar colapsable 240 px / 64 px
    │   │       └── layout/       ← layout con overlay móvil
    │   └── environments/
    └── proxy.conf.json      ← proxea /api → backend en desarrollo
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
