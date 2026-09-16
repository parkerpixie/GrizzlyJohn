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

  function readQuestCount() {
    try { return Number(JSON.parse(localStorage.getItem('grizzlyjohn:questCount') || '0')) || 0; }
    catch { return 0; }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
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

  function fixRandomToolButton() {
    if (document.documentElement.dataset.randomToolFixReady === 'true') return;
    document.documentElement.dataset.randomToolFixReady = 'true';

    document.addEventListener('click', event => {
      const button = event.target.closest('#drawDbtSkill');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const tools = [...document.querySelectorAll('#dbtCardGrid [data-dbt-index]')];
      const viewer = document.getElementById('dbtViewer');
      const viewerImage = document.getElementById('dbtViewerImage');
      const viewerTitle = document.getElementById('dbtViewerTitle');
      if (!tools.length || !viewer || !viewerImage || !viewerTitle) return;

      const chosen = tools[Math.floor(Math.random() * tools.length)];
      const sourceImage = chosen.querySelector('img');
      const sourceTitle = chosen.querySelector('.dbt-card-label strong')?.textContent?.trim()
        || chosen.getAttribute('aria-label')?.replace(/^Open\s+/i, '').replace(/\s+skill card$/i, '')
        || 'Recovery tool';

      if (!sourceImage?.src) return;
      viewerImage.src = sourceImage.src;
      viewerImage.alt = `${sourceTitle} skill card`;
      viewerTitle.textContent = sourceTitle;

      if (!viewer.open) {
        if (typeof viewer.showModal === 'function') viewer.showModal();
        else viewer.setAttribute('open', '');
      }
    }, true);
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
