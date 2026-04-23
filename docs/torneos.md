# SportCard Torneos — Plan de desarrollo

> Extensión de SportCard para torneos escolares, municipales y ligas deportivas.
> Un solo backend. Dos frontends: la app actual (jugadores) y un portal nuevo (entrenadores/organizadores).

---

## Contexto y arquitectura general

### Qué existe hoy
- Backend NestJS 10 + TypeORM + PostgreSQL en `backend/`
- Frontend Angular 19 mobile-first en `frontend/` — jugadores y fanáticos
- Módulos activos: `Auth`, `Users`, `Events`, `Notifications`, `Admin`, `Contacts`
- Un solo servidor Docker Compose con los tres servicios

### Qué se agrega
- **Módulos backend** nuevos en el mismo NestJS: `Teams`, `Tournaments`, `Fixtures`, `Results`
- **Portal web** Angular nuevo en `frontend-torneos/` — para entrenadores y organizadores, orientado a tablet/escritorio
- Los jugadores siguen usando la app en `frontend/` — solo se les agregan nuevas notificaciones y vistas de seguimiento

### Principios que guían el diseño
1. Un usuario de SportCard puede ser jugador, entrenador o ambos — solo es un flag en su perfil
2. Los partidos del torneo se crean como `Event` en el módulo existente — no hay un modelo separado para "partido"
3. El fixture se genera automáticamente pero se puede editar a mano
4. Los torneos tienen estado público: cualquiera ve tabla y llaves sin cuenta; participar sí requiere cuenta

---

## Entidades nuevas (base de datos)

### Team (equipo)
| Campo          | Tipo     | Notas                                    |
|----------------|----------|------------------------------------------|
| id             | uuid     | PK                                       |
| name           | varchar  |                                          |
| sport          | varchar  | mismo enum que Event.sport               |
| coachId        | uuid FK  | → users.id                               |
| logoUrl        | varchar  | nullable                                 |
| createdAt      | timestamp|                                          |

### TeamMember (nómina)
| Campo      | Tipo    | Notas                        |
|------------|---------|------------------------------|
| id         | uuid    | PK                           |
| teamId     | uuid FK |                              |
| userId     | uuid FK |                              |
| position   | varchar | nullable — posición deportiva |
| joinedAt   | timestamp|                             |
| UNIQUE (teamId, userId) | | un jugador una vez por equipo |

### Tournament (torneo)
| Campo               | Tipo      | Notas                                              |
|---------------------|-----------|----------------------------------------------------|
| id                  | uuid      | PK                                                 |
| name                | varchar   |                                                    |
| sport               | varchar   |                                                    |
| format              | enum      | `cup` \| `league` \| `groups_playoffs` \| `points` |
| status              | enum      | `draft` \| `open` \| `in_progress` \| `finished`   |
| organizerId         | uuid FK   | → users.id                                         |
| maxTeams            | int       | nullable                                           |
| registrationOpen    | boolean   | si cualquiera puede inscribirse                    |
| requiresApproval    | boolean   |                                                    |
| shareToken          | uuid      | DEFAULT uuid_generate_v4() — link público          |
| startDate           | date      | nullable                                           |
| endDate             | date      | nullable                                           |
| createdAt           | timestamp |                                                    |

### TournamentTeam (inscripción de equipo)
| Campo        | Tipo   | Notas                                           |
|--------------|--------|-------------------------------------------------|
| id           | uuid   | PK                                              |
| tournamentId | uuid FK|                                                 |
| teamId       | uuid FK|                                                 |
| status       | enum   | `pending` \| `approved` \| `rejected`           |
| groupName    | varchar| nullable — ej. "Grupo A"                        |
| UNIQUE (tournamentId, teamId) | |                                  |

### Match (partido / fixture)
| Campo         | Tipo    | Notas                                                  |
|---------------|---------|--------------------------------------------------------|
| id            | uuid    | PK                                                     |
| tournamentId  | uuid FK |                                                        |
| homeTeamId    | uuid FK |                                                        |
| awayTeamId    | uuid FK |                                                        |
| eventId       | uuid FK | → events.id nullable — evento SportCard del partido    |
| round         | varchar | ej. "Fecha 3", "Semifinal", "Grupo A - F1"             |
| homeScore     | int     | nullable — null = no jugado aún                        |
| awayScore     | int     | nullable                                               |
| homePenalties | int     | nullable — solo si aplica                              |
| awayPenalties | int     | nullable                                               |
| status        | enum    | `scheduled` \| `played` \| `cancelled` \| `postponed`  |
| playedAt      | timestamp| nullable                                              |

