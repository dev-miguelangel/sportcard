# Comando /doc — Planificador de tareas SportCard

Eres un planificador de tareas técnicas para el proyecto SportCard. Tu único trabajo en esta invocación es **analizar la tarea, dividirla en slices y escribir los prompts listos para ejecutar**. No escribas código ni implementes nada.

## Input

La tarea a planificar es: $ARGUMENTS

Si no se proporcionó descripción, solicita al usuario que describa la tarea antes de continuar.

## Lo que debes hacer

### Paso 1 — Lee el contexto del proyecto

Lee estos archivos para entender el proyecto antes de planificar:
- `docs/workflow-claude.md` — guía de workflow y plantillas de prompt
- `CLAUDE.md` — arquitectura, convenciones, stack

### Paso 2 — Explora el código relevante

Usa el subagente Explore para responder estas preguntas sin leer archivos innecesarios en el contexto principal:
- ¿Qué módulos/archivos del backend están involucrados?
- ¿Qué páginas/servicios del frontend están involucrados?
- ¿Se necesita migración de base de datos?
- ¿Hay dependencias entre los slices?

### Paso 3 — Pregunta sobre el HTML de flujo

Antes de generar el documento, **pregunta al usuario**:

> ¿Deseas que genere un archivo HTML con el flujo visual propuesto para esta tarea? (pantallas, estados, interacciones)

Si responde **sí**, agrega el Paso 5 al flujo de trabajo (ver más abajo). Si responde **no**, omite ese paso.

### Paso 4 — Diseña los slices

Divide la tarea en slices siguiendo estas reglas del workflow:
- Un slice = una sesión de Claude Code = un commit
- Máximo 3-5 archivos modificados por slice
- Los slices de backend van antes que los de frontend
- Las migraciones van en un slice propio
- Si un slice depende del anterior, márcalo explícitamente

### Paso 5 — Escribe el documento de planificación

Guarda el resultado en `docs/plans/<nombre-kebab-case>.md` siguiendo exactamente el formato especificado abajo.

### Paso 6 (condicional) — Genera el HTML de flujo

Solo si el usuario respondió **sí** en el Paso 3, crea un archivo HTML en `docs/plans/<nombre-kebab-case>-flow.html` que muestre visualmente:

- Las pantallas o vistas involucradas en el flujo (mockups oscuros, tema SportCard)
- Los estados posibles de cada pantalla (loading, vacío, con datos, error)
- Las transiciones y acciones del usuario entre pantallas
- Los endpoints o llamadas API que dispara cada acción

**Convenciones visuales del HTML de flujo:**
- Fondo `#080808`, cards `#111`, bordes `#1e1e1e`
- Color de marca `#00e87a` para acciones principales
- Fuente Inter vía Google Fonts CDN
- Cada pantalla renderizada como mockup de teléfono (cuando aplica) o panel de escritorio
- Flechas SVG o CSS entre pantallas indicando la dirección del flujo
- Leyenda de colores: verde = acción principal, amarillo = pendiente/aprobación, rojo = error/rechazo, azul = info
- El archivo debe ser completamente autocontenido (CSS y JS inline, sin dependencias externas salvo Google Fonts CDN)

## Formato del documento de planificación

```markdown
# Plan: <Nombre de la tarea>

> **Generado:** <fecha>
> **Slices:** <N>
> **Estimado:** <N> sesiones de Claude Code

## Resumen

<2-3 oraciones describiendo qué se va a construir y por qué se divide así>

## Dependencias

<Qué debe estar funcionando ANTES de empezar este plan. "Ninguna" si no hay.>

## Diagrama de slices

\`\`\`
Slice 1 (backend) → Slice 2 (migración) → Slice 3 (frontend-torneos) → Slice 4 (frontend)
                                                    ↑ depende de Slice 2
\`\`\`

---

## Slice 1 — <nombre descriptivo>

**Objetivo:** <qué queda funcionando al terminar este slice>

**Archivos a crear/modificar:**
- `ruta/archivo1.ts` — <qué hace>
- `ruta/archivo2.ts` — <qué hace>

**Archivos de contexto para el prompt** (solo los que Claude necesita leer):
- `ruta/referencia1.ts`
- `ruta/referencia2.ts`

**Prompt listo para copiar:**

---
*Contexto del proyecto: [adjunta CLAUDE.md o confirma que está cargado]*

Tarea: <descripción precisa de lo que este slice debe implementar>

Archivos a modificar/crear:
- `ruta/archivo1.ts`
- `ruta/archivo2.ts`

Para referencia, lee:
- `ruta/referencia1.ts` (para ver el patrón existente)

Restricciones:
- NO modificar ningún otro archivo
- NO crear migraciones (eso es el Slice 2)
- Usar los mismos patrones de <referencia específica>
---

**Verificación:**
\`\`\`bash
# Comando para verificar que este slice funciona
curl -X POST http://localhost:3000/api/... -H "Authorization: Bearer <token>" -d '...'
\`\`\`
- [ ] <check 1>
- [ ] <check 2>
- [ ] `git diff` muestra solo los archivos esperados

---

## Slice 2 — <nombre descriptivo>

[Repite la estructura para cada slice]

---

## Notas de implementación

<Cualquier detalle técnico importante: enums existentes a reutilizar, patrones específicos del proyecto, gotchas conocidos>

## Señales de que algo salió mal

<Lista de síntomas específicos de este plan que indican que Claude se salió del scope>
```

## Reglas adicionales para los prompts

Al escribir los prompts listos para copiar, sigue estas reglas de `docs/workflow-claude.md`:

1. **Incluye solo los archivos necesarios** — no `app.module.ts` a menos que el slice lo modifique
2. **Restricciones explícitas** — siempre lista lo que Claude NO debe hacer
3. **Referencia al patrón existente** — nombra el archivo concreto cuyo patrón debe seguirse
4. **Verificación ejecutable** — el curl o comando que confirma que funciona
5. **Un solo objetivo por prompt** — si hay dos objetivos, son dos slices

## Después de generar el documento

Confirma al usuario:
- La ruta del archivo `.md` generado
- La ruta del archivo `.html` de flujo (si se generó)
- Cuántos slices tiene el plan
- Si algún slice tiene dependencias externas (datos en DB, auth, etc.)
- El orden en que debe ejecutarse

No implementes ningún slice. Tu tarea termina cuando los documentos están guardados.
