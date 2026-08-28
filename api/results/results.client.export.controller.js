import * as resultsService from './results.service.js';
import { verifyClientAccessWithPrivileges } from './results.access.service.js';
import { buildWideRows, toCsv } from './results.excel.data.util.js';
import { createWideExcelWorkbook } from './results.excel.workbook.builder.js';
import { createPdfReport } from './results.pdf.builder.js';
import { processSurveyAnalytics } from './results.analytics.core.service.js';

// Client-facing export (one row per respondent, demographic columns +
// one column per question) — Excel by default, or ?format=csv. Distinct
// from exportResponsesToExcel (admin-only, flat per-answer log): that one
// stays as-is for the admin dashboard so this doesn't change its output.
export const exportSurveyResponses = async (req, res) => {
  const { surveyId } = req.params;
  const format = (req.query.format || 'xlsx').toLowerCase();

  try {
    const survey = await verifyClientAccessWithPrivileges(surveyId, req.client?.id, req.client?.role);

    // PDF is a readable report (KPIs + per-question % breakdown +
    // respondent profile) built from the same analytics engine the
    // dashboard uses — not the raw per-respondent table below, which
    // wouldn't fit legibly on a page. That table is what CSV/Excel are for.
    if (format === 'pdf') {
      const { analytics } = await processSurveyAnalytics(survey);
      const doc = createPdfReport(survey, analytics);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Encuesta_${surveyId}.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    const responses = await resultsService.getSurveyResponsesWithUserDetails(surveyId);
    if (!responses || responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    const { rows, questionOrder } = buildWideRows(responses);

    if (format === 'csv') {
      const csv = toCsv(rows, questionOrder);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=Encuesta_${surveyId}.csv`);
      // Leading BOM so Excel opens accented characters correctly instead
      // of assuming Latin-1.
      return res.send('﻿' + csv);
    }

    const workbook = createWideExcelWorkbook(rows, questionOrder);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=Encuesta_${surveyId}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(`[results.client.export] exportSurveyResponses failed (surveyId=${surveyId}, clientId=${req.client?.id}):`, error.message);
    const status = error.message.includes('Access denied')
      ? 403
      : error.message.includes('not found')
        ? 404
        : 500;
    res.status(status).json({ message: error.message });
  }
};
