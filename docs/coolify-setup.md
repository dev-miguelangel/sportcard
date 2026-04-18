# Sport Card — Deploy en Coolify (Hello World)

Stack: NestJS · Angular 20+ · PostgreSQL · VPS con Coolify

---

## Resumen de la arquitectura en producción

```
Internet
    │
    ▼
[Coolify / Traefik]  ← SSL automático (Let's Encrypt)
    │
    ├── api.tudominio.com  →  NestJS (puerto 3000)
    ├── app.tudominio.com  →  Angular (nginx puerto 80)
    └── [interno]          →  PostgreSQL (puerto 5432, no expuesto)
```

Cada servicio vive en un contenedor separado dentro del VPS. Coolify actúa como orquestador y reverse proxy (Traefik).

---

## Parte 1 — Prereqs locales

```bash
# Verifica que tienes instalado:
node --version        # >= 20
npm --version         # >= 10
docker --version      # >= 24
git --version

# Instala los CLIs si no los tienes
npm install -g @nestjs/cli @angular/cli
```

---

## Parte 2 — Estructura del monorepo

```bash
mkdir sportcard && cd sportcard
git init
```

Estructura final que vamos a crear:

```
sportcard/
├── backend/
│   ├── src/
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── app.component.ts
│   │       ├── app.component.html
│   │       ├── app.component.scss
│   │       └── app.config.ts
│   ├── nginx.conf
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── docker-compose.yml   ← solo para desarrollo local
└── .gitignore
```

---

## Parte 3 — Backend NestJS (Hello World)

```bash
cd sportcard
nest new backend --package-manager npm --skip-git
```

### 3.1 Reemplaza `backend/src/app.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      status: 'ok',
      service: 'Sport Card API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      db: process.env.DATABASE_URL ? 'configured' : 'not configured',
    };
  }
}
```

### 3.2 Reemplaza `backend/src/app.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

### 3.3 Reemplaza `backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Sport Card API running on port ${port}`);
}
bootstrap();
```

### 3.4 Crea `backend/Dockerfile`

```dockerfile
# ── Build stage ──────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
```

### 3.5 Crea `backend/.dockerignore`

```
node_modules
dist
.env
*.local
```

### 3.6 Verifica que arranca localmente

```bash
cd backend
npm run start:dev
# Abre http://localhost:3000/api → debe retornar JSON
```

---

## Parte 4 — Frontend Angular (Hello World)

```bash
cd ..  # vuelve a la raíz sportcard/
ng new frontend --routing --style=scss --skip-git --ssr=false
```

### 4.1 Crea `frontend/src/app/app.component.ts`

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface ApiStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  db: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  apiStatus = signal<ApiStatus | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // En producción, Angular lee esta URL del entorno configurado en Coolify
  private apiUrl = (window as any).__API_URL__ || 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<ApiStatus>(`${this.apiUrl}/api`).subscribe({
      next: (data) => {
        this.apiStatus.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo conectar con la API');
        this.loading.set(false);
      },
    });
  }
}
```

### 4.2 Crea `frontend/src/app/app.component.html`

```html
<div class="container">
  <div class="card">
    <div class="logo">SC</div>
    <h1>Sport Card</h1>
    <p class="subtitle">Hello World — Stack inicial funcionando</p>

    <div class="divider"></div>

    @if (loading()) {
      <div class="status loading">Conectando con la API...</div>
    }

    @if (error()) {
      <div class="status error">
        <span class="dot red"></span>
        {{ error() }}
      </div>
    }

    @if (apiStatus(); as api) {
      <div class="status ok">
        <span class="dot green"></span>
        API conectada
      </div>
      <div class="info-grid">
        <div class="info-row">
          <span class="key">Servicio</span>
          <span class="val">{{ api.service }}</span>
        </div>
        <div class="info-row">
          <span class="key">Versión</span>
          <span class="val">{{ api.version }}</span>
        </div>
        <div class="info-row">
          <span class="key">Base de datos</span>
          <span class="val" [class.green]="api.db === 'configured'">{{ api.db }}</span>
        </div>
        <div class="info-row">
          <span class="key">Timestamp</span>
          <span class="val">{{ api.timestamp | date:'medium' }}</span>
        </div>
      </div>
    }

    <div class="stack">
      <span class="chip">NestJS</span>
      <span class="chip">Angular 20+</span>
      <span class="chip">PostgreSQL</span>
    </div>
  </div>
</div>
```

### 4.3 Crea `frontend/src/app/app.component.scss`

