(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  let lastKnown = [];

  function selectedFromChips() {
    const holder = $('#selectedFeelings');
    if (!holder) return [];
    return $$('.selected-feeling-chip', holder).map(button => {
      const clone = button.cloneNode(true);
      clone.querySelectorAll('span').forEach(span => span.remove());
      return button.getAttribute('data-remove-selected-feeling') || clone.textContent.trim();
    }).map(value => String(value || '').trim()).filter(Boolean);
  }

  function savedFromResult() {
    const text = $('#feelingResult .check-in-saved span')?.textContent || '';
    return text.split('·').map(word => word.trim()).filter(Boolean);
  }

  function ensureSummary() {
    const result = $('#feelingResult');
    const checkIn = $('#feelingCheckIn');
    if (!result || !checkIn) return false;
    let summary = $('#persistentFeelingSummary');
    if (!summary) {
      summary = document.createElement('div');
      summary.id = 'persistentFeelingSummary';
      summary.className = 'persistent-feeling-summary';
      result.insertAdjacentElement('beforebegin', summary);
    }
    return summary;
  }

  function render() {
    const summary = ensureSummary();
    if (!summary) return;

    const selected = selectedFromChips();
    const saved = savedFromResult();
    if (selected.length) lastKnown = selected;
    else if (saved.length) lastKnown = saved;

    const hasGuidedResult = Boolean($('#feelingResult .guided-saved-note'));
    const visible = selected.length ? selected : (hasGuidedResult || saved.length ? lastKnown : []);
    if (!visible.length) {
      summary.hidden = true;
      return;
    }

    summary.hidden = false;
    summary.innerHTML = `<p class="eyebrow">${saved.length ? 'CHECK-IN SAVED' : 'CURRENT CHECK-IN'}</p><div class="persistent-feeling-chips">${visible.map(word => `<span>${escapeHtml(word)}</span>`).join('')}</div>`;
  }

  function installStyles() {
    if ($('#persistentFeelingSummaryStyles')) return;
    const style = document.createElement('style');
    style.id = 'persistentFeelingSummaryStyles';
    style.textContent = `
      .persistent-feeling-summary{margin:14px 0 10px;padding:12px 14px;border-radius:15px;background:rgba(47,70,54,.07);border:1px solid rgba(47,70,54,.10)}
      .persistent-feeling-summary .eyebrow{margin:0 0 7px}
      .persistent-feeling-chips{display:flex;gap:7px;flex-wrap:wrap}
      .persistent-feeling-chips span{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:var(--paper,#fffaf0);color:var(--pine-dark,#203127);font-size:.82rem;font-weight:800;border:1px solid rgba(47,70,54,.12)}
    `;
    document.head.appendChild(style);
  }

  function start() {
    installStyles();
    render();
    [120, 350, 800, 1600].forEach(delay => window.setTimeout(render, delay));

    const target = $('#feelingCheckIn') || document.body;
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        render();
      });
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
