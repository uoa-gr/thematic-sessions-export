// ---------------------------------------------------------------------------
// app.js — Main controller
// - Fetches data from Supabase
// - Transforms and renders table
// - Handles Sync + Download actions
//
// Depends on:
//   - config.js (CONFIG)
//   - supabase-client.js (supabaseClient)
//   - transform.js (transformRows)
//   - columns.js (DISPLAY_COLUMNS)
//   - table-renderer.js (renderTable)
//   - excel-export.js (downloadXlsx)
// ---------------------------------------------------------------------------

(function () {
  var currentRows = [];

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(text) {
    var el = byId("statusBar");
    if (el) el.textContent = text;
  }

  function setStatusHtml(html) {
    var el = byId("statusBar");
    if (el) el.innerHTML = html;
  }

  function setError(message) {
    var err = byId("errorBanner");
    if (!err) return;

    if (message) {
      err.textContent = message;
      err.style.display = "";
    } else {
      err.textContent = "";
      err.style.display = "none";
    }
  }

  function setSyncButtonLoading(isLoading) {
    var btn = byId("syncBtn");
    if (!btn) return;

    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Syncing...";
    } else {
      btn.disabled = false;
      btn.textContent =
        btn.dataset.originalText || "Sync";
    }
  }

  function setDownloadEnabled(enabled) {
    var btn = byId("downloadBtn");
    if (!btn) return;
    btn.disabled = !enabled;
  }

  async function syncData() {
    setError(null);
    setSyncButtonLoading(true);

    try {
      if (
        !CONFIG ||
        !CONFIG.SUPABASE_URL ||
        !CONFIG.SUPABASE_KEY
      ) {
        throw new Error(
          "Missing Supabase configuration.",
        );
      }

      console.log(
        "[DEBUG] Fetching from table:",
        CONFIG.TABLE_NAME,
      );

      var result = await supabaseClient
        .from(CONFIG.TABLE_NAME)
        .select("*")
        .order("created_at", { ascending: true });

      console.log(
        "[DEBUG] Supabase raw response:",
        result,
      );
      console.log(
        "[DEBUG] status:",
        result.status,
        "statusText:",
        result.statusText,
      );
      console.log(
        "[DEBUG] data length:",
        result.data ? result.data.length : "null",
      );
      console.log("[DEBUG] error:", result.error);

      if (result.error) {
        throw result.error;
      }

      var rawRows = result.data || [];
      currentRows = transformRows(rawRows);

      renderTable(currentRows);
      setDownloadEnabled(currentRows.length > 0);

      var now = new Date().toLocaleString();
      setStatusHtml(
        "<strong>" +
          currentRows.length +
          "</strong> rows loaded — last synced at <strong>" +
          now +
          "</strong>",
      );
    } catch (err) {
      setError(
        "Fetch error: " + (err.message || err),
      );
      setStatus("Sync failed.");
      currentRows = [];
      setDownloadEnabled(false);
      renderTable(currentRows);
    } finally {
      setSyncButtonLoading(false);
    }
  }

  function download() {
    if (!currentRows.length) return;
    downloadXlsx(currentRows);
  }

  function init() {
    var syncBtn = byId("syncBtn");
    var downloadBtn = byId("downloadBtn");

    if (syncBtn)
      syncBtn.addEventListener("click", syncData);
    if (downloadBtn)
      downloadBtn.addEventListener(
        "click",
        download,
      );

    setDownloadEnabled(false);
    setStatus("Press Sync to fetch data…");
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
    );
  } else {
    init();
  }

  // Expose for debugging if needed
  window.appSync = syncData;
})();
