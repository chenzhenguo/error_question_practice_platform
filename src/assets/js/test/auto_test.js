// Lightweight browser-based auto test for the Import Wizard flow.
// Usage:
// 1) Open the app with ?autoTest=1 (or #autotest) to auto-run on load
// 2) Or call window.__runImportAutoTest() from DevTools

(function () {
  function log(...args) {
    console.log('[AutoTest]', ...args);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function waitFor(predicate, { timeout = 10000, interval = 100 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const val = typeof predicate === 'function' ? predicate() : null;
        if (val) return val;
      } catch (_) {
        // ignore
      }
      await sleep(interval);
    }
    return null;
  }

  function getClickables() {
    return Array.from(
      document.querySelectorAll(
        'button, a, [role="button"], input[type="button"], input[type="submit"], .btn, .el-button'
      )
    );
  }

  function normText(el) {
    return (el?.textContent || el?.value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function findByText(texts) {
    const tlist = (Array.isArray(texts) ? texts : [texts]).map((t) => t.toLowerCase());
    return getClickables().find((el) => {
      const t = normText(el);
      return tlist.some((needle) => t.includes(needle));
    });
  }

  function safeClick(el) {
    if (!el) return false;
    try {
      el.click();
      return true;
    } catch (e) {
      try {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  async function openImportWizard() {
    // Preferred: if preview.js exposes an opener
    if (typeof window.openImportWizard === 'function') {
      try {
        window.openImportWizard();
        return true;
      } catch (e) {
        log('window.openImportWizard failed, fallback to clicking button.', e);
      }
    }
    // Fallback: try to find an "导入" button in toolbar/UI
    const candidates = [
      ['导入题库', '导入'],
      ['import'],
    ];
    for (const texts of candidates) {
      const btn = findByText(texts);
      if (safeClick(btn)) return true;
    }
    return false;
  }

  async function runImportAutoTest() {
    log('Starting Import Wizard auto-test...');

    // 0) Open the wizard
    const opened = await openImportWizard();
    if (!opened) {
      log('Failed to locate Import button.');
    }

    // 1) Wait for modal to appear
    const modal = await waitFor(() => document.querySelector('.modal-overlay'));
    if (!modal) {
      const msg = 'Modal overlay did not appear.';
      log(msg);
      document.dispatchEvent(new CustomEvent('auto-test:done', { detail: { ok: false, step: 'open', message: msg } }));
      return false;
    }

    // 2) Click "加载示例数据"
    const loadBtn = (document.querySelector('[data-testid="load-sample"]')) || findByText(['加载示例数据', 'load sample']);
    if (!safeClick(loadBtn)) {
      const msg = 'Load sample button not found.';
      log(msg);
      document.dispatchEvent(new CustomEvent('auto-test:done', { detail: { ok: false, step: 'load-sample', message: msg } }));
      return false;
    }

    // 3) Proceed to mapping -> preview (some flows auto-jump, some need Next)
    // Click Next up to 2 times if needed until we see start-import button
    for (let i = 0; i < 2; i++) {
      const startBtn = findByText(['开始导入', 'start import']);
      if (startBtn) break;
      const nextBtn = (document.querySelector('[data-testid="to-preview"]')) || findByText(['下一步', '到预览', '预览', 'next']);
      if (nextBtn) {
        safeClick(nextBtn);
        await sleep(500);
      } else {
        // maybe already at preview
        break;
      }
    }

    // 4) Click "开始导入"
    const startImportBtn = (document.querySelector('[data-testid="start-import"]')) || findByText(['开始导入', 'start import']);
    if (!safeClick(startImportBtn)) {
      const msg = 'Start Import button not found.';
      log(msg);
      document.dispatchEvent(new CustomEvent('auto-test:done', { detail: { ok: false, step: 'start-import', message: msg } }));
      return false;
    }

    // 5) Wait for modal close
    const closed = await waitFor(() => !document.querySelector('.modal-overlay'));
    if (!closed) {
      const msg = 'Modal overlay did not close after import.';
      log(msg);
      document.dispatchEvent(new CustomEvent('auto-test:done', { detail: { ok: false, step: 'close', message: msg } }));
      return false;
    }

    log('Import Wizard auto-test SUCCESS');
    document.dispatchEvent(new CustomEvent('auto-test:done', { detail: { ok: true } }));
    return true;
  }

  // Expose to window
  window.__runImportAutoTest = runImportAutoTest;

  // Auto-run if query includes ?autoTest=1 or hash contains #autotest
  function shouldAutoRun() {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('autoTest') === '1') return true;
      if ((url.hash || '').toLowerCase().includes('autotest')) return true;
    } catch (_) {}
    return false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (shouldAutoRun()) {
        // slight delay to ensure UI is attached
        setTimeout(() => {
          runImportAutoTest();
        }, 400);
      }
    });
  } else {
    if (shouldAutoRun()) {
      setTimeout(() => {
        runImportAutoTest();
      }, 400);
    }
  }
})();