```scss
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #0a0a0f;
  color: #e8e8f0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; padding: 24px;
}

.card {
  background: #1a1a24; border: 1px solid #2a2a3a;
  border-radius: 20px; padding: 40px 36px;
  width: 100%; max-width: 420px; text-align: center;
}

.logo {
  width: 64px; height: 64px; background: #00e87a; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 900; color: #0a0a0f;
  margin: 0 auto 16px;
}

h1 { font-size: 24px; font-weight: 900; margin-bottom: 6px; }
.subtitle { font-size: 13px; color: #9090a8; margin-bottom: 24px; }
.divider { height: 1px; background: #2a2a3a; margin-bottom: 20px; }

.status {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
  margin-bottom: 16px;
}
.status.loading { background: #22222f; color: #9090a8; }
.status.ok { background: rgba(0,232,122,0.1); color: #00e87a; }
.status.error { background: rgba(255,59,92,0.1); color: #ff3b5c; }

.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.green { background: #00e87a; }
.dot.red { background: #ff3b5c; }

.info-grid { margin-bottom: 20px; }
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid #22222f; font-size: 13px;
}
.info-row:last-child { border-bottom: none; }
.key { color: #9090a8; }
.val { font-weight: 600; }
.val.green { color: #00e87a; }

.stack { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.chip {
  padding: 5px 14px; border-radius: 100px;
  background: #22222f; border: 1px solid #2a2a3a;
  font-size: 12px; color: #9090a8;
}
```

