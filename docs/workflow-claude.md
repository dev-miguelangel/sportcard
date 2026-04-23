# Workflow con Claude Code — SportCard

Guía para trabajar eficientemente con Claude Code en este monorepo minimizando el uso de tokens.

---

## El problema que queremos evitar

Una sesión larga que toca muchos archivos agota el contexto. Cuando se corta a la mitad, el estado queda inconsistente y otro agente (o Claude en una sesión nueva) no tiene suficiente contexto para continuar sin errores.

**Regla de oro: una sesión = un slice vertical completo + commit verificado.**

---

## Granularidad correcta de una tarea

| Demasiado grande | Tamaño correcto | Demasiado pequeño |
|---|---|---|
| "Implementa el portal de torneos completo" | "Crea la página /tournaments/:id con sus tabs" | "Cambia el color del botón" |
| "Agrega módulo Fixtures al backend" | "Agrega el endpoint `generateFixture` con su servicio y migración" | "Renombra una variable" |

Referencia: si no puedes escribir el prompt en 5 líneas o menos, divídelo.

---

## Plantillas de prompt por tipo de tarea

### A. Nuevo endpoint backend

```
Contexto:
- CLAUDE.md (adjunto o ya cargado)
- backend/src/<módulo>/<módulo>.service.ts
- backend/src/<módulo>/<módulo>.controller.ts
- backend/src/<módulo>/entities/<entity>.entity.ts

Tarea:
Agrega el endpoint PATCH /tournaments/:id/status al módulo Tournaments.
- DTO: UpdateTournamentStatusDto con campo status: TournamentStatus
- Servicio: método updateStatus(id, organizerId, status) que valida que el caller es organizador
- Controlador: PATCH handler con JwtAuthGuard
- NO crear migración (el schema no cambia)
- NO modificar ningún otro archivo
```

**Qué incluir:** solo los archivos que toca el endpoint (servicio + controlador + DTO).
**Qué omitir:** app.module.ts (no cambia), otros módulos, frontends.

---

### B. Nueva página Angular (frontend-torneos)

```
Contexto:
- CLAUDE.md (adjunto o ya cargado)
- frontend-torneos/src/app/core/services/<servicio>.service.ts  ← el que usa la página
- frontend-torneos/src/app/app.routes.ts  ← solo para ver el patrón de rutas

Tarea:
Crea la página /tournaments/:id con dos tabs: Equipos y Fixture.
- Archivo nuevo: pages/tournaments/detail/tournament-detail.component.ts + .html
- Agrega la ruta lazy en app.routes.ts
- Usa signals para todo el estado; no BehaviorSubject
- Tema dark como el resto del portal
- NO modificar ningún servicio existente
```

**Qué incluir:** solo el servicio que la página va a consumir, y las rutas para ver el patrón.
**Qué omitir:** otros componentes, SCSS global, environments.

---

### C. Migración de base de datos

```
Contexto:
- backend/src/<módulo>/entities/<entity>.entity.ts  ← entidad modificada

Tarea:
Genera la migración para el campo `shareToken` que se agregó a Tournament.
- Archivo: backend/src/migrations/<timestamp>-AddShareTokenToTournament.ts
- Solo ALTER TABLE, no CREATE TABLE
- down() debe revertir el cambio
- NO modificar app.module.ts ni ningún otro archivo
```

Las migraciones son de alcance muy pequeño. Siempre sesión separada + `docker compose up --build` para verificar antes de continuar.

---

### D. Bug fix

```
Contexto:
- El error exacto (mensaje de consola o HTTP response)
- backend/src/<módulo>/<archivo-sospechoso>.ts

Tarea:
Fix: al crear un torneo desde frontend-torneos, el backend responde 403.
El error es "CORS policy blocked" en la consola del browser.
Solo toca backend/src/main.ts.
```

Regla: **siempre incluye el mensaje de error exacto**. Describe el síntoma observable, no la causa que supones.

