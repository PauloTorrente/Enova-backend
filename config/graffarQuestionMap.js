// The contract between "how the Perfilación Quirúrgica survey gets
// authored in Enova-Pulse" and "how the backend reads its answers back
// out to run the Graffar formula". Whoever builds that survey (via the
// normal survey-creation flow, then marks it surveyType:
// 'surgical_profiling') MUST use these exact questionIds, and — for the
// coded questions — these exact option texts (copied verbatim from the
// spec). If the wording drifts, the lookup tables below stop matching and
// the calculation throws "Missing or invalid required field" instead of
// silently producing a wrong score.

// field name (as calculateSurgicalProfile expects it) -> the questionId
// that question must be created with.
export const GRAFFAR_QUESTION_IDS = {
  sostenQuien: 'sosten_quien',       // A1
  ocupacionSosten: 'ocupacion_sosten', // A2
  educacionSosten: 'educacion_sosten', // A3
  fuenteIngreso: 'fuente_ingreso',     // A4
  tenencia: 'tenencia',                // A5
  banos: 'banos',                      // A6
  personas: 'personas',                // A7
  serviciosHogar: 'servicios_hogar',   // A8 (multiple) — internet/streaming feed posesiones too
  posesiones: 'posesiones',            // A9 (multiple)
  cpZona: 'cp_zona',                   // A10
  numHijos: 'num_hijos',               // B1
  estadoPareja: 'estado_pareja',       // B2
  decisorCompras: 'decisor_compras',   // B3
  categorias: 'categorias',            // C1 (multiple)
  canales: 'canales',                  // C2 (multiple)
  digital: 'digital',                  // C3 (multiple)
  sector: 'sector',                    // C4
  actitudCompra: 'actitud_compra',     // D1
  actitudInnovador: 'actitud_innovador', // D2
  controlAtencion: 'control_atencion', // control de calidad
  // No "país" question — the calculation reads it straight off the
  // respondent's own Filtro Preliminar profile (User.country) instead of
  // asking again.
};

// A2 — ocupación del sostén del hogar (alimenta Graffar)
export const OCUPACION_SOSTEN_CODES = {
  'Profesional, directivo/a o dueño/a de una empresa grande': 1,
  'Técnico/a, mando medio, o comerciante/productor mediano': 2,
  'Empleado/a administrativo u operativo, o pequeño comerciante': 3,
  'Obrero/a o trabajador/a por cuenta propia estable': 4,
  'Trabajo ocasional o informal, sin ingreso fijo': 5,
};

// A3 — educación del sostén del hogar (alimenta Graffar). Same wording
// used for Filtro Preliminar's educacion_propia, kept as one shared table.
export const EDUCACION_CODES = {
  'Universitario o más': 1,
  'Técnico superior o secundaria completa': 2,
  'Secundaria incompleta': 3,
  'Primaria': 4,
  'Sin estudios formales': 5,
};

// A4 — fuente de ingreso del hogar (alimenta Graffar)
export const FUENTE_INGRESO_CODES = {
  'Rentas, inversiones o un negocio propio': 1,
  'Honorarios profesionales o ganancias de una empresa': 2,
  'Un sueldo fijo mensual': 3,
  'Pago semanal, diario, por trabajo hecho u ocasional': 4,
  'Apoyos, subsidios, remesas o ayuda de familiares': 5,
};

// A5 — tenencia de la vivienda (alimenta vivienda_score)
export const TENENCIA_CODES = {
  'Propia, ya pagada': 'propia_pagada',
  'Propia, pagándola': 'propia_pagandose',
  'Alquilada': 'alquilada',
  'Prestada u otra': 'prestada_otra',
};

// A6 — baños completos (alimenta vivienda_score). "3 o más" -> 3.
export const BANOS_CODES = {
  '3 o más': 3,
  '2': 2,
  '1': 1,
  '0': 0,
};

// B3 — quién decide las compras (informativo/routing, no alimenta la fórmula)
export const DECISOR_COMPRAS_CODES = {
  'Yo decido': 'si',
  'Lo decidimos entre varios': 'compartido',
  'Decide otra persona': 'no',
};

// A8 + A9 combined — option text -> the boolean key stored in `posesiones`.
// Only 8 of these feed indice_posesiones (see POSESION_KEYS in
// graffarConfig.js); the rest (moto, secadora, alexa, streaming) are kept
// in the raw answers but don't affect the score.
export const POSESION_OPTION_TO_KEY = {
  'Internet fijo en casa': 'internet',       // A8 — counts toward the 8
  'TV o streaming de pago': 'streaming',     // A8 — extra, not counted
  'Automóvil': 'auto',                       // A9
  'Lavadora': 'lavadora',                    // A9
  'Refrigerador': 'refrigerador',            // A9
  'Aire acondicionado': 'aire',              // A9
  'Computador o laptop': 'computador',       // A9
  'Tarjeta de crédito': 'tarjeta',           // A9
  'Cuenta o app bancaria': 'banca',          // A9
  'Moto': 'moto',                            // A9 — extra, not counted
  'Secadora': 'secadora',                    // A9 — extra, not counted
  'Alexa o dispositivo similar': 'alexa',    // A9 — extra, not counted
};
