(() => {
  'use strict';

  const TOOLS = [
    { title: 'HALT', path: 'graphics/HALT Skill.png' },
    { title: 'ABC Please', path: 'ABC Please Skill.png' },
    { title: 'Check The Facts', path: 'Check The Facts Skill.png' },
    { title: 'Cope Ahead', path: 'Cope Ahead Skill.png' },
    { title: 'DEAR MAN', path: 'DEAR MAN Skill.png' },
    { title: 'FAST', path: 'FAST Skill.png' },
    { title: 'GIVE', path: 'GIVE Skill.png' },
    { title: 'How', path: 'How Skill.png' },
    { title: 'IMPROVE', path: 'IMPROVE Skill.png' },
    { title: 'Opposite Action', path: 'Opposite Action Skill.png' },
    { title: 'Problem Solving', path: 'Problem Solving Skill.png' },
    { title: 'Radical Acceptance', path: 'Radical Acceptance Skill.png' },
    { title: 'Self Soothe', path: 'Self Soothe Skill.png' },
    { title: 'STOP', path: 'STOP Skill.png' },
    { title: 'TIPP', path: 'TIPP Skill.png' },
    { title: 'What', path: 'What Skill.png' },
    { title: 'WISE MIND', path: 'WISE MIND Skill.png' }
  ];

  let currentIndex = 0;
  let observer = null;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function encodePath(path = '') {
    return String(path).split('/').map(part => encodeURIComponent(part)).join('/');
  }

  function ensureTools() {
    const grid = document.getElementById('dbtCardGrid');
    const count = document.getElementById('dbtCount');
    if (!grid) return false;

    if (count) count.textContent = `${TOOLS.length} tools`;

    grid.innerHTML = TOOLS.map((tool, index) => `
      <button class="dbt-card-button${tool.title === 'HALT' ? ' is-go-to' : ''}" type="button" data-dbt-fix-index="${index}" aria-label="Open ${escapeHtml(tool.title)} skill card">
        <img src="${encodePath(tool.path)}" alt="${escapeHtml(tool.title)} skill card" loading="lazy">
        <span class="dbt-card-label">
          <strong>${escapeHtml(tool.title)}</strong>
          <span>${tool.title === 'HALT' ? 'John’s go-to · Tap to read' : 'Tap to read'}</span>
        </span>
      </button>`).join('');
    return true;
  }

  function openTool(index) {
    const viewer = document.getElementById('dbtViewer');
    const image = document.getElementById('dbtViewerImage');
    const title = document.getElementById('dbtViewerTitle');
    if (!viewer || !image || !title || !TOOLS.length) return false;

    currentIndex = ((Number(index) || 0) % TOOLS.length + TOOLS.length) % TOOLS.length;
    const tool = TOOLS[currentIndex];
    image.src = encodePath(tool.path);
    image.alt = `${tool.title} skill card`;
    title.textContent = tool.title;

    if (!viewer.open) {
      if (typeof viewer.showModal === 'function') viewer.showModal();
      else viewer.setAttribute('open', '');
    }
    return true;
  }

  function openToolbox() {
    const toolbox = document.getElementById('dbtToolbox');
    if (!toolbox) return;
    toolbox.hidden = false;
    ensureTools();
    document.querySelectorAll('[data-open-recovery-toolbox]').forEach(button => {
      button.setAttribute('aria-expanded', 'true');
    });
    window.requestAnimationFrame(() => toolbox.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function shareCurrentTool() {
    const tool = TOOLS[currentIndex];
    if (!tool) return;
    const url = new URL(encodePath(tool.path), location.href).href;
    if (!navigator.share) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await navigator.share({ title: `${tool.title} — GrizzlyJohn`, url });
    } catch {}
  }

  function handleClick(event) {
    const randomButton = event.target.closest('#drawDbtSkill');
    if (randomButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      ensureTools();
      openTool(Math.floor(Math.random() * TOOLS.length));
      return;
    }

    const toolButton = event.target.closest('#dbtCardGrid [data-dbt-fix-index]');
    if (toolButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openTool(Number(toolButton.dataset.dbtFixIndex));
      return;
    }

    const toolboxButton = event.target.closest('[data-open-recovery-toolbox]');
    if (toolboxButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openToolbox();
      return;
    }

    if (event.target.closest('#dbtViewerClose')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById('dbtViewer')?.close();
      return;
    }

    if (event.target.closest('#dbtPrevious')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openTool(currentIndex - 1);
      return;
    }

    if (event.target.closest('#dbtNext')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openTool(currentIndex + 1);
      return;
    }

    if (event.target.closest('#dbtShare')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      shareCurrentTool();
      return;
    }

    const viewer = document.getElementById('dbtViewer');
    if (viewer && event.target === viewer) viewer.close();
  }

  function init() {
    if (document.documentElement.dataset.dbtButtonFixV2 === 'true') return;
    document.documentElement.dataset.dbtButtonFixV2 = 'true';

    ensureTools();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', event => {
      const viewer = document.getElementById('dbtViewer');
      if (!viewer?.open) return;
      if (event.key === 'ArrowLeft') openTool(currentIndex - 1);
      if (event.key === 'ArrowRight') openTool(currentIndex + 1);
    });

    const wisdom = document.getElementById('wisdom');
    if (wisdom) {
      observer = new MutationObserver(() => ensureTools());
      observer.observe(wisdom, { childList: true, subtree: true });
    }

    [50, 250, 750, 1500].forEach(delay => window.setTimeout(ensureTools, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
