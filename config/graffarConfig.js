// Editable configuration for the Perfilación Quirúrgica (surgical profiling)
// scoring — the cutoffs and country labels below are meant to be tuned
// without touching the calculation code (per the spec: "los cortes y la
// tabla de etiquetas viven en configuración editable, no en código").

// graffar total (4-20) -> estrato. First cutoff whose `max` the total is
// <= to wins.
export const GRAFFAR_CUTOFFS = [
  { max: 6, estrato: 1, label: 'I' },
  { max: 9, estrato: 2, label: 'II' },
  { max: 12, estrato: 3, label: 'III' },
  { max: 16, estrato: 4, label: 'IV' },
  { max: Infinity, estrato: 5, label: 'V' },
];

// indice_posesiones (0-100) -> banda objetiva. First band whose `min` the
// index is >= to wins (list must stay sorted highest-min first).
export const POSESIONES_BANDS = [
  { min: 78, estrato: 1, label: 'I' },
  { min: 60, estrato: 2, label: 'II' },
  { min: 40, estrato: 3, label: 'III' },
  { min: 20, estrato: 4, label: 'IV' },
  { min: 0, estrato: 5, label: 'V' },
];

// Pending from Pepe: real per-country label tables (e.g. AMAI bands for
// MX). "default" is used for any country not yet configured here.
export const ETIQUETA_LOCAL_BY_COUNTRY = {
  default: { 1: 'Estrato I', 2: 'Estrato II', 3: 'Estrato III', 4: 'Estrato IV', 5: 'Estrato V' },
};

// The exact answer that counts as "paying attention" for the control_atencion
// question (A/B-style trap question inserted mid-survey).
export const CONTROL_ATENCION_EXPECTED_ANSWER = 'De acuerdo';

// The 8 possessions that feed indice_posesiones — must match the boolean
// keys sent in `posesiones` from the client. "auto" is weighted double per
// the spec ("auto cuenta doble"), which is why the divisor below is 8.5
// (7 single-weight items + 1 double-weight item = 8.5 max points for 8 items).
export const POSESION_KEYS = [
  'auto', 'lavadora', 'refrigerador', 'aire', 'computador', 'tarjeta', 'banca', 'internet',
];
