import SurgicalProfile from './profiling.model.js';
import { saveSurgicalProfile } from './profiling.service.js';
import User from '../users/users.model.js';
import * as paymentsService from '../payments/payments.service.js';
import { verifyClientAccessWithPrivileges } from '../results/results.access.service.js';
import {
  OCUPACION_SOSTEN_CODES,
  EDUCACION_CODES,
  FUENTE_INGRESO_CODES,
  TENENCIA_CODES,
  DECISOR_COMPRAS_CODES,
  POSESION_OPTION_TO_KEY,
} from '../../config/graffarQuestionMap.js';

// The code tables in graffarQuestionMap.js go label -> code (that's what
// decoding an incoming answer needs); the QA drill-down needs the reverse
// (code -> label) to show a respondent's answers back in plain Spanish
// instead of raw numbers/keys. Built once here rather than duplicated in
// graffarQuestionMap.js, since nothing else needs this direction.
const invert = (table) => Object.fromEntries(Object.entries(table).map(([label, code]) => [code, label]));
const OCUPACION_SOSTEN_LABELS = invert(OCUPACION_SOSTEN_CODES);
const EDUCACION_LABELS = invert(EDUCACION_CODES);
const FUENTE_INGRESO_LABELS = invert(FUENTE_INGRESO_CODES);
const TENENCIA_LABELS = invert(TENENCIA_CODES);
const DECISOR_COMPRAS_LABELS = invert(DECISOR_COMPRAS_CODES);
const POSESION_KEY_LABELS = invert(POSESION_OPTION_TO_KEY);

// Turns one SurgicalProfile row's stored fields (a mix of decoded codes and
// raw survey text — see profiling.survey-mapper.js) back into a fully
// human-readable breakdown, for the per-respondent drill-down in the
// Perfilación directory / per-survey results pages.
const buildProfileDetail = (p) => ({
  sostenQuien: p.sostenQuien,
  ocupacionSosten: OCUPACION_SOSTEN_LABELS[p.ocupacionSosten] ?? p.ocupacionSosten,
  educacionSosten: EDUCACION_LABELS[p.educacionSosten] ?? p.educacionSosten,
  fuenteIngreso: FUENTE_INGRESO_LABELS[p.fuenteIngreso] ?? p.fuenteIngreso,
  tenencia: TENENCIA_LABELS[p.tenencia] ?? p.tenencia,
  banos: p.banos,
  personas: p.personas,
  posesiones: Object.entries(p.posesiones || {})
    .filter(([, has]) => has)
    .map(([key]) => POSESION_KEY_LABELS[key] ?? key),
  cpZona: p.cpZona,
  numHijos: p.numHijos,
  estadoPareja: p.estadoPareja,
  decisorCompras: DECISOR_COMPRAS_LABELS[p.decisorCompras] ?? p.decisorCompras,
  categorias: p.categorias || [],
  canales: p.canales || [],
  digital: p.digital || [],
  sector: p.sector,
  actitudCompra: p.actitudCompra,
  actitudInnovador: p.actitudInnovador,
  controlAtencion: p.controlAtencion,
  viviendaScore: p.viviendaScore,
});

