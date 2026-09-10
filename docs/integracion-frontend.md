# Conectar el frontend

Todo pasa por `src/lib/api.ts`. No hace falta reescribir `App.tsx`: son
cambios puntuales, pantalla por pantalla.

## 0. Variables

`.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

La sesión se abre sola (anónima) la primera vez que llamas cualquier función.
Requiere **Anonymous sign-ins** activado en Authentication > Sign In /
Providers.

## 1. Paso "Perfil inicial": cambiar `localStorage` por Postgres

Antes:

```ts
localStorage.setItem('enfoca:perfil', JSON.stringify(perfil))
```

Después:

```ts
import { guardarPerfilBasico } from './lib/api'

await guardarPerfilBasico({
  nombre,
  email: correo,
  descripcionPersonal: descripcion,
})
```

Se puede dejar el `localStorage` como respaldo offline; lo que importa es que
la verdad quede en la base.

## 2. Paso "Cuestionario laboral"

Las llaves son los ids que ya existen en `src/data.ts` (`workingNow`,
`currentRole`, `roleEnjoyment`, `why`, `workStyle`):

```ts
import { guardarRespuestas } from './lib/api'

await guardarRespuestas('f0_conexion', respuestasDelCuestionario)
```

Y antes de empezar a medir personalidad:

```ts
import { registrarConsentimiento } from './lib/api'

await registrarConsentimiento()
```

## 3. `ChatTest.tsx`: un solo cambio

Antes:

```ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const res = await fetch(`${API_URL}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
})
const data = await res.json()
// data.message, data.responseId
```

Después:

```ts
import { enviarMensaje } from './lib/api'

const r = await enviarMensaje(texto, { sesionId })
setSesionId(r.sesion_id)          // guárdalo en estado; reanuda la sesión
setMensajes((prev) => [...prev, { role: 'assistant', content: r.respuesta }])
// r.fase y r.etapa sirven para mover la barra de progreso
// r.guardado dice qué se escribió en la base en este turno
```

Ya no hay que mandar el historial: el servidor lo tiene.

## 4. Pantalla de resultados: vacantes reales

```ts
import { calcularMatch, matchesGuardados } from './lib/api'

const { vacantes, cobertura, faltantes } = await calcularMatch({ limite: 10 })

vacantes.forEach((v) => {
  v.titulo
  v.empresa
  v.score          // el % de afinidad, calculado en SQL
  v.explicacion    // por qué le queda
  v.desglose       // habilidades, condiciones, intereses, valores...
})
```

`calcularMatch()` recalcula y cuesta IA. Para volver a pintar la pantalla sin
gastar, usa `matchesGuardados()`.

Si `cobertura` es baja, muestra `faltantes` como invitación a completar fases
en lugar de un número seco.

## 5. Mapa Profesional

```ts
import { generarReporte, ultimoReporte } from './lib/api'

const reporte = await generarReporte()
reporte.mapa_md            // Markdown listo para renderizar
reporte.estado_evaluacion  // 'completada' | 'parcial'
reporte.fases_sin_medir
```

Devuelve **409** si la persona no ha hecho ni Big Five ni RIASEC: atrapa ese
error y manda a la persona de vuelta al chat.

Para mostrar el reporte anterior sin regenerarlo: `ultimoReporte()`.

## 6. Reto de la fase 5

```ts
import { evaluarReto, generarReto } from './lib/api'

const reto = await generarReto()             // el área la elige por RIASEC
reto.enunciado
reto.criterios                               // sin los niveles: se evalúa a ciegas

const resultado = await evaluarReto({
  retoId: reto.reto_id,
  respuesta: textoDeLaPersona,
  segundos: segundosTranscurridos,
})
resultado.puntaje_0_100
resultado.aprueba
resultado.lo_que_hiciste_bien
resultado.como_mejorar
```

Un reto sólo se califica una vez (segundo intento devuelve **409**).

## 7. Privacidad

Dos botones en el perfil, y con eso se cubren los derechos ARCO:

```ts
import { borrarMiCuenta, exportarMisDatos } from './lib/api'

const todo = await exportarMisDatos()   // JSON descargable
await borrarMiCuenta()                  // pide confirmación en la UI antes
```

## Manejo de errores

`api.ts` desenvuelve el cuerpo `{ error: "..." }` de las funciones, así que el
`message` del `Error` ya es texto mostrable:

```ts
try {
  await enviarMensaje(texto)
} catch (e) {
  setError(e instanceof Error ? e.message : 'Algo salió mal')
}
```

Vale la pena tratar aparte el **429** (presupuesto de IA agotado): no es culpa
de la persona y conviene decirle que vuelva más tarde.
