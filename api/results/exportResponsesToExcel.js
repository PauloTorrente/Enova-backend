import ExcelJS from 'exceljs'; // Import ExcelJS library for Excel manipulation
import * as resultsService from './results.service.js'; // Import service to fetch survey data

// Main function to export survey responses to Excel
export const exportResponsesToExcel = async (req, res) => {
  try {
    // Extract survey ID from request parameters
    const { surveyId } = req.params;
    
    // Fetch responses from database using service
    const responses = await resultsService.getResponsesBySurvey(surveyId);

    // Clean response data by removing unnecessary quotes
    const cleanedResponses = responses.map(r => ({
      ...r,
      answer: r.answer.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"')
    }));

    // Initialize new Excel workbook
    const workbook = new ExcelJS.Workbook();
    
    // Create worksheets for different data views
    const rawSheet = workbook.addWorksheet('Responses');
    const statsSheet = workbook.addWorksheet('Statistics');
    const chartsSheet = workbook.addWorksheet('Charts');

    // Define consistent header styling
    const headerStyle = {
      fill: { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: 'FF6C63FF' } // Brand color
      },
      font: { 
        bold: true, 
        color: { argb: 'FFFFFFFF' } // White text
      },
      alignment: { 
        horizontal: 'center' 
      }
    };

    // Worksheet 1: Raw response data
    rawSheet.columns = [
      { header: 'Question', key: 'question', width: 40 },
      { header: 'Answer', key: 'answer', width: 30 }
    ];
    rawSheet.addRows(cleanedResponses);
    applyHeaderStyle(rawSheet, headerStyle);

    // Worksheet 2: Response statistics
    const statsData = calculateStats(cleanedResponses);
    statsSheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 30 }
    ];
    statsSheet.addRows(statsData);
    applyHeaderStyle(statsSheet, headerStyle);

    // Worksheet 3: Data visualization
    prepareChartsData(chartsSheet, cleanedResponses);
    applyHeaderStyle(chartsSheet, headerStyle);

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=survey_${surveyId}_report.xlsx`);
    
    // Send the Excel file
    res.send(buffer);

  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ 
      message: 'Failed to generate report',
      error: error.message 
    });
  }
};

// Helper function to apply consistent header styling
function applyHeaderStyle(sheet, style) {
  sheet.getRow(1).eachCell(cell => {
    cell.fill = style.fill;
    cell.font = style.font;
    cell.alignment = style.alignment;
  });
}

// Calculate response statistics (totals, frequencies)
function calculateStats(responses) {
  const total = responses.length;
  
  // Group responses by question and count answers
  const byQuestion = responses.reduce((acc, { question, answer }) => {
    if (!acc[question]) {
      acc[question] = { counts: {}, total: 0 };
    }
    acc[question].counts[answer] = (acc[question].counts[answer] || 0) + 1;
    acc[question].total++;
    return acc;
  }, {});

  // Prepare statistics data for Excel
  const stats = [
    { metric: 'Total Responses', value: total }
  ];

  // Add most common answers for each question
  for (const [question, data] of Object.entries(byQuestion)) {
    const mostCommon = Object.entries(data.counts)
      .sort((a, b) => b[1] - a[1])[0];
    
    stats.push({
      metric: `Most common: "${question}"`,
      value: `${mostCommon[0]} (${Math.round((mostCommon[1] / data.total) * 100)}%)`
    });
  }

  return stats;
}

// Prepare data for charts visualization
function prepareChartsData(sheet, responses) {
  // Filter and count responses for chart data
  const chartData = responses
    .filter(r => r.question.includes('frequency')) // Filter for chartable questions
    .reduce((acc, { answer }) => {
      acc[answer] = (acc[answer] || 0) + 1;
      return acc;
    }, {});

  // Add data table for chart reference
  sheet.addTable({
    name: 'ChartData',
    ref: 'A1',
    columns: [
      { name: 'Answer' }, 
      { name: 'Count' }
    ],
    rows: Object.entries(chartData)
      .map(([answer, count]) => [answer, count])
  });
  
  // Note: Actual chart rendering would require additional setup
  // This prepares the data structure for chart creation
}