// ---------------------------------------------------------------------------
// reg-transform.js — Transform raw Supabase rows into flat display-ready objects
//                    for the three registration-phase tables.
// ---------------------------------------------------------------------------

/**
 * Convert a boolean DB value to a human-readable "Yes" / "No" string.
 * @param {*} v
 * @returns {string}
 */
function boolStr(v) {
  if (v === true)  return "Yes";
  if (v === false) return "No";
  return "";
}

/**
 * Extract a short display label from a storage file_path.
 * The path is whatever was stored during upload (e.g. "abstracts/uuid-filename.pdf").
 * We return just the final filename segment.
 *
 * @param {string|null} filePath
 * @returns {string}  e.g. "uuid-my_abstract.pdf"  or  ""
 */
function fileLabel(filePath) {
  if (!filePath) return "";
  var parts = filePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
}

// ── Registrations ─────────────────────────────────────────────────────────────

/**
 * @param {Object} raw — one row from the `registrations` table
 * @returns {Object}
 */
function transformRegistration(raw) {
  return {
    id:                 raw.id                || "",
    created_at:         raw.created_at        || "",
    updated_at:         raw.updated_at        || "",
    first_name:         raw.first_name        || "",
    last_name:          raw.last_name         || "",
    email:              raw.email             || "",
    affiliation:        raw.affiliation       || "",
    country:            raw.country           || "",
    registration_type:  raw.registration_type || "",
    abstract_intent:    raw.abstract_intent   || "",
    payment_confirmed:  boolStr(raw.payment_confirmed),
    mailing_consent:    boolStr(raw.mailing_consent),
    gdpr_consent:       boolStr(raw.gdpr_consent),
  };
}

// ── Abstracts ─────────────────────────────────────────────────────────────────

/**
 * @param {Object} raw — one row from the `abstracts` table
 * @returns {Object}
 */
function transformAbstract(raw) {
  return {
    id:            raw.id            || "",
    created_at:    raw.created_at    || "",
    first_name:    raw.first_name    || "",
    last_name:     raw.last_name     || "",
    email:         raw.email         || "",
    affiliation:   raw.affiliation   || "",
    title:         raw.title         || "",
    session:       raw.session       || "",
    // co_authors is free-form text; could contain multiple authors
    co_authors:    raw.co_authors    || "",
    abstract_text: raw.abstract_text || "",
    notes:         raw.notes         || "",
    // UI display: badge
    has_file:      raw.file_path ? fileLabel(raw.file_path) : "",
    // Excel / ZIP: raw storage path
    _file_path:    raw.file_path     || "",
  };
}

// ── Payment Receipts ──────────────────────────────────────────────────────────

/**
 * @param {Object} raw — one row from the `payment_receipts` table
 * @returns {Object}
 */
function transformPayment(raw) {
  return {
    id:           raw.id           || "",
    created_at:   raw.created_at   || "",
    email:        raw.email        || "",
    receipt_type: raw.receipt_type || "",
    notes:        raw.notes        || "",
    // UI display: badge
    has_file:     raw.file_path ? fileLabel(raw.file_path) : "",
    // Excel / ZIP: raw storage path
    _file_path:   raw.file_path    || "",
  };
}

// ── Batch helpers ─────────────────────────────────────────────────────────────

function transformRegistrations(rows) {
  return rows.map(transformRegistration);
}

function transformAbstracts(rows) {
  return rows.map(transformAbstract);
}

function transformPayments(rows) {
  return rows.map(transformPayment);
}
