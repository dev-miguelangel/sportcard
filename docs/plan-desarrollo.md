# Sport Card — Plan de Desarrollo

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Backend | NestJS 10+ (TypeScript) |
| Frontend | Angular 20+ (Standalone Components, Signals) |
| Base de datos | PostgreSQL 16 |
| ORM | TypeORM o Prisma |
| Autenticación | Google OAuth 2.0 + JWT |
| Tiempo real | WebSockets (Socket.io via NestJS) |
| Almacenamiento | AWS S3 / Supabase Storage |
| Deploy | Docker + Railway o Render |
| CI/CD | GitHub Actions |

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                        FRONTEND                         │
│                    Angular 20+                          │
│   (Standalone Components, Signals, httpResource)        │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP REST + WebSocket
┌─────────────────────▼───────────────────────────────────┐
│                        BACKEND                          │
│                     NestJS 10+                          │
│        (Modules, Guards, Interceptors, Pipes)           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    PostgreSQL 16                         │
│              (TypeORM / Prisma ORM)                     │
└─────────────────────────────────────────────────────────┘
```

---

## Módulos NestJS

### 1. `AuthModule`
- Google OAuth 2.0 (Passport.js)
- JWT access/refresh tokens
- Guard de autenticación global
- Guard de perfil completo (bloquea rutas si el perfil no está completo)

### 2. `UsersModule`
- CRUD de perfil de usuario
- Datos personales, deportivos, salud, contacto de emergencia
- Estado de lesión
- Visibilidad pública/privada
- Gestión de tutores para menores de edad

### 3. `EventsModule`
- Creación de eventos (públicos/privados, competitivos/no competitivos)
- Tipos: partido amistoso, torneo, trekking, running, etc.
- Configuración: deporte, participantes, aprobación requerida, etc.
- Geolocalización y detalles logísticos
- Eventos recurrentes
- Enlace público compartible (sin autenticación)

### 4. `TeamsModule`
- Crear/editar equipos
- Gestión de miembros (agregar, remover)
- Asignación de capitanes
- Invitaciones a miembros

### 5. `InvitationsModule`
- Invitaciones a eventos (individuales y por equipo)
- Postulaciones a eventos públicos con aprobación
- Estados: pendiente, aceptada, rechazada

### 6. `TournamentsModule`
- Cuadrangulares, eliminación simple/doble, round robin
- Generación automática de fixture
- Seguimiento de bracket

### 7. `ResultsModule`
- Registro de resultados por ambos equipos/jugadores
- Sistema de confirmación mutua
- Resolución de discrepancias por organizador
- Estadísticas: goles, asistencias, sets, etc.

### 8. `NotificationsModule`
- Notificaciones en tiempo real (WebSocket)
- Notificaciones push (Web Push API)
- Tipos: invitación, cambio de evento, confirmación de resultado, lesión de jugador

### 9. `ReviewsModule`
- Reseñas y comentarios en eventos pasados
- Rating de eventos

### 10. `StatsModule`
- Estadísticas personales: partidos jugados, goles, rachas
- Historial de actividades
- Leaderboards por deporte

---

## Esquema de Base de Datos

### Tabla `users`
```sql
id             UUID PRIMARY KEY
google_id      VARCHAR UNIQUE NOT NULL
email          VARCHAR UNIQUE NOT NULL
name           VARCHAR NOT NULL
birth_date     DATE NOT NULL
phone          VARCHAR
avatar_url     VARCHAR
is_injured     BOOLEAN DEFAULT false
profile_public BOOLEAN DEFAULT true
is_minor       BOOLEAN GENERATED AS (birth_date > NOW() - INTERVAL '18 years')
tutor_id       UUID REFERENCES users(id)
onboarding_step INTEGER DEFAULT 1
created_at     TIMESTAMP DEFAULT NOW()
```

### Tabla `health_data`
```sql
id             UUID PRIMARY KEY
user_id        UUID REFERENCES users(id) UNIQUE
blood_type     VARCHAR
allergies      TEXT[]
conditions     TEXT[]
medications    TEXT[]
updated_at     TIMESTAMP
```

### Tabla `emergency_contacts`
```sql
id             UUID PRIMARY KEY
user_id        UUID REFERENCES users(id)
name           VARCHAR NOT NULL
phone          VARCHAR NOT NULL
relationship   VARCHAR
```

### Tabla `sport_preferences`
```sql
id             UUID PRIMARY KEY
user_id        UUID REFERENCES users(id)
sport          VARCHAR NOT NULL
level          ENUM('beginner','amateur','semi_pro','professional')
position       VARCHAR
```

### Tabla `teams`
```sql
id             UUID PRIMARY KEY
name           VARCHAR NOT NULL
sport          VARCHAR NOT NULL
avatar_url     VARCHAR
creator_id     UUID REFERENCES users(id)
captain_id     UUID REFERENCES users(id)
created_at     TIMESTAMP DEFAULT NOW()
```

### Tabla `team_members`
```sql
team_id        UUID REFERENCES teams(id)
user_id        UUID REFERENCES users(id)
role           ENUM('member','captain','coach')
joined_at      TIMESTAMP DEFAULT NOW()
PRIMARY KEY (team_id, user_id)
```

### Tabla `events`
```sql
id             UUID PRIMARY KEY
title          VARCHAR NOT NULL
description    TEXT
sport          VARCHAR NOT NULL
type           ENUM('friendly','tournament','trekking','running','training','other')
format         ENUM('single','team')
is_competitive BOOLEAN DEFAULT false
is_public      BOOLEAN DEFAULT true
requires_approval BOOLEAN DEFAULT false
max_participants INTEGER
location_name  VARCHAR
latitude       DECIMAL
longitude      DECIMAL
start_datetime TIMESTAMP NOT NULL
end_datetime   TIMESTAMP
is_recurring   BOOLEAN DEFAULT false
recurrence_rule VARCHAR
share_token    UUID UNIQUE DEFAULT gen_random_uuid()
organizer_id   UUID REFERENCES users(id)
status         ENUM('draft','open','closed','cancelled','finished') DEFAULT 'open'
created_at     TIMESTAMP DEFAULT NOW()
```

### Tabla `event_participants`
```sql
id             UUID PRIMARY KEY
event_id       UUID REFERENCES events(id)
user_id        UUID REFERENCES users(id)
team_id        UUID REFERENCES teams(id)
status         ENUM('pending','approved','rejected','withdrawn')
applied_at     TIMESTAMP DEFAULT NOW()
```

### Tabla `results`
```sql
id             UUID PRIMARY KEY
event_id       UUID REFERENCES events(id) UNIQUE
submitted_by   UUID REFERENCES users(id)
confirmed_by   UUID REFERENCES users(id)
status         ENUM('pending','confirmed','disputed')
data           JSONB  -- goles, sets, tiempos, etc.
submitted_at   TIMESTAMP DEFAULT NOW()
confirmed_at   TIMESTAMP
```

### Tabla `notifications`
```sql
id             UUID PRIMARY KEY
user_id        UUID REFERENCES users(id)
type           VARCHAR NOT NULL
title          VARCHAR NOT NULL
body           TEXT
metadata       JSONB
read           BOOLEAN DEFAULT false
created_at     TIMESTAMP DEFAULT NOW()
```

---

## Módulos Angular

### Core
- `AuthGuard` — redirige a login si no hay sesión
- `OnboardingGuard` — redirige a completar perfil si el onboarding no está terminado
- `AuthInterceptor` — adjunta JWT a cada petición
- `AuthStore` (Signal Store) — estado global de sesión

### Feature Modules (Lazy Loaded)

| Módulo | Ruta | Descripción |
|---|---|---|
| `AuthModule` | `/auth` | Login con Google |
| `OnboardingModule` | `/onboarding` | Pasos 1-3 del primer ingreso |
| `DashboardModule` | `/dashboard` | Pantalla principal |
| `EventsModule` | `/events` | Listado, búsqueda, detalle |
| `EventCreateModule` | `/events/create` | Creación de eventos |
| `TeamsModule` | `/teams` | Equipos del usuario |
| `ProfileModule` | `/profile/:id` | Perfil propio y ajeno |
| `TournamentModule` | `/tournaments/:id` | Bracket y fixture |
| `PublicEventModule` | `/e/:token` | Vista pública sin auth |
| `NotificationsModule` | `/notifications` | Centro de notificaciones |

---

## Fases de Desarrollo

### Fase 0 — Setup (1 semana)
- [ ] Repositorios Git (monorepo o polyrepo)
- [ ] Docker Compose: NestJS + PostgreSQL + pgAdmin
- [ ] Variables de entorno y configuración base
- [ ] Google OAuth configurado en GCP Console
- [ ] CI/CD básico con GitHub Actions
- [ ] Proyecto Angular 20+ inicializado con estructura de módulos

### Fase 1 — Autenticación y Onboarding (2 semanas)
- [ ] Google OAuth en NestJS (Passport + JWT)
- [ ] Pantalla de login Angular
- [ ] Flujo de onboarding 3 pasos (datos personales, salud, emergencia)
- [ ] Guards de autenticación y onboarding en Angular
- [ ] Perfil de usuario (ver y editar)

### Fase 2 — Eventos (3 semanas)
- [ ] CRUD completo de eventos en NestJS
- [ ] Listado de eventos con filtros (deporte, tipo, fecha, distancia)
- [ ] Creación de eventos paso a paso en Angular
- [ ] Detalle de evento
- [ ] Inscripción directa y por postulación
- [ ] Vista pública compartible (sin auth)

### Fase 3 — Equipos e Invitaciones (2 semanas)
- [ ] CRUD de equipos
- [ ] Gestión de miembros y capitán
- [ ] Sistema de invitaciones (evento y equipo)
- [ ] Notificaciones en tiempo real (WebSocket)
- [ ] Centro de notificaciones

### Fase 4 — Torneos y Resultados (3 semanas)
- [ ] Módulo de torneos (fixture automático)
- [ ] Bracket visual en Angular
- [ ] Registro de resultados
- [ ] Confirmación mutua de resultados
- [ ] Estadísticas básicas por usuario

### Fase 5 — Funcionalidades Avanzadas (2 semanas)
- [ ] Estado de lesión y notificación a organizadores
- [ ] Menores de edad con tutor
- [ ] Eventos recurrentes
- [ ] Reseñas y comentarios
- [ ] Rachas deportivas y logros

### Fase 6 — Pulimiento y Deploy (2 semanas)
- [ ] Optimizaciones de rendimiento (lazy loading, SSR Angular)
- [ ] Notificaciones push (Web Push API)
- [ ] Tests unitarios e integración críticos
- [ ] Deploy en producción
- [ ] Documentación API (Swagger)

---

## Timeline Estimado

```
Semana  1:  Setup & DevOps
Semana  2-3: Auth + Onboarding
Semana  4-6: Eventos
Semana  7-8: Equipos + Invitaciones
Semana  9-11: Torneos + Resultados
Semana 12-13: Funcionalidades avanzadas
Semana 14-15: Pulimiento + Deploy
```

**Total estimado: ~15 semanas (MVP completo)**

---

## Consideraciones de Seguridad

- JWT de corta duración (15 min) + refresh token rotativo
- Rate limiting en endpoints críticos (NestJS Throttler)
- Validación estricta de DTOs (class-validator)
- Datos de salud encriptados en reposo (AES-256)
- Roles y permisos por recurso (organizador, participante, capitán)
- CORS configurado por entorno
- Helmet.js para headers de seguridad

---

## Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/sportcard

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage
STORAGE_BUCKET=
STORAGE_KEY=
STORAGE_SECRET=

# App
FRONTEND_URL=http://localhost:4200
PORT=3000
```
