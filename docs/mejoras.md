# SportCard — Mejoras de Arquitectura y Seguridad

> Análisis del estado actual (v1.0.0) e identificación de oportunidades de mejora.

---

## Índice

1. [Seguridad](#1-seguridad)
2. [Arquitectura del backend](#2-arquitectura-del-backend)
3. [Base de datos y rendimiento](#3-base-de-datos-y-rendimiento)
4. [Frontend](#4-frontend)
5. [Calidad y mantenibilidad](#5-calidad-y-mantenibilidad)
6. [Infraestructura](#6-infraestructura)
7. [Plan de acción](#7-plan-de-acción)

---

## 1. Seguridad

### 1.1 Sin rate limiting
**Estado actual**: no existe ningún throttler en el backend. Un atacante puede hacer miles de peticiones por segundo contra cualquier endpoint, incluyendo el login de desarrollo.

**Riesgo**: fuerza bruta en `/auth/dev-login`, abuso de la búsqueda de contactos para enumerar usuarios, denegación de servicio.

**Mejora**: agregar `@nestjs/throttler` con límites distintos por tipo de endpoint (auth más estricto, búsqueda moderado, resto normal).

---

### 1.2 Sin helmet
**Estado actual**: `main.ts` no usa `helmet`. Los headers HTTP de seguridad estándar (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, etc.) no se envían.

**Riesgo**: exposición a clickjacking, MIME sniffing, ataques XSS reflejado desde cabeceras.

**Mejora**: agregar `helmet()` en `main.ts` antes de registrar el prefijo global.

---

### 1.3 CORS demasiado permisivo en desarrollo
**Estado actual**: `app.enableCors` lee `FRONTEND_URL` del `.env`; si esa variable no está definida, el origen por defecto es `http://localhost:4200`. No hay validación de que en producción esté configurado correctamente.

**Riesgo**: si `FRONTEND_URL` se omite en producción, podría aceptar cualquier origen según la configuración del servidor.

**Mejora**: hacer que `FRONTEND_URL` sea obligatoria (usar `configService.getOrThrow`) y agregar una lista blanca explícita para staging/producción.

---

### 1.4 JWT sin refresh token
**Estado actual**: el token dura 7 días (`JWT_EXPIRES_IN='7d'`). No existe un mecanismo de refresh. Una vez robado, el token es válido durante toda su vida útil sin posibilidad de invalidarlo.

**Riesgo**: si un token es comprometido, el atacante tiene acceso durante días. No hay forma de forzar cierre de sesión del lado del servidor.

**Mejora**: implementar refresh tokens con rotación. El access token dura 15 minutos; el refresh token (guardado en cookie `httpOnly`) dura 30 días y genera un nuevo par en cada uso.

---

### 1.5 Endpoint de dev login accesible si la variable no está bien protegida
**Estado actual**: el endpoint `POST /auth/dev-login` devuelve 403 si `DEV_AUTH_ENABLED !== 'true'`, pero el endpoint existe y responde en producción. La contraseña se compara en texto plano contra el valor de la variable de entorno.

**Riesgo**: si alguien configura mal el entorno o filtra el `.env`, el endpoint queda expuesto.

**Mejora**: eliminar el endpoint completamente del build de producción mediante una variable en tiempo de compilación, o al menos registrar el controlador condicionalmente desde el módulo solo cuando `DEV_AUTH_ENABLED=true`.

---

### 1.6 Búsqueda de contactos expone emails
**Estado actual**: `GET /contacts/search?q=` hace `ILIKE` sobre `email`. Esto permite a cualquier usuario autenticado buscar por email parcial y confirmar si un correo está registrado en la plataforma.

**Riesgo**: enumeración de cuentas por correo electrónico. Vulnerabilidad de privacidad.

**Mejora**: eliminar `email` del campo de búsqueda pública. La búsqueda debería operar solo sobre `name` y `stringId`. El campo `email` puede reservarse para la invitación directa desde el formulario del organizador (que ya existe).

---

### 1.7 Datos sensibles sin control de acceso granular
**Estado actual**: los campos de salud (`bloodType`, `allergies`, `medicalConditions`, `medications`) y contacto de emergencia se devuelven en el endpoint `GET /auth/me` junto con el resto del perfil. No existe un endpoint separado ni control de acceso.

**Riesgo**: si en el futuro se expone el perfil de otros usuarios (ej. para el organizador ver los datos de un participante), se filtraría información médica sensible.

**Mejora**: separar los datos sensibles en DTOs distintos. El organizador debería recibir solo nombre, stringId y foto de los participantes, nunca datos médicos.

---

### 1.8 Sin validación de tamaño de payload
**Estado actual**: no hay límite explícito de tamaño en los cuerpos de las peticiones HTTP.

**Riesgo**: un atacante puede enviar payloads de varios MB en endpoints como creación de evento o actualización de perfil, consumiendo memoria y CPU.

**Mejora**: configurar `app.use(express.json({ limit: '100kb' }))` en `main.ts`.

---

### 1.9 Sin registro de acciones de administración
**Estado actual**: el panel de admin puede bloquear usuarios, cambiar roles y enviar broadcasts sin dejar ningún rastro auditable.

**Riesgo**: sin trazabilidad de quién hizo qué y cuándo. Un admin malicioso o una cuenta comprometida puede actuar sin evidencia.

**Mejora**: agregar un log de auditoría para las acciones del módulo admin (tabla `audit_log` o integración con un sistema de logs estructurados).

---

## 2. Arquitectura del backend

### 2.1 Sin notificaciones en tiempo real
**Estado actual**: las notificaciones in-app son pull (el cliente las solicita al cargar la página de notificaciones). No hay ningún mecanismo push.

**Impacto en UX**: el usuario no se entera de una invitación o aprobación hasta que abre la sección de notificaciones manualmente.

**Mejora**: implementar Server-Sent Events (SSE) para notificaciones en tiempo real. Es más simple que WebSockets para un canal unidireccional servidor → cliente y no requiere infraestructura adicional.

---

### 2.2 Sin caché
**Estado actual**: cada petición a `GET /events` o `GET /contacts/search` genera una consulta completa a la base de datos.

**Impacto**: a medida que la plataforma crece, consultas como el feed de eventos público o la búsqueda de usuarios se vuelven costosas con tráfico concurrente.

**Mejora**: agregar Redis como capa de caché. El feed público de eventos puede cachearse con TTL de 30 segundos. Los resultados de búsqueda de usuarios pueden cachearse por usuario+query con TTL corto.

---

### 2.3 Sin paginación en varios endpoints
**Estado actual**: `GET /events/mine`, `GET /contacts` y `GET /events/:id/participants` devuelven todos los registros sin paginación.

**Impacto**: un usuario con 200 eventos o 500 contactos descarga toda la lista en cada petición.

**Mejora**: agregar `?page` y `?limit` a todos los endpoints de listado. En el frontend, implementar scroll infinito o paginación por páginas.

---

### 2.4 Sin índices explícitos en la base de datos
**Estado actual**: TypeORM crea los índices primarios y los de las constraints `UNIQUE`, pero no hay índices en columnas de búsqueda frecuente.

**Impacto**: queries como `WHERE organizer_id = ?`, `WHERE user_id = ?` en `event_participants` o `WHERE status = 'open'` en `events` hacen full-table scan cuando la tabla crece.

**Mejora**: agregar `@Index` en las entidades para las columnas usadas en `WHERE` frecuentes: `Event.organizerId`, `Event.status`, `EventParticipant.userId`, `EventParticipant.eventId`, `Notification.userId`, `Contact.userId`.

---

### 2.5 Sin documentación automática de la API
**Estado actual**: la API no tiene documentación interactiva. El único documento es `docs/info.md`, que hay que mantener manualmente.

**Mejora**: integrar `@nestjs/swagger`. Con los decoradores `@ApiOperation`, `@ApiResponse` y `@ApiProperty` en los DTOs, se genera automáticamente una interfaz Swagger en `/api/docs`.

---

### 2.6 Sin versionado de API
**Estado actual**: todos los endpoints están bajo el prefijo `/api` sin versión. Cualquier cambio breaking afecta a todos los clientes.

**Mejora**: agregar versionado desde ahora (`/api/v1/...`). NestJS lo soporta nativamente con `app.enableVersioning()`.

---

### 2.7 Sin cola de trabajos para tareas asíncronas
**Estado actual**: el envío de notificaciones y la auto-finalización de eventos ocurren de forma síncrona dentro del ciclo de una petición HTTP.

**Impacto**: si en el futuro se agregan emails, notificaciones push o procesamiento de imágenes, bloquearían el hilo de la petición.

**Mejora**: integrar BullMQ (Redis) para procesar trabajos en background: envío de emails, notificaciones push, limpieza de eventos expirados como tarea programada.

---

## 3. Base de datos y rendimiento

### 3.1 Búsqueda con ILIKE no escala
**Estado actual**: la búsqueda de eventos y contactos usa `ILIKE '%term%'` en PostgreSQL, que no puede aprovechar índices B-tree estándar.

**Impacto**: con decenas de miles de usuarios o eventos, las búsquedas se vuelven lentas.

**Mejora**: agregar índices GIN con extensión `pg_trgm` para búsqueda de texto. Alternativamente, migrar la búsqueda a PostgreSQL Full-Text Search (`to_tsvector / to_tsquery`) que sí es indexable.

---

### 3.2 Sin soft deletes
**Estado actual**: no existe un mecanismo de borrado suave. Los registros eliminados desaparecen permanentemente de la base de datos.

**Impacto**: no hay forma de recuperar datos eliminados accidentalmente ni de auditar el historial.

**Mejora**: agregar `@DeleteDateColumn()` en TypeORM para las entidades principales (`User`, `Event`, `Contact`) y activar `withDeleted: false` por defecto en las consultas. Los registros "eliminados" se marcan con `deleted_at` pero permanecen en la base de datos.

---

### 3.3 Auto-finalización de eventos como efecto secundario de consultas
**Estado actual**: `autoFinishExpiredEvents()` se ejecuta dentro de `findPublic()` y `findMine()`, es decir, en el ciclo de una petición de lectura.

**Impacto**: las escrituras inesperadas en una operación de lectura pueden causar problemas de concurrencia y afectar el tiempo de respuesta.

**Mejora**: mover `autoFinishExpiredEvents()` a una tarea programada (cron job) con `@nestjs/schedule` que se ejecute cada 5 minutos independientemente de las peticiones.

---

## 4. Frontend

### 4.1 Mapas de deportes duplicados en múltiples componentes
**Estado actual**: `SPORT_GRADIENTS` y `SPORT_EMOJIS` están copiados en `event-list.component.ts`, `event-detail.component.ts`, `event-create.component.ts`, `dashboard.component.ts` y `event-invite.component.ts`.

**Impacto**: agregar un deporte nuevo requiere modificar todos esos archivos. Es fácil que queden inconsistentes.

**Mejora**: extraer ambos mapas a un archivo compartido `core/constants/sports.ts` e importarlos desde ahí.

---

### 4.2 Sin feedback de errores de red global
**Estado actual**: cada componente maneja sus propios errores de peticiones HTTP de forma local. No hay un interceptor que centralice el manejo de errores comunes (401, 403, 500, sin conexión).

**Mejora**: agregar un `ErrorInterceptor` que intercepte respuestas con error, muestre un toast/banner global para errores 500 o de red, y redirija a `/login` en caso de 401.

---

### 4.3 Sin estado de carga global / skeleton screens consistentes
**Estado actual**: cada página implementa sus propios skeletons de carga con distintos enfoques visuales.

**Mejora**: crear un componente `SkeletonComponent` reutilizable con variantes (card, list-item, text) para unificar la experiencia de carga.

---

### 4.4 Sin soporte offline
**Estado actual**: el `ServiceWorker` está registrado en `app.config.ts` (mencionado en el CLAUDE.md) pero no hay estrategia de caché offline definida.

**Mejora**: configurar una estrategia de caché en `ngsw-config.json` para que el feed de eventos y el dashboard funcionen con datos cacheados cuando no hay conexión.

---

### 4.5 Sin manejo de tokens expirados
**Estado actual**: si el JWT expira, las peticiones devuelven 401 pero el usuario no es redirigido automáticamente a `/login` ni se le muestra ningún mensaje.

**Mejora**: el `ErrorInterceptor` mencionado en 4.2 debería limpiar el `localStorage` y redirigir a `/login` ante un 401, con un mensaje explicativo.

---

## 5. Calidad y mantenibilidad

### 5.1 Sin tests
**Estado actual**: no existe ningún test en el proyecto (ni unitarios, ni de integración, ni e2e).

**Impacto**: cualquier cambio puede romper funcionalidad existente sin que haya forma automática de detectarlo.

**Mejora**: comenzar con tests de integración en el backend para los flujos críticos (join/leave evento, invitaciones, contactos) usando Jest + Supertest con una base de datos de test. En el frontend, tests unitarios para los servicios y guards.

---

### 5.2 Sin pipeline de CI/CD
**Estado actual**: no hay configuración de GitHub Actions ni ninguna otra herramienta de integración continua.

**Impacto**: el código se fusiona a `main` sin validación automática.

**Mejora**: crear un workflow de GitHub Actions que en cada PR ejecute: compilación TypeScript, linting y tests (cuando existan).

---

### 5.3 Variables de entorno sin validación al arrancar
**Estado actual**: si `JWT_SECRET` o `DATABASE_URL` no están definidas, el servidor arranca pero falla en tiempo de ejecución con errores poco descriptivos.

**Mejora**: usar `@nestjs/config` con un schema de validación Joi o Zod que verifique todas las variables requeridas en el bootstrap y falle con un mensaje claro si alguna falta.

---

## 6. Infraestructura

### 6.1 Sin health check
**Estado actual**: no existe un endpoint `/health` o `/api/health`.

**Impacto**: los load balancers y orquestadores (Kubernetes, Railway, Render) no pueden verificar si el servicio está activo.

**Mejora**: agregar `@nestjs/terminus` con un endpoint `GET /api/health` que verifique la conexión a la base de datos y devuelva el estado del servicio.

---

### 6.2 Sin gestión de secretos en producción
**Estado actual**: los secretos (`JWT_SECRET`, credenciales de Google OAuth, `DATABASE_PASSWORD`) viven en el archivo `.env`. No hay integración con un gestor de secretos.

**Mejora**: para producción, usar variables de entorno inyectadas por la plataforma de deployment (Railway, Render, AWS Secrets Manager) en lugar de archivos `.env` en el servidor.

---

### 6.3 Sin monitoreo ni trazabilidad
**Estado actual**: no hay integración con ninguna herramienta de observabilidad. Los errores en producción son invisibles.

**Mejora**: agregar Sentry para captura de errores (backend y frontend) y un sistema de logs estructurados (Winston o Pino en NestJS) que permita filtrar y alertar.

---

## 7. Plan de acción

Las mejoras están ordenadas por **impacto / esfuerzo**. Se recomienda implementarlas con Claude en el siguiente orden:

---

### Fase 1 — Seguridad básica (alta prioridad, bajo esfuerzo)
> Estas mejoras son pequeñas en código pero críticas antes de cualquier despliegue.

| # | Mejora | Referencia |
|---|--------|------------|
| 1 | Agregar `helmet()` en `main.ts` | §1.2 |
| 2 | Agregar `ThrottlerModule` con límites por endpoint | §1.1 |
| 3 | Limitar tamaño de payload en `main.ts` | §1.8 |
| 4 | Eliminar email del campo de búsqueda en contactos | §1.6 |
| 5 | Hacer `FRONTEND_URL` obligatoria con `getOrThrow` | §1.3 |
| 6 | Registrar el controlador de dev login condicionalmente | §1.5 |

**Prompt sugerido**:
```
Implementa las mejoras de seguridad básica del plan en docs/mejoras.md, secciones 1.1, 1.2, 1.3, 1.5, 1.6 y 1.8.
Incluye la migración si se requiere y actualiza los tests si existen.
```

---

### Fase 2 — Índices de base de datos y cron job (alta prioridad, bajo esfuerzo)
> Previenen degradación de rendimiento a medida que crecen los datos.

| # | Mejora | Referencia |
|---|--------|------------|
| 7 | Agregar `@Index` en entidades para columnas de búsqueda frecuente | §3.4 |
| 8 | Mover `autoFinishExpiredEvents` a un cron job con `@nestjs/schedule` | §3.3 |
| 9 | Health check con `@nestjs/terminus` | §6.1 |

**Prompt sugerido**:
```
Implementa las mejoras §2.4, §3.3 y §6.1 del plan en docs/mejoras.md:
índices de base de datos en las entidades, cron job para auto-finalizar eventos y endpoint /api/health.
Genera la migración para los índices.
```

---

### Fase 3 — Calidad del frontend (prioridad media, esfuerzo medio)
> Mejoran la consistencia del código y la experiencia ante errores.

| # | Mejora | Referencia |
|---|--------|------------|
| 10 | Extraer `SPORT_GRADIENTS` y `SPORT_EMOJIS` a `core/constants/sports.ts` | §4.1 |
| 11 | Agregar `ErrorInterceptor` global para 401, 500 y errores de red | §4.2, §4.5 |
| 12 | Validación de variables de entorno con Joi en el arranque del backend | §5.3 |

**Prompt sugerido**:
```
Implementa las mejoras §4.1, §4.2, §4.5 y §5.3 del plan en docs/mejoras.md:
extrae los mapas de deportes a un archivo compartido, agrega un ErrorInterceptor en Angular
y agrega validación de variables de entorno con Joi en el backend.
```

---

### Fase 4 — Paginación y SSE (prioridad media, esfuerzo medio-alto)
> Necesarias antes de que la plataforma tenga usuarios reales.

| # | Mejora | Referencia |
|---|--------|------------|
| 13 | Paginación en `GET /events/mine`, `GET /contacts`, `GET /events/:id/participants` | §2.3 |
| 14 | Notificaciones en tiempo real con Server-Sent Events | §2.1 |

**Prompt sugerido**:
```
Implementa paginación (page/limit) en los endpoints GET /events/mine, GET /contacts
y GET /events/:id/participants según §2.3 del plan en docs/mejoras.md.
Actualiza los componentes del frontend para consumir la respuesta paginada.
```

---

### Fase 5 — Refresh tokens y seguridad avanzada (prioridad media, esfuerzo alto)

| # | Mejora | Referencia |
|---|--------|------------|
| 15 | Implementar refresh token con cookie `httpOnly` | §1.4 |
| 16 | Separar DTOs de datos sensibles de salud | §1.7 |
| 17 | Log de auditoría para acciones de admin | §1.9 |

**Prompt sugerido**:
```
Implementa el sistema de refresh tokens según §1.4 del plan en docs/mejoras.md:
access token de 15 min, refresh token en cookie httpOnly de 30 días,
endpoint POST /auth/refresh y rotación automática.
Actualiza el AuthInterceptor del frontend para reintentar con refresh ante un 401.
```

---

### Fase 6 — Tests y CI/CD (prioridad alta para estabilidad a largo plazo)

| # | Mejora | Referencia |
|---|--------|------------|
| 18 | Tests de integración en backend para flujos críticos | §5.1 |
| 19 | Pipeline de GitHub Actions (build + lint + test) | §5.2 |

**Prompt sugerido**:
```
Crea tests de integración con Jest + Supertest para el backend de SportCard,
cubriendo los flujos: crear evento, unirse a evento, invitar por link, agregar contacto.
Usa una base de datos PostgreSQL de test separada.
Luego crea el workflow de GitHub Actions en .github/workflows/ci.yml.
```

---

### Fase 7 — Observabilidad y caché (largo plazo)

| # | Mejora | Referencia |
|---|--------|------------|
| 20 | Integrar Sentry (backend + frontend) | §6.3 |
| 21 | Caché con Redis para el feed de eventos y búsqueda | §2.2 |
| 22 | Búsqueda con `pg_trgm` o Full-Text Search | §3.1 |
| 23 | Swagger/OpenAPI | §2.5 |

**Prompt sugerido**:
```
Integra Sentry en el backend NestJS y en el frontend Angular de SportCard
según §6.3 del plan en docs/mejoras.md. Captura excepciones no manejadas,
agrega contexto de usuario autenticado y configura source maps para el frontend.
```

---

> **Nota**: cada fase puede ejecutarse de forma independiente. El orden dentro de cada fase es orientativo; lo importante es no saltarse la Fase 1 antes de pasar a producción.