### Standing (fila de tabla — solo ligas y grupos)
> Se calcula automáticamente a partir de los Match con `status = played`. No se guarda manualmente.

---

## Fases de desarrollo

---

### Fase 1 — Base del modelo de equipos (backend)

**Objetivo**: poder crear equipos, agregar jugadores de SportCard a la nómina y gestionar membresías.

**Tareas Claude:**

```
Implementa el módulo Teams en el backend NestJS existente en backend/src/.

Entidades a crear:
- Team: id (uuid PK), name, sport, coachId (FK → users), logoUrl (nullable), createdAt
- TeamMember: id, teamId (FK), userId (FK), position (nullable), joinedAt. UNIQUE(teamId, userId)

Módulo TeamModule con TypeOrmModule.forFeature([Team, TeamMember, User]).
No importar UsersModule, seguir patrón de ContactsModule (inyectar User repo directamente).

TeamsService con métodos:
- createTeam(coachId, dto): crea equipo con coach como primer miembro
- getMyTeams(userId): equipos donde el usuario es coach o miembro
- getTeamById(id): equipo con miembros enriquecidos (nombre, avatar, stringId)
- addMember(teamId, coachId, targetUserId, position?): valida que quien agrega es el coach
- removeMember(teamId, coachId, targetUserId): ídem
- searchForTeam(q): búsqueda pública de equipos por nombre

TeamsController con JwtAuthGuard:
POST   /teams              → createTeam
GET    /teams/mine         → getMyTeams
GET    /teams/search?q=    → searchForTeam
GET    /teams/:id          → getTeamById
POST   /teams/:id/members  → addMember (body: { userId, position? })
DELETE /teams/:id/members/:userId → removeMember

Migración: 17XXXXXXXXX-CreateTeamTables.ts con las dos tablas.
Registrar Team y TeamMember en entities[] de app.module.ts e importar TeamsModule.
```

**Entregable**: endpoints funcionando, migración aplicada, entrenador puede crear equipo y agregar jugadores por userId.

---

### Fase 2 — Módulo de torneos (backend)

**Objetivo**: crear torneos, gestionar inscripciones de equipos, estados y lógica de aprobación.

**Tareas Claude:**

```
Implementa el módulo Tournaments en el backend NestJS.

Entidades:
- Tournament: campos descritos arriba. shareToken DEFAULT uuid_generate_v4()
- TournamentTeam: tournamentId, teamId, status (pending|approved|rejected), groupName (nullable). UNIQUE(tournamentId, teamId)

TournamentsService métodos:
- createTournament(organizerId, dto)
- findPublic(userId?): torneos con status open o in_progress; si viene userId incluye los del usuario también
- findMine(userId): torneos donde es organizador
- findById(id, userId?): detalle completo con equipos aprobados
- findByToken(shareToken): solo campos públicos (sin equipos pendientes)
- registerTeam(tournamentId, teamId, coachId): valida que coachId es el coach del equipo, verifica inscripciones abiertas y cupo
- updateRegistration(tournamentId, teamId, organizerId, status): aprueba o rechaza
- updateTournamentStatus(id, organizerId, status)

TournamentsController con JwtAuthGuard excepto GET /tournaments/t/:shareToken:
POST   /tournaments                    → createTournament
GET    /tournaments                    → findPublic
GET    /tournaments/mine               → findMine
GET    /tournaments/t/:shareToken      → findByToken (sin auth)
GET    /tournaments/:id                → findById
POST   /tournaments/:id/teams          → registerTeam (body: { teamId })
PATCH  /tournaments/:id/teams/:teamId  → updateRegistration (body: { status })
PATCH  /tournaments/:id/status         → updateTournamentStatus (body: { status })

Migración: crear tablas tournament y tournament_team.
Registrar entidades en app.module.ts, importar TournamentsModule.
```

**Entregable**: torneo creable, equipos que se inscriben y pueden ser aprobados/rechazados, link público funcionando.

---

### Fase 3 — Fixture y resultados (backend)

**Objetivo**: generar el calendario de partidos automáticamente, crear eventos SportCard por cada partido y cargar resultados.

**Tareas Claude:**

