/**
 * Export array of data objects to CSV and trigger browser download
 */
export function exportToCsv(data: Record<string, any>[], filename: string) {
  if (!data || !data.length) return;

  // Extract headers
  const headers = Object.keys(data[0]);

  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          let val = row[header];
          if (val === null || val === undefined) {
            val = '';
          } else if (typeof val === 'object') {
            val = JSON.stringify(val);
          } else {
            val = String(val);
          }
          // Escape quotes and commas
          const escaped = val.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export array of data objects to JSON and trigger browser download
 */
export function exportToJson(data: any[], filename: string) {
  if (!data || !data.length) return;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

