# De Express a Edge Functions

## Qué reemplaza a qué

| Antes (`backend/src/server.ts`) | Ahora |
| --- | --- |
| `POST /api/chat` con todo el `SYSTEM_PROMPT` | `chat-orientador` (prompt por fases en `prompt.ts`) |
| Historial en el estado de React | Tablas `sesiones` y `mensajes` |
| Perfil en `localStorage` | Tabla `personas` con RLS |
| Reporte final en el texto de la respuesta | `reporte`, con `payload` y `mapa_md` versionados |
| Match simulado (`mockJobs` con `match %`) | `match` + `buscar_vacantes` en SQL |
| `GET /api/health` | Ya no aplica; el estado se ve en el dashboard |

El `backend/` se queda en el repo como referencia, pero **no se despliega**.

## Qué cambió de fondo

1. **La conversación se persiste.** Antes, al recargar la página se perdía
   todo. Ahora cada mensaje entra en `mensajes` y la sesión guarda su fase.
2. **El LLM escribe en la base, pero validado.** Tiene 9 herramientas
   (`guardar_perfil`, `guardar_big_five`, `guardar_riasec`, `guardar_valores`,
   `guardar_condiciones`, `guardar_dealbreakers`, `guardar_habilidades`,
   `guardar_fortalezas`, `avanzar_fase`). Cada una valida rangos y catálogos
   del lado del servidor, y toda escritura queda en `audit_llm_writes` con lo
   aplicado y lo rechazado. Si el modelo inventa un slug, se rechaza y se le
   dice por qué.
3. **Los puntajes no los calcula el modelo.** El prompt le prohíbe sumar: sólo
   transcribe respuestas crudas. La conversión a 0–100 está en código.
4. **No puede inventar porcentajes de afinidad.** El score es SQL. El modelo
   sólo redacta la explicación de las 3 mejores vacantes.
5. **`avanzar_fase` no permite regresar**, para que no se repitan
   instrumentos ya medidos.

## Bug heredado que hay que arreglar

`backend/src/server.ts` usa:

```ts
model: process.env.OPENAI_MODEL ?? 'gpt-5.6-luna'
```

`gpt-5.6-luna` no es un modelo real: si `OPENAI_MODEL` no está definido, la
llamada responde 404. Las Edge Functions usan `MODEL_CHAT` con default
`gpt-4o-mini`, `MODEL_REPORTE` con `gpt-4o` y `MODEL_EMBED` con
`text-embedding-3-small`, todos configurables por secreto.

## Estructura de las funciones

```
supabase/functions/
  _shared/shared.ts        <- utilidades comunes (una sola copia)
  chat-orientador/{index.ts, prompt.ts}
  match/index.ts
  reporte/index.ts
  reto/index.ts
  privacidad/index.ts
  indexar/index.ts
```

`_shared/shared.ts` trae el cliente de Supabase, CORS, el puente con OpenAI,
la tabla de precios, el registro en `llm_calls` y el tope de gasto.

> **Nota de despliegue.** Las versiones que ya corren en el proyecto se
> subieron con una copia hermana de `shared.ts` dentro de cada carpeta
> (contenido idéntico, sólo cambia la ruta del import). El repo usa la forma
> canónica del CLI, `../_shared/shared.ts`. Despliega siempre con el CLI desde
> la raíz del repo; si pegas un `index.ts` suelto en el dashboard, ese import
> no resuelve.

## Desplegar

```bash
supabase link --project-ref xhjcweizspfcpjocgtcl
supabase functions deploy            # todas
supabase functions deploy match      # una sola
```

`verify_jwt` por función ya está en `supabase/config.toml`: `true` en todas
menos `indexar`.

## Secretos

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set MODEL_CHAT=gpt-4o-mini
supabase secrets set MODEL_REPORTE=gpt-4o
supabase secrets set MODEL_EMBED=text-embedding-3-small
supabase secrets set LLM_GASTO_MAX_USD_DIA=5
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta
Supabase automáticamente: no las declares.

## Códigos de error que devuelven las funciones

| Código | Significado |
| --- | --- |
| 401 | Sin sesión válida |
| 403 | `indexar` sin service role key |
| 409 | `reporte` sin datos suficientes, o reto ya calificado |
| 428 | `privacidad` borrar sin `confirmar: "BORRAR"` |
| 429 | Se agotó el presupuesto diario de IA |
| 502 | Falló la llamada al modelo (el avance ya quedó guardado) |
