# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running locally

The entire stack runs with a single command from the project root:

```bash
docker compose up --build   # first time or after Dockerfile/package.json changes
docker compose up           # subsequent runs
docker compose down -v      # stop and wipe the database volume
```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:4200        |
| Backend    | http://localhost:3000/api    |
| PostgreSQL | localhost:5432 · `sportcard` |

Without Docker, run each service separately (requires local PostgreSQL):

```bash
cd backend && npm run start:dev
cd frontend && npm start
```

## Dev Auth (skip Google OAuth in development)

When `DEV_AUTH_ENABLED=true` in `.env`, a username/password form appears on the login screen below the Google button. Default credentials: `dev@sportcard.dev` / `dev1234`. This endpoint returns 403 in production regardless of the flag.

## Database migrations

Migrations run automatically on backend startup (`migrationsRun: true`). `synchronize` is always `false` — never use it to apply schema changes.

**Creating a migration after changing an entity** (run from `backend/`, requires local PostgreSQL on port 5432):

```bash
npm run migration:generate -- src/migrations/DescriptiveName
npm run migration:run      # apply manually without restarting the server
npm run migration:revert   # roll back the last migration
npm run migration:show     # list applied / pending migrations
```

The CLI always connects with `DATABASE_HOST=localhost` (hardcoded in the `typeorm` script). The `.env` uses `DATABASE_HOST=postgres` for Docker, so never pass it through when running migration commands locally.

Migration files live in `backend/src/migrations/`. The `data-source.ts` is the standalone TypeORM config used exclusively by the CLI — it reads `../../.env` relative to the compiled output.

**Adding an enum value**: PostgreSQL requires `ALTER TYPE <enum> ADD VALUE IF NOT EXISTS '...'` — you cannot remove enum values in a down migration, so `down()` is a no-op. See `1776900200000-AddInvitationNotificationType.ts` as the pattern.

## Architecture

### Backend — NestJS 10 + TypeORM + PostgreSQL

Modules: `AuthModule`, `UsersModule`, `EventsModule`, `NotificationsModule`, `AdminModule`. All registered in `app.module.ts` with the four TypeORM entities: `User`, `Event`, `EventParticipant`, `Notification`.

```
backend/src/
├── app.module.ts               ← TypeORM config (migrationsRun: true, synchronize: false)
├── data-source.ts              ← standalone DataSource for TypeORM CLI only
├── migrations/                 ← timestamped migration files
├── auth/                       ← Google OAuth + JWT; guards in auth/guards/
├── users/                      ← User entity + CRUD; UsersModule exports UsersService
├── events/
│   ├── entities/
│   │   ├── event.entity.ts           ← Event: sport, type, title, locationName,
│   │   │                                startDatetime, endDatetime, maxParticipants,
│   │   │                                isPublic, requiresApproval, shareToken (uuid),
│   │   │                                status (draft|open|closed|cancelled|finished),
│   │   │                                organizerId
│   │   └── event-participant.entity.ts ← EventParticipant: eventId, userId,
│   │                                     status (approved|pending|waiting|rejected), message
│   ├── events.controller.ts          ← GET/POST /events (all require JwtAuthGuard)
│   ├── event-public.controller.ts    ← GET /events/token/:shareToken (no auth)
│   ├── participants.controller.ts    ← join/leave/invite/list/updateStatus
│   ├── events.service.ts             ← findPublic, findMine, findOne, findByShareToken
│   │                                    enrichWithStats adds participantCount + myStatus
│   └── participants.service.ts       ← join (auto-approve organizer), inviteUser
├── notifications/
│   └── entities/notification.entity.ts ← type: broadcast|event|system|invitation
│                                          userId + eventId (both nullable FK)
└── admin/                      ← platform admin only; AdminGuard checks role=admin
```

**Auth flow:**
```
Google:    GET /api/auth/google → Google OAuth → /api/auth/google/callback
           → redirect /auth/callback?token=JWT → frontend handleCallback() → fetchMe()
Dev login: POST /api/auth/dev-login → { token } → handleCallback() → fetchMe()
```
`GET /auth/me` returns the full user from DB minus `googleId`. `fetchMe()` checks `localStorage('sc_return_url')` and redirects there after login if set, otherwise goes to `/dashboard` (or `/onboarding` if `onboardingStep < 4`).

