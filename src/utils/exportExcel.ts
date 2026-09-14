/** Builds a real .xlsx workbook from headers/rows and triggers a browser download. */
export async function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<void> {
  // Loaded on demand — ExcelJS is large and export is an infrequent action.
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  rows.forEach(row => sheet.addRow(row));

  sheet.columns.forEach((col, i) => {
    const headerLen = String(headers[i] ?? '').length;
    const maxRowLen = rows.reduce((max, row) => Math.max(max, String(row[i] ?? '').length), 0);
    col.width = Math.min(40, Math.max(10, headerLen, maxRowLen) + 2);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
