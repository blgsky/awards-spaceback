/**
 * The Spaceback Awards 2026 — submission backend (Google Apps Script)
 * ------------------------------------------------------------------
 * Receives entries from submit.html, appends a row to a Google Sheet,
 * and saves the uploaded company logo to a Drive folder.
 *
 * SETUP (one time, ~5 min):
 *   1. Create a Google Sheet (this is where entries land). Copy its ID
 *      from the URL:  docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit
 *   2. Create a Drive folder for uploaded logos. Copy its ID from the URL:
 *      drive.google.com/drive/folders/<THIS_IS_THE_ID>
 *   3. Go to script.google.com → New project → paste this file.
 *   4. Fill in SHEET_ID and DRIVE_FOLDER_ID below.
 *   5. Deploy → New deployment → type "Web app":
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Copy the Web app URL it gives you.
 *   6. Paste that URL into scripts/form.js  →  var ENDPOINT = "...".
 *
 * To view/download entries: open the Sheet → File → Download → CSV / XLSX.
 */

var SHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
var DRIVE_FOLDER_ID = "PASTE_YOUR_DRIVE_FOLDER_ID_HERE";

var HEADERS = [
  "Submitted At", "First Name", "Last Name", "Email", "Job Title",
  "Company Name", "Categories", "Campaign Flight Dates",
  "Goals & Strategy", "Quantitative Performance", "Qualitative Performance",
  "Behind the Scenes", "Consent", "Company Logo",
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    // Save the logo to Drive and keep a shareable link.
    var logoUrl = "";
    if (data.logo && data.logo.dataBase64) {
      var bytes = Utilities.base64Decode(data.logo.dataBase64);
      var stamp = Utilities.formatDate(new Date(), "UTC", "yyyyMMdd-HHmmss");
      var safeCompany = String(data.company || "entry").replace(/[^\w.-]+/g, "_").slice(0, 40);
      var blob = Utilities.newBlob(bytes, data.logo.mimeType, stamp + "_" + safeCompany + "_" + (data.logo.name || "logo"));
      var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var file = folder.createFile(blob);
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (ignore) {}
      logoUrl = file.getUrl();
    }

    sheet.appendRow([
      data.submittedAt ? new Date(data.submittedAt) : new Date(),
      data.firstName || "",
      data.lastName || "",
      data.email || "",
      data.jobTitle || "",
      data.company || "",
      (data.categories || []).join(", "),
      data.flightDates || "",
      data.goals || "",
      data.quant || "",
      data.qual || "",
      data.behind || "",
      data.consent ? "Yes" : "No",
      logoUrl,
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, service: "Spaceback Awards 2026 submissions" });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
