import {
  GRAFFAR_CUTOFFS,
  POSESIONES_BANDS,
  ETIQUETA_LOCAL_BY_COUNTRY,
  CONTROL_ATENCION_EXPECTED_ANSWER,
  POSESION_KEYS,
} from '../../config/graffarConfig.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// vivienda_score (1-5): bathrooms drive the base, then penalties stack for
// renting/borrowing the home and for crowding with too few bathrooms.
export const calculateViviendaScore = ({ banos, tenencia, personas }) => {
  let base;
  if (banos >= 3) base = 1;
  else if (banos === 2) base = 2;
  else if (banos === 1) base = 3;
  else base = 5;

  let score = base;
  if (tenencia === 'alquilada') score += 1;
  if (tenencia === 'prestada_otra') score += 1;
  if (personas >= 6 && banos <= 1) score += 1;

  return clamp(score, 1, 5);
};

export const resolveEstrato = (graffar) =>
  GRAFFAR_CUTOFFS.find((c) => graffar <= c.max) || GRAFFAR_CUTOFFS[GRAFFAR_CUTOFFS.length - 1];

// indice_posesiones (0-100): share of the 8 tracked possessions the
// household has, with "auto" weighted double (see POSESION_KEYS docstring).
export const calculateIndicePosesiones = (posesiones = {}) => {
  const n = POSESION_KEYS.reduce((count, key) => count + (posesiones[key] ? 1 : 0), 0);
  const autoBonus = posesiones.auto ? 0.5 : 0;
  return Math.min(100, Math.round(((n + autoBonus) / 8.5) * 100));
};

export const resolveBandaObjetiva = (indice) =>
  POSESIONES_BANDS.find((b) => indice >= b.min) || POSESIONES_BANDS[POSESIONES_BANDS.length - 1];

// Runs the whole Graffar-adapted formula against one submission's raw
// answers and returns every derived field to persist alongside them. This
// is the single source of truth for the calculation — don't reimplement
// it elsewhere (per the spec).
export const calculateSurgicalProfile = (answers) => {
  const { ocupacion_sosten, educacion_sosten, fuente_ingreso, tenencia, banos, personas, posesiones, pais, control_atencion } = answers;

  for (const [field, value] of Object.entries({ ocupacion_sosten, educacion_sosten, fuente_ingreso, banos, personas })) {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      throw new Error(`Missing or invalid required field for scoring: ${field}`);
    }
  }

  const viviendaScore = calculateViviendaScore({ banos: Number(banos), tenencia, personas: Number(personas) });
  const graffar = Number(ocupacion_sosten) + Number(educacion_sosten) + Number(fuente_ingreso) + viviendaScore;
  const estratoInfo = resolveEstrato(graffar);
  const indicePosesiones = calculateIndicePosesiones(posesiones);
  const bandaInfo = resolveBandaObjetiva(indicePosesiones);
  const flagRevisar = Math.abs(estratoInfo.estrato - bandaInfo.estrato) >= 2;
  const flagAtencion = control_atencion !== undefined && control_atencion !== CONTROL_ATENCION_EXPECTED_ANSWER;
  const etiquetaTable = ETIQUETA_LOCAL_BY_COUNTRY[pais] || ETIQUETA_LOCAL_BY_COUNTRY.default;

  return {
    viviendaScore,
    graffar,
    estrato: estratoInfo.estrato,
    estratoLabel: estratoInfo.label,
    indicePosesiones,
    bandaObjetiva: bandaInfo.estrato,
    bandaObjetivaLabel: bandaInfo.label,
    flagRevisar,
    flagAtencion,
    etiquetaLocal: etiquetaTable[estratoInfo.estrato],
  };
};
