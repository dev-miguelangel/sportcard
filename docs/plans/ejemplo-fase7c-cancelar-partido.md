# Plan: Cancelar / posponer partido (Fase 7c)

> **Generado:** 2026-04-23
> **Slices:** 3
> **Estimado:** 3 sesiones de Claude Code

## Resumen

Agrega el endpoint para cancelar o posponer un partido. Cuando el partido tiene un evento SportCard asociado, ese evento también se cancela y los jugadores reciben notificación. Se divide en 3 slices porque el backend (lógica + endpoint) y la UI (botón en el portal) son independientes y deben verificarse por separado.

## Dependencias

- Módulo Fixtures debe estar implementado (Fases 3–4)
- Backend corriendo con migraciones aplicadas
- Fixture generado con al menos un partido en estado `scheduled`

## Diagrama de slices

```
Slice 1 (backend: servicio) → Slice 2 (backend: controlador) → Slice 3 (frontend-torneos: UI)
              depende de Fase 3
```

---

## Slice 1 — Lógica de cancelación en FixturesService

**Objetivo:** `FixturesService.cancelMatch()` que cambia el estado del partido y del evento asociado, y envía notificaciones.

**Archivos a crear/modificar:**
- `backend/src/fixtures/fixtures.service.ts` — nuevo método `cancelMatch()`

**Archivos de contexto para el prompt** (solo los que Claude necesita leer):
- `backend/src/fixtures/fixtures.service.ts` (para entender la estructura existente)
- `backend/src/fixtures/entities/match.entity.ts` (campos disponibles)
- `backend/src/notifications/notifications.service.ts` (para ver cómo enviar notifs)

**Prompt listo para copiar:**

---
*Contexto del proyecto: CLAUDE.md está cargado en esta sesión.*

Tarea: Agrega el método `cancelMatch` al `FixturesService` existente en `backend/src/fixtures/fixtures.service.ts`.

Comportamiento requerido:
- Signature: `cancelMatch(matchId: string, organizerId: string, status: 'cancelled' | 'postponed'): Promise<MatchDto>`
- Valida que `organizerId` es el organizador del torneo del partido (usa el mismo patrón de `assertOrganizer` del `TournamentsService`)
- Cambia `match.status` al valor recibido
- Si `match.eventId` no es null, actualiza el `Event` asociado a `status = EventStatus.CANCELLED`
- Llama a `notifSvc.createMatchResult(...)` para cada `EventParticipant` del evento (reutiliza el patrón de `scheduleMatch`)
- Retorna el `MatchDto` actualizado

Para referencia, lee:
- `backend/src/fixtures/fixtures.service.ts` — para ver la estructura de `scheduleMatch` y `recordResult` que debes seguir
- `backend/src/fixtures/entities/match.entity.ts` — para ver los campos disponibles

Restricciones:
- NO agregar el endpoint todavía (eso es el Slice 2)
- NO crear migraciones (el schema no cambia)
- NO modificar ningún otro archivo
- El método debe poder inyectar el `EventRepository` y `EventParticipantRepository` — si no están en el constructor, agrégalos

---

**Verificación:**
```bash
# No hay endpoint todavía — verificación manual mirando el código
# Confirma que fixtures.service.ts compila sin errores:
cd backend && npx tsc --noEmit
```
- [ ] `npx tsc --noEmit` en `backend/` no reporta errores
- [ ] El método existe y tiene la firma correcta
- [ ] `git diff` solo muestra cambios en `fixtures.service.ts`

---

## Slice 2 — Endpoint PATCH .../cancel en FixturesController

**Objetivo:** El endpoint `PATCH /tournaments/:id/matches/:matchId/cancel` responde correctamente.

**Archivos a crear/modificar:**
- `backend/src/fixtures/fixtures.controller.ts` — nuevo handler `cancelMatch`

**Archivos de contexto para el prompt** (solo los que Claude necesita leer):
- `backend/src/fixtures/fixtures.controller.ts` (estructura actual)

**Prompt listo para copiar:**

---
*Contexto del proyecto: CLAUDE.md está cargado.*

El `FixturesService.cancelMatch()` ya existe (implementado en la sesión anterior).

Tarea: Agrega el handler al `FixturesController` en `backend/src/fixtures/fixtures.controller.ts`.

```
PATCH /tournaments/:id/matches/:matchId/cancel
Body: { status: 'cancelled' | 'postponed' }
Auth: JwtAuthGuard
```

