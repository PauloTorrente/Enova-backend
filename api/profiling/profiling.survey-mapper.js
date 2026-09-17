import {
  GRAFFAR_QUESTION_IDS,
  OCUPACION_SOSTEN_CODES,
  EDUCACION_CODES,
  FUENTE_INGRESO_CODES,
  TENENCIA_CODES,
  BANOS_CODES,
  DECISOR_COMPRAS_CODES,
  POSESION_OPTION_TO_KEY,
} from '../../config/graffarQuestionMap.js';

const byQuestionId = (results, questionId) =>
  results.find((r) => r.questionId === questionId)?.answer;

// A question's answer for a single-select coded question comes back as
// the literal option text the respondent picked — decode it through the
// matching lookup table. Passes the value through unchanged if it isn't
// in the table (lets a numeric/free-text answer flow through as-is).
const decode = (value, table) => (value !== undefined && table[value] !== undefined ? table[value] : value);

// A8 (servicios) and A9 (posesiones) are separate multi-select questions
// in the survey but both feed the same `posesiones` bag the formula reads.
const buildPosesiones = (results) => {
  const bag = {};
  for (const fieldKey of ['serviciosHogar', 'posesiones']) {
    const answer = byQuestionId(results, GRAFFAR_QUESTION_IDS[fieldKey]);
    const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
    for (const optionText of selected) {
      const key = POSESION_OPTION_TO_KEY[optionText];
      if (key) bag[key] = true;
    }
  }
  return bag;
};

// Turns the Result rows a respondent left on a survey marked
// surveyType: 'surgical_profiling' into the `answers` shape
// calculateSurgicalProfile expects — the same shape POST /profiling/surgical
// takes directly (that endpoint is now a manual/QA-only shortcut; this is
// the real respondent-facing path). See config/graffarQuestionMap.js for
// the questionId/option-text contract this depends on.
export const mapSurveyResultsToGraffarAnswers = (results) => {
  const get = (fieldKey) => byQuestionId(results, GRAFFAR_QUESTION_IDS[fieldKey]);

  return {
    sosten_quien: get('sostenQuien'),
    ocupacion_sosten: decode(get('ocupacionSosten'), OCUPACION_SOSTEN_CODES),
    educacion_sosten: decode(get('educacionSosten'), EDUCACION_CODES),
    fuente_ingreso: decode(get('fuenteIngreso'), FUENTE_INGRESO_CODES),
    tenencia: decode(get('tenencia'), TENENCIA_CODES),
    banos: decode(get('banos'), BANOS_CODES),
    personas: Number(get('personas')),
    posesiones: buildPosesiones(results),
    cp_zona: get('cpZona'),
    num_hijos: get('numHijos'),
    estado_pareja: get('estadoPareja'),
    decisor_compras: decode(get('decisorCompras'), DECISOR_COMPRAS_CODES),
    categorias: get('categorias'),
    canales: get('canales'),
    digital: get('digital'),
    sector: get('sector'),
    actitud_compra: get('actitudCompra'),
    actitud_innovador: get('actitudInnovador'),
    control_atencion: get('controlAtencion'),
    // No separate "país" question — pulled from the respondent's own
    // Filtro Preliminar profile (User.country) by the caller instead, to
    // avoid asking the same thing twice. See the hook in
    // surveys.response.validation.controller.js.
    pais: undefined,
  };
};
