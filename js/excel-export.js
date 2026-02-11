// ---------------------------------------------------------------------------
// excel-export.js — Generate and download an .xlsx file from transformed rows
//
// Depends on:
//   - SheetJS (XLSX global, loaded via CDN)
//   - columns.js  (DISPLAY_COLUMNS)
// ---------------------------------------------------------------------------

/**
 * Build a SheetJS worksheet from the current transformed data and trigger a
 * browser download of `thematic_sessions_submissions.xlsx`.
 *
 * @param {Object[]} rows — array of flat, transformed row objects
 */
function downloadXlsx(rows) {
  if (!rows || rows.length === 0) return;

  // ── Header row ──────────────────────────────────────────
  var header = [];
  for (
    var h = 0;
    h < DISPLAY_COLUMNS.length;
    h++
  ) {
    header.push(DISPLAY_COLUMNS[h].label);
  }

  // ── Data rows ───────────────────────────────────────────
  var wsData = [header];

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var dataRow = [];
    for (
      var c = 0;
      c < DISPLAY_COLUMNS.length;
      c++
    ) {
      var val = row[DISPLAY_COLUMNS[c].key];
      dataRow.push(val != null ? val : "");
    }
    wsData.push(dataRow);
  }

  // ── Create worksheet ────────────────────────────────────
  var ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── Auto-size columns (rough heuristic) ─────────────────
  var colWidths = [];
  for (
    var i = 0;
    i < DISPLAY_COLUMNS.length;
    i++
  ) {
    var col = DISPLAY_COLUMNS[i];
    var maxLen = col.label.length;

    for (var j = 0; j < rows.length; j++) {
      var v = String(
        rows[j][col.key] != null
          ? rows[j][col.key]
          : "",
      );
      var cap = col.wrap ? 50 : 40;
      var len = v.length < cap ? v.length : cap;
      if (len > maxLen) maxLen = len;
    }

    colWidths.push({ wch: maxLen + 2 });
  }
  ws["!cols"] = colWidths;

  // ── Create workbook & trigger download ──────────────────
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Submissions",
  );
  XLSX.writeFile(
    wb,
    "thematic_session_submissions_2026.xlsx",
  );
}
