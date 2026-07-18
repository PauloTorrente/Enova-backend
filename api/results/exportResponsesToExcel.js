// Express handler for GET /export/:surveyId — streams a survey's
// responses back as an .xlsx report.
//
// Split by responsibility:
//   - results.excel.data.util.js       -> response cleanup + statistics
//   - results.excel.workbook.builder.js -> ExcelJS workbook/sheet assembly
// This file only orchestrates the request/response cycle.

import * as resultsService from './results.service.js';
import { processResponses } from './results.excel.data.util.js';
import { createExcelWorkbook } from './results.excel.workbook.builder.js';

export const exportResponsesToExcel = async (req, res) => {
  const { surveyId } = req.params;

  try {
    const responses = await resultsService.getResponsesBySurvey(surveyId);
    const processedData = processResponses(responses);
    const workbook = createExcelWorkbook(processedData);

    sendExcelResponse(res, workbook, surveyId);
  } catch (error) {
    console.error(`[exportResponsesToExcel] Export failed (surveyId=${surveyId}):`, error.message);
    res.status(500).json({
      success: false,
      message: 'Fallo al generar el informe',
      error: error.message
    });
  }
};

// Streams the workbook directly to the response as an .xlsx download.
const sendExcelResponse = (res, workbook, surveyId) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Reporte_Encuesta_${surveyId}.xlsx`
  );

  workbook.xlsx.write(res).then(() => res.end());
};
