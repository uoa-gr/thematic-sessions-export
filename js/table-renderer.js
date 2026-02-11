// ---------------------------------------------------------------------------
// table-renderer.js — Build & inject a DOM <table> from transformed row data
//
// Depends on: columns.js (DISPLAY_COLUMNS must be loaded first)
// ---------------------------------------------------------------------------

/**
 * Open the sidebar with full cell content.
 *
 * @param {string} title — column label to show in the sidebar header
 * @param {string} content — full cell text
 */
function openSidebar(title, content) {
  var overlay = document.getElementById(
    "sidebarOverlay",
  );
  var sidebar =
    document.getElementById("sidebar");
  var sidebarTitle = document.getElementById(
    "sidebarTitle",
  );
  var sidebarBody = document.getElementById(
    "sidebarBody",
  );

  if (!overlay || !sidebar) return;

  sidebarTitle.textContent = title;
  sidebarBody.textContent = content;

  overlay.classList.add("open");
  sidebar.classList.add("open");
}

/**
 * Close the sidebar.
 */
function closeSidebar() {
  var overlay = document.getElementById(
    "sidebarOverlay",
  );
  var sidebar =
    document.getElementById("sidebar");

  if (overlay) overlay.classList.remove("open");
  if (sidebar) sidebar.classList.remove("open");
}

// Wire up sidebar close buttons once DOM is ready
(function () {
  function init() {
    var closeBtn = document.getElementById(
      "sidebarClose",
    );
    var overlay = document.getElementById(
      "sidebarOverlay",
    );

    if (closeBtn)
      closeBtn.addEventListener(
        "click",
        closeSidebar,
      );
    if (overlay)
      overlay.addEventListener(
        "click",
        closeSidebar,
      );

    // Close on Escape key
    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Escape") closeSidebar();
      },
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
    );
  } else {
    init();
  }
})();

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
      } else if (col.wrap) {
        var div = document.createElement("div");
        div.className = "cell-clamp";
        div.textContent = val;

        // Click to open sidebar with full content
        (function (label, fullText) {
          div.addEventListener(
            "click",
            function () {
              openSidebar(label, fullText);
            },
          );
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

  // ── Inject into DOM ─────────────────────────────────────
  wrap.innerHTML = "";
  wrap.appendChild(table);
}
