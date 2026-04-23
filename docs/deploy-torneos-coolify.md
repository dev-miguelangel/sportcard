# Despliegue de frontend-torneos en Coolify

> **Última actualización:** 2026-04-23  
> **Rama de referencia:** `torneos`

---

## Visión general

El stack de SportCard tiene **cuatro servicios** en producción:

| Servicio | Puerto interno | Descripción |
|---|---|---|
| `postgres` | 5432 | Base de datos |
| `backend` | 3000 | API NestJS |
| `frontend` | 80 | App jugadores (Angular) |
| `frontend-torneos` | 80 | Portal organizadores (Angular) — **nuevo** |

`frontend-torneos` es una aplicación Angular independiente compilada a estático y servida por nginx. Toda la configuración dinámica (URL del API, flags) se inyecta en runtime mediante `config.js`, no en el build.

---

## Paso 1 — Crear el servicio en Coolify

1. En el dashboard de Coolify, ve a tu proyecto → **Add Resource → Application**.
2. Conecta el mismo repositorio Git que usa el backend/frontend.
3. En **Build Pack** selecciona **Dockerfile**.
4. En **Base Directory** escribe: `frontend-torneos`
5. En **Dockerfile Location** escribe: `Dockerfile`
6. En **Docker Build Target** escribe: `production`

> El `target: production` es crítico — sin él Coolify usa el stage `development` y levanta el dev server de Angular en lugar de nginx.

---

## Paso 2 — Variables de entorno del nuevo servicio

Configura estas variables en la sección **Environment Variables** del servicio `frontend-torneos`:

| Variable | Valor de ejemplo | Descripción |
|---|---|---|
| `API_URL` | `https://api.tudominio.com/api` | URL pública del backend. Se escribe en `config.js` → `window.__API_URL__`. Incluye el prefijo `/api`. |
| `DEV_AUTH_ENABLED` | `false` | Deshabilita el login dev en producción. Siempre `false` fuera de local. |

**Cómo funciona en runtime:** el `CMD` del Dockerfile escribe `/usr/share/nginx/html/config.js` con esas variables antes de arrancar nginx. El `index.html` carga ese archivo con `<script src="/config.js">`.

---

## Paso 3 — Actualizar el backend (OBLIGATORIO)

El backend valida el origen de las peticiones mediante CORS. Hay que agregar el dominio del nuevo portal a `FRONTEND_URL`.

En el servicio **backend** de Coolify, edita la variable:

```
# Antes (solo app jugadores)
FRONTEND_URL=https://app.tudominio.com

# Después (ambos frontends)
FRONTEND_URL=https://app.tudominio.com,https://torneos.tudominio.com
```

`FRONTEND_URL` acepta múltiples orígenes separados por coma. El backend los parsea y configura CORS con todos ellos.

Después de guardar, redeploy del backend para que tome efecto.

---

## Paso 4 — Dominio y SSL

1. En el servicio `frontend-torneos` de Coolify, ve a **Domains**.
2. Agrega el dominio: `torneos.tudominio.com` (o el subdominio que elijas).
3. Coolify genera el certificado SSL automáticamente (Let's Encrypt).
4. El puerto expuesto es `80` — Coolify pone el proxy HTTPS delante.

---

## Paso 5 — Build Args opcionales

El Dockerfile expone el ARG `BUILD_CONFIG` para elegir la configuración de Angular:

```
# Por defecto usa "production" (recomendado)
BUILD_CONFIG=production

# Solo si necesitas depurar en staging con source maps
BUILD_CONFIG=staging
```

En Coolify esto se configura en **Build Arguments** (distinto a Environment Variables).

---

## Paso 6 — Verificar el despliegue

Una vez desplegado, comprueba:

```bash
# 1. El config.js se sirve con la URL correcta
curl https://torneos.tudominio.com/config.js
# Debe retornar:
# window.__API_URL__ = 'https://api.tudominio.com/api'; window.__DEV_AUTH_ENABLED__ = 'false';

# 2. El SPA carga correctamente (200, no 404)
curl -I https://torneos.tudominio.com/

# 3. Las rutas de SPA hacen fallback a index.html (no 404)
curl -I https://torneos.tudominio.com/tournaments/algun-id

# 4. El CORS ya no bloquea desde el portal
# (verificar en DevTools del browser — sin errores de preflight)
```

---

## Resumen de variables de entorno por servicio

### `frontend-torneos` (servicio nuevo)

| Variable | Producción | Staging |
|---|---|---|
| `API_URL` | `https://api.tudominio.com/api` | `https://api-staging.tudominio.com/api` |
| `DEV_AUTH_ENABLED` | `false` | `true` (opcional, para pruebas) |

### `backend` (servicio existente — requiere cambio)

| Variable | Valor actualizado |
|---|---|
| `FRONTEND_URL` | `https://app.tudominio.com,https://torneos.tudominio.com` |
| `NODE_ENV` | `production` |
| `DATABASE_HOST` | (sin cambio — apunta a postgres interno) |
| `JWT_SECRET` | (sin cambio) |
| `GOOGLE_CLIENT_ID` | (sin cambio) |
| `GOOGLE_CLIENT_SECRET` | (sin cambio) |
| `GOOGLE_CALLBACK_URL` | (sin cambio — sigue siendo la URL del backend) |

### `frontend` (app jugadores — sin cambios necesarios)

No requiere modificación. La variable `API_URL` ya apunta al backend correcto.

---

## Notas importantes

**Autenticación:** `frontend-torneos` usa el mismo backend de auth (Google OAuth + JWT). No hay cambios en el flujo — el JWT es el mismo token que usa la app de jugadores.

**Base de datos:** no hay migraciones nuevas para este despliegue. El schema ya está completo desde las fases anteriores.

**Orden de redeploy:** primero backend (para que CORS esté activo), luego frontend-torneos. Nunca al revés — si el portal levanta antes de que el backend acepte su origen, los usuarios verán errores de CORS en el primer minuto.

**Google OAuth redirect:** la URL de callback de Google (`GOOGLE_CALLBACK_URL`) sigue siendo la del backend. No hay que agregar el dominio de `frontend-torneos` a la consola de Google.

---

## Troubleshooting frecuente

| Síntoma | Causa probable | Solución |
|---|---|---|
| Pantalla en blanco, consola con error 404 en `config.js` | El `CMD` del Dockerfile no se ejecutó (target incorrecto) | Verificar que el Build Target sea `production` en Coolify |
| Error CORS en preflight | `FRONTEND_URL` del backend no incluye el nuevo dominio | Agregar dominio a `FRONTEND_URL` y redeploy del backend |
| `window.__API_URL__` es `undefined` | `API_URL` no está configurada como env var en Coolify | Agregar la variable en el servicio `frontend-torneos` |
| Login con Google redirecciona mal | `GOOGLE_CALLBACK_URL` no corresponde al backend | No tocar — el callback siempre va al backend, no al frontend |
| Rutas directas (ej. `/tournaments/xxx`) dan 404 | nginx no tiene el fallback SPA | Verificar que se copió `nginx.conf` en el build (ya está en el Dockerfile) |
