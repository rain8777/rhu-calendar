/**
 * ════════════════════════════════════════════════════════════════
 *  Ragay PK Team Calendar — Google Apps Script Backend
 *  FILE: Code.gs
 * ════════════════════════════════════════════════════════════════
 *
 *  HOW TO DEPLOY:
 *  1. Open your Google Sheet
 *  2. Click Extensions → Apps Script
 *  3. Delete everything and paste this entire file
 *  4. Fill in SHEET_ID and SECRET below
 *  5. Click Deploy → New Deployment → Web App
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  6. Copy the Web App /exec URL → paste into Vercel env vars
 *
 *  SHEET COLUMNS (Sheet1):
 *  A: id | B: Date | C: Title | D: Team | E: Details | F: Venue | G: Color
 */

// ── CONFIG — edit these two lines ─────────────────────────────────────────────
const SHEET_ID = "1gvPWhPK2TZ_kPYyz2Io7orUgSmeGoRWcivZIl9PAzLY"; // from the Sheet URL
const SECRET   = "rhucalendar"; // must match Vercel GAS_SECRET
// ──────────────────────────────────────────────────────────────────────────────

const SHEET_NAME = "Sheet1";
const HEADERS    = ["id", "Date", "Title", "Team", "Details", "Venue", "Color"];
const COL        = { id: 0, date: 1, title: 2, team: 3, details: 4, venue: 5, color: 6 };

// Valid team values
const TEAMS = [
  "agao-ao", "agrupacion", "san-rafael", "banga-caves", "cabugao",
  "cabadisan", "binahan-proper", "poblacion-iraya", "buenasuerte",
  "inandawa", "lower-omon", "lower-santa-cruz", "patalunan",
  "panaytayan-nuevo", "catabangan-proper"
];

// Fixed event title
const EVENT_TITLE = "Purok Kalusugan";

// ─── CORS / JSON response helper ──────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── GET  →  read events ──────────────────────────────────────────────────────
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || "getEvents";
  if (action === "getEvents") return getEvents();
  return jsonResponse({ error: "Unknown GET action: " + action });
}

// ─── POST  →  write events ────────────────────────────────────────────────────
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (_) {
    return jsonResponse({ success: false, error: "Invalid JSON body" });
  }

  // Verify shared secret
  if (body.secret !== SECRET) {
    return jsonResponse({ success: false, error: "Unauthorized — wrong secret" });
  }

  switch (body.action) {
    case "saveEvent":   return saveEvent(body.event);
    case "deleteEvent": return deleteEvent(body.id);
    default:            return jsonResponse({ success: false, error: "Unknown POST action" });
  }
}

// ─── Sheet helper ─────────────────────────────────────────────────────────────
function getSheet() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Auto-create sheet if missing
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#1a1a3e")
      .setFontColor("#a5b4fc");
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Auto-add headers if row 1 is empty
  var firstCell = sheet.getRange(1, 1).getValue();
  if (firstCell !== "id") {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#1a1a3e")
      .setFontColor("#a5b4fc");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function rowToEvent(row) {
  // Google Sheets can return Date objects for date cells — convert to YYYY-MM-DD
  var rawDate = row[COL.date];
  var dateStr = "";
  if (rawDate instanceof Date) {
    var y = rawDate.getFullYear();
    var m = String(rawDate.getMonth() + 1).padStart(2, "0");
    var d = String(rawDate.getDate()).padStart(2, "0");
    dateStr = y + "-" + m + "-" + d;
  } else {
    dateStr = String(rawDate || "");
  }

  return {
    id:      String(row[COL.id]      || ""),
    date:    dateStr,
    title:   String(row[COL.title]   || EVENT_TITLE),
    team:    String(row[COL.team]    || "agao-ao"),
    details: String(row[COL.details] || ""),
    venue:   String(row[COL.venue]   || ""),
    color:   String(row[COL.color]   || ""),
  };
}

// ─── Action: get all events ───────────────────────────────────────────────────
function getEvents() {
  try {
    var sheet = getSheet();
    var data  = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse({ events: [] });

    var events = data.slice(1)
      .filter(function(row) { return row[COL.id] && row[COL.date]; })
      .map(rowToEvent);

    return jsonResponse({ events: events });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ─── Action: create or update an event ───────────────────────────────────────
function saveEvent(event) {
  try {
    if (!event || !event.date) {
      return jsonResponse({ success: false, error: "Missing required field: date" });
    }

    var sheet = getSheet();
    var data  = sheet.getDataRange().getValues();

    // Assign UUID if this is a new event
    if (!event.id) {
      event.id = Utilities.getUuid();
    }

    var newRow = [
      event.id,
      event.date,
      event.title || EVENT_TITLE,
      event.team    || "",
      event.details || "",
      event.venue   || "",
      event.color   || "",
    ];

    // Search for existing row to update
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][COL.id]) === String(event.id)) {
        sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
        return jsonResponse({ success: true, event: rowToEvent(newRow) });
      }
    }

    // Not found → append new row
    sheet.appendRow(newRow);
    return jsonResponse({ success: true, event: rowToEvent(newRow) });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ─── Action: delete an event by id ───────────────────────────────────────────
function deleteEvent(id) {
  try {
    if (!id) return jsonResponse({ success: false, error: "Missing id" });

    var sheet = getSheet();
    var data  = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][COL.id]) === String(id)) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ success: true });
      }
    }

    // Not found — treat as already deleted (idempotent)
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}