### 4.4 Actualiza `frontend/src/app/app.config.ts`

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ],
};
```

### 4.5 Crea `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Inyecta la URL de la API en tiempo de ejecución
    location /config.js {
        default_type application/javascript;
        return 200 'window.__API_URL__ = "$API_URL";';
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compresión
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

### 4.6 Agrega el script de config en `frontend/src/index.html`

Agrega esta línea **antes** del `</head>`:

```html
<script src="/config.js"></script>
```

### 4.7 Crea `frontend/Dockerfile`

```dockerfile
# ── Build stage ──────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────
FROM nginx:alpine AS production

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

> **Nota:** Si `ng new` generó el output en `dist/frontend` sin `/browser`, ajusta la ruta del COPY. Verifica con `npm run build` localmente.

### 4.8 Crea `frontend/.dockerignore`

```
node_modules
dist
.angular
*.local
```

---

## Parte 5 — Docker Compose para desarrollo local

Crea `docker-compose.yml` en la raíz del proyecto:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sportcard
      POSTGRES_USER: sportcard
      POSTGRES_PASSWORD: sportcard_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sportcard"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://sportcard:sportcard_dev@postgres:5432/sportcard
      FRONTEND_URL: http://localhost:4200
      PORT: 3000
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
    ports:
      - "4200:80"
    environment:
      API_URL: http://localhost:3000
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Prueba local con Docker

```bash
# En la raíz del proyecto
docker compose up --build

# Verifica:
# Backend: http://localhost:3000/api
# Frontend: http://localhost:4200
```

---

## Parte 6 — Subir a GitHub

```bash
# En la raíz del proyecto crea .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.*
*.local
.angular/
EOF

git add .
git commit -m "feat: hello world inicial - NestJS + Angular + PostgreSQL"

# Crea el repo en GitHub (reemplaza con tu usuario)
gh repo create sportcard --public --push --source=.
# o manualmente:
# git remote add origin https://github.com/TU_USUARIO/sportcard.git
# git push -u origin main
```

---

## Parte 7 — Configuración en Coolify

### 7.1 Conecta tu cuenta de GitHub

1. Entra a tu Coolify: `http://TU_VPS_IP:8000`
2. Ve a **Settings → Source → Add** 
3. Selecciona **GitHub** → haz clic en **Register Now** (abre GitHub Apps)
4. Instala la GitHub App en tu cuenta y selecciona el repo `sportcard`
5. Vuelve a Coolify — el repo debe aparecer en **Sources**

### 7.2 Crea la base de datos PostgreSQL

1. En el panel lateral ve a **Resources → New Resource**
2. Selecciona **PostgreSQL** (versión 16)
3. Configura:
   ```
   Name:     sportcard-db
   DB Name:  sportcard
   User:     sportcard
   Password: [genera uno seguro con el botón Generate]
   ```
4. Haz clic en **Save** y luego **Start**
5. Una vez iniciado, ve a la base de datos y **copia la Internal Database URL**
   - Tendrá el formato: `postgresql://sportcard:PASSWORD@sportcard-db:5432/sportcard`
   - Guárdala, la necesitarás en el paso 8

### 7.3 Crea el servicio Backend (NestJS)

1. Ve a **Resources → New Resource → Application**
2. Selecciona tu fuente de GitHub → elige el repo `sportcard`
3. Configura:

   | Campo | Valor |
   |---|---|
   | **Name** | `sportcard-backend` |
   | **Build Pack** | `Dockerfile` |
   | **Base Directory** | `/backend` |
   | **Dockerfile Location** | `/backend/Dockerfile` |
   | **Port** | `3000` |

4. En la sección **Domains**, agrega:
   ```
   api.tudominio.com
   ```
   (Coolify configurará Let's Encrypt automáticamente)

5. En la sección **Environment Variables**, agrega:
   ```
   DATABASE_URL    = postgresql://sportcard:PASSWORD@sportcard-db:5432/sportcard
   FRONTEND_URL    = https://app.tudominio.com
   PORT            = 3000
   NODE_ENV        = production
   ```

6. Haz clic en **Save** → **Deploy**

### 7.4 Crea el servicio Frontend (Angular)

1. Ve a **Resources → New Resource → Application**
2. Selecciona el mismo repo `sportcard`
3. Configura:

   | Campo | Valor |
   |---|---|
   | **Name** | `sportcard-frontend` |
   | **Build Pack** | `Dockerfile` |
   | **Base Directory** | `/frontend` |
   | **Dockerfile Location** | `/frontend/Dockerfile` |
   | **Port** | `80` |

4. En **Domains**:
   ```
   app.tudominio.com
   ```

5. En **Environment Variables**:
   ```
   API_URL = https://api.tudominio.com
   ```

6. Haz clic en **Save** → **Deploy**

### 7.5 Configura los DNS (en tu proveedor de dominio)

Crea dos registros tipo **A** apuntando a la IP de tu VPS:

```
Tipo  Nombre   Valor
A     api      TU_VPS_IP
A     app      TU_VPS_IP
```

> Coolify/Traefik detecta el dominio por header `Host` y enruta al contenedor correcto.

---

## Parte 8 — Verificación del deploy

### Backend
```bash
# Debe responder con JSON
curl https://api.tudominio.com/api

# Respuesta esperada:
{
  "status": "ok",
  "service": "Sport Card API",
  "version": "1.0.0",
  "timestamp": "...",
  "db": "configured"
}

# Health check
curl https://api.tudominio.com/api/health
# → { "status": "ok" }
```

### Frontend
Abre `https://app.tudominio.com` en el navegador.  
Debe mostrar la pantalla de hello world con el estado de la API en verde.

---

## Parte 9 — Flujo de CI/CD (deploys automáticos)

Una vez configurado, el deploy automático funciona así:

```
git push origin main
        │
        ▼
  GitHub recibe el push
        │
        ▼
  Coolify webhook detecta cambio
        │
        ▼
  Build Dockerfile (backend y/o frontend)
        │
        ▼
  Reemplaza contenedor con zero-downtime
        │
        ▼
  https://api.tudominio.com  (actualizado)
  https://app.tudominio.com  (actualizado)
```

Para activarlo:
1. En cada servicio de Coolify, ve a **Settings**
2. Activa **Auto Deploy on Push** → ON
3. Copia el **Webhook URL** que te genera Coolify
4. En GitHub → Settings → Webhooks → Add webhook → pega la URL

---

## Parte 10 — Comandos útiles de mantenimiento

```bash
# Ver logs del backend en tiempo real (desde Coolify UI o via SSH)
docker logs -f sportcard-backend --tail 100

# Conectarse a la DB desde el VPS
docker exec -it sportcard-db psql -U sportcard -d sportcard

# Reiniciar un servicio sin redeploy
# (desde la UI de Coolify → botón Restart)

# Ver uso de recursos
docker stats

# Ver todos los contenedores corriendo
docker ps
```

---

## Resumen rápido

| Paso | Qué haces | Dónde |
|---|---|---|
| 1-5 | Crear código + Docker local | Tu máquina |
| 6 | Push a GitHub | GitHub |
| 7.1 | Conectar GitHub a Coolify | Coolify UI |
| 7.2 | Crear PostgreSQL | Coolify UI |
| 7.3 | Crear servicio Backend | Coolify UI |
| 7.4 | Crear servicio Frontend | Coolify UI |
| 7.5 | Apuntar DNS | Tu proveedor de dominio |
| 8 | Verificar con curl y browser | Terminal / Browser |
| 9 | Activar auto-deploy | Coolify UI + GitHub |
