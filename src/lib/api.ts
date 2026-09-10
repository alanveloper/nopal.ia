// Unico punto de contacto del frontend con Supabase.
// Regla: el navegador no arma prompts ni toca llaves de OpenAI. Solo invoca
// funciones y lee lo que RLS le permite.
import { sesionLista, supabase } from './supabase'
import type {
  AreaReto, Borrado, Exportacion, Fase, PerfilBasico, RespuestaChat,
  RespuestaMatch, RespuestaReporte, RetoEvaluado, RetoGenerado,
} from './tipos'

// Las funciones responden { error: "mensaje" } con codigo 4xx o 5xx.
// supabase-js mete ese cuerpo en error.context, asi que lo desenvolvemos
// para poder mostrar el mensaje real en pantalla.
async function detalleDelError(error: unknown): Promise<string> {
  const contexto = (error as unknown as { context?: Response })?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const cuerpo = (await contexto.json()) as { error?: string }
      if (cuerpo?.error) return cuerpo.error
    } catch {
      // La funcion no respondio JSON; nos quedamos con el mensaje generico.
    }
  }
  return error instanceof Error ? error.message : 'Error desconocido'
}

async function idPersona(): Promise<string> {
  const sesion = await sesionLista()
  if (!sesion) {
    throw new Error(
      'No pude abrir tu sesion. Revisa que las sesiones anonimas esten activas en Supabase.',
    )
  }
  return sesion.user.id
}

async function invocar<T>(nombre: string, cuerpo: Record<string, unknown> = {}): Promise<T> {
  await idPersona()
  const { data, error } = await supabase.functions.invoke<T>(nombre, { body: cuerpo })
  if (error) throw new Error(await detalleDelError(error))
  if (data === null) throw new Error('La funcion no devolvio datos.')
  return data
}

// ---------------- perfil y cuestionario (sustituyen al localStorage) ----------------

export async function guardarPerfilBasico(perfil: PerfilBasico): Promise<void> {
  const persona = await idPersona()
  const parche: Record<string, unknown> = {}
  if (perfil.nombre) parche.nombre = perfil.nombre
  if (perfil.email) parche.email = perfil.email
  if (perfil.ciudad) parche.ciudad = perfil.ciudad
  if (perfil.descripcionPersonal) parche.descripcion_personal = perfil.descripcionPersonal
  if (perfil.situacionActual) parche.situacion_actual = perfil.situacionActual
  if (Object.keys(parche).length === 0) return
  const { error } = await supabase.from('personas').update(parche).eq('id', persona)
  if (error) throw new Error(error.message)
}

/** Guarda respuestas crudas de una fase. Las llaves son los ids de data.ts. */
export async function guardarRespuestas(
  fase: Fase,
  respuestas: Record<string, unknown>,
): Promise<void> {
  const persona = await idPersona()
  const filas = Object.entries(respuestas)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([reactivo, valor]) => ({
      persona_id: persona,
      fase,
      reactivo,
      respuesta: { valor },
    }))
  if (filas.length === 0) return
  const { error } = await supabase
    .from('respuestas')
    .upsert(filas, { onConflict: 'persona_id,fase,reactivo' })
  if (error) throw new Error(error.message)
}

/** Obligatorio antes de la fase 1: sin consentimiento no se mide nada. */
export async function registrarConsentimiento(
  tipo = 'evaluacion',
  textoVersion = 'enfoca-1.0.0',
): Promise<void> {
  const persona = await idPersona()
  const { error } = await supabase.from('consentimientos').insert({
    persona_id: persona,
    tipo,
    texto_version: textoVersion,
    otorgado: true,
  })
  if (error) throw new Error(error.message)
}

export async function perfilActual(): Promise<Record<string, unknown> | null> {
  const persona = await idPersona()
  const { data, error } = await supabase.rpc('perfil_persona', { p_persona: persona })
  if (error) throw new Error(error.message)
  return (data ?? null) as Record<string, unknown> | null
}

// ---------------- chat ----------------

export function enviarMensaje(
  mensaje: string,
  opciones: { sesionId?: string; nueva?: boolean } = {},
): Promise<RespuestaChat> {
  return invocar<RespuestaChat>('chat-orientador', {
    mensaje,
    sesion_id: opciones.sesionId,
    nueva: opciones.nueva,
  })
}

// ---------------- match ----------------

export function calcularMatch(
  opciones: { limite?: number; explicar?: boolean; incluirDescartadas?: boolean } = {},
): Promise<RespuestaMatch> {
  return invocar<RespuestaMatch>('match', {
    limite: opciones.limite,
    explicar: opciones.explicar,
    incluir_descartadas: opciones.incluirDescartadas,
  })
}

/** Lee el match ya calculado, sin volver a gastar en IA. */
export async function matchesGuardados(limite = 10) {
  await idPersona()
  const { data, error } = await supabase
    .from('matches')
    .select(
      'score, explicacion, desglose, descartada_por, calculado_at, vacantes(id, titulo, area, modalidad, sueldo_mxn_min, sueldo_mxn_max, empresas(nombre, sector))',
    )
    .order('score', { ascending: false })
    .limit(limite)
  if (error) throw new Error(error.message)
  return data ?? []
}

// ---------------- reporte ----------------

export function generarReporte(): Promise<RespuestaReporte> {
  return invocar<RespuestaReporte>('reporte')
}

export async function ultimoReporte() {
  await idPersona()
  const { data, error } = await supabase
    .from('reportes')
    .select('id, version, resumen, mapa_md, payload, created_at')
    .order('version', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return (data ?? [])[0] ?? null
}

// ---------------- reto ----------------

export function generarReto(
  opciones: { area?: AreaReto; sesionId?: string } = {},
): Promise<RetoGenerado> {
  return invocar<RetoGenerado>('reto', {
    accion: 'generar',
    area: opciones.area,
    sesion_id: opciones.sesionId,
  })
}

export function evaluarReto(datos: {
  retoId: string
  respuesta: string
  segundos?: number
}): Promise<RetoEvaluado> {
  return invocar<RetoEvaluado>('reto', {
    accion: 'evaluar',
    reto_id: datos.retoId,
    respuesta: datos.respuesta,
    segundos: datos.segundos,
  })
}

// ---------------- privacidad (LFPDPPP) ----------------

export function exportarMisDatos(): Promise<Exportacion> {
  return invocar<Exportacion>('privacidad', { accion: 'exportar' })
}

/** Borra perfil, respuestas, reportes y cuenta. No se puede deshacer. */
export function borrarMiCuenta(): Promise<Borrado> {
  return invocar<Borrado>('privacidad', { accion: 'borrar', confirmar: 'BORRAR' })
}
