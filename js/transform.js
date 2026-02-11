// ---------------------------------------------------------------------------
// transform.js — Transform raw Supabase rows into flat display-ready objects
// ---------------------------------------------------------------------------

/**
 * Ordered list of sub-fields inside every organizer JSON blob.
 * Kept in one place so other modules (column definitions, etc.) can reference it.
 */
const ORGANIZER_FIELDS = ["email", "country", "lastName", "firstName", "affiliation"];

/**
 * Flatten a single organizer JSON blob (or already-parsed object) into a set
 * of prefixed flat keys.
 *
 *   flattenOrganizer({firstName:"Ada", lastName:"Lovelace", ...}, "organizer_primary")
 *   => { organizer_primary_firstName: "Ada", organizer_primary_lastName: "Lovelace", ... }
 *
 * If the blob is null / undefined / empty string, every sub-field becomes "".
 *
 * @param {string|object|null} blob  — raw value from Supabase (JSON string or object)
 * @param {string}             prefix — e.g. "organizer_primary"
 * @returns {Object<string,string>}
 */
function flattenOrganizer(blob, prefix) {
    var parsed = null;

    if (blob !== null && blob !== undefined) {
        if (typeof blob === "string") {
            var trimmed = blob.trim();
            if (trimmed.length > 0) {
                try {
                    parsed = JSON.parse(trimmed);
                } catch (_e) {
                    parsed = null;
                }
            }
        } else if (typeof blob === "object") {
            parsed = blob;
        }
    }

    var out = {};
    for (var i = 0; i < ORGANIZER_FIELDS.length; i++) {
        var key = ORGANIZER_FIELDS[i];
        out[prefix + "_" + key] =
            parsed && parsed[key] != null ? String(parsed[key]) : "";
    }
    return out;
}

/**
 * Normalise the session_keywords value.
 * Supabase may return it as a JSON array, a JSON-encoded string, or a plain
 * string.  We always produce a readable comma-separated string.
 *
 * @param {*} kw — raw keywords value
 * @returns {string}
 */
function normaliseKeywords(kw) {
    if (kw === null || kw === undefined) return "";

    // If it's already an array (Supabase parsed it for us)
    if (Array.isArray(kw)) {
        return kw.join(", ");
    }

    // If it's a string that looks like a JSON array, parse it first
    if (typeof kw === "string") {
        var trimmed = kw.trim();
        if (trimmed.charAt(0) === "[") {
            try {
                var arr = JSON.parse(trimmed);
                if (Array.isArray(arr)) {
                    return arr.join(", ");
                }
            } catch (_e) {
                // fall through — return the raw string
            }
        }
        return kw;
    }

    return String(kw);
}

/**
 * Transform a single raw Supabase row into a flat, display-ready object.
 *
 * @param {Object} raw — one row as returned by supabase.from(TABLE).select("*")
 * @returns {Object<string,string>}
 */
function transformRow(raw) {
    var row = {};

    // Scalar fields
    row.id         = raw.id         || "";
    row.created_at = raw.created_at || "";
    row.locale     = raw.locale     || "";

    // Flatten all three organizer blobs
    var primary   = flattenOrganizer(raw.organizer_primary,   "organizer_primary");
    var secondary = flattenOrganizer(raw.organizer_secondary, "organizer_secondary");
    var tertiary  = flattenOrganizer(raw.organizer_tertiary,  "organizer_tertiary");

    Object.assign(row, primary, secondary, tertiary);

    // Session fields
    row.session_title       = raw.session_title       || "";
    row.session_topic       = raw.session_topic       || "";
    row.session_summary     = raw.session_summary     || "";
    row.session_keywords    = normaliseKeywords(raw.session_keywords);
    row.additional_comments = raw.additional_comments  || "";
    row.status              = raw.status               || "";

    return row;
}

/**
 * Convenience: transform an entire array of raw rows.
 *
 * @param {Object[]} rawRows
 * @returns {Object[]}
 */
function transformRows(rawRows) {
    var result = [];
    for (var i = 0; i < rawRows.length; i++) {
        result.push(transformRow(rawRows[i]));
    }
    return result;
}
