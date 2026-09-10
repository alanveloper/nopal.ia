// Contrato de las Edge Functions y del motor de match.
// Si cambias algo en supabase/functions, actualiza este archivo.

export type Fase =
  | 'f0_conexion' | 'f1_big_five' | 'f2_riasec'
  | 'f3_valores' | 'f4_entrevista' | 'f5_reto' | 'cierre'

export type Etapa =
  | 'bienvenida' | 'perfil' | 'cuestionario' | 'big_five' | 'riasec'
  | 'valores' | 'entrevista' | 'reto' | 'reporte' | 'listo'

export type AreaReto = 'verbal' | 'analitico' | 'espacial' | 'logico'

export type Dimension =
  | 'estructura' | 'comunicacion' | 'interrupciones' | 'interaccion_social'
  | 'entorno' | 'sincronia' | 'supervision' | 'precision'

export type PerfilBasico = {
  nombre?: string
  email?: string
  ciudad?: string
  descripcionPersonal?: string
  situacionActual?: string
}

export type RespuestaChat = {
  sesion_id: string
  fase: Fase
  etapa: Etapa
  respuesta: string
  /** Nombres de las herramientas que si escribieron en la base. */
  guardado: string[]
}

/** Cada componente va de 0 a 1. El score final los pondera y renormaliza. */
export type DesgloseMatch = {
  habilidades?: number
  condiciones?: number
  intereses?: number
  valores?: number
  personalidad?: number
  semantica?: number
  /** Que porcentaje del perfil ya esta medido. */
  cobertura?: number
  /** Componentes que aun no se pueden calcular. */
  faltantes?: string[]
  [clave: string]: unknown
}

export type VacanteMatch = {
  vacante_id: string
  titulo: string
  empresa: string | null
  modalidad: string | null
  /** 0 a 100. Lo calcula SQL, no el LLM. */
  score: number
  desglose: DesgloseMatch
  /** Filtro duro que la descarto: ingles, horas, sueldo o dealbreaker. */
  descartada_por: string | null
  explicacion?: string
}

export type RespuestaMatch = {
  vacantes: VacanteMatch[]
  perfil_usado: string
  semantica: boolean
  cobertura: number
  faltantes: string[]
  nota: string
}

export type RespuestaReporte = {
  reporte_id: string
  version: number
  estado_evaluacion: 'completada' | 'parcial'
  fases_sin_medir: string[]
  resumen: string
  /** Mapa Profesional en Markdown, listo para renderizar. */
  mapa_md: string
  payload: Record<string, unknown>
  siguiente_paso: string
}

export type CriterioReto = { clave: string; titulo: string; peso: number }

export type RetoGenerado = {
  reto_id: string
  area: AreaReto
  enunciado: string
  criterios: CriterioReto[]
}

export type RetoEvaluado = {
  reto_id: string
  area: AreaReto
  promedio_0_4: number
  puntaje_0_100: number
  aprueba: boolean
  criterios: Array<CriterioReto & { puntos: number; comentario: string }>
  lo_que_hiciste_bien: string
  como_mejorar: string
  habilidades_con_evidencia: number
  nota: string
}

export type Exportacion = {
  generado_at: string
  persona_id: string
  aviso: string
  datos: Record<string, unknown>
}

export type Borrado = { borrado: boolean; mensaje?: string; aviso?: string }