```
Implementa el módulo Fixtures en el backend (puede ser parte de TournamentsModule o módulo separado FixturesModule).

Entidad Match: campos descritos arriba. Importar EventsService para crear Event por cada partido.

FixturesService métodos:

generateFixture(tournamentId, organizerId):
  - Obtiene equipos aprobados del torneo
  - Según tournament.format genera los encuentros:
    · 'cup': llave de eliminación simple (potencia de 2, rellena con bye si es necesario)
    · 'league': round-robin completo (todos contra todos, una vuelta)
    · 'groups_playoffs': divide equipos en grupos iguales, round-robin por grupo
    · 'points': estructura libre, crea una ronda genérica con todos los enfrentamientos
  - Crea los registros Match con status = 'scheduled', sin fechas ni eventId aún
  - Retorna los partidos creados

schedulMatch(matchId, organizerId, dto: { startDatetime, locationName }):
  - Actualiza la fecha del partido
  - Crea un Event en EventsModule con type='private', sport del torneo, title="{HomeTeam} vs {AwayTeam}"
  - Inscribe automáticamente a todos los miembros de ambos equipos como EventParticipant (status='approved')
  - Guarda eventId en el Match
  - Envía notificación tipo 'event' a los jugadores inscritos

recordResult(matchId, organizerId, dto: { homeScore, awayScore, homePenalties?, awayPenalties? }):
  - Valida que organizerId es organizador del torneo
  - Actualiza homeScore, awayScore, status='played', playedAt=now()
  - Si es torneo en formato 'cup' o 'groups_playoffs': actualiza el siguiente partido de la llave con el ganador
  - Retorna el match actualizado

getStandings(tournamentId): calcula y retorna tabla de posiciones a partir de matches played.
  Columnas: PJ, G, E, P, GF, GC, DG, Pts. Ordenada por Pts desc, DG desc, GF desc.

getBracket(tournamentId): retorna todos los matches agrupados por ronda, con nombres de equipos.

FixturesController con JwtAuthGuard:
POST   /tournaments/:id/fixture              → generateFixture
PATCH  /tournaments/:id/matches/:matchId/schedule  → scheduleMatch
PATCH  /tournaments/:id/matches/:matchId/result    → recordResult
GET    /tournaments/:id/standings            → getStandings (público si torneo es público)
GET    /tournaments/:id/bracket              → getBracket   (público si torneo es público)
GET    /tournaments/:id/matches              → lista todos los partidos del torneo

Migración: tabla match.
```

**Entregable**: fixture generado automáticamente, partidos convertidos en eventos SportCard, resultados que actualizan llave o tabla.

---

### Fase 4 — Notificaciones para jugadores (backend + app actual)

**Objetivo**: que los jugadores reciban en SportCard todo lo relevante del torneo: invitación al equipo, partido programado, resultado publicado.

**Tareas Claude:**

```
Agrega los nuevos tipos de notificación al enum de Notification.type en la entidad existente y en la migración correspondiente.

Nuevos tipos a agregar (ALTER TYPE ... ADD VALUE IF NOT EXISTS, siguiendo el patrón de AddInvitationNotificationType.ts):
- 'team_invite'    — te agregaron a un equipo
- 'match_scheduled'— partido de tu equipo programado (con eventId del partido)
- 'match_result'   — resultado de tu partido publicado
- 'tournament_update' — tu equipo fue aprobado/rechazado en un torneo

En FixturesService.scheduleMatch y recordResult ya creados en Fase 3, agregar las llamadas a NotificationsService para crear las notificaciones pertinentes.

En TeamsService.addMember agregar notificación tipo 'team_invite' al jugador agregado.

En el frontend (frontend/src/app/pages/notifications/):
- Agregar renderizado visual para los 4 nuevos tipos en el template de notificaciones
- 'team_invite': muestra nombre del equipo, botón "Ver equipo" → ruta /teams/:id (nueva ruta)
- 'match_scheduled': muestra "Partido el [fecha]", botón "Ver evento" → /events/:eventId
- 'match_result': muestra marcador final, enlace al torneo
- 'tournament_update': muestra nombre del torneo y estado (aprobado/rechazado)

Nueva sección en la app actual (frontend/src/app/pages/):
- Página /teams/:id — vista pública del equipo: logo, nómina, torneos activos
- Página /tournaments/:id — vista pública del torneo: tabla o llave según formato, próximos partidos
  Ambas usan los endpoints públicos, no requieren auth para ver, sí para acciones.
```

**Entregable**: el ciclo completo funciona — el entrenador agenda un partido y todos los jugadores reciben notificación y ven el evento en su app.

---

### Fase 5 — Portal de torneos (nuevo frontend)

**Objetivo**: interfaz web para entrenadores y organizadores. Orientada a tablet/escritorio.

**Tareas Claude:**

