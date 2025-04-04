import ExcelJS from 'exceljs';
import * as resultsService from './results.service.js';

// Main function to export survey responses to an Excel file
export const exportResponsesToExcel = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const responses = await resultsService.getResponsesBySurvey(surveyId);
    const processedData = processResponses(responses);

    const workbook = createExcelWorkbook(processedData);
    sendExcelResponse(res, workbook, surveyId);
  } catch (error) {
    handleExportError(res, error);
  }
};

// Process responses and clean data
function processResponses(responses) {
  return responses.map(r => ({
    ...r.get({ plain: true }),
    question: r.question,
    answer: cleanAnswer(r.answer),
    surveyTitle: r.surveyTitle
  }));
}

// Clean unnecessary quotes from answers
function cleanAnswer(answer) {
  if (typeof answer !== 'string') return answer;
  return answer.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
}

// Create an Excel workbook with structured data
function createExcelWorkbook(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Enova Analytics';
  workbook.created = new Date();

  addRawDataSheet(workbook, data);
  addStatisticsSheet(workbook, data);
  addVisualizationSheet(workbook, data);

  return workbook;
}

// Add raw data sheet
function addRawDataSheet(workbook, data) {
  const sheet = workbook.addWorksheet('Raw Data');

  sheet.columns = [
    { header: 'Question', key: 'question', width: 35 },
    { header: 'Answer', key: 'answer', width: 30 }
  ];

  sheet.addRows(data);
  applySheetStyle(sheet, '6C63FF');
}

// Add statistics sheet
function addStatisticsSheet(workbook, data) {
  const sheet = workbook.addWorksheet('Statistics');
  const stats = calculateStatistics(data);

  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 40 },
    { header: 'Value', key: 'value', width: 30 }
  ];

  sheet.addRows(stats);
  applySheetStyle(sheet, '4A90E2');
}

// Add visualization sheet with charts
function addVisualizationSheet(workbook, data) {
  const sheet = workbook.addWorksheet('Visualizations');
  const questions = [...new Set(data.map(r => r.question))];

  let currentRow = 1;

  questions.forEach(question => {
    sheet.getCell(`A${currentRow}`).value = question;
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow++;

    const questionData = data.filter(r => r.question === question);
    const answerCounts = calculateAnswerCounts(questionData);

    sheet.getCell(`A${currentRow}`).value = 'Answer';
    sheet.getCell(`B${currentRow}`).value = 'Count';
    currentRow++;

    Object.entries(answerCounts).forEach(([answer, count]) => {
      sheet.getCell(`A${currentRow}`).value = answer;
      sheet.getCell(`B${currentRow}`).value = count;
      currentRow++;
    });

    addChart(sheet, answerCounts, currentRow - Object.keys(answerCounts).length, question);

    currentRow += 2;
  });

  applySheetStyle(sheet, '00C897');
}

// Add charts (pie, bar, column)
function addChart(sheet, data, startRow, title) {
  const chartSheet = sheet.workbook.addWorksheet(`${title} Chart`);

  chartSheet.columns = [
    { header: 'Answer', key: 'answer', width: 30 },
    { header: 'Count', key: 'count', width: 20 }
  ];

  const rows = Object.entries(data).map(([answer, count]) => [answer, count]);
  chartSheet.addRows(rows);

  const pieChart = chartSheet.addChart({
    type: 'pie',
    title: `Distribution for ${title}`,
    data: {
      labels: rows.map(row => row[0]),
      values: rows.map(row => row[1])
    }
  });

  const barChart = chartSheet.addChart({
    type: 'bar',
    title: `Bar Chart for ${title}`,
    data: {
      labels: rows.map(row => row[0]),
      values: rows.map(row => row[1])
    }
  });

  const columnChart = chartSheet.addChart({
    type: 'column',
    title: `Column Chart for ${title}`,
    data: {
      labels: rows.map(row => row[0]),
      values: rows.map(row => row[1])
    }
  });

  chartSheet.addImage(pieChart, { tl: { col: 3, row: startRow } });
  chartSheet.addImage(barChart, { tl: { col: 10, row: startRow } });
  chartSheet.addImage(columnChart, { tl: { col: 17, row: startRow } });
}

// Calculate statistics for the responses
function calculateStatistics(data) {
  const total = data.length;
  const byQuestion = {};

  data.forEach(({ question, answer }) => {
    if (!byQuestion[question]) {
      byQuestion[question] = { counts: {}, total: 0 };
    }

    const answerKey = String(answer);
    byQuestion[question].counts[answerKey] = (byQuestion[question].counts[answerKey] || 0) + 1;
    byQuestion[question].total++;
  });

  const stats = [{ metric: 'Total Responses', value: total }];

  for (const [question, data] of Object.entries(byQuestion)) {
    const sortedAnswers = Object.entries(data.counts).sort((a, b) => b[1] - a[1]);
    const mostCommon = sortedAnswers[0];
    const percentage = Math.round((mostCommon[1] / data.total) * 100);

    stats.push({
      metric: `Most common answer: "${question}"`,
      value: `${mostCommon[0]} (${percentage}%)`
    });

    if (sortedAnswers.length <= 5) {
      sortedAnswers.forEach(([answer, count], index) => {
        stats.push({
          metric: `  ${index + 1}. ${answer}`,
          value: `${count} (${Math.round((count / data.total) * 100)}%)`
        });
      });
    }
  }

  return stats;
}

// Count responses by type
function calculateAnswerCounts(data) {
  return data.reduce((acc, { answer }) => {
    const answerKey = String(answer);
    acc[answerKey] = (acc[answerKey] || 0) + 1;
    return acc;
  }, {});
}

// Apply style to Excel sheets
function applySheetStyle(sheet, color) {
  sheet.getRow(1).eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color }
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
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
}

// Send Excel file as response
function sendExcelResponse(res, workbook, surveyId) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Survey_Report_${surveyId}.xlsx`
  );

  workbook.xlsx.write(res).then(() => res.end());
}

// Handle export errors
function handleExportError(res, error) {
  console.error('Export error:', error);
  res.status(500).json({
    success: false,
    message: 'Failed to generate report',
    error: error.message
  });
}
