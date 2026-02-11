// ---------------------------------------------------------------------------
// table-renderer.js — Build & inject a DOM <table> from transformed row data
//
// Depends on: columns.js (DISPLAY_COLUMNS must be loaded first)
// ---------------------------------------------------------------------------

/**
 * Render the given rows into the #tableWrap container.
 * If the array is empty an "empty-state" placeholder is shown instead.
 *
 * @param {Object[]} rows — array of flat, transformed row objects
 */
function renderTable(rows) {
  var wrap = document.getElementById("tableWrap");
  var empty =
    document.getElementById("emptyState");

  // ── No data ─────────────────────────────────────────────
  if (!rows || rows.length === 0) {
    wrap.innerHTML = "";
    if (empty) {
      empty.style.display = "";
      wrap.appendChild(empty);
    }
    return;
  }

  // ── Build <table> ───────────────────────────────────────
  var table = document.createElement("table");

  // thead
  var thead = document.createElement("thead");
  var headTr = document.createElement("tr");

  for (
    var c = 0;
    c < DISPLAY_COLUMNS.length;
    c++
  ) {
    var th = document.createElement("th");
    th.textContent = DISPLAY_COLUMNS[c].label;
    headTr.appendChild(th);
  }

  thead.appendChild(headTr);
  table.appendChild(thead);

  // tbody
  var tbody = document.createElement("tbody");

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var tr = document.createElement("tr");

    for (
      var d = 0;
      d < DISPLAY_COLUMNS.length;
      d++
    ) {
      var col = DISPLAY_COLUMNS[d];
      var td = document.createElement("td");
      var val =
        row[col.key] != null ? row[col.key] : "";

      // Status column gets a coloured badge
      if (col.key === "status" && val !== "") {
        var span = document.createElement("span");
        span.className = "badge badge-" + val;
        span.textContent = val;
        td.appendChild(span);
      } else {
        td.textContent = val;
      }

      // Allow long-text columns to wrap; add title for native tooltip
      if (col.wrap) {
        td.classList.add("wrap-cell");
        if (val.length > 80) {
          td.title = val;
        }
      }

      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  // ── Inject into DOM ─────────────────────────────────────
  wrap.innerHTML = "";
  wrap.appendChild(table);
}