```
Crea un nuevo proyecto Angular 19 en frontend-torneos/ en la raíz del monorepo.

Configuración inicial:
- angular.json, tsconfig, tailwind.config igual que frontend/ pero sin PWA
- Mismo proxy.conf.json apuntando a localhost:3000
- Variables de entorno con apiUrl idéntico a frontend/
- AuthService idéntico al de frontend/ (mismo JWT, mismos endpoints /auth/me, /auth/google)
- Interceptor de auth Bearer idéntico

Estructura de páginas:
- /login           — mismo flujo Google OAuth; redirige a /dashboard después
- /dashboard       — resumen: mis equipos, torneos activos, próximos partidos
- /teams           — lista de equipos donde soy coach; botón "Crear equipo"
- /teams/new       — formulario crear equipo
- /teams/:id       — detalle: nómina, botón agregar jugador (búsqueda predictiva igual que Contacts), torneos del equipo
- /tournaments     — lista: mis torneos organizados + torneos donde tengo equipo inscrito
- /tournaments/new — formulario crear torneo: nombre, deporte, formato, fechas, configuración inscripciones
- /tournaments/:id — detalle del torneo con tabs:
    · Equipos — lista de inscritos, aprobar/rechazar pendientes
    · Fixture  — tabla de partidos por ronda, botón "Generar fixture" si no hay
    · Bracket o Tabla — según formato del torneo
    · Resultados — formulario para cargar marcadores de partidos jugados
- /tournaments/t/:shareToken — página pública (sin auth): info del torneo + botón inscribirse si está abierto

Routing:
- authGuard en todas las rutas excepto /login y /tournaments/t/:token
- lazy-loading en todas las rutas

Componentes compartidos:
- BottomNav no aplica — usar sidebar lateral colapsable para navegación
- UserSearchInput: igual al de Contacts en frontend/ — búsqueda predictiva para agregar jugadores
- TournamentCard, TeamCard, MatchCard: tarjetas visuales reutilizables
- BracketView: árbol SVG o CSS de la llave de eliminación
- StandingsTable: tabla de posiciones ordenable

Servicios (core/services/):
- TeamsService: CRUD equipos, gestión nómina
- TournamentsService: CRUD torneos, inscripciones, estados
- FixturesService: generar fixture, agendar partidos, cargar resultados, obtener bracket/standings

Convenciones (igual que frontend/):
- Signals para todo el estado reactivo — signal(), computed(), no BehaviorSubject
- Debounce con setTimeout/clearTimeout — no RxJS en componentes
- Dark theme: neutral-950 bg, neutral-900 cards, #00e87a brand
- Español para textos de usuario, inglés para código
- Material Symbols via CDN para iconos
```

**Entregable**: portal funcional donde el organizador hace todo el flujo de principio a fin sin tocar la app de jugadores.

---

### Fase 6 — Docker y CI (infraestructura)

**Objetivo**: levantar el portal de torneos junto con los demás servicios de forma consistente.

**Tareas Claude:**

```
Agrega el portal de torneos al docker-compose.yml existente.

Nuevo servicio frontend-torneos en docker-compose.yml:
- Dockerfile similar a frontend/ pero apuntando a frontend-torneos/
- Puerto 4201 (frontend jugadores sigue en 4200)
- Variable de entorno API_URL=http://backend:3000

Actualizar tabla de servicios en CLAUDE.md y docs/info.md:
| frontend-torneos | http://localhost:4201 |

No crear entornos de staging/producción — eso es parte de la infraestructura de despliegue existente en Coolify.
Solo asegurarse de que docker compose up --build levanta los cuatro servicios correctamente.
```

---

### Fase 7 — Pulido y casos de borde

**Objetivo**: cubrir los escenarios que no son el happy path.

**Tareas Claude (una sesión por ítem):**

