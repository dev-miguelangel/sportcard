# Plan: CRUD de Deportes administrables en vista Admin

> **Generado:** 2026-04-23
> **Slices:** 4
> **Estimado:** 4 sesiones de Claude Code

## Resumen

Se crea un módulo `Sports` en el backend (entidad + migración con seed de los 15 deportes iniciales + CRUD con AdminGuard) y se añade una pestaña "Deportes" en el admin panel existente del frontend. El formulario de crear/editar incluye un selector de iconos de Material Symbols filtrable por texto (lista curada de ~30 iconos de la categoría deportes). El Slice 4 —reemplazar los maps de sports hardcodeados en 5+ componentes— es opcional y ejecutable de forma independiente después de verificar el Slice 3 en producción.

## Dependencias

Ninguna. El admin panel, el AdminGuard y el sistema de autenticación ya están funcionando en la rama `activities`.

## Diagrama de slices

```
Slice 1 (entidad + migración con seed)
         ↓
Slice 2 (CRUD endpoints backend)
         ↓
Slice 3 (frontend: pestaña admin + icon picker)
         ↓ (opcional, rama separada)
Slice 4 (frontend: reemplazar SPORT_EMOJIS / SPORT_GRADIENTS hardcodeados con API)
```

---

## Slice 1 — Entidad Sport + migración con seed inicial

**Objetivo:** La tabla `sports` existe en PostgreSQL con los 15 deportes pre-cargados. El backend arranca sin errores de migración.

**Archivos a crear/modificar:**
- `backend/src/sports/entities/sport.entity.ts` — entidad TypeORM: id, name, icon, emoji, gradient, isActive, order
- `backend/src/sports/sports.module.ts` — módulo shell (TypeOrmModule.forFeature([Sport]), sin servicio ni controlador aún)
- `backend/src/migrations/1776901000000-CreateSportsTable.ts` — CREATE TABLE + INSERT de los 15 deportes
- `backend/src/app.module.ts` — añadir Sport a entities[], import SportsModule
- `backend/src/data-source.ts` — añadir Sport a entities[]

**Archivos de contexto para el prompt:**
- `backend/src/events/entities/event.entity.ts` (patrón de entidad TypeORM)
- `backend/src/migrations/1776816000000-CreateEventsTable.ts` (patrón de up/down)
- `backend/src/notifications/notifications.module.ts` (patrón de módulo mínimo)

**Prompt listo para copiar:**

---
*Asegúrate de que CLAUDE.md está cargado en la sesión.*

Tarea: Crea la entidad `Sport`, su módulo y la migración con seed de datos iniciales en el backend SportCard (NestJS + TypeORM).

Archivos a crear/modificar:

1. `backend/src/sports/entities/sport.entity.ts` — entidad TypeORM con campos:
   - `id`: number, PK con @PrimaryGeneratedColumn()
   - `name`: string, @Column({ unique: true })
   - `icon`: string, @Column() — nombre del Material Symbol, ej: "sports_soccer"
   - `emoji`: string, @Column()
   - `gradient`: string, @Column() — valor CSS completo, ej: "linear-gradient(135deg,#003d20,#006b35)"
   - `isActive`: boolean, @Column({ default: true })
   - `order`: number, @Column({ default: 0 })

2. `backend/src/sports/sports.module.ts` — módulo mínimo con @Module({ imports: [TypeOrmModule.forFeature([Sport])] }).

