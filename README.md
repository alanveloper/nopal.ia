# Enfoca

Orientación vocacional y emparejamiento laboral inteligente.

> **Conocerte → Medirte → Escucharte → Entender qué necesitas → Generar hipótesis → Encontrar dónde puedes prosperar.**

No califica si alguien es "buen o mal trabajador": busca la combinación de
**persona + puesto + entorno de empresa** con más probabilidad de éxito y
bienestar a largo plazo, para bajar la rotación a 6 meses.

## Arquitectura

| Capa | Qué es | Dónde |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | `src/` |
| Integración | Cliente de Supabase, sesión y API tipada | `src/lib/` |
| Backend | 6 Edge Functions en Deno + OpenAI | `supabase/functions/` |
| Datos | Postgres con `jsonb`, `pgvector` y RLS | `supabase/migrations/` |
| Backend viejo | Express (sustituido, se conserva de referencia) | `backend/` |

Detalle completo en [`docs/arquitectura.md`](docs/arquitectura.md),
[`docs/migracion-express-a-edge.md`](docs/migracion-express-a-edge.md) y
[`docs/integracion-frontend.md`](docs/integracion-frontend.md).

### Las 6 funciones

| Función | Para qué sirve |
| --- | --- |
| `chat-orientador` | Conduce las 6 fases y escribe en la base con 9 herramientas validadas |
| `match` | Convierte el perfil en vector y deja que SQL calcule el score |
| `reporte` | Mapa Profesional en Markdown + JSON versionado |
| `reto` | Genera y califica el reto de la fase 5 con rúbrica |
| `privacidad` | Exportar y borrar todos los datos (derechos ARCO) |
| `indexar` | Rellena embeddings de vacantes y empresas (sólo service role) |

## Ejecutar localmente

```powershell
npm install
npm run dev
```

> El repo trae `package-lock.json` y `pnpm-lock.yaml`. Al agregar
> `@supabase/supabase-js` los dos quedaron desactualizados, así que corre
> `npm install` una vez y commitea el lockfile que quieras conservar.

Antes de arrancar, copia `.env.example` a `.env.local` y llena:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Validar producción

```powershell
npm run build
```

## Despliegue en Vercel

`vercel.json` ya deja todo listo: al conectar el repo, cada push a `main`
se publica solo.

- Framework: **Vite** · Build: `npm run build` · Output: `dist`
- Install command forzado a `npm install` (por los dos lockfiles)
- Rewrite de SPA a `/index.html`
- Variables en Vercel: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

El `backend/` de Express **no se despliega**: sus funciones ahora viven en
Supabase.

## Pendientes manuales (una sola vez)

1. `supabase secrets set OPENAI_API_KEY=...` (y opcionalmente `MODEL_CHAT`,
   `MODEL_REPORTE`, `MODEL_EMBED`, `LLM_GASTO_MAX_USD_DIA`).
2. Activar **Anonymous sign-ins** en Authentication > Sign In / Providers.
3. Sustituir las vacantes de ejemplo (`fuente = 'ejemplo'`) por vacantes reales.
4. Llamar a `indexar` con la service role key para generar los embeddings.
5. Materializar las migraciones `0002`–`0005` en el repo
   (ver [`supabase/migrations/README.md`](supabase/migrations/README.md)).

## Estado actual

- Flujo completo de datos básicos, preguntas, evaluaciones y resultados.
- Las respuestas ya **no** viven en `localStorage`: se guardan en Postgres con
  RLS por persona (ver `docs/integracion-frontend.md` para el reemplazo).
- Preguntas y evaluaciones siguen centralizadas en `src/data.ts`; las vacantes
  mock se sustituyen por el resultado de la función `match`.
- El porcentaje de afinidad lo calcula SQL, nunca el modelo.

## Límites éticos y legales

Big Five y RIASEC son instrumentos de **autorreporte con fines de
orientación**: no son diagnósticos clínicos ni miden capacidad laboral. El
sistema no infiere ni almacena datos de salud o discapacidad (LFPDPPP art. 3
fr. VI), la personalidad pesa poco en el match y nunca funciona como filtro de
exclusión.
