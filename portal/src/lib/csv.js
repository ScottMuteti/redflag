const escapeCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// columns: [{ header, value: (row) => any }]
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => escapeCell(c.header)).join(',')];
  rows.forEach((row) => lines.push(columns.map((c) => escapeCell(c.value(row))).join(',')));
  return lines.join('\n');
}

export function downloadCsv(filename, rows, columns) {
  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Minimal CSV parser: handles quoted cells and commas inside quotes. Returns objects keyed by header.
export function parseCsv(text) {
  const rows = [];
  let cell = '';
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  const [header = [], ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
}
