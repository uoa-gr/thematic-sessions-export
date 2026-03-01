// ---------------------------------------------------------------------------
// zip-export.js — Build a ZIP archive containing:
//   • conference_data.xlsx  (three sheets: Registrations, Abstracts, Payments)
//   • abstracts/            (uploaded abstract files, fetched via signed URLs)
//   • payment_receipts/     (uploaded receipt files, fetched via signed URLs)
//
// Depends on:
//   - SheetJS  (XLSX global, CDN)
//   - JSZip    (JSZip global, CDN)
//   - reg-columns.js   (REGISTRATION_COLUMNS, ABSTRACT_COLUMNS, PAYMENT_COLUMNS, excelColumns)
//   - supabase-client.js  (supabaseClient)
// ---------------------------------------------------------------------------

// ── Excel helpers ─────────────────────────────────────────────────────────────

/**
 * Build a SheetJS worksheet from an array of transformed rows and a column list.
 *
 * @param {Object[]}    rows — transformed rows
 * @param {ColumnDef[]} cols — columns to include (already excelColumns-filtered)
 * @returns {Object} SheetJS worksheet
 */
function buildSheet(rows, cols) {
  // Header row
  var header = cols.map(function (c) { return c.label; });

  // Data rows
  var wsData = [header];
  for (var r = 0; r < rows.length; r++) {
    var row     = rows[r];
    var dataRow = [];
    for (var c = 0; c < cols.length; c++) {
      var v = row[cols[c].key];
      dataRow.push(v != null ? v : "");
    }
    wsData.push(dataRow);
  }

  var ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns (rough heuristic)
  var colWidths = [];
  for (var i = 0; i < cols.length; i++) {
    var col    = cols[i];
    var maxLen = col.label.length;
    for (var j = 0; j < rows.length; j++) {
      var cell = String(rows[j][col.key] != null ? rows[j][col.key] : "");
      var cap  = col.wrap ? 60 : 40;
      var len  = cell.length < cap ? cell.length : cap;
      if (len > maxLen) maxLen = len;
    }
    colWidths.push({ wch: maxLen + 2 });
  }
  ws["!cols"] = colWidths;

  return ws;
}

// ── File download helpers ─────────────────────────────────────────────────────

/**
 * Generate a signed URL for a private storage file and download it as ArrayBuffer.
 * Returns null (and logs a warning) if the operation fails.
 *
 * @param {string} bucket   — Supabase storage bucket name
 * @param {string} filePath — path within the bucket
 * @returns {Promise<ArrayBuffer|null>}
 */
async function fetchStorageFile(bucket, filePath) {
  try {
    var signed = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (signed.error) {
      console.warn("[zip-export] Signed URL error for " + filePath + ":", signed.error.message);
      return null;
    }

    var response = await fetch(signed.data.signedUrl);
    if (!response.ok) {
      console.warn("[zip-export] Fetch failed for " + filePath + ": HTTP " + response.status);
      return null;
    }

    return await response.arrayBuffer();
  } catch (err) {
    console.warn("[zip-export] Exception fetching " + filePath + ":", err);
    return null;
  }
}

/**
 * Extract just the basename (last segment) from a storage path.
 *
 * @param {string} filePath — raw storage path
 * @returns {string}  e.g. "uuid-my_abstract.pdf"
 */
function storageBasename(filePath) {
  var parts = filePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
}

/**
 * Sanitise an email address for use as a filesystem folder/file name.
 * Keeps letters, digits, dots, hyphens; replaces @ with _at_.
 *
 * @param {string} email
 * @returns {string}  e.g. "john.doe_at_example.com"
 */
function safeEmail(email) {
  return (email || "unknown")
    .replace(/@/g, "_at_")
    .replace(/[^a-zA-Z0-9._+-]/g, "_");
}

