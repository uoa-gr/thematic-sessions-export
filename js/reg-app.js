// ---------------------------------------------------------------------------
// reg-app.js — Controller for the abstracts page
//
// Depends on:
//   config.js           (CONFIG)
//   supabase-client.js  (supabaseClient)
//   reg-columns.js      (ABSTRACT_COLUMNS, uiColumns, excelColumns)
//   reg-transform.js    (transformAbstracts)
//   reg-renderer.js     (renderRegTable)
// ---------------------------------------------------------------------------

(function () {

  var abstracts = [];

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function byId(id) { return document.getElementById(id); }

  function setStatus(text) {
    var el = byId("statusBar");
    if (el) el.textContent = text;
  }

  function setError(message) {
    var err = byId("errorBanner");
    if (!err) return;
    err.textContent   = message || "";
    err.style.display = message ? "" : "none";
  }

  function setDownloadEnabled(enabled) {
    var btn = byId("downloadBtn");
    if (btn) btn.disabled = !enabled;
  }

  function setSyncLoading(isLoading) {
    var btn = byId("syncBtn");
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Syncing…";
    } else {
      btn.disabled    = false;
      btn.textContent = btn.dataset.originalText || "Sync";
    }
  }

  // ── Data fetching ──────────────────────────────────────────────────────────
  async function fetchTable(tableName) {
    var result = await supabaseClient
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: true });
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function syncData() {
    setError(null);
    setSyncLoading(true);
    setDownloadEnabled(false);

    try {
      if (!CONFIG || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
        throw new Error("Missing Supabase configuration in config.js.");
      }

      setStatus("Fetching abstracts…");
      var raw = await fetchTable("abstracts");
      abstracts = transformAbstracts(raw);

      var countEl = byId("absCount");
      if (countEl) countEl.textContent = abstracts.length;

      renderRegTable(abstracts, uiColumns(ABSTRACT_COLUMNS));
      setDownloadEnabled(abstracts.length > 0);
      setStatus(abstracts.length + " abstracts — synced at " + new Date().toLocaleString());

    } catch (err) {
      setError("Fetch error: " + (err.message || err));
      setStatus("Sync failed.");
      abstracts = [];
      var countEl = byId("absCount");
      if (countEl) countEl.textContent = 0;
      renderRegTable([], uiColumns(ABSTRACT_COLUMNS));
    } finally {
      setSyncLoading(false);
    }
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  function exportExcel() {
    if (!abstracts.length) return;

    var cols   = excelColumns(ABSTRACT_COLUMNS);
    var header = cols.map(function (c) { return c.label; });

    var wsData = [header];
    for (var r = 0; r < abstracts.length; r++) {
      var row     = abstracts[r];
      var dataRow = cols.map(function (c) {
        var v = row[c.key];
        return v != null ? v : "";
      });
      wsData.push(dataRow);
    }

    var ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-size columns (heuristic)
    ws["!cols"] = cols.map(function (c) {
      var maxLen = c.label.length;
      for (var j = 0; j < abstracts.length; j++) {
        var cell = String(abstracts[j][c.key] != null ? abstracts[j][c.key] : "");
        var cap  = c.wrap ? 60 : 40;
        var len  = cell.length < cap ? cell.length : cap;
        if (len > maxLen) maxLen = len;
      }
      return { wch: maxLen + 2 };
    });

    var wb        = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Abstracts");

    var timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    XLSX.writeFile(wb, "abstracts_" + timestamp + ".xlsx");

    setStatus("Excel exported — " + abstracts.length + " abstracts.");
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    var syncBtn     = byId("syncBtn");
    var downloadBtn = byId("downloadBtn");

    if (syncBtn)     syncBtn.addEventListener("click", syncData);
    if (downloadBtn) downloadBtn.addEventListener("click", exportExcel);

    setDownloadEnabled(false);
    setStatus("Press Sync to fetch abstracts…");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.appSync = syncData;

})();
