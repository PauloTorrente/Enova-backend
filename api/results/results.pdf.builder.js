import PDFDocument from 'pdfkit';

// Client-facing PDF export: a readable report (KPIs + per-question
// breakdown with percentage bars + respondent profile), not a raw data
// dump — that's what the Excel/CSV export is for. Mirrors what's already
// on screen in SurveyResults so the numbers never disagree between the
// dashboard and the exported file.

const BRAND = '6C63FF';
const TEXT_DARK = '1a1a2e';
const TEXT_MUTED = '6b7280';

const drawBar = (doc, x, y, width, height, pct, color) => {
  doc.roundedRect(x, y, width, height, height / 2).fill('#EEF0F6');
  const filled = Math.max(2, (width * Math.min(100, pct)) / 100);
  doc.roundedRect(x, y, filled, height, height / 2).fill(`#${color}`);
};

const sortByCount = (counts) =>
  Object.entries(counts || {}).sort(([, a], [, b]) => b - a);

const toPct = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

const addDemographicMiniTable = (doc, label, counts, total) => {
  const entries = sortByCount(counts).slice(0, 5);
  if (entries.length === 0) return;

  doc.fontSize(9).fillColor(TEXT_MUTED).text(label, { continued: false });
  entries.forEach(([key, count]) => {
    doc.fontSize(9).fillColor(TEXT_DARK).text(`  ${key}: ${toPct(count, total)}% (${count})`);
  });
  doc.moveDown(0.3);
};

export const createPdfReport = (survey, analyticsData) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const { basicStats, questionAnalytics, demographicOverview } = analyticsData;

  // ── Header ──────────────────────────────────────────────────────────
  doc.fontSize(20).fillColor(TEXT_DARK).text(survey.title || 'Encuesta', { align: 'left' });
  if (survey.description) {
    doc.fontSize(11).fillColor(TEXT_MUTED).text(survey.description);
  }
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor(TEXT_MUTED).text(`Generado: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  doc.moveDown(1);

  // ── KPI summary ─────────────────────────────────────────────────────
  const kpis = [
    ['Total respuestas', basicStats.totalResponses],
    ['Usuarios únicos', basicStats.totalUsers],
    ['Respuestas por usuario', basicStats.responsesPerUser],
    ['Cumplimiento vs. meta', basicStats.completionRate != null ? `${basicStats.completionRate}%` : 'Sin meta']
  ];
  const kpiWidth = (doc.page.width - 100) / kpis.length;
  const kpiY = doc.y;
  kpis.forEach(([label, value], i) => {
    const x = 50 + i * kpiWidth;
    doc.fontSize(16).fillColor(`#${BRAND}`).text(String(value), x, kpiY, { width: kpiWidth - 10 });
    doc.fontSize(8).fillColor(TEXT_MUTED).text(label, x, doc.y, { width: kpiWidth - 10 });
  });
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#E5E7EB').stroke();
  doc.moveDown(1);

  // ── Per-question breakdown ──────────────────────────────────────────
  questionAnalytics.forEach((question, idx) => {
    if (doc.y > doc.page.height - 150) doc.addPage();

    doc.fontSize(12).fillColor(TEXT_DARK).text(`${idx + 1}. ${question.question}`, { width: doc.page.width - 100 });
    doc.moveDown(0.4);

    if (question.options && Object.keys(question.options).length > 0) {
      // Choice question: one bar per option, colored by rank.
      const total = question.totalAnswers || 0;
      const ranked = sortByCount(
        Object.fromEntries(Object.entries(question.options).map(([label, o]) => [label, o.count]))
      );
      const colors = ['4F46E5', 'F59E0B', '10B981', 'EF4444', '8B5CF6', '06B6D4', 'EC4899'];

      ranked.forEach(([label, count], i) => {
        if (doc.y > doc.page.height - 100) doc.addPage();
        const pct = toPct(count, total);
        const barY = doc.y + 3;
        doc.fontSize(9).fillColor(TEXT_DARK).text(label.length > 55 ? `${label.slice(0, 55)}…` : label, 50, doc.y, { width: 320 });
        drawBar(doc, 380, barY, 100, 8, pct, colors[i % colors.length]);
        doc.fontSize(9).fillColor(TEXT_MUTED).text(`${pct}% (${count})`, 490, barY - 2);
        doc.moveDown(0.6);
      });
    } else {
      // Open-ended question: just note how many people answered — the
      // full text answers live in the Excel/CSV export, not this report.
      doc.fontSize(9).fillColor(TEXT_MUTED).text(`Respuesta abierta — ${question.totalAnswers || 0} respuestas recibidas`);
    }

    doc.moveDown(1);
  });

  // ── Respondent profile (survey-wide) ────────────────────────────────
  if (doc.y > doc.page.height - 200) doc.addPage();
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#E5E7EB').stroke();
  doc.moveDown(1);
  doc.fontSize(13).fillColor(TEXT_DARK).text('Perfil de los encuestados');
  doc.moveDown(0.5);

  const total = basicStats.totalResponses || 0;
  addDemographicMiniTable(doc, 'Género', demographicOverview.byGender, total);
  addDemographicMiniTable(doc, 'Edad', demographicOverview.byAgeGroup, total);
  addDemographicMiniTable(doc, 'Ciudad', demographicOverview.byCity, total);

  return doc;
};