/**
 * Derive a flat filename for abstracts: email + original basename.
 * e.g. "john.doe_at_example.com_uuid-my_abstract.pdf"
 *
 * @param {string} email
 * @param {string} filePath — raw storage path
 * @returns {string}
 */
function zipFilename(email, filePath) {
  return safeEmail(email) + "_" + storageBasename(filePath);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build and trigger download of the conference ZIP archive.
 *
 * @param {Object[]} registrations — transformed registration rows
 * @param {Object[]} abstracts     — transformed abstract rows
 * @param {Object[]} payments      — transformed payment rows
 * @param {function} onStatus      — callback(string) for progress messages
 */
async function downloadZip(registrations, abstracts, payments, onStatus) {
  function status(msg) { if (onStatus) onStatus(msg); }

  status("Building Excel workbook…");

  // ── Excel ──────────────────────────────────────────────────────────────────
  var wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(registrations, excelColumns(REGISTRATION_COLUMNS)),
    "Registrations"
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(abstracts, excelColumns(ABSTRACT_COLUMNS)),
    "Abstracts"
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(payments, excelColumns(PAYMENT_COLUMNS)),
    "Payment Receipts"
  );

  // Write workbook to a Uint8Array (works without Node.js)
  var excelBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

  // ── ZIP ────────────────────────────────────────────────────────────────────
  var zip = new JSZip();
  zip.file("conference_data.xlsx", excelBuffer);

  var failedFiles = [];

  // Abstract files
  var absWithFiles = abstracts.filter(function (row) { return row._file_path; });
  if (absWithFiles.length > 0) {
    var absFolder = zip.folder("abstracts");
    for (var i = 0; i < absWithFiles.length; i++) {
      var abs      = absWithFiles[i];
      var filename = zipFilename(abs.email, abs._file_path);
      status(
        "Downloading abstract file " + (i + 1) + " / " + absWithFiles.length +
        " (" + filename + ")…"
      );
      var buffer = await fetchStorageFile("abstracts", abs._file_path);
      if (buffer) {
        absFolder.file(filename, buffer);
      } else {
        failedFiles.push("abstracts/" + abs._file_path);
      }
    }
  }

  // Payment receipt files — one subfolder per user email
  var payWithFiles = payments.filter(function (row) { return row._file_path; });
  if (payWithFiles.length > 0) {
    for (var j = 0; j < payWithFiles.length; j++) {
      var pay       = payWithFiles[j];
      var userFolder = zip.folder("payment_receipts/" + safeEmail(pay.email));
      var pFilename  = storageBasename(pay._file_path);
      status(
        "Downloading receipt file " + (j + 1) + " / " + payWithFiles.length +
        " (" + safeEmail(pay.email) + "/" + pFilename + ")…"
      );
      var pBuffer = await fetchStorageFile("payment-receipts", pay._file_path);
      if (pBuffer) {
        userFolder.file(pFilename, pBuffer);
      } else {
        failedFiles.push("payment_receipts/" + safeEmail(pay.email) + "/" + pay._file_path);
      }
    }
  }

  // Add a manifest of any failed downloads
  if (failedFiles.length > 0) {
    var note = "The following files could not be downloaded (storage permission or network issue):\n\n" +
      failedFiles.join("\n");
    zip.file("DOWNLOAD_ERRORS.txt", note);
  }

  // ── Generate & trigger download ────────────────────────────────────────────
  status("Compressing ZIP…");
  var content = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

  var timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  var zipName   = "conference_export_" + timestamp + ".zip";

  var url = URL.createObjectURL(content);
  var a   = document.createElement("a");
  a.href     = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  var summary =
    registrations.length + " registrations, " +
    abstracts.length    + " abstracts (" + absWithFiles.length + " files), " +
    payments.length     + " payment receipts (" + payWithFiles.length + " files)" +
    (failedFiles.length ? " — ⚠ " + failedFiles.length + " file(s) failed (see DOWNLOAD_ERRORS.txt)" : "");

  return summary;
}
