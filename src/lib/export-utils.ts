/**
 * export-utils.ts
 * Utility functions for generating and downloading reports from the browser.
 */

/**
 * Converts an array of objects into a CSV string.
 */
function convertToCSV(data: any[], filename: string) {
  if (!data || !data.length) return '';

  // Extract all unique headers from all objects
  const headersSet = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(key => headersSet.add(key));
  });
  
  const headers = Array.from(headersSet);
  
  // Create CSV header row
  const csvRows = [headers.join(',')];
  
  // Create CSV data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      
      // Handle special types (arrays, objects, nulls)
      if (val === null || val === undefined) {
        return '';
      }
      
      let stringVal = '';
      if (typeof val === 'object') {
        stringVal = JSON.stringify(val).replace(/"/g, '""'); // Escape inner quotes
      } else {
        stringVal = String(val).replace(/"/g, '""');
      }
      
      // Quote strings containing commas, newlines, or quotes
      if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('"')) {
        return `"${stringVal}"`;
      }
      
      return stringVal;
    });
    
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Triggers a browser download of the given string content as a CSV file.
 */
export function downloadCSV(data: any[], filename: string = 'export.csv') {
  const csvString = convertToCSV(data, filename);
  if (!csvString) {
    console.warn('No data to export');
    return;
  }
  
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  // Create a link and trigger download
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback
    console.warn('HTML5 download attribute not supported.');
  }
}