// POST /api/profiling/surgical — MANUAL/QA SHORTCUT ONLY. Takes a
// hand-built JSON body and runs it through the Graffar formula directly —
// useful for testing the formula itself, but real respondents never call
// this. The real path is: an admin/client creates an actual survey with
// surveyType: 'surgical_profiling' and the questionIds from
// config/graffarQuestionMap.js, the respondent answers it like any other
// survey (POST /surveys/respond), and the scoring happens automatically
// from those answers (see surveys.response.validation.controller.js).
export const submitSurgicalProfile = async (req, res) => {
  const userId = req.user.userId;
  const answers = req.body;

  try {
    const profile = await saveSurgicalProfile(userId, answers);
    res.status(201).json({ success: true, profile });
  } catch (error) {
    console.error(`[profiling] submitSurgicalProfile failed (userId=${userId}):`, error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/profiling/surgical/me — the logged-in respondent's most recent
// submission (there should only ever be one, but survey re-submission
// isn't blocked here — that policy call belongs to whoever wires up the
// paid-survey flow on top of this).
export const getMySurgicalProfile = async (req, res) => {
  try {
    const profile = await SurgicalProfile.findOne({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']],
    });
    if (!profile) return res.status(404).json({ success: false, message: 'No surgical profile submitted yet' });
    res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error(`[profiling] getMySurgicalProfile failed (userId=${req.user?.userId}):`, error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// GET /api/profiling/client/survey/:surveyId/results — a client's view of
// how their Perfilación Quirúrgica survey's respondents scored: the raw
// list plus a distribution so the client doesn't have to add it up by
// hand. Ownership-checked the same way as results.client.scores.controller.js.
export const getSurveyGraffarResults = async (req, res) => {
  const { surveyId } = req.params;

  try {
    await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);

    const profiles = await SurgicalProfile.findAll({
      where: { surveyId },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']],
    });

    const distribution = { I: 0, II: 0, III: 0, IV: 0, V: 0 };
    let flaggedCount = 0;

    const respondents = profiles.map((p) => {
      distribution[p.estratoLabel] = (distribution[p.estratoLabel] || 0) + 1;
      if (p.flagRevisar || p.flagAtencion) flaggedCount += 1;

      return {
        id: p.id,
        userId: p.userId,
        name: p.user ? `${p.user.firstName} ${p.user.lastName}` : `Usuario ${p.userId}`,
        estrato: p.estrato,
        estratoLabel: p.estratoLabel,
        graffar: p.graffar,
        indicePosesiones: p.indicePosesiones,
        bandaObjetivaLabel: p.bandaObjetivaLabel,
        etiquetaLocal: p.etiquetaLocal,
        flagRevisar: p.flagRevisar,
        flagAtencion: p.flagAtencion,
        pais: p.pais,
        createdAt: p.createdAt,
        detail: buildProfileDetail(p),
      };
    });

    res.status(200).json({
      success: true,
      totalRespondents: respondents.length,
      distribution,
      flaggedCount,
      respondents,
    });
  } catch (error) {
    console.error(`[profiling] getSurveyGraffarResults failed (surveyId=${surveyId}, clientId=${req.client?.id}):`, error.message);
    const status = error.message.includes('Access denied') ? 403 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// GET /api/profiling/directory — every respondent who has a Perfilación
// Quirúrgica result, one row each (their most recent submission), for the
// standalone "ver el Graffar de cada usuario" page in Enova Pulse — not
// scoped to one survey, unlike getSurveyGraffarResults above. Same
// visibility rule as /users/ranking: any authenticated client can view it.
export const getGraffarDirectory = async (req, res) => {
  try {
    const allProfiles = await SurgicalProfile.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']],
    });

    // Keep only the latest row per userId (a respondent could in theory
    // have answered more than one surgical_profiling survey over time).
    const latestByUser = new Map();
    for (const p of allProfiles) {
      if (!latestByUser.has(p.userId)) latestByUser.set(p.userId, p);
    }

    const distribution = { I: 0, II: 0, III: 0, IV: 0, V: 0 };
    let flaggedCount = 0;

    const respondents = [...latestByUser.values()].map((p) => {
      distribution[p.estratoLabel] = (distribution[p.estratoLabel] || 0) + 1;
      if (p.flagRevisar || p.flagAtencion) flaggedCount += 1;

      return {
        id: p.id,
        userId: p.userId,
        name: p.user ? `${p.user.firstName} ${p.user.lastName}` : `Usuario ${p.userId}`,
        estrato: p.estrato,
        estratoLabel: p.estratoLabel,
        graffar: p.graffar,
        indicePosesiones: p.indicePosesiones,
        bandaObjetivaLabel: p.bandaObjetivaLabel,
        etiquetaLocal: p.etiquetaLocal,
        flagRevisar: p.flagRevisar,
        flagAtencion: p.flagAtencion,
        pais: p.pais,
        createdAt: p.createdAt,
        detail: buildProfileDetail(p),
      };
    });

    res.status(200).json({
      success: true,
      totalRespondents: respondents.length,
      distribution,
      flaggedCount,
      respondents,
    });
  } catch (error) {
    console.error('[profiling] getGraffarDirectory failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch Graffar directory' });
  }
};

// GET /api/profiling/summary — one readable view of everything this
// respondent has given so far: Filtro Preliminar (registration) fields,
// the Perfilación Quirúrgica result (if submitted), and their earnings.
// Built for demos/QA — the three pieces otherwise live behind three
// separate GETs (/users/me, /profiling/surgical/me, /payments/me).
export const getProfilingSummary = async (req, res) => {
  const userId = req.user.userId;

  try {
    const [user, surgicalProfile, payments] = await Promise.all([
      User.findByPk(userId),
      SurgicalProfile.findOne({ where: { userId }, order: [['createdAt', 'DESC']] }),
      paymentsService.getRespondentTransactions(userId),
    ]);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      filtroPreliminar: {
        nombre: `${user.firstName} ${user.lastName}`,
        email: user.email,
        whatsapp: user.phone_number,
        whatsappVerificado: user.whatsappVerified,
        pais: user.country,
        ciudad: user.city,
        cp: user.postalCode,
        sexo: user.gender,
        anioNacimiento: user.birthYear,
        educacionPropia: user.educationCode,
        ocupacionPropia: user.occupation,
        tieneHijos: user.hasChildren,
        consentimientoAceptado: user.consentAccepted,
        consentimientoFecha: user.consentDate,
      },
      perfilacionQuirurgica: surgicalProfile
        ? {
            estrato: surgicalProfile.estrato,
            estratoLabel: surgicalProfile.estratoLabel,
            graffar: surgicalProfile.graffar,
            indicePosesiones: surgicalProfile.indicePosesiones,
            bandaObjetiva: surgicalProfile.bandaObjetivaLabel,
            flagRevisar: surgicalProfile.flagRevisar,
            etiquetaLocal: surgicalProfile.etiquetaLocal,
            enviadoEl: surgicalProfile.createdAt,
          }
        : { estado: 'No ha respondido la Perfilación Quirúrgica todavía' },
      pagos: {
        walletBalance: user.walletBalance,
        totalGanado: payments.reduce((sum, t) => sum + t.amount, 0),
        movimientos: payments.length,
      },
    });
  } catch (error) {
    console.error(`[profiling] getProfilingSummary failed (userId=${userId}):`, error.message);
    res.status(500).json({ success: false, message: 'Failed to build profiling summary', error: error.message });
  }
};
