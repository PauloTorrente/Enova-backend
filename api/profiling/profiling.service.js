import SurgicalProfile from './profiling.model.js';
import { calculateSurgicalProfile } from './profiling.graffar.service.js';

// Runs the Graffar formula on a set of raw answers and persists both the
// calculated fields and the raw answers in one row. Shared by the manual
// QA endpoint (POST /profiling/surgical) and the real respondent path (a
// survey marked surveyType: 'surgical_profiling' — see
// surveys.response.validation.controller.js) so the two never drift.
export const saveSurgicalProfile = async (userId, answers) => {
  const calculated = calculateSurgicalProfile(answers);

  return SurgicalProfile.create({
    userId,
    sostenQuien: answers.sosten_quien ?? null,
    ocupacionSosten: answers.ocupacion_sosten,
    educacionSosten: answers.educacion_sosten,
    fuenteIngreso: answers.fuente_ingreso,
    tenencia: answers.tenencia,
    banos: answers.banos,
    personas: answers.personas,
    posesiones: answers.posesiones ?? null,
    cpZona: answers.cp_zona ?? null,
    numHijos: answers.num_hijos ?? null,
    estadoPareja: answers.estado_pareja ?? null,
    decisorCompras: answers.decisor_compras ?? null,
    categorias: answers.categorias ?? null,
    canales: answers.canales ?? null,
    digital: answers.digital ?? null,
    sector: answers.sector ?? null,
    actitudCompra: answers.actitud_compra ?? null,
    actitudInnovador: answers.actitud_innovador ?? null,
    controlAtencion: answers.control_atencion ?? null,
    flagAtencion: calculated.flagAtencion,
    pais: answers.pais ?? null,
    rawAnswers: answers,
    ...calculated,
  });
};