---

### E. Exploración antes de escribir código (usa subagente)

Cuando no sabes qué archivos tocar:

```
/explorar: ¿Cómo funciona el flujo de autenticación en este backend?
           Solo quiero entender qué archivos leer — no generar código todavía.
```

El subagente `Explore` responde con los archivos relevantes y su propósito. Luego usas esa lista para armar el prompt de implementación. Esto evita cargar archivos innecesarios en la sesión principal.

---

## Protocolo de sesión

```
1. git status  →  confirma que partes de una base limpia
2. Define el slice (qué endpoint/página/bug)
3. Arma el prompt con solo los archivos relevantes
4. Claude implementa
5. docker compose up --build  (o npm run test)
6. Verifica manualmente el happy path
7. git commit  (punto de no retorno)
8. Siguiente slice
```

Si Claude llega al 70-80% del contexto sin haber terminado el slice → **para, hace commit de lo que funciona, y abre sesión nueva** para el resto.

---

## Qué NO poner en el contexto

| Innecesario | Por qué |
|---|---|
| `app.module.ts` completo | Solo se necesita si cambias entities[] o imports[] |
| Todos los archivos de un módulo | Solo los archivos que la tarea toca |
| Migraciones antiguas | Solo la migración actual que estás escribiendo |
| `package.json` / `angular.json` | Solo si el problema es de configuración de build |
| Archivos del otro frontend | Frontend y frontend-torneos son independientes |
| `docker-compose.yml` | Solo para tareas de infra |

---

## Cómo delegar con subagentes

### Exploración de código (no genera código)
```
Subagente Explore: "¿Cómo genera el fixture el FixturesService?
                    ¿Qué archivos debo leer para entender la lógica de grupos?"
```

### Diseño antes de implementar (sesión costosa)
```
Subagente Plan: "Diseña cómo implementar el bracket SVG para el formato cup.
                 Solo el plan — no código todavía."
```
Revisas el plan, lo apruebas, y luego pides la implementación en sesión separada.

### Tareas independientes en paralelo
```
Agente A: "Crea el endpoint GET /tournaments/:id/standings"
Agente B: "Crea el componente StandingsTable en frontend-torneos"
```
Solo en paralelo cuando A y B no se modifican mutuamente.

---

## Fases del plan torneos.md — cómo dividirlas

Cada fase del plan ya está bien definida. El error fue tratar una fase entera como una sesión. La división correcta:

**Fase 3 (Fixture) → 4 sesiones:**
1. Entidad `Match` + migración
2. `FixturesService.generateFixture()` con tests manuales curl
3. `FixturesService.scheduleMatch()` + `recordResult()`
4. `FixturesController` + `FixturesPublicController`

**Fase 5 (Portal) → 1 sesión por página:**
1. Scaffold base (routing, layout, auth)
2. Página `/teams` + `/teams/:id`
3. Página `/tournaments` + `/tournaments/new`
4. Página `/tournaments/:id` (tabs Equipos + Fixture)
5. Página `/tournaments/t/:shareToken` (pública)

---

## Checklist de calidad pre-commit

```
[ ] docker compose up --build  →  no errores en logs
[ ] Backend inicia sin errores de migración
[ ] El endpoint nuevo responde correctamente con curl
[ ] La página nueva carga y muestra datos reales
[ ] No hay errores TypeScript (mcp__ide__getDiagnostics o tsc --noEmit)
[ ] git diff  →  solo los archivos esperados cambian
```

---

## Señales de que la sesión se está descontrolando

- Claude empieza a "suponer" cómo funciona algo en lugar de leer el código
- El response incluye "y también modifiqué X, Y, Z" para archivos que no mencionaste
- Claude reescribe componentes completos cuando solo pediste un cambio
- Aparece `// TODO` o comentarios de "provisional" en el código generado

Cuando esto ocurre: **para, revisa el diff, descarta lo que no pediste, commitea solo lo correcto.**