```
7a. Fixture con número impar de equipos
    En FixturesService.generateFixture, si format='cup' y hay número impar de equipos,
    agregar lógica de 'bye': el equipo con mejor posición en el grupo (o elegido aleatoriamente)
    pasa automáticamente a la siguiente ronda. El Match se crea con awayTeamId=null y status='played'.

7b. Empates en copa
    En Match agregar campos homePenalties y awayPenalties (ya en el modelo).
    En recordResult si homeScore === awayScore y el partido es de copa (ronda eliminatoria),
    requerir que vengan homePenalties y awayPenalties. El ganador por penales avanza.

7c. Cancelar / posponer partido
    PATCH /tournaments/:id/matches/:matchId/cancel
    - Cambia status a 'cancelled' o 'postponed'
    - Si tenía eventId asociado, cierra el Event (status='cancelled')
    - Notifica a los jugadores inscritos en ese evento

7d. Equipo que abandona el torneo
    DELETE /tournaments/:id/teams/:teamId (solo organizador)
    - Cambia TournamentTeam.status a 'rejected'
    - Marca como 'cancelled' todos los Match del equipo pendientes
    - Recalcula standings si aplica

7e. Estadísticas básicas de jugador
    GET /users/:id/stats
    - Partidos jugados (eventos de tipo partido en los que fue EventParticipant)
    - Torneos en los que participó (a través de sus equipos)
    - Sin sistema de goles por ahora — solo presencia

7f. Vista "Seguir torneo" en app jugadores
    Página /tournaments/:id en frontend/ (no en frontend-torneos)
    - Solo lectura: tabla de posiciones o bracket según formato
    - Lista de próximos partidos del torneo
    - No requiere estar inscrito para ver
```

---

## Orden sugerido y dependencias

```
Fase 1 (Teams)
    ↓
Fase 2 (Tournaments) — requiere Teams
    ↓
Fase 3 (Fixtures + Results) — requiere Tournaments + EventsModule existente
    ↓
Fase 4 (Notificaciones) — requiere Fixtures + NotificationsModule existente
    ↓ (paralelo)
Fase 5 (Portal web) — puede empezarse en paralelo desde Fase 2 en adelante
    ↓
Fase 6 (Docker)
    ↓
Fase 7 (Pulido) — ítems independientes, cualquier orden
```

---

## Cómo usar este plan con Claude

Cada fase está redactada como un prompt listo para copiar y pegar. Para mejores resultados:

1. **Una fase a la vez.** No intentes implementar varias fases en una sola sesión — el contexto se llena y la calidad baja.
2. **Siempre empieza la sesión con el contexto.** Adjunta `CLAUDE.md`, la fase actual de `torneos.md` y los archivos que Claude va a tocar según la fase.
3. **Verifica antes de continuar.** Después de cada fase, levanta el stack con `docker compose up --build` y prueba los endpoints nuevos con curl o Postman antes de pasar a la siguiente.
4. **Las migraciones son críticas.** Si una migración falla al levantar el backend, revisa el SQL antes de seguir — un error en la migración bloquea todo.
5. **Los ítems de Fase 7 son independientes.** Puedes pedir el 7c o el 7e solos en cualquier momento sin haber hecho los otros.

---

## Resumen de entidades nuevas

| Entidad         | Tabla             | Módulo       | Fase |
|-----------------|-------------------|--------------|------|
| Team            | team              | Teams        | 1    |
| TeamMember      | team_member       | Teams        | 1    |
| Tournament      | tournament        | Tournaments  | 2    |
| TournamentTeam  | tournament_team   | Tournaments  | 2    |
| Match           | match             | Fixtures     | 3    |

Las tablas existentes que se extienden: `notification.type` (nuevos valores en Fase 4).

---

## Resumen de endpoints nuevos

### Equipos
| Método | Ruta                            | Quién       |
|--------|---------------------------------|-------------|
| POST   | /teams                          | Entrenador  |
| GET    | /teams/mine                     | Entrenador  |
| GET    | /teams/search?q=                | Público     |
| GET    | /teams/:id                      | Público     |
| POST   | /teams/:id/members              | Coach       |
| DELETE | /teams/:id/members/:userId      | Coach       |

### Torneos
| Método | Ruta                                        | Quién        |
|--------|---------------------------------------------|--------------|
| POST   | /tournaments                                | Organizador  |
| GET    | /tournaments                                | Público      |
| GET    | /tournaments/mine                           | Auth         |
| GET    | /tournaments/t/:shareToken                  | Público      |
| GET    | /tournaments/:id                            | Público      |
| POST   | /tournaments/:id/teams                      | Coach        |
| PATCH  | /tournaments/:id/teams/:teamId              | Organizador  |
| PATCH  | /tournaments/:id/status                     | Organizador  |

### Fixture y resultados
| Método | Ruta                                              | Quién       |
|--------|---------------------------------------------------|-------------|
| POST   | /tournaments/:id/fixture                          | Organizador |
| PATCH  | /tournaments/:id/matches/:matchId/schedule        | Organizador |
| PATCH  | /tournaments/:id/matches/:matchId/result          | Organizador |
| GET    | /tournaments/:id/standings                        | Público     |
| GET    | /tournaments/:id/bracket                          | Público     |
| GET    | /tournaments/:id/matches                          | Público     |
