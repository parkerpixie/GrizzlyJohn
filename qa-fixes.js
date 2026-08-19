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
    try {
      return Number(JSON.parse(localStorage.getItem('grizzlyjohn:questCount') || '0')) || 0;
    } catch {
      return 0;
    }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function expandQuestRewards() {
    if (!window.GRIZZLY_DATA || !Array.isArray(GRIZZLY_DATA.stamps)) return;
    const ids = new Set(GRIZZLY_DATA.stamps.map(stamp => stamp.id));
    BONUS_STAMPS.forEach(stamp => {
      if (!ids.has(stamp.id)) GRIZZLY_DATA.stamps.push(stamp);
    });
    GRIZZLY_DATA.stamps.sort((a, b) => a.requirement - b.requirement);

    const grid = document.getElementById('stampGrid');
    const count = readQuestCount();
    if (!grid) return;
    grid.innerHTML = GRIZZLY_DATA.stamps.map(stamp => {
      const unlocked = count >= stamp.requirement;
      return `<div class="stamp ${unlocked ? 'is-unlocked' : ''}"><span>${stamp.icon}</span><strong>${escapeHtml(stamp.name)}</strong><small>${unlocked ? 'Unlocked' : `${stamp.requirement} quests`}</small></div>`;
    }).join('');
  }

  function guardQuestCompletion() {
    const complete = document.getElementById('completeQuest');
    const another = document.getElementById('newQuest');
    if (!complete || !another) return;

    complete.addEventListener('click', event => {
      if (complete.dataset.questCounted === 'true') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      complete.dataset.questCounted = 'true';
      window.setTimeout(() => {
        complete.disabled = true;
        complete.textContent = 'Counted ✓';
      }, 0);
    }, true);

    another.addEventListener('click', () => {
      delete complete.dataset.questCounted;
      complete.disabled = false;
      complete.textContent = 'I did the thing ✓';
    }, true);
  }

  function fixPodcastLinks() {
    document.querySelectorAll('.podcast-card').forEach(card => {
      const title = card.querySelector('h2')?.textContent?.trim();
      if (title !== 'How to Be a Better Human') return;
      const spotify = card.querySelector('a[href*="open.spotify.com"]');
      if (spotify) spotify.href = BETTER_HUMAN_SPOTIFY;
    });
  }

  function loadQaStyles() {
    if (document.querySelector('link[data-qa-fixes]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'qa-fixes.css?v=20260819-1';
    link.dataset.qaFixes = 'true';
    document.head.appendChild(link);
  }

  function init() {
    loadQaStyles();
    expandQuestRewards();
    guardQuestCompletion();
    fixPodcastLinks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
