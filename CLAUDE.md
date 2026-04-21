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

## Architecture

### Backend — NestJS 10 + TypeORM + PostgreSQL

```
backend/src/
├── data-source.ts          ← standalone DataSource for TypeORM CLI
├── app.module.ts           ← TypeORM config (migrationsRun, no synchronize)
├── migrations/             ← timestamped migration files
├── auth/
│   ├── auth.controller.ts  ← /auth/google, /auth/me, /auth/dev-login
│   ├── auth.service.ts     ← generateToken(), devLogin()
│   ├── dto/                ← DevLoginDto
│   ├── guards/             ← GoogleAuthGuard, JwtAuthGuard
│   └── strategies/         ← google.strategy (calls UsersService.findOrCreate),
│                              jwt.strategy (validates Bearer token)
└── users/
    ├── entities/user.entity.ts   ← User: uuid id, stringId (6-char unique), googleId,
    │                                email, name, avatar, onboardingStep, timestamps
    └── users.service.ts          ← findOrCreate (generates unique stringId), findById, findByEmail
```

`GET /auth/me` fetches the full user from the DB (not just the JWT payload) and strips `googleId` before returning. This is what `AuthService.fetchMe()` calls on the frontend after login.

### stringId generation

Each user gets a unique 6-character ID at registration. Charset: digits `1–9` + Spanish alphabet without Ñ = 35 characters (`123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`). Generated in `UsersService.generateUniqueStringId()` with a collision-retry loop.

### Frontend — Angular 19, standalone components, signals

```
frontend/src/app/
├── app.config.ts       ← provideRouter, provideHttpClient + authInterceptor, ServiceWorker
├── app.routes.ts       ← lazy-loaded routes, all protected with authGuard except /login and /auth/callback
├── core/
│   ├── services/auth.service.ts    ← signals: _token, _user → isLoggedIn, currentUser, token
│   ├── guards/auth.guard.ts        ← redirects to /login if not authenticated
│   └── interceptors/auth.interceptor.ts  ← attaches Bearer token to every request
└── pages/
    ├── login/          ← Google OAuth button + conditional Dev Auth form
    ├── auth-callback/  ← reads ?token= from URL, calls auth.handleCallback()
    ├── dashboard/      ← home screen with stats (placeholders) and bottom nav
    └── profile/        ← user profile: avatar, stringId badge, memberSince, stats
```

**Auth flow:**

```
Dev login:  POST /api/auth/dev-login → { token } → handleCallback(token) → fetchMe() → /dashboard
Google:     GET /api/auth/google → Google → GET /api/auth/google/callback → redirect to
            /auth/callback?token=JWT → handleCallback(token) → fetchMe() → /dashboard
```

`AuthService` persists token and user in `localStorage` under keys `sc_token` and `sc_user`. All signals are derived from these.

### UI conventions

- **Theme**: dark (`neutral-950` background, `neutral-900` cards, `neutral-800` borders)
- **Brand color**: `#00e87a` — available as `bg-brand`, `text-brand`, `border-brand` etc.
- **Icons**: Google Material Symbols loaded via CDN. Use `<span class="material-symbols-outlined">icon_name</span>`. Add `filled` class for filled variant.
- **Touch targets**: minimum `min-h-[44px]` on all interactive elements.
- **Safe areas**: use `env(safe-area-inset-*)` for iOS notch/home bar padding.
- **Bottom nav**: fixed on mobile (`sm:hidden`), 5 items with center FAB raised with `-mt-5`.
- All **user-facing text must be in Spanish**. Code (variables, functions, types, comments) must be in **English**.

### Environments

| File                           | `apiUrl`                        |
|--------------------------------|---------------------------------|
| `environment.ts`               | `http://localhost:3000/api`     |
| `environment.production.ts`    | production URL                  |
| `environment.staging.ts`       | staging URL                     |

The Angular dev server proxies `/api` to the backend via `proxy.conf.json`.

## Planned modules (not yet implemented)

Refer to `docs/plan-desarrollo.md` for the full roadmap. Next modules to build: `EventsModule`, `TeamsModule`, `InvitationsModule`, `TournamentsModule`, `ResultsModule`, `NotificationsModule`, `StatsModule`. The Angular routes `/events`, `/teams`, `/profile/:id`, `/tournaments/:id`, `/e/:token` (public, no auth) are planned but not yet created.