3. `backend/src/migrations/1776901000000-CreateSportsTable.ts` — migración que en up() hace:
   CREATE TABLE sports con todos los campos + INSERT de estos 15 deportes (en orden, con order=0..14):
   - Fútbol, icon: sports_soccer, emoji: ⚽, gradient: linear-gradient(135deg,#003d20,#006b35)
   - Fútbol 7, icon: sports_soccer, emoji: ⚽, gradient: linear-gradient(135deg,#004d28,#007a40)
   - Básquetbol, icon: sports_basketball, emoji: 🏀, gradient: linear-gradient(135deg,#5c1f00,#9c3d00)
   - Tenis, icon: sports_tennis, emoji: 🎾, gradient: linear-gradient(135deg,#2d4a00,#4a7a00)
   - Running, icon: directions_run, emoji: 🏃, gradient: linear-gradient(135deg,#003366,#0055aa)
   - Ciclismo, icon: directions_bike, emoji: 🚴, gradient: linear-gradient(135deg,#002244,#003d7a)
   - Natación, icon: pool, emoji: 🏊, gradient: linear-gradient(135deg,#001f3f,#003d7a)
   - Balonmano, icon: sports_handball, emoji: 🤾, gradient: linear-gradient(135deg,#1a0033,#3d0080)
   - Trekking, icon: hiking, emoji: 🥾, gradient: linear-gradient(135deg,#1a0f00,#4a2d00)
   - Escalada, icon: landscape, emoji: 🧗, gradient: linear-gradient(135deg,#0d1a00,#1f4000)
   - Voleibol, icon: sports_volleyball, emoji: 🏐, gradient: linear-gradient(135deg,#1a1a00,#4a4a00)
   - Pádel, icon: sports_tennis, emoji: 🏓, gradient: linear-gradient(135deg,#003322,#006644)
   - Rugby, icon: sports_rugby_football, emoji: 🏉, gradient: linear-gradient(135deg,#2d1600,#5c2d00)
   - Crossfit, icon: fitness_center, emoji: 💪, gradient: linear-gradient(135deg,#1a0000,#4d0000)
   - Yoga, icon: self_improvement, emoji: 🧘, gradient: linear-gradient(135deg,#1a001a,#3d003d)
   En down(): DROP TABLE IF EXISTS sports

4. `backend/src/app.module.ts` — añadir `Sport` al array `entities[]` e importar `SportsModule` en imports[].

5. `backend/src/data-source.ts` — añadir `Sport` al array `entities[]`.

Para referencia, lee:
- `backend/src/events/entities/event.entity.ts` (patrón de entidad TypeORM)
- `backend/src/migrations/1776816000000-CreateEventsTable.ts` (patrón de migración con up/down)

Restricciones:
- NO crear servicio ni controlador en este slice
- NO usar synchronize — solo la migración define el schema
- El id debe usar @PrimaryGeneratedColumn() (serial integer, no UUID)
---

**Verificación:**
```bash
docker compose up --build
docker compose exec postgres psql -U sportcard -c "SELECT id, name, icon FROM sports ORDER BY \"order\";"
```
- [ ] Backend arranca sin errores de migración en los logs
- [ ] `SELECT * FROM sports` devuelve 15 filas
- [ ] `git diff` muestra exactamente 5 archivos modificados/creados

---

## Slice 2 — CRUD endpoints de deportes (admin + público)

**Objetivo:** `GET /api/sports` devuelve la lista de deportes activos sin auth. Los endpoints de admin `GET/POST/PATCH/DELETE /api/admin/sports` funcionan correctamente con token de admin.

**Archivos a crear/modificar:**
- `backend/src/sports/dto/create-sport.dto.ts` — DTO con campos del formulario
- `backend/src/sports/dto/update-sport.dto.ts` — PartialType(CreateSportDto)
- `backend/src/sports/sports.service.ts` — findAll (público), findAllAdmin (paginado+búsqueda), create, update, remove
- `backend/src/sports/sports.controller.ts` — rutas mixtas (público + AdminGuard por ruta)
- `backend/src/sports/sports.module.ts` — actualizar para incluir service y controller

**Archivos de contexto para el prompt:**
- `backend/src/sports/entities/sport.entity.ts`
- `backend/src/admin/admin.service.ts` (patrón de paginación + búsqueda)
- `backend/src/admin/admin.controller.ts` (patrón de AdminGuard)

**Prompt listo para copiar:**

---
*Asegúrate de que CLAUDE.md está cargado en la sesión.*

Tarea: Implementa el servicio y controlador CRUD del módulo Sports. El Slice 1 ya creó la entidad Sport y la migración.

Archivos a crear/modificar:

1. `backend/src/sports/dto/create-sport.dto.ts` — campos: name (string), icon (string), emoji (string), gradient (string), isActive (boolean, opcional, default true), order (number, opcional, default 0).

2. `backend/src/sports/dto/update-sport.dto.ts` — PartialType(CreateSportDto).

3. `backend/src/sports/sports.service.ts` — con inyección de @InjectRepository(Sport):
   - `findAll()`: isActive = true, ORDER BY order ASC
   - `findAllAdmin(search?: string, page = 1, limit = 20)`: todos los deportes paginados, si hay search filtra por name ILIKE %search%
   - `create(dto: CreateSportDto)`: inserta y retorna la entidad
   - `update(id: number, dto: UpdateSportDto)`: actualiza y retorna la entidad
   - `remove(id: number)`: hard delete, lanza NotFoundException si no existe

4. `backend/src/sports/sports.controller.ts` — sin prefijo de clase @Controller(), rutas absolutas:
   - @Get('sports') sin guard → findAll()
   - @Get('admin/sports') @UseGuards(AdminGuard) → findAllAdmin(search?, page?, limit?)
   - @Post('admin/sports') @UseGuards(AdminGuard) → create(dto)
   - @Patch('admin/sports/:id') @UseGuards(AdminGuard) → update(id, dto)
   - @Delete('admin/sports/:id') @UseGuards(AdminGuard) → remove(id)

5. `backend/src/sports/sports.module.ts` — añadir SportsService a providers y SportsController a controllers. Exportar SportsService.

Para referencia, lee:
- `backend/src/sports/entities/sport.entity.ts` (la entidad ya creada)
- `backend/src/admin/admin.controller.ts` (patrón de AdminGuard import path y uso)

Restricciones:
- NO modificar admin.controller.ts ni admin.service.ts
- NO crear migración (el schema no cambia en este slice)
- El AdminGuard se importa desde '../auth/guards/admin.guard' (verificar ruta exacta leyendo el archivo)
---

**Verificación:**
```bash
# Público (sin token)
curl http://localhost:3000/api/sports | jq '.[].name'

# Requiere token de admin (obtener haciendo dev login)
TOKEN="<pega_aquí_token_admin>"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/admin/sports?search=fut"

# Crear deporte
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Squash","icon":"sports_tennis","emoji":"🎾","gradient":"linear-gradient(135deg,#1a0033,#3d0080)"}' \
  http://localhost:3000/api/admin/sports

# Actualizar
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive":false}' \
  http://localhost:3000/api/admin/sports/16
```
- [ ] GET /api/sports devuelve 15 deportes sin auth
- [ ] GET /api/admin/sports con token admin funciona con paginación
- [ ] POST/PATCH/DELETE funcionan correctamente
- [ ] Sin token o con token no-admin retorna 401/403
- [ ] `git diff` muestra exactamente 5 archivos

---

## Slice 3 — Frontend: pestaña Deportes en admin + icon picker inline

**Objetivo:** El admin panel tiene una quinta pestaña "Deportes" con tabla CRUD completa. El formulario de crear/editar incluye un selector de iconos Material Symbols filtrable por texto, sin componentes externos.

**Archivos a modificar:**
- `frontend/src/app/core/services/admin.service.ts` — añadir interface AdminSport + 4 métodos CRUD
- `frontend/src/app/pages/admin/admin.component.ts` — añadir signals y lógica para el tab deportes
- `frontend/src/app/pages/admin/admin.component.html` — añadir tab button + contenido del tab + modal

**Archivos de contexto para el prompt:**
- `frontend/src/app/core/services/admin.service.ts` (leer completo para añadir al final)
- `frontend/src/app/pages/admin/admin.component.ts` (leer completo)
- `frontend/src/app/pages/admin/admin.component.html` (leer completo)

**Prompt listo para copiar:**

---
*Asegúrate de que CLAUDE.md está cargado en la sesión.*

Tarea: Añade la pestaña "Deportes" al admin panel del frontend SportCard. Los endpoints backend ya existen (Slices 1 y 2 completados): GET/POST/PATCH/DELETE /api/admin/sports y GET /api/sports.

Lee los 3 archivos completos antes de modificar.

Archivos a modificar:

1. `frontend/src/app/core/services/admin.service.ts` — añadir al final:
   - Interface `AdminSport`: { id: number; name: string; icon: string; emoji: string; gradient: string; isActive: boolean; order: number }
   - Interface `PagedSports`: { data: AdminSport[]; total: number }
   - Métodos que usan this.http y environment.apiUrl:
     * getSports(page=1, limit=20, search=''): Observable<PagedSports> → GET /admin/sports
     * createSport(data): Observable<AdminSport> → POST /admin/sports
     * updateSport(id, data): Observable<AdminSport> → PATCH /admin/sports/:id
     * deleteSport(id): Observable<void> → DELETE /admin/sports/:id

2. `frontend/src/app/pages/admin/admin.component.ts` — añadir:
   - Tipo 'sports' al union type del tab activo si existe
   - Signals: sports=signal<AdminSport[]>([]), sportsTotal=signal(0), sportsPage=signal(1), sportsSearch=signal(''), sportsLoading=signal(false)
   - Signals del modal: showSportModal=signal(false), editingSport=signal<AdminSport|null>(null)
   - sportForm: objeto reactive con signal o similar para name, icon, emoji, gradient, isActive, order
   - iconPickerOpen=signal(false), iconSearch=signal('')
   - Constante SPORTS_ICONS: string[] con estos nombres de Material Symbols:
     sports_soccer, sports_basketball, sports_tennis, sports_baseball, sports_football,
     sports_golf, sports_handball, sports_hockey, sports_rugby_football, sports_volleyball,
     sports_kayaking, sports_mma, sports_martial_arts, sports_motorsports, sports_cricket,
     sports_esports, sports_kabaddi, sports_score, directions_bike, directions_run,
     pool, hiking, fitness_center, self_improvement, skateboarding, rowing,
     surfing, downhill_skiing, snowboarding, paragliding
   - computed filteredIcons(): SPORTS_ICONS.filter(i => i.includes(iconSearch().toLowerCase()))
   - Métodos: loadSports(), saveSport(), confirmDeleteSport(id), openCreateSport(), openEditSport(sport), closeSportModal(), selectIcon(icon)

3. `frontend/src/app/pages/admin/admin.component.html` — añadir:
   a) Nuevo botón en el tab bar (justo después del último tab existente):
      icon: sports_soccer, label: Deportes, id: sports
   b) Bloque @if(activeTab()==='sports') con:
      - Header: título "Deportes", input de búsqueda, botón "Nuevo deporte"
      - Tabla: columnas [Icono (Material Symbol renderizado), Nombre, Emoji, Estado (badge verde/gris), Orden, Acciones (Editar/Eliminar)]
      - Estado vacío: mensaje + CTA si !sportsLoading() && sports().length === 0
      - Estado loading: spinner igual al de otros tabs
      - Paginación con botones Anterior/Siguiente
   c) Modal overlay @if(showSportModal()):
      - Overlay negro semitransparente
      - Card centrada con campos del formulario:
        * Input text: Nombre
        * Input text: Emoji
        * Input text: Gradient (CSS)
        * Toggle checkbox: Activo
        * Input number: Orden
        * Sección Icono: muestra el icono actual renderizado como Material Symbol + botón "Cambiar icono"
      - Panel del icon picker @if(iconPickerOpen()):
        * Input de búsqueda para filtrar filteredIcons()
        * Grid 4 cols de iconos renderizados con <span class="material-symbols-outlined">{{icon}}</span>
        * Al hacer clic en icono: selectIcon(icon), cierra picker
      - Footer: botón Cancelar + botón Guardar

Restricciones:
- NO crear archivos nuevos (solo modificar los 3 listados)
- NO usar BehaviorSubject ni ngRx — solo signals
- El modal debe seguir el mismo patrón dark que el resto (neutral-950 overlay, neutral-900 card)
- Los iconos se renderizan con <span class="material-symbols-outlined">{{nombre_icono}}</span> (Material Symbols ya está cargado en index.html)
- El icon picker es inline en el modal, no un componente separado
---

**Verificación:**
- [ ] Pestaña "Deportes" visible en la barra de navegación del admin
- [ ] La tabla carga los 15 deportes al activar la pestaña
- [ ] La búsqueda filtra deportes al escribir
- [ ] "Nuevo deporte" abre el modal con formulario vacío
- [ ] El icon picker filtra iconos al escribir en su input
- [ ] Al hacer clic en un icono se selecciona y cierra el picker
- [ ] Guardar llama al endpoint y recarga la tabla
- [ ] "Editar" abre el modal con datos pre-llenados
- [ ] "Eliminar" pide window.confirm() y llama al endpoint
- [ ] `git diff` muestra exactamente 3 archivos

---

## Slice 4 (opcional) — Reemplazar SPORT_EMOJIS / SPORT_GRADIENTS hardcodeados con API

**Objetivo:** Los componentes que duplicaban `SPORT_EMOJIS` y `SPORT_GRADIENTS` obtienen los datos desde `GET /api/sports`. Se elimina la duplicación en ~6 componentes.

**Archivos a crear/modificar:**
- `frontend/src/app/core/services/sports.service.ts` — nuevo servicio singleton con caché en signal
- `frontend/src/app/pages/events/create/event-create.component.ts` — reemplaza SPORTS_WITH_EMOJI
- `frontend/src/app/pages/events/list/event-list.component.ts` — reemplaza FILTER_SPORTS
- `frontend/src/app/pages/dashboard/dashboard.component.ts` — reemplaza SPORT_EMOJIS y SPORT_GRADIENTS
- `frontend/src/app/pages/activities/activities.component.ts` — reemplaza SPORTS y SPORT_GRADIENTS

**Advertencia:** Este slice toca 5 componentes y es el más propenso a regresiones. Ejecutar solo después de verificar el Slice 3 en producción y probar manualmente crear evento + filtros + dashboard antes de commitear.

---

## Notas de implementación

- El campo `icon` almacena el nombre del Material Symbol como string (`"sports_soccer"`), no el codepoint Unicode. Se renderiza con `<span class="material-symbols-outlined">sports_soccer</span>`.
- La lista `SPORTS_ICONS` en el componente admin es curada manualmente a partir de `https://fonts.google.com/icons?icon.query=sports`. No se hace fetch al API de Google Fonts.
- Al eliminar un deporte desde el admin, los eventos, equipos y torneos existentes mantienen su campo `sport: string` sin cambios — no hay FK entre `sports` y las otras tablas. El campo es solo de referencia.
- La migración incluye seed de datos. Si el backend ya corrió sin esta migración, `npm run migration:run` aplica el CREATE TABLE + INSERT sin afectar las tablas existentes.
- El endpoint público `GET /api/sports` solo retorna deportes con `isActive = true`. Si se desactiva un deporte en admin, desaparece del dropdown de crear evento (después del Slice 4).

## Señales de que algo salió mal

- **Slice 1**: Claude usa `synchronize: true` o modifica `event.entity.ts` para añadir validación de deporte. Descartar.
- **Slice 2**: Claude modifica `admin.controller.ts` en lugar de crear `sports.controller.ts`. Descartar esos cambios.
- **Slice 2**: Claude crea un endpoint `/sports/icons` para listar los iconos de Material Symbols. No necesario — la lista es estática en el frontend.
- **Slice 3**: Claude crea un componente separado `sport-icon-picker.component.ts`. El plan indica inline en el modal de admin.
- **Slice 3**: `git diff` muestra archivos fuera de los 3 esperados (app.routes.ts, environments, etc.). Descartar esos cambios.
- **Cualquier slice**: Claude añade `// TODO` o implementaciones parciales. Pedir que complete o descartar.
