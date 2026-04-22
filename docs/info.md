# SportCard — Documentación v1.0.0

> Plataforma mobile-first para organizar y unirse a eventos deportivos.

---

## Índice

1. [Estado del proyecto](#estado-del-proyecto)
2. [Stack tecnológico](#stack-tecnológico)
3. [Levantar el proyecto](#levantar-el-proyecto)
4. [Arquitectura](#arquitectura)
5. [Base de datos](#base-de-datos)
6. [API — Endpoints disponibles](#api--endpoints-disponibles)
7. [Rutas del frontend](#rutas-del-frontend)
8. [Casos de uso implementados](#casos-de-uso-implementados)
9. [Autenticación](#autenticación)
10. [Convenciones de código](#convenciones-de-código)

---

## Estado del proyecto

**Versión**: 1.0.0  
**Rama principal**: `main` · **Rama de desarrollo**: `dev`  
**Tag**: `v1.0.0`

La versión 1.0.0 incluye el ciclo completo de vida de un evento deportivo: creación, inscripción, gestión de participantes, invitaciones (por link y por notificación), módulo de contactos y panel de administración.

---

## Stack tecnológico

| Capa       | Tecnología                                      |
|------------|-------------------------------------------------|
| Backend    | NestJS 10 · TypeORM · PostgreSQL 16             |
| Frontend   | Angular 19 · Tailwind CSS · Material Symbols    |
| Auth       | Google OAuth 2.0 · JWT (passport-jwt)           |
| Infra      | Docker Compose (backend + frontend + postgres)  |

---

## Levantar el proyecto

```bash
# Primera vez o tras cambios en Dockerfile/package.json
docker compose up --build

# Ejecuciones siguientes
docker compose up

# Detener y borrar volumen de base de datos
docker compose down -v
```

| Servicio   | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:4200      |
| Backend    | http://localhost:3000/api  |
| PostgreSQL | localhost:5432 · `sportcard` |

### Sin Docker

```bash
cd backend  && npm run start:dev
cd frontend && npm start
```

### Dev login (sin Google OAuth)

Con `DEV_AUTH_ENABLED=true` en `.env`, aparece un formulario de login en la pantalla de inicio.  
Credenciales por defecto: `dev@sportcard.dev` / `dev1234`

### Migraciones

Se ejecutan automáticamente al iniciar el backend (`migrationsRun: true`). Para gestión manual:

```bash
cd backend
npm run migration:generate -- src/migrations/NombreDescriptivo
npm run migration:run
npm run migration:revert
npm run migration:show
```

---

## Arquitectura

### Backend — NestJS

```
backend/src/
├── app.module.ts              ← Registro de módulos y TypeORM config
├── data-source.ts             ← DataSource standalone para el CLI de TypeORM
├── migrations/                ← 9 migraciones aplicadas
├── auth/                      ← Google OAuth + JWT + dev-login
├── users/                     ← Entidad User, onboarding
├── events/
│   ├── entities/
│   │   ├── event.entity.ts
│   │   └── event-participant.entity.ts
│   ├── events.controller.ts        ← CRUD de eventos autenticado
│   ├── event-public.controller.ts  ← GET /events/token/:shareToken (público)
│   ├── participants.controller.ts  ← join/leave/invite/list/updateStatus
│   ├── events.service.ts
│   └── participants.service.ts
├── notifications/             ← Entidad Notification, mis notificaciones
├── contacts/                  ← Entidad Contact, búsqueda y gestión de contactos
└── admin/                     ← Panel admin (requiere role=admin)
```

### Frontend — Angular 19

```
frontend/src/app/
├── app.config.ts              ← provideRouter, provideHttpClient + authInterceptor
├── app.routes.ts              ← Rutas lazy-loaded; authGuard en todas salvo /login, /auth/callback, /e/:token
├── core/
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── events.service.ts
│   │   ├── notifications.service.ts
│   │   └── contacts.service.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── admin.guard.ts
│   └── interceptors/auth.interceptor.ts   ← Adjunta Bearer token a todas las peticiones
├── pages/
│   ├── login/
│   ├── auth-callback/
│   ├── dashboard/
│   ├── onboarding/
│   ├── profile/
│   ├── notifications/
│   ├── contacts/
│   ├── events/
│   │   ├── list/
│   │   ├── create/
│   │   ├── detail/
│   │   └── invite/           ← Página pública /e/:token
│   └── admin/
└── shared/
    ├── bottom-nav/
    └── header/
```

**Estado reactivo**: Angular signals (`signal()`, `computed()`). Sin NgRx ni BehaviorSubject.

---

## Base de datos

### Tabla `users`

| Columna             | Tipo            | Notas                                    |
|---------------------|-----------------|------------------------------------------|
| id                  | uuid PK         |                                          |
| string_id           | varchar(6) UNIQUE | ID corto alfanumérico (1-9 + A-Z)      |
| google_id           | varchar UNIQUE  |                                          |
| email               | varchar UNIQUE  |                                          |
| name                | varchar         |                                          |
| avatar              | varchar NULL    | URL de foto de perfil                    |
| onboarding_step     | int default 1   | 1–4; ≥4 = onboarding completo           |
| role                | enum            | `user` · `admin`                         |
| status              | enum            | `active` · `blocked`                     |
| phone               | varchar NULL    | Paso 1                                   |
| birth_date          | date NULL       | Paso 1                                   |
| gender              | varchar NULL    | Paso 1                                   |
| city                | varchar NULL    | Paso 1                                   |
| sports              | text[] default {}| Paso 1 — lista de deportes              |
| blood_type          | varchar NULL    | Paso 2                                   |
| allergies           | varchar NULL    | Paso 2                                   |
| medical_conditions  | varchar NULL    | Paso 2                                   |
| medications         | varchar NULL    | Paso 2                                   |
| emergency_name      | varchar NULL    | Paso 3                                   |
| emergency_phone     | varchar NULL    | Paso 3                                   |
| emergency_relation  | varchar NULL    | Paso 3                                   |
| created_at          | timestamp       |                                          |
| updated_at          | timestamp       |                                          |

### Tabla `events`

| Columna            | Tipo       | Notas                                                 |
|--------------------|------------|-------------------------------------------------------|
| id                 | uuid PK    |                                                       |
| sport              | varchar    | Ej: `Fútbol`, `Tenis`, `Running`                      |
| type               | varchar    | `friendly` · `training` · `tournament` · `trekking` · `running` · `other` |
| title              | varchar    |                                                       |
| description        | text NULL  |                                                       |
| location_name      | varchar    |                                                       |
| start_datetime     | timestamp  |                                                       |
| end_datetime       | timestamp NULL | Al pasar esta fecha, el evento pasa a `finished` |
| max_participants   | int NULL   | NULL = sin límite                                     |
| is_public          | bool       | default true                                          |
| requires_approval  | bool       | default false                                         |
| closing_notes      | text NULL  | Notas del organizador al cerrar                       |
| results            | text NULL  | Resultado final del evento                            |
| share_token        | uuid UNIQUE | Generado automáticamente por PostgreSQL              |
| status             | enum       | `draft` · `open` · `closed` · `cancelled` · `finished` |
| organizer_id       | uuid FK→users |                                                    |
| created_at         | timestamp  |                                                       |
| updated_at         | timestamp  |                                                       |

### Tabla `event_participants`

| Columna    | Tipo    | Notas                                                    |
|------------|---------|----------------------------------------------------------|
| id         | uuid PK |                                                          |
| event_id   | uuid FK→events CASCADE |                                           |
| user_id    | uuid FK→users CASCADE  |                                           |
| status     | enum    | `approved` · `pending` · `waiting` · `rejected`          |
| message    | text NULL | Mensaje del participante al solicitar inscripción      |
| created_at | timestamp |                                                        |
| updated_at | timestamp |                                                        |

**Constraint**: `UNIQUE(event_id, user_id)`

### Tabla `notifications`

| Columna    | Tipo      | Notas                                                       |
|------------|-----------|-------------------------------------------------------------|
| id         | uuid PK   |                                                             |
| user_id    | uuid NULL FK→users | NULL = broadcast a todos                         |
| event_id   | uuid NULL FK→events |                                                  |
| title      | varchar   |                                                             |
| body       | text      |                                                             |
| type       | enum      | `broadcast` · `event` · `system` · `invitation`             |
| read_at    | timestamp NULL |                                                        |
| created_at | timestamp |                                                             |
| updated_at | timestamp |                                                             |

### Tabla `contact`

| Columna    | Tipo      | Notas                                          |
|------------|-----------|------------------------------------------------|
| id         | uuid PK   |                                                |
| user_id    | uuid FK→users CASCADE | El usuario que guarda el contacto  |
| contact_id | uuid FK→users CASCADE | El usuario guardado como contacto  |
| created_at | timestamp |                                                |

**Constraint**: `UNIQUE(user_id, contact_id)`

### Migraciones aplicadas (en orden)

| Archivo | Descripción |
|---------|-------------|
| `1745020800000-AddStringIdToUser` | Agrega columna `string_id` a usuarios |
| `1745193600000-AddOnboardingFields` | Campos de onboarding (salud, emergencia, deportes) |
| `1776816000000-CreateEventsTable` | Tabla `events` |
| `1776816100000-CreateEventParticipantsTable` | Tabla `event_participants` |
| `1776900000000-AddRoleAndStatusToUser` | Enums `role` y `status` en usuarios |
| `1776900100000-CreateNotificationsTable` | Tabla `notifications` |
| `1776900200000-AddInvitationNotificationType` | Valor `invitation` al enum de tipo de notificación |
| `1776900300000-AddEventClosingFields` | Columnas `closing_notes`, `results`, `end_datetime` |
| `1776900400000-CreateContactTable` | Tabla `contact` |

---

## API — Endpoints disponibles

> Base URL: `http://localhost:3000/api`  
> Todos los endpoints salvo los marcados con 🌐 requieren header `Authorization: Bearer <JWT>`

### Auth — `/auth`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/auth/google` | Inicia flujo OAuth con Google |
| GET | `/auth/google/callback` | Callback de Google; redirige a `/auth/callback?token=JWT` |
| GET | `/auth/me` | Retorna el usuario autenticado (sin `googleId`) |
| GET | `/auth/logout` | Limpia sesión (frontend borra el token) |
| GET | `/auth/dev-credentials` 🌐 | Retorna credenciales de dev (solo si `DEV_AUTH_ENABLED=true`) |
| POST | `/auth/dev-login` 🌐 | Login con usuario/contraseña de desarrollo |

### Usuarios — `/users`

| Método | Ruta | Descripción |
|--------|------|-------------|
| PATCH | `/users/onboarding` | Actualiza paso de onboarding del usuario autenticado |

### Eventos — `/events`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/events` | Crear evento |
| GET | `/events` | Listar eventos públicos + eventos propios (status `open`) |
| GET | `/events/mine` | Mis eventos (organizador) + eventos donde participo |
| GET | `/events/:id` | Detalle de un evento |
| PATCH | `/events/:id/close` | Cerrar evento con notas y resultado (solo organizador) |
| GET | `/events/token/:shareToken` 🌐 | Vista previa pública por share token (sin auth) |

### Participantes — `/events/:id/...`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/events/:id/join` | Inscribirse al evento |
| DELETE | `/events/:id/join` | Abandonar el evento |
| GET | `/events/:id/participants` | Listar participantes (solo organizador) |
| POST | `/events/:id/invite` | Invitar usuario por ID (6 chars) o correo (solo organizador) |
| PATCH | `/events/:id/participants/:participantId` | Aprobar / rechazar participante (solo organizador) |

**Lógica de inscripción (`join`)**:
- Organizador → `approved` automático
- `requiresApproval = true` → `pending`
- Evento lleno → `waiting`
- En otro caso → `approved`

**Visibilidad de `GET /events`**: retorna eventos `public + open` más eventos propios `open` (privados incluidos si el usuario es organizador).

### Notificaciones — `/notifications`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/notifications/mine` | Mis notificaciones (propias + broadcasts) |
| PATCH | `/notifications/:id/read` | Marcar notificación como leída |

### Contactos — `/contacts`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/contacts/search?q=` | Búsqueda predictiva de usuarios (mín. 2 chars, máx. 15 resultados) |
| GET | `/contacts` | Mis contactos |
| POST | `/contacts/:userId` | Agregar contacto |
| DELETE | `/contacts/:userId` | Eliminar contacto |

La búsqueda aplica `ILIKE` en `name`, `email` y `stringId`. Cada resultado incluye `isContact: boolean`.

### Admin — `/admin` (requiere `role=admin`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/users?page&limit&search` | Listar usuarios con paginación y búsqueda |
| PATCH | `/admin/users/:id/block` | Bloquear usuario |
| PATCH | `/admin/users/:id/activate` | Activar usuario |
| PATCH | `/admin/users/:id/role` | Cambiar rol de usuario |
| POST | `/admin/users/set-admin` | Promover usuario a admin |
| GET | `/admin/events?page&limit&search` | Listar todos los eventos |
| PATCH | `/admin/events/:id/block` | Bloquear evento |
| PATCH | `/admin/events/:id/activate` | Activar evento |
| GET | `/admin/stats` | Estadísticas generales de la plataforma |
| POST | `/admin/notifications/broadcast` | Enviar notificación a todos los usuarios |
| POST | `/admin/notifications/event/:eventId` | Enviar notificación a participantes de un evento |
| GET | `/admin/notifications` | Listar todas las notificaciones |

---

## Rutas del frontend

| Ruta | Componente | Auth |
|------|------------|------|
| `/` | → redirige a `/dashboard` | — |
| `/login` | LoginComponent | No |
| `/auth/callback` | AuthCallbackComponent | No |
| `/dashboard` | DashboardComponent | Sí |
| `/onboarding` | OnboardingComponent | Sí |
| `/profile` | ProfileComponent | Sí |
| `/notifications` | NotificationsComponent | Sí |
| `/events` | EventListComponent | Sí |
| `/events/create` | EventCreateComponent | Sí |
| `/events/:id` | EventDetailComponent | Sí |
| `/contacts` | ContactsComponent | Sí |
| `/admin` | AdminComponent | Sí + admin |
| `/e/:token` | EventInviteComponent | No |
| `**` | → redirige a `/login` | — |

---

## Casos de uso implementados

### Autenticación y perfil

- **Registro / Login con Google** — OAuth 2.0, crea o recupera usuario en la primera sesión
- **Onboarding de 4 pasos** — datos personales, datos de salud, contacto de emergencia, completado. El usuario es redirigido a `/onboarding` si `onboardingStep < 4`
- **Dev login** — acceso con usuario/contraseña para desarrollo local sin configurar OAuth
- **Perfil** — visualización de datos personales y del perfil

### Eventos

- **Crear evento** — título, deporte, tipo, fecha/hora de inicio y fin, ubicación, descripción opcional, cupos máximos, visibilidad (público/privado), aprobación requerida
- **Listar eventos** — feed con filtros por deporte, fecha (hoy/mañana/esta semana) y disponibilidad de cupos; búsqueda textual por nombre, lugar y deporte
- **Detalle del evento** — información completa, estado de inscripción, acciones según rol
- **Inscribirse** — directa, con solicitud pendiente o en lista de espera según configuración del evento
- **Abandonar evento** — el organizador puede ver la gestión; los participantes pueden salir
- **Cierre de evento** — el organizador puede marcar el evento como cerrado con notas y resultado
- **Auto-finalización** — los eventos con `end_datetime` en el pasado se marcan automáticamente como `finished` al consultar la API
- **Vista previa pública** — cualquier persona con el link `/e/:shareToken` puede ver información básica del evento sin autenticarse y acceder al flujo de inscripción

### Invitaciones

- **Link de invitación** — el organizador copia la URL `/e/<shareToken>` desde el detalle del evento
- **Invitación por ID o correo** — el organizador ingresa el `stringId` (6 chars) o correo del usuario; se crea una notificación de tipo `invitation`
- **Aceptar / Rechazar invitación** — desde la página de notificaciones; aceptar llama a `join`, rechazar marca la notificación como leída

### Contactos

- **Búsqueda predictiva** — búsqueda con debounce (350ms) sobre nombre, correo y stringId
- **Agregar / Eliminar contactos** — actualización inmediata en ambas secciones (resultados y lista)
- **Invitar contactos desde un evento** — el organizador selecciona uno o varios contactos con checkboxes y envía las invitaciones en lote

### Notificaciones

- **Notificaciones in-app** — tipos: `broadcast`, `event`, `system`, `invitation`
- **Marcar como leída** — individual o automático al interactuar con la notificación
- **Broadcasts** — enviadas por admins a todos los usuarios (no tienen `userId`)

### Panel de administración

- **Gestión de usuarios** — listar, buscar, bloquear, activar, cambiar rol
- **Gestión de eventos** — listar, buscar, bloquear, activar
- **Estadísticas** — métricas generales de la plataforma
- **Notificaciones** — enviar broadcasts o notificaciones de evento; listar todas

---

## Autenticación

### Flujo Google OAuth

```
GET /api/auth/google
  → Google OAuth
  → GET /api/auth/google/callback
  → redirect /auth/callback?token=JWT
  → handleCallback() en frontend
  → fetchMe() → /api/auth/me
  → si onboardingStep < 4 → /onboarding, si no → /dashboard
```

### Flujo dev login

```
POST /api/auth/dev-login { email, password }
  → { token }
  → mismo handleCallback() que el flujo Google
```

### JWT

- Almacenado en `localStorage` bajo la clave `sc_token`
- El interceptor `AuthInterceptor` lo adjunta como `Authorization: Bearer <token>` en todas las peticiones HTTP
- `sc_return_url` se guarda temporalmente para redirigir al usuario tras login cuando accede a un link de invitación pública

---

## Convenciones de código

- **Idioma**: texto visible al usuario en **español**; código (variables, funciones, tipos, comentarios) en **inglés**
- **Tema UI**: dark — fondo `neutral-950`, cards `neutral-900`, bordes `neutral-800`
- **Color de marca**: `#00e87a` — clases Tailwind `bg-brand`, `text-brand`, `border-brand`
- **Iconos**: Google Material Symbols via CDN — `<span class="material-symbols-outlined">icon_name</span>`; clase `filled` para variante rellena
- **Touch targets**: `min-h-[44px]` en todos los elementos interactivos
- **Safe areas**: `env(safe-area-inset-*)` para compatibilidad con notch/home bar de iOS
- **Estado reactivo (frontend)**: siempre `signal()` y `computed()` de Angular — nunca `BehaviorSubject` ni NgRx
- **HTTP (frontend)**: los servicios retornan `Observable<T>`; los componentes suscriben con `.subscribe()`; debounce con `setTimeout` nativo
- **Migraciones**: nunca usar `synchronize: true`; siempre generar y ejecutar migraciones explícitas; los valores de enum no se pueden eliminar en `down()`
