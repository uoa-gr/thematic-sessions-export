// ---------------------------------------------------------------------------
// columns.js — Single source of truth for display column definitions
//
// Every module that needs to know about columns (renderer, exporter, etc.)
// reads from DISPLAY_COLUMNS instead of hard-coding its own list.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ColumnDef
 * @property {string}  key   — property name on a transformed row object
 * @property {string}  label — human-readable header for the UI & Excel export
 * @property {boolean} [wrap]  — if true, the cell allows text wrapping
 */

/** @type {ColumnDef[]} */
var DISPLAY_COLUMNS = [
    // ── Meta ────────────────────────────────────────────────
    { key: "id",                             label: "ID" },
    { key: "created_at",                     label: "Created At" },
    { key: "locale",                         label: "Locale" },

    // ── Primary organizer (flattened) ───────────────────────
    { key: "organizer_primary_firstName",    label: "Primary: First Name" },
    { key: "organizer_primary_lastName",     label: "Primary: Last Name" },
    { key: "organizer_primary_email",        label: "Primary: Email" },
    { key: "organizer_primary_affiliation",  label: "Primary: Affiliation",  wrap: true },
    { key: "organizer_primary_country",      label: "Primary: Country" },

    // ── Secondary organizer (flattened) ─────────────────────
    { key: "organizer_secondary_firstName",   label: "Secondary: First Name" },
    { key: "organizer_secondary_lastName",    label: "Secondary: Last Name" },
    { key: "organizer_secondary_email",       label: "Secondary: Email" },
    { key: "organizer_secondary_affiliation", label: "Secondary: Affiliation", wrap: true },
    { key: "organizer_secondary_country",     label: "Secondary: Country" },

    // ── Tertiary organizer (flattened) ──────────────────────
    { key: "organizer_tertiary_firstName",    label: "Tertiary: First Name" },
    { key: "organizer_tertiary_lastName",     label: "Tertiary: Last Name" },
    { key: "organizer_tertiary_email",        label: "Tertiary: Email" },
    { key: "organizer_tertiary_affiliation",  label: "Tertiary: Affiliation", wrap: true },
    { key: "organizer_tertiary_country",      label: "Tertiary: Country" },

    // ── Session details ─────────────────────────────────────
    { key: "session_title",                  label: "Session Title",   wrap: true },
    { key: "session_topic",                  label: "Session Topic",   wrap: true },
    { key: "session_summary",                label: "Session Summary", wrap: true },
    { key: "session_keywords",               label: "Keywords",        wrap: true },
    { key: "additional_comments",            label: "Comments",        wrap: true },

    // ── Status ──────────────────────────────────────────────
    { key: "status",                         label: "Status" },
];
