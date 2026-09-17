import SurgicalProfile from './profiling.model.js';
import { saveSurgicalProfile } from './profiling.service.js';
import User from '../users/users.model.js';
import * as paymentsService from '../payments/payments.service.js';

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
