// ---------------------------------------------------------------------------
// reg-app.js — Main controller for the registrations / abstracts / payments page
//
// Depends on:
//   config.js           (CONFIG)
//   supabase-client.js  (supabaseClient)
//   reg-columns.js      (REGISTRATION_COLUMNS, ABSTRACT_COLUMNS, PAYMENT_COLUMNS, uiColumns)
//   reg-transform.js    (transformRegistrations, transformAbstracts, transformPayments)
//   reg-renderer.js     (renderRegTable)
//   zip-export.js       (downloadZip)
// ---------------------------------------------------------------------------

(function () {

  // ── State ──────────────────────────────────────────────────────────────────
  var allData = {
    registrations: [],
    abstracts:     [],
    payments:      [],
  };

  var activeTab = "registrations"; // "registrations" | "abstracts" | "payments"

  // ── Tab → column / count mapping ──────────────────────────────────────────
  var TAB_CONFIG = {
    registrations: {
      columns:    REGISTRATION_COLUMNS,
      countEl:    "regCount",
      table:      "registrations",
      transform:  transformRegistrations,
    },
    abstracts: {
      columns:    ABSTRACT_COLUMNS,
      countEl:    "absCount",
      table:      "abstracts",
      transform:  transformAbstracts,
    },
    payments: {
      columns:    PAYMENT_COLUMNS,
      countEl:    "payCount",
      table:      "payment_receipts",
      transform:  transformPayments,
    },
  };

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function byId(id) { return document.getElementById(id); }

  function setStatus(text) {
    var el = byId("statusBar");
    if (el) el.textContent = text;
  }

  function setStatusHtml(html) {
    var el = byId("statusBar");
    if (el) {
      // Build safe content: split on <strong> tags manually for our known format
      // We only call this with our own controlled strings, so this is safe.
      el.textContent = html
        .replace(/<strong>/g, "")
        .replace(/<\/strong>/g, "");
    }
  }

  function setError(message) {
    var err = byId("errorBanner");
    if (!err) return;
    err.textContent    = message || "";
    err.style.display  = message ? "" : "none";
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
      btn.textContent = btn.dataset.originalText || "Sync All";
    }
  }

  function setDownloadLoading(isLoading) {
    var btn = byId("downloadBtn");
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Building ZIP…";
    } else {
      btn.disabled    = false;
      btn.textContent = btn.dataset.originalText || "Download ZIP";
    }
  }

  function updateCount(tabKey, count) {
    var cfg = TAB_CONFIG[tabKey];
    if (!cfg) return;
    var el = byId(cfg.countEl);
    if (el) el.textContent = count;
  }

  // ── Tab switching ──────────────────────────────────────────────────────────
  function switchTab(tabKey) {
    activeTab = tabKey;

    // Update button styles
    var btns = document.querySelectorAll(".tab-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].dataset.tab === tabKey);
    }

    // Re-render the current table
    renderCurrentTab();
  }

  function renderCurrentTab() {
    var cfg  = TAB_CONFIG[activeTab];
    var rows = allData[activeTab];
    renderRegTable(rows, uiColumns(cfg.columns));
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  /**
   * Fetch all rows from a single Supabase table, sorted by created_at.
   *
   * @param {string} tableName
   * @returns {Promise<Object[]>} raw rows
   */
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

      setStatus("Fetching registrations…");
      var rawReg = await fetchTable("registrations");
      allData.registrations = transformRegistrations(rawReg);
      updateCount("registrations", allData.registrations.length);

      setStatus("Fetching abstracts…");
      var rawAbs = await fetchTable("abstracts");
      allData.abstracts = transformAbstracts(rawAbs);
      updateCount("abstracts", allData.abstracts.length);

      setStatus("Fetching payment receipts…");
      var rawPay = await fetchTable("payment_receipts");
      allData.payments = transformPayments(rawPay);
      updateCount("payments", allData.payments.length);

      // Render whichever tab is active
      renderCurrentTab();

      var hasData =
        allData.registrations.length > 0 ||
        allData.abstracts.length     > 0 ||
        allData.payments.length      > 0;

      setDownloadEnabled(hasData);

      var now = new Date().toLocaleString();
      setStatus(
        allData.registrations.length + " registrations · " +
        allData.abstracts.length     + " abstracts · " +
        allData.payments.length      + " payment receipts — synced at " + now
      );

    } catch (err) {
      setError("Fetch error: " + (err.message || err));
      setStatus("Sync failed.");
      allData.registrations = [];
      allData.abstracts     = [];
      allData.payments      = [];
      updateCount("registrations", 0);
      updateCount("abstracts", 0);
      updateCount("payments", 0);
      renderCurrentTab();
    } finally {
      setSyncLoading(false);
    }
  }

  // ── ZIP download ───────────────────────────────────────────────────────────
  async function triggerDownload() {
    var hasData =
      allData.registrations.length > 0 ||
      allData.abstracts.length     > 0 ||
      allData.payments.length      > 0;

    if (!hasData) return;

    setError(null);
    setDownloadLoading(true);

    try {
      var summary = await downloadZip(
        allData.registrations,
        allData.abstracts,
        allData.payments,
        function (msg) { setStatus(msg); }
      );
      setStatus("ZIP downloaded — " + summary);
    } catch (err) {
      setError("Export error: " + (err.message || err));
      setStatus("ZIP export failed.");
    } finally {
      setDownloadLoading(false);
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    var syncBtn     = byId("syncBtn");
    var downloadBtn = byId("downloadBtn");
    var tabBar      = byId("tabBar");

    if (syncBtn)     syncBtn.addEventListener("click", syncData);
    if (downloadBtn) downloadBtn.addEventListener("click", triggerDownload);

    // Tab clicks (event delegation on the tab bar)
    if (tabBar) {
      tabBar.addEventListener("click", function (e) {
        var btn = e.target.closest(".tab-btn");
        if (btn && btn.dataset.tab) switchTab(btn.dataset.tab);
      });
    }

    setDownloadEnabled(false);
    setStatus("Press Sync All to fetch data…");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for debugging
  window.appSync = syncData;

})();
