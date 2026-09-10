# Arquitectura de Enfoca

## Una sola base, tres capas

No hay dos bases de datos. Postgres hace los tres trabajos:

1. **Relacional (el sistema).** Tablas normalizadas con enums y llaves
   foráneas: `personas`, `sesiones`, `big_five`, `riasec`, `valores_persona`,
   `condiciones_persona`, `vacantes`, `matches`. Aquí manda la integridad.
2. **Documental `jsonb` (el LLM).** Lo que no tiene forma fija:
   `sesiones.progreso`, `respuestas.respuesta`, `retos.rubrica`,
   `retos.eventos`, `reportes.payload`, `matches.desglose`,
   `hipotesis.evidencia`, `audit_llm_writes.entrada`.
3. **Vectorial `pgvector` (la búsqueda por significado).** Columnas
   `embedding` en `vacantes`, `empresas`, `reportes` y `llm_documents`, con
   índices HNSW sobre `extensions.vector_ip_ops`.

Eso evita el problema clásico de tener Mongo para el LLM y SQL para el
sistema: dos verdades que se desincronizan. Aquí la verdad es una.

## Las 6 fases y dónde queda cada cosa

| Fase | Instrumento | Se guarda en |
| --- | --- | --- |
| 0 Conexión | Contexto y filtros duros | `personas` (incluye `ingles`, `horas_semana`, `sueldo_minimo_mxn`) |
| 1 Big Five | 10 reactivos, escala 1–5 | `big_five` (puntaje 0–100, `confianza`, crudas en `reactivos`) |
| 2 RIASEC | 10 reactivos, escala 1–5 | `riasec` + `codigo_riasec` calculado |
| 3 Valores | 10 pares A/B | `elecciones_valores` y `valores_persona` (peso 0–100) |
| 4 Entrevista | Conversación | `fortalezas`, `dealbreakers`, `condiciones_persona`, `persona_skills` |
| 5 Reto | Rúbrica 0–4 | `retos` (`rubrica` y `eventos` en `jsonb`) |
| Cierre | Mapa Profesional | `reportes` (versionado) + `hipotesis` |

**El LLM conversa y transcribe; la aritmética vive en código.** Big Five se
calcula con `puntaje = round(100 * (promedio - 1) / 4)` y el reactivo 9 está
redactado al revés (se invierte con `6 - v`). Así el resultado es
reproducible y auditable, no depende de que el modelo sume bien.

## Motor de match

Corre en SQL (`buscar_vacantes`, migración `0004`), no en el modelo.

**Filtros duros** (descartan la vacante y dicen por qué): inglés requerido,
horas por semana, piso salarial y `dealbreaker_roto` (una dimensión marcada
como indispensable con diferencia mayor a 2).

**Pesos:**

| Componente | Peso |
| --- | --- |
| Habilidades | 0.25 |
| Condiciones de trabajo | 0.25 |
| Intereses (RIASEC) | 0.20 |
| Valores | 0.15 |
| Personalidad (Big Five) | 0.10 |
| Semántica (pgvector) | 0.05 |

Los pesos se **renormalizan sobre lo efectivamente medido**:
`score = 100 * Σ(peso_i · componente_i) / Σ(pesos medidos)`. Alguien que sólo
hizo la fase 1 igual obtiene un score honesto, con su `cobertura` y sus
`faltantes` en el desglose.

La personalidad pesa poco a propósito y nunca es filtro de exclusión.

## Las 8 dimensiones de entorno (escala −2 a +2)

| Dimensión | −2 | +2 |
| --- | --- | --- |
| estructura | Improviso sobre la marcha | Necesito procesos y checklists |
| comunicacion | Por escrito y asíncrona | Mucha llamada y voz |
| interrupciones | Bloques largos sin interrumpir | Cambiar de tarea todo el día |
| interaccion_social | Prácticamente solo | Trato con gente todo el día |
| entorno | Silencio y pocos estímulos | Lugar concurrido y con movimiento |
| sincronia | Flexible, yo elijo cuándo | Fijo y compartido con el equipo |
| supervision | Autonomía total | Retroalimentación frecuente |
| precision | Prefiero velocidad | Prefiero exactitud |

La misma escala se usa para la persona (`condiciones_persona`) y para la
empresa (`entorno_empresa`), así el encaje es una resta, no una corazonada.

## Seguridad

- **RLS en todas las tablas.** Cada persona sólo ve sus filas; los catálogos
  (`skills`, `vacantes`, `empresas`, `dimensiones_ref`) son de lectura.
- Las funciones usan el cliente de usuario, que respeta RLS. El cliente admin
  se reserva para bitácoras (`llm_calls`, `audit_llm_writes`,
  `eventos_privacidad`) y para el borrado de cuenta.
- `al_crear_usuario()` y `tocar_updated_at()` son `SECURITY DEFINER` pero con
  `EXECUTE` revocado a `anon` y `authenticated` (migración `0006`), así no se
  pueden llamar por REST.
- `indexar` va con `verify_jwt = false` porque no recibe JWT de usuario:
  valida la service role key por dentro y responde 403 a cualquier otra cosa.

## Costos

Cada llamada al modelo se registra en `llm_calls` con tokens, latencia y costo
estimado. `presupuestoAgotado()` suma el gasto de las últimas 24 h y responde
**429** si pasa de `LLM_GASTO_MAX_USD_DIA` (5 USD por defecto). En un
hackathon con la llave compartida, eso es la diferencia entre una demo y un
cobro sorpresa.

## Mantenimiento de embeddings

Las vacantes y empresas nuevas entran sin `embedding`. Para llenarlos:

```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "content-type: application/json" \
  -d '{"que":"todo","limite":100}' \
  "$SUPABASE_URL/functions/v1/indexar"
```

Devuelve cuántos indexó y cuántos quedan pendientes. Nunca lo llames desde el
navegador: expondrías la service role key.

## Deuda técnica conocida

- En RIASEC, `emprendedor` y `convencional` tienen **un solo reactivo** cada
  uno (los demás tienen dos). Su confiabilidad es más baja; conviene subirlos
  a dos reactivos.
- Las 6 vacantes sembradas son de ejemplo (`fuente = 'ejemplo'`), las tres
  primeras replican los `mockJobs` del frontend.
- Falta ingesta real de vacantes; el esquema ya la contempla con `fuente` y
  `url` en `vacantes`.