**`findPublic` visibility rule**: returns public+open events OR any open event where `organizerId === userId` (so creators always see their own private events).

**Participant join logic**: organizer → auto-approved; `requiresApproval` → pending; full capacity → waiting; otherwise → approved.

**Invitation flow**: `POST /events/:id/invite` with `{ identifier }` (stringId 6-char or email). Creates a `INVITATION` notification for the target user. In the notifications page, INVITATION type shows Accept/Decline buttons — Accept calls `join`, Decline marks notification read.

**Public event preview**: `GET /events/token/:shareToken` returns only `{ id, title, sport, type, startDatetime, locationName, isPublic }` — no auth required.

### Frontend — Angular 19+, standalone components, signals

```
frontend/src/app/
├── app.config.ts           ← provideRouter, provideHttpClient + authInterceptor, ServiceWorker
├── app.routes.ts           ← all routes lazy-loaded; authGuard on all except /login,
│                              /auth/callback, /e/:token
├── core/
│   ├── services/
│   │   ├── auth.service.ts         ← signals: _token, _user → isLoggedIn, currentUser
│   │   ├── events.service.ts       ← findAll, findMine, findOne, findByToken,
│   │   │                              join, leave, inviteUser
│   │   └── notifications.service.ts← getMyNotifications, markRead
│   ├── guards/auth.guard.ts        ← redirects to /login; adminGuard checks role
│   └── interceptors/auth.interceptor.ts ← attaches Bearer token to all requests
├── pages/
│   ├── events/
│   │   ├── list/      ← public event feed + bottom sheet for join/leave
│   │   ├── detail/    ← full event view; organizer sees invite section + participant mgmt
│   │   ├── create/    ← create form
│   │   └── invite/    ← PUBLIC page (/e/:token); shows partial info + CTA → login or event
│   ├── notifications/ ← list with Accept/Decline for INVITATION type
│   ├── admin/         ← tabs: users, events, stats, notifications (role=admin only)
│   └── onboarding/    ← 4-step wizard; step 4 = complete (onboardingStep >= 4 → dashboard)
└── shared/
    ├── bottom-nav/    ← fixed mobile nav, 5 items
    └── header/
```

**State management**: all reactive state uses Angular signals (`signal()`, `computed()`). No NgRx or BehaviorSubject patterns — keep signals consistent.

**`AuthService` localStorage keys**: `sc_token`, `sc_user`, `sc_return_url` (temporary, cleared after redirect).

### UI conventions

- **Theme**: dark — `neutral-950` background, `neutral-900` cards, `neutral-800` borders.
- **Brand color**: `#00e87a` — Tailwind classes `bg-brand`, `text-brand`, `border-brand`.
- **Icons**: Google Material Symbols via CDN. `<span class="material-symbols-outlined">icon_name</span>`; add class `filled` for filled variant.
- **Touch targets**: `min-h-[44px]` on all interactive elements.
- **Safe areas**: `env(safe-area-inset-*)` for iOS notch/home bar padding.
- **Sport visuals**: each sport has a gradient (`SPORT_GRADIENTS`) and emoji (`SPORT_EMOJIS`) — these maps are duplicated across components (list, detail, invite). Keep them in sync when adding sports.
- All **user-facing text in Spanish**. Code (variables, functions, types, comments) in **English**.

### Environments

| File                        | `apiUrl`                    |
|-----------------------------|-----------------------------|
| `environment.ts`            | `http://localhost:3000/api` |
| `environment.production.ts` | production URL              |
| `environment.staging.ts`    | staging URL                 |

The Angular dev server proxies `/api` to the backend via `proxy.conf.json`.

### Key data relationships

- `Event.organizerId` → `User.id` (FK, no cascade)
- `EventParticipant` has `UNIQUE(eventId, userId)` — one row per user per event
- `Notification.userId` nullable (null = broadcast to all); `Notification.eventId` nullable
- `Event.shareToken` is a UUID generated by PostgreSQL default, always unique

### Adding a new backend module

1. Create `src/<name>/<name>.module.ts` with TypeOrmModule.forFeature for its entities
2. Add the entity class to the `entities` array in `app.module.ts`
3. Import the module in `app.module.ts`
4. Generate a migration for the new table(s)
