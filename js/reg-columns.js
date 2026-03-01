// ---------------------------------------------------------------------------
// reg-columns.js — Column definitions for the three registration-phase tables
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ColumnDef
 * @property {string}  key   — property name on a transformed row object
 * @property {string}  label — human-readable header for the UI & Excel export
 * @property {boolean} [wrap]  — if true, the cell allows text wrapping / sidebar click
 * @property {boolean} [excelOnly] — if true, only included in Excel, not in UI table
 * @property {boolean} [uiOnly]   — if true, only included in UI table, not in Excel
 */

// ── Registrations ─────────────────────────────────────────────────────────────
/** @type {ColumnDef[]} */
var REGISTRATION_COLUMNS = [
  { key: "id",                label: "ID" },
  { key: "created_at",        label: "Submitted At" },
  { key: "updated_at",        label: "Updated At" },
  { key: "first_name",        label: "First Name" },
  { key: "last_name",         label: "Last Name" },
  { key: "email",             label: "Email" },
  { key: "affiliation",       label: "Affiliation",       wrap: true },
  { key: "country",           label: "Country" },
  { key: "registration_type", label: "Type" },
  { key: "abstract_intent",   label: "Abstract Intent" },
  { key: "payment_confirmed", label: "Payment Confirmed" },
  { key: "mailing_consent",   label: "Mailing Consent" },
  { key: "gdpr_consent",      label: "GDPR Consent" },
];

// ── Abstracts ─────────────────────────────────────────────────────────────────
/** @type {ColumnDef[]} */
var ABSTRACT_COLUMNS = [
  { key: "id",            label: "ID" },
  { key: "created_at",    label: "Submitted At" },
  { key: "first_name",    label: "First Name" },
  { key: "last_name",     label: "Last Name" },
  { key: "email",         label: "Email" },
  { key: "affiliation",   label: "Affiliation",   wrap: true },
  { key: "title",         label: "Title",         wrap: true },
  { key: "session",       label: "Session",       wrap: true },
  { key: "co_authors",    label: "Co-Authors",    wrap: true },
  { key: "abstract_text", label: "Abstract Text", wrap: true },
  // UI: clickable badge → signed URL; Excel: raw storage path
  { key: "has_file",   label: "File", uiOnly: true,   bucket: "abstracts" },
  { key: "_file_path", label: "File Path (ZIP)", excelOnly: true },
];

// ── Payment Receipts ──────────────────────────────────────────────────────────
/** @type {ColumnDef[]} */
var PAYMENT_COLUMNS = [
  { key: "id",           label: "ID" },
  { key: "created_at",   label: "Submitted At" },
  { key: "email",        label: "Email" },
  { key: "receipt_type", label: "Receipt Type" },
  { key: "notes",        label: "Notes", wrap: true },
  // UI: clickable badge → signed URL; Excel: raw storage path
  { key: "has_file",   label: "File", uiOnly: true,   bucket: "payment-receipts" },
  { key: "_file_path", label: "File Path (ZIP)", excelOnly: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return only the columns meant for the UI table. */
function uiColumns(cols) {
  return cols.filter(function (c) { return !c.excelOnly; });
}

/** Return only the columns meant for Excel export. */
function excelColumns(cols) {
  return cols.filter(function (c) { return !c.uiOnly; });
}
