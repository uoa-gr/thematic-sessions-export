// ---------------------------------------------------------------------------
// reg-renderer.js — Build & inject a DOM <table> from row data.
//
// Unlike table-renderer.js, the columns are passed as a parameter rather
// than read from a global, so this renderer works for all three tabs.
//
// Also manages the shared sidebar (same markup as the thematic-sessions page).
// ---------------------------------------------------------------------------

// ── Sidebar ───────────────────────────────────────────────────────────────────

function openSidebar(title, content) {
  var overlay = document.getElementById("sidebarOverlay");
  var sidebar  = document.getElementById("sidebar");
  var titleEl  = document.getElementById("sidebarTitle");
  var bodyEl   = document.getElementById("sidebarBody");

  if (!overlay || !sidebar) return;

  titleEl.textContent = title;
  bodyEl.textContent  = content;

  overlay.classList.add("open");
  sidebar.classList.add("open");
}

function closeSidebar() {
  var overlay = document.getElementById("sidebarOverlay");
  var sidebar  = document.getElementById("sidebar");
  if (overlay) overlay.classList.remove("open");
  if (sidebar)  sidebar.classList.remove("open");
}

(function () {
  function init() {
    var closeBtn = document.getElementById("sidebarClose");
    var overlay  = document.getElementById("sidebarOverlay");

    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (overlay)  overlay.addEventListener("click",  closeSidebar);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSidebar();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// ── DOM helper ────────────────────────────────────────────────────────────────

/** Remove all child nodes from an element without using innerHTML. */
function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

// ── Table renderer ────────────────────────────────────────────────────────────

/**
 * Render an array of transformed rows into #tableWrap.
 *
 * @param {Object[]}   rows    — array of flat, transformed row objects
 * @param {ColumnDef[]} cols   — UI column definitions (already filtered: no excelOnly cols)
 */
function renderRegTable(rows, cols) {
  var wrap  = document.getElementById("tableWrap");
  var empty = document.getElementById("emptyState");

  // ── No data ────────────────────────────────────────────────────────────────
  if (!rows || rows.length === 0) {
    clearChildren(wrap);
    if (empty) {
      empty.style.display = "";
      wrap.appendChild(empty);
    }
    return;
  }

  // ── Build <table> ──────────────────────────────────────────────────────────
  var table = document.createElement("table");

  // thead
  var thead  = document.createElement("thead");
  var headTr = document.createElement("tr");

  for (var c = 0; c < cols.length; c++) {
    var th = document.createElement("th");
    th.textContent = cols[c].label;
    headTr.appendChild(th);
  }
  thead.appendChild(headTr);
  table.appendChild(thead);

  // tbody
  var tbody = document.createElement("tbody");

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var tr  = document.createElement("tr");

    for (var d = 0; d < cols.length; d++) {
      var col = cols[d];
      var td  = document.createElement("td");
      var val = row[col.key] != null ? row[col.key] : "";

      if (col.key === "payment_confirmed") {
        // Colour-coded badge for payment status
        var span = document.createElement("span");
        span.className   = "badge badge-" + (val === "Yes" ? "approved" : "pending-pay");
        span.textContent = val;
        td.appendChild(span);

      } else if (col.key === "has_file") {
        if (val !== "") {
          // File indicator badge — shows filename stub
          var fspan = document.createElement("span");
          fspan.className   = "badge badge-file";
          fspan.textContent = val;
          td.appendChild(fspan);
        }

      } else if (col.wrap) {
        // Clamp long text; click to open sidebar
        var div = document.createElement("div");
        div.className   = "cell-clamp";
        div.textContent = val;

        (function (label, fullText) {
          div.addEventListener("click", function () {
            openSidebar(label, fullText);
          });
        })(col.label, val);

        td.appendChild(div);

      } else {
        td.textContent = val;
      }

      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  // ── Inject into DOM ────────────────────────────────────────────────────────
  clearChildren(wrap);
  wrap.appendChild(table);
}
