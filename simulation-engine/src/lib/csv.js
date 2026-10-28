// Minimal RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF). Returns an
// array of objects keyed by lowercased header. Server-side so imports are
// validated here, never trusted from the client.
function parseCsv(text) {
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
  const keys = header.map((h) => h.toLowerCase().replace(/\s+/g, ''));
  return body.map((cells) => Object.fromEntries(keys.map((k, i) => [k, cells[i] ?? ''])));
}

module.exports = { parseCsv };
