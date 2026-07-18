import ExcelJS from 'exceljs';
import { calculateStatistics, calculateAnswerCounts } from './results.excel.data.util.js';

// Assembles the full workbook (raw data + statistics + per-question
// visualization sheets) from already-processed response rows.
export const createExcelWorkbook = (data) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Enova Analytics';
  workbook.created = new Date();

  addRawDataSheet(workbook, data);
  addStatisticsSheet(workbook, data);
  addVisualizationSheet(workbook, data);

  return workbook;
};

// "Datos Brutos": one row per response, question + answer only.
const addRawDataSheet = (workbook, data) => {
  const sheet = workbook.addWorksheet('Datos Brutos');
  sheet.columns = [
    { header: 'Pregunta', key: 'question', width: 35 },
    { header: 'Respuesta', key: 'answer', width: 30 }
  ];
  sheet.addRows(data);
  applySheetStyle(sheet, '6C63FF');
};

// "Estadísticas": aggregate counts and most-common-answer summary.
const addStatisticsSheet = (workbook, data) => {
  const sheet = workbook.addWorksheet('Estadísticas');
  const stats = calculateStatistics(data);

  sheet.columns = [
    { header: 'Métrica', key: 'metric', width: 40 },
    { header: 'Valor', key: 'value', width: 30 }
  ];
  sheet.addRows(stats);
  applySheetStyle(sheet, '4A90E2');
};

// "Visualizaciones": one answer-count table per question, stacked
// vertically since ExcelJS sheets don't support per-block layout helpers.
const addVisualizationSheet = (workbook, data) => {
  const sheet = workbook.addWorksheet('Visualizaciones');
  const questions = [...new Set(data.map((r) => r.question))];

  let currentRow = 1;

  questions.forEach((question) => {
    sheet.getCell(`A${currentRow}`).value = question;
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow++;

    const questionData = data.filter((r) => r.question === question);
    const answerCounts = calculateAnswerCounts(questionData);

    sheet.getCell(`A${currentRow}`).value = 'Respuesta';
    sheet.getCell(`B${currentRow}`).value = 'Cantidad';
    currentRow++;

    Object.entries(answerCounts).forEach(([answer, count]) => {
      sheet.getCell(`A${currentRow}`).value = answer;
      sheet.getCell(`B${currentRow}`).value = count;
      currentRow++;
    });

    currentRow += 2; // Blank rows between questions.
  });

  applySheetStyle(sheet, '00C897');
};

// Applies the shared header/border/alignment style to a sheet's header
// row and wraps text on every data row below it.
const applySheetStyle = (sheet, headerColor) => {
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  for (let i = 2; i <= sheet.rowCount; i++) {
    sheet.getRow(i).alignment = { vertical: 'top', wrapText: true };
  }
};
