// PERSONNEL-TRACKER — this whole file belongs to the Personnel Tracker tab.
// See PERSONNEL_TRACKER.md in the project root for how to hide or remove the tab.
//
// How a Personnel Tracker entry is stored in the main Google Sheet (no sheet change needed):
//   Title  -> "Personnel Tracker"
//   Venue  -> the person's NAME
//   Team   -> the TYPE: Leave | Travel Order | Absent | Other
//   Date   -> first day (a single-day entry has only this)
//   Details-> optional lines at the top, then free text:
//               Position: Nurse II
//               To: 2026-10-16        (last day, only for a from–to range)

export const PERSONNEL_TYPES = [
  { name: "Leave",        color: "#FFCB00", ink: "#3b3000" }, // yellow
  { name: "Travel Order", color: "#00C2E0", ink: "#06323b" }, // cyan
  { name: "Absent",       color: "#E2445C", ink: "#ffffff" }, // red
  { name: "Other",        color: "#A25DDC", ink: "#ffffff" }, // purple
];
export const personnelType = (name) => PERSONNEL_TYPES.find((t) => t.name === name) || PERSONNEL_TYPES[PERSONNEL_TYPES.length - 1];
export const personnelColor = (name) => personnelType(name).color;

// ── details text: "Position:" and "To:" lines ──
export function parsePersonnel(details) {
  let rest = details || "", position = "", to = "";
  for (;;) {
    const m = rest.match(/^(Position|To): ([^\n]*)(\n|$)/);
    if (!m) break;
    if (m[1] === "Position") position = m[2].trim(); else to = m[2].trim();
    rest = rest.slice(m[0].length);
  }
  // free text that merely looks like a field was escaped with one leading newline when saved — undo that
  if (/^\n(Position|To): /.test(rest)) rest = rest.slice(1);
  return { position, to, text: rest };
}

export function buildPersonnelDetails({ position = "", to = "", text = "" }) {
  const head = [];
  if (position.trim()) head.push("Position: " + position.trim());
  if (to) head.push("To: " + to);
  const safe = /^(Position|To): /.test(text) ? "\n" + text : text;
  return head.length ? head.join("\n") + "\n" + safe : safe;
}

// ── dates (all "YYYY-MM-DD" strings, local time) ──
const pad = (n) => String(n).padStart(2, "0");
export const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromStr = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDaysStr = (s, n) => { const d = fromStr(s); d.setDate(d.getDate() + n); return toStr(d); };
export const dayDiff = (a, b) => Math.round((fromStr(b) - fromStr(a)) / 86400000);

const MAX_DAYS = 366; // a from–to entry is drawn on at most this many days (a mistyped end year can't flood the calendar)

// first day, last day and number of days an entry covers (the real figures, however long)
export function eventRange(ev) {
  const { to } = parsePersonnel(ev.details);
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const end = to && iso.test(to) && iso.test(ev.date) && to > ev.date ? to : ev.date;
  return { start: ev.date, end, days: iso.test(ev.date) ? dayDiff(ev.date, end) + 1 : 1 };
}

// A from–to entry becomes one item per day so every calendar view shows it on each day it covers.
// Each copy points back to the saved entry in `_orig` (used when you click it to edit).
export function expandPersonnel(events) {
  const out = [];
  events.forEach((e) => {
    const r = eventRange(e);
    if (r.days <= 1) { out.push(e); return; }
    for (let i = 0; i < Math.min(r.days, MAX_DAYS); i++) out.push({ ...e, date: addDaysStr(e.date, i), _orig: e, _i: i, _n: r.days });
  });
  return out;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatRange(start, end) {
  const a = fromStr(start), b = fromStr(end), thisYear = new Date().getFullYear();
  const one = (d, withYear) => `${MON[d.getMonth()]} ${d.getDate()}${withYear ? ", " + d.getFullYear() : ""}`;
  if (start === end) return one(a, a.getFullYear() !== thisYear);
  if (a.getFullYear() !== b.getFullYear()) return `${one(a, true)} – ${one(b, true)}`;
  const y = a.getFullYear() !== thisYear ? `, ${a.getFullYear()}` : "";
  if (a.getMonth() === b.getMonth()) return `${MON[a.getMonth()]} ${a.getDate()} – ${b.getDate()}${y}`;
  return `${one(a, false)} – ${one(b, false)}${y}`;
}
export const durationLabel = (days) => `${days} day${days === 1 ? "" : "s"}`;

// ── people ──
const AVATAR_COLORS = ["#6161ff", "#00c875", "#fdab3d", "#e2445c", "#0086c0", "#a25ddc", "#037f4c", "#ff642e", "#ff158a", "#7f5347"];
export function nameColor(name) {
  let h = 0;
  for (const ch of (name || "").toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export const initialsOf = (name) =>
  (name || "").replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "•";

// suggestions for the form
const uniqSorted = (list) => {
  const seen = new Map();
  list.forEach((v) => { const t = (v || "").trim(); if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t); });
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
};
export const personnelNames = (events) => uniqSorted(events.map((e) => e.venue));
export const personnelPositions = (events) => uniqSorted(events.map((e) => parsePersonnel(e.details).position));
// most recent position used for each person (lower-cased name -> position)
export function positionByName(events) {
  const out = {};
  [...events].sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach((e) => {
    const p = parsePersonnel(e.details).position;
    if (e.venue && p) out[e.venue.trim().toLowerCase()] = p;
  });
  return out;
}
