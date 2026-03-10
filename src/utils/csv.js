// Utility to fetch and parse CSV files in the public folder
export async function fetchAndParseCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i] ? values[i].trim() : '';
    });
    return obj;
  });
}
