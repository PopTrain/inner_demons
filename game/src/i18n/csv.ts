/**
 * Minimal RFC 4180-ish CSV parser: handles quoted fields, escaped `""`
 * quotes, commas/newlines embedded inside quoted fields, and CRLF/LF line
 * endings. Locale strings routinely contain commas and multi-line dialogue,
 * so a naive per-line `split(",")` isn't safe here.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let touchedRow = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      touchedRow = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      touchedRow = true;
    } else if (c === "\r") {
      continue;
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      touchedRow = false;
    } else {
      field += c;
      touchedRow = true;
    }
  }

  if (touchedRow || field.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
