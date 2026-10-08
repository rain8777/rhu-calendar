// Location, Barangay and (for Medic Support) Names are stored as leading lines inside
// the existing "details" column, so the Google Sheet / Apps Script needs no change:
//   Venue: Zone 7
//   Barangay: poblacion-iraya
//   Names: Juan Dela Cruz | Maria Santos
//   Duty: Typhoon Uwan
//   ...free-text details...
// ("Venue:" is the legacy key; the UI calls it "Location".)
export function parseMeta(details) {
  let rest = details || "";
  let venue = "", barangay = "", duty = "", names = [];
  for (;;) {
    const m = rest.match(/^(Venue|Barangay|Names|Duty): ([^\n]*)(\n|$)/);
    if (!m) break;
    if (m[1] === "Venue") venue = m[2].trim();
    else if (m[1] === "Barangay") barangay = m[2].trim();
    else if (m[1] === "Duty") duty = m[2].trim();
    else names = m[2].split("|").map((n) => n.trim()).filter(Boolean);
    rest = rest.slice(m[0].length);
  }
  return { venue, barangay, duty, names, text: rest };
}

export function buildDetails({ venue = "", barangay = "", names = [], duty = "", text = "" }) {
  const head = [];
  if (venue.trim()) head.push("Venue: " + venue.trim());
  if (barangay) head.push("Barangay: " + barangay);
  const nm = names.map((n) => n.replace(/\|/g, " ").trim()).filter(Boolean);
  if (duty.trim()) head.push("Duty: " + duty.trim());
  if (nm.length) head.push("Names: " + nm.join(" | "));
  return head.length ? head.join("\n") + "\n" + text : text;
}