Sigue exactamente el mismo patrón de `scheduleMatch` y `recordResult` que ya existen en el controlador.

Restricciones:
- NO modificar `fixtures.service.ts`
- NO modificar `fixtures.module.ts`
- NO crear DTOs separados — usa el tipo inline como hacen los otros endpoints

---

**Verificación:**
```bash
# Con el backend corriendo (docker compose up):
TOKEN="<jwt-de-dev-login>"
TOURNAMENT_ID="<uuid-de-un-torneo>"
MATCH_ID="<uuid-de-un-partido-scheduled>"

curl -X PATCH "http://localhost:3000/api/tournaments/$TOURNAMENT_ID/matches/$MATCH_ID/cancel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}'
# Debe responder 200 con el partido actualizado (status: "cancelled")
```
- [ ] Responde 200 con `status: "cancelled"` o `"postponed"`
- [ ] Si el partido tenía `eventId`, el evento en BD tiene `status: cancelled`
- [ ] Los jugadores del evento reciben notificación (verifica en `/api/notifications`)
- [ ] `git diff` solo muestra cambios en `fixtures.controller.ts`

---

## Slice 3 — Botón cancelar en tournament-detail (frontend-torneos)

**Objetivo:** El organizador puede cancelar un partido desde la tab Fixture del portal.

**Archivos a crear/modificar:**
- `frontend-torneos/src/app/pages/tournaments/detail/tournament-detail.component.ts` — acción `cancelMatch()`
- `frontend-torneos/src/app/pages/tournaments/detail/tournament-detail.component.html` — botón en la fila del partido
- `frontend-torneos/src/app/core/services/fixtures.service.ts` — método `cancelMatch()`

**Archivos de contexto para el prompt** (solo los que Claude necesita leer):
- `frontend-torneos/src/app/core/services/fixtures.service.ts`
- `frontend-torneos/src/app/pages/tournaments/detail/tournament-detail.component.ts`

**Prompt listo para copiar:**

---
*Contexto del proyecto: CLAUDE.md está cargado.*

El endpoint `PATCH /tournaments/:id/matches/:matchId/cancel` ya existe en el backend.

Tarea: Agrega la acción de cancelar partido al portal de torneos.

**En `fixtures.service.ts`:** agrega el método:
```typescript
cancelMatch(tournamentId: string, matchId: string, status: 'cancelled' | 'postponed'): Observable<MatchItem>
```

**En `tournament-detail.component.ts`:** agrega:
- Signal `cancellingMatch = signal<string | null>(null)` (guarda el matchId que se está cancelando)
- Método `cancelMatch(matchId: string, status: 'cancelled' | 'postponed')` que llama al servicio y actualiza `matches()`

**En el template HTML:** en la fila de cada partido con `status === 'scheduled'`, agrega un botón de cancelar que solo aparece si `t.isOrganizer`. Al hacer click llama a `cancelMatch(match.id, 'cancelled')`. Mientras procesa, muestra el spinner del matchId.

Convenciones obligatorias:
- Signals para todo el estado (no BehaviorSubject)
- Icono: `cancel` de Material Symbols
- Color del botón: `text-red-400 hover:text-red-300`
- Texto: "Cancelar partido"
- NO modificar ningún otro componente ni servicio

---

**Verificación:**
- [ ] El botón "Cancelar partido" aparece en partidos `scheduled` solo para el organizador
- [ ] Al hacer click, el partido cambia a `cancelled` en la UI sin reload
- [ ] El botón no aparece en partidos ya jugados o cancelados
- [ ] `git diff` muestra solo los 3 archivos esperados

---

## Notas de implementación

- El `EventRepository` y `EventParticipantRepository` deben agregarse al constructor de `FixturesService` si no están. Verificar en `fixtures.module.ts` que `Event` y `EventParticipant` están en `TypeOrmModule.forFeature([...])`.
- `NotificationsService` ya está inyectado en `FixturesService` — reutilizar directamente.
- El enum `MatchStatus` ya tiene `CANCELLED` y `POSTPONED` — no agregar valores nuevos.

## Señales de que algo salió mal

- Claude modifica `tournaments.service.ts` o `teams.service.ts` → fuera de scope
- Claude crea una nueva migración → el schema no cambia, rechazar
- El template HTML usa `*ngIf` en lugar de `@if` → corregir antes de commitear
- Claude agrega un DTO class nuevo para el body → no es necesario, usar tipo inline como los otros endpoints
