(() => {
  const BONUS_STAMPS = [
    { id: 'trail-starter', icon: '🥾', name: 'Trail Starter', requirement: 2 },
    { id: 'detour-approved', icon: '🪧', name: 'Detour Approved', requirement: 4 },
    { id: 'week-of-wandering', icon: '🧭', name: 'Week of Wandering', requirement: 7 },
    { id: 'rabbit-hole-regular', icon: '🐇', name: 'Rabbit Hole Regular', requirement: 12 },
    { id: 'road-less-repeated', icon: '🚙', name: 'Road Less Repeated', requirement: 20 },
    { id: 'park-bench-philosopher', icon: '🪑', name: 'Park Bench Philosopher', requirement: 35 },
    { id: 'half-century-roamer', icon: '🏕️', name: 'Half-Century Roamer', requirement: 50 },
    { id: 'trail-legend', icon: '🏔️', name: 'Trail Legend', requirement: 75 },
    { id: 'century-side-quests', icon: '🐻', name: 'Century of Side Quests', requirement: 100 }
  ];

  const BETTER_HUMAN_SPOTIFY = 'https://open.spotify.com/show/5KUwV1eFkq1T2qoNdWJ5Qe';

  const DBT_TOOLS = [
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

  function readQuestCount() {
    try { return Number(JSON.parse(localStorage.getItem('grizzlyjohn:questCount') || '0')) || 0; }
    catch { return 0; }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function encodePath(path = '') {
    return String(path).split('/').map(part => encodeURIComponent(part)).join('/');
  }

  function expandQuestRewards() {
    if (!window.GRIZZLY_DATA || !Array.isArray(GRIZZLY_DATA.stamps)) return;
    const ids = new Set(GRIZZLY_DATA.stamps.map(stamp => stamp.id));
    BONUS_STAMPS.forEach(stamp => { if (!ids.has(stamp.id)) GRIZZLY_DATA.stamps.push(stamp); });
    GRIZZLY_DATA.stamps.sort((a, b) => a.requirement - b.requirement);
    const grid = document.getElementById('stampGrid');
    const count = readQuestCount();
    if (!grid) return;
    grid.innerHTML = GRIZZLY_DATA.stamps.map(stamp => {
      const unlocked = count >= stamp.requirement;
      return `<div class="stamp ${unlocked ? 'is-unlocked' : ''}"><span>${stamp.icon}</span><strong>${escapeHtml(stamp.name)}</strong><small>${unlocked ? 'Unlocked' : `${stamp.requirement} quests`}</small></div>`;
    }).join('');
  }

  function fixPodcastLinks() {
    document.querySelectorAll('.podcast-card').forEach(card => {
      const title = card.querySelector('h2')?.textContent?.trim();
      if (title !== 'How to Be a Better Human') return;
      const spotify = card.querySelector('a[href*="open.spotify.com"]');
      if (spotify) spotify.href = BETTER_HUMAN_SPOTIFY;
    });
  }

  function openDbtTool(index) {
    if (!DBT_TOOLS.length) return false;
    const safeIndex = ((Number(index) || 0) % DBT_TOOLS.length + DBT_TOOLS.length) % DBT_TOOLS.length;
    const tool = DBT_TOOLS[safeIndex];
    const viewer = document.getElementById('dbtViewer');
    const viewerImage = document.getElementById('dbtViewerImage');
    const viewerTitle = document.getElementById('dbtViewerTitle');
    if (!tool || !viewer || !viewerImage || !viewerTitle) return false;

    viewerImage.src = encodePath(tool.path);
    viewerImage.alt = `${tool.title} skill card`;
    viewerTitle.textContent = tool.title;

    if (!viewer.open) {
      if (typeof viewer.showModal === 'function') viewer.showModal();
      else viewer.setAttribute('open', '');
    }
    return true;
  }

  function renderDbtTools() {
    const grid = document.getElementById('dbtCardGrid');
    const count = document.getElementById('dbtCount');
    if (!grid) return false;

    const countText = `${DBT_TOOLS.length} tools`;
    if (count && count.textContent !== countText) count.textContent = countText;

    if (!grid.querySelector('[data-dbt-index]')) {
      grid.innerHTML = DBT_TOOLS.map((tool, index) => {
        const isHalt = tool.title === 'HALT';
        return `
          <button class="dbt-card-button${isHalt ? ' is-go-to' : ''}" type="button" data-dbt-index="${index}" aria-label="Open ${escapeHtml(tool.title)} skill card">
            <img src="${encodePath(tool.path)}" alt="${escapeHtml(tool.title)} skill card" loading="lazy">
            <span class="dbt-card-label">
              <strong>${escapeHtml(tool.title)}</strong>
              <span>${isHalt ? 'John’s go-to · Tap to read' : 'Tap to read'}</span>
            </span>
          </button>`;
      }).join('');
    }
    return true;
  }

  function fixRandomToolButton() {
    if (document.documentElement.dataset.randomToolFixReady === 'true') return;
    document.documentElement.dataset.randomToolFixReady = 'true';

    document.addEventListener('click', event => {
      const randomButton = event.target.closest('#drawDbtSkill');
      if (randomButton) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        renderDbtTools();
        openDbtTool(Math.floor(Math.random() * DBT_TOOLS.length));
        return;
      }

      const toolButton = event.target.closest('#dbtCardGrid [data-dbt-index]');
      if (!toolButton) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openDbtTool(Number(toolButton.dataset.dbtIndex));
    }, true);

    renderDbtTools();

    const wisdom = document.getElementById('wisdom');
    if (wisdom && !wisdom.dataset.dbtRepairObserverReady) {
      wisdom.dataset.dbtRepairObserverReady = 'true';
      let scheduled = false;
      const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(() => {
          scheduled = false;
          renderDbtTools();
        });
      });
      observer.observe(wisdom, { childList: true, subtree: true });
    }
  }

  function loadQaStyles() {
    if (document.querySelector('link[data-qa-fixes]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'qa-fixes.css?v=20260819-1';
    link.dataset.qaFixes = 'true';
    document.head.appendChild(link);
  }

  function loadBreneReflection() {
    if (document.querySelector('script[data-brene-reflection]')) return;
    const script = document.createElement('script');
    script.src = 'brene-reflection.js?v=20260821-1';
    script.dataset.breneReflection = 'true';
    document.body.appendChild(script);
  }

  function loadSkillRouting() {
    if (document.querySelector('script[data-john-skill-routing]')) return;
    const script = document.createElement('script');
    script.src = 'john-skill-routing.js?v=20260909-1';
    script.dataset.johnSkillRouting = 'true';
    document.body.appendChild(script);
  }

  function init() {
    loadQaStyles();
    expandQuestRewards();
    fixPodcastLinks();
    fixRandomToolButton();
    loadBreneReflection();
    loadSkillRouting();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
