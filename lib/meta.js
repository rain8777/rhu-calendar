// Location + Barangay for RHU Activities are stored as leading lines inside the
// existing "details" column, so the Google Sheet / Apps Script needs no change:
//   Venue: Zone 7
//   Barangay: poblacion-iraya
//   ...free-text details...
// ("Venue:" is the legacy key; the UI calls it "Location".)
export function parseMeta(details) {
  let rest = details || "";
  let venue = "", barangay = "";
  for (;;) {
    const m = rest.match(/^(Venue|Barangay): ([^\n]*)(\n|$)/);
    if (!m) break;
    if (m[1] === "Venue") venue = m[2].trim(); else barangay = m[2].trim();
    rest = rest.slice(m[0].length);
  }
  return { venue, barangay, text: rest };
}

export function buildDetails({ venue = "", barangay = "", text = "" }) {
  const head = [];
  if (venue.trim()) head.push("Venue: " + venue.trim());
  if (barangay) head.push("Barangay: " + barangay);
  return head.length ? head.join("\n") + "\n" + text : text;
}
