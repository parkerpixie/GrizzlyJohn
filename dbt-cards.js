(() => {
  const SKILL_FILES = [
    'graphics/HALT Skill.png',
    'ABC Please Skill.png',
    'Check The Facts Skill.png',
    'Cope Ahead Skill.png',
    'DEAR MAN Skill.png',
    'FAST Skill.png',
    'GIVE Skill.png',
    'How Skill.png',
    'IMPROVE Skill.png',
    'Opposite Action Skill.png',
    'Problem Solving Skill.png',
    'Radical Acceptance Skill.png',
    'Self Soothe Skill.png',
    'STOP Skill.png',
    'TIPP Skill.png',
    'What Skill.png',
    'WISE MIND Skill.png'
  ];

  const GO_TO_SKILL = 'HALT';
  const grid = document.getElementById('dbtCardGrid');
  const count = document.getElementById('dbtCount');
  const randomButton = document.getElementById('drawDbtSkill');
  const viewer = document.getElementById('dbtViewer');
  const image = document.getElementById('dbtViewerImage');
  const title = document.getElementById('dbtViewerTitle');
  const closeButton = document.getElementById('dbtViewerClose');
  const prevButton = document.getElementById('dbtPrevious');
  const nextButton = document.getElementById('dbtNext');
  const shareButton = document.getElementById('dbtShare');
  const toolbox = document.getElementById('dbtToolbox');

  if (!grid || !viewer || !image || !title) return;

  const HIGH_DYSREGULATION = new Set([
    'overwhelmed', 'flooded', 'dysregulated', 'scattered', 'panicked', 'furious',
    'enraged', 'shut down', 'numb', 'burned out', 'helpless', 'trapped', 'powerless'
  ]);

  const ALTERNATES_BY_GROUP = {
    'OVERWHELMED / DYSREGULATED': ['HALT', 'TIPP', 'STOP', 'Self Soothe', 'IMPROVE'],
    'FEAR / ANXIETY': ['HALT', 'TIPP', 'Check The Facts', 'Cope Ahead', 'WISE MIND'],
    'ANGER': ['HALT', 'STOP', 'TIPP', 'Check The Facts', 'WISE MIND'],
    'SAD / HURT': ['HALT', 'Self Soothe', 'Opposite Action', 'IMPROVE'],
    'NEUTRAL / LOW ENERGY': ['HALT', 'ABC Please', 'Self Soothe'],
    'SHAME / SELF-CONSCIOUS': ['HALT', 'Check The Facts', 'Self Soothe', 'Opposite Action']
  };

  const state = {
    skills: SKILL_FILES.map(file => ({
      name: file.split('/').pop(),
      path: file.split('/').map(part => encodeURIComponent(part)).join('/')
    })),
    index: 0
  };

  function cleanName(name = '') {
    return String(name).replace(/ Skill\.png$/i, '').trim();
  }

  function normalize(name = '') {
    return cleanName(name).toLowerCase().replace(/\./g, '').trim();
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function injectStyles() {
    if (document.getElementById('johnHaltSkillStyles')) return;
    const style = document.createElement('style');
    style.id = 'johnHaltSkillStyles';
    style.textContent = `
      .dbt-card-button.is-go-to{outline:3px solid #d59b35;outline-offset:2px}
      .dbt-card-button.is-go-to .dbt-card-label span{color:#8a5b12;font-weight:800}
      .john-skill-options{margin-top:.85rem;padding-top:.85rem;border-top:1px solid rgba(47,70,54,.12)}
      .john-skill-options h4{margin:.15rem 0 .35rem;color:var(--pine-dark,#2f4636)}
      .john-skill-options p{margin:0 0 .65rem}
      .john-skill-chip-row{display:flex;flex-wrap:wrap;gap:.45rem}
      .john-skill-chip{border:1px solid rgba(47,70,54,.18);border-radius:999px;background:#fff;color:var(--pine-dark,#2f4636);padding:.55rem .75rem;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
      .john-skill-chip.is-halt{background:#f8ead0;border-color:#d59b35;color:#6c4910}
      .john-halt-callout{margin:.7rem 0;padding:.8rem;border-radius:14px;background:#f8ead0;border:1px solid rgba(213,155,53,.55)}
      .john-halt-callout strong{display:block;color:#6c4910;margin-bottom:.25rem}
      .john-toolbox-link{margin-top:1rem}
      .john-toolbox-close{margin:.8rem 0 0 auto;display:block}
      #dbtToolbox[hidden]{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function findSkillIndex(skillName) {
    const wanted = normalize(skillName);
    return state.skills.findIndex(skill => normalize(skill.name) === wanted);
  }

  function openViewer(index) {
    if (!state.skills.length || index < 0) return;
    state.index = (index + state.skills.length) % state.skills.length;
    const skill = state.skills[state.index];
    image.src = skill.path;
    image.alt = `${cleanName(skill.name)} skill card`;
    title.textContent = cleanName(skill.name);
    if (!viewer.open) viewer.showModal();
  }

  function setToolboxExpanded(expanded) {
    document.querySelectorAll('[data-open-recovery-toolbox]').forEach(button => {
      button.setAttribute('aria-expanded', String(expanded));
    });
  }

  function openToolbox({ navigate = true, scroll = true } = {}) {
    if (navigate) document.querySelector('[data-nav="wisdom"]')?.click();
    window.setTimeout(() => {
      if (!toolbox) return;
      toolbox.hidden = false;
      setToolboxExpanded(true);
      if (scroll) toolbox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, navigate ? 120 : 0);
  }

  function closeToolbox() {
    if (!toolbox) return;
    toolbox.hidden = true;
    setToolboxExpanded(false);
    document.getElementById('johnToolboxLink')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setupToolboxAccess() {
    if (!toolbox) return;
    toolbox.hidden = true;

    const toolboxHeader = toolbox.querySelector('.dbt-toolbox-header');
    if (toolboxHeader) {
      const eyebrow = toolboxHeader.querySelector('.eyebrow');
      const heading = toolboxHeader.querySelector('h2');
      const copy = toolboxHeader.querySelector('p:not(.eyebrow)');
      if (eyebrow) eyebrow.textContent = 'RECOVERY TOOLBOX';
      if (heading) heading.textContent = 'HALT + DBT Trail Tools';
      if (copy) copy.textContent = 'Open what you need, when you need it. HALT is John’s go-to, followed by the complete DBT card collection.';
    }

    if (!toolbox.querySelector('[data-close-recovery-toolbox]')) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'text-button john-toolbox-close';
      close.dataset.closeRecoveryToolbox = 'true';
      close.textContent = 'Close toolbox ↑';
      close.addEventListener('click', closeToolbox);
      toolbox.appendChild(close);
    }

    const todayCard = document.querySelector('.today-tool-card');
    if (todayCard) {
      const eyebrow = todayCard.querySelector('.eyebrow');
      const heading = todayCard.querySelector('h3');
      const copy = todayCard.querySelector('p:not(.eyebrow)');
      const button = todayCard.querySelector('button');
      if (eyebrow) eyebrow.textContent = 'RECOVERY TOOLBOX';
      if (heading) heading.textContent = 'Need a tool? They’re all in one place.';
      if (copy) copy.textContent = 'HALT plus the full DBT collection, organized behind one clean link.';
      if (button) {
        button.textContent = 'Open Recovery Toolbox →';
        button.removeAttribute('data-nav');
        button.removeAttribute('onclick');
        button.dataset.openRecoveryToolbox = 'true';
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', () => openToolbox({ navigate: true }));
      }
    }

    if (!document.getElementById('johnToolboxLink')) {
      const linkCard = document.createElement('article');
      linkCard.className = 'card john-toolbox-link';
      linkCard.id = 'johnToolboxLink';
      linkCard.innerHTML = `
        <div class="card-icon">🧰</div>
        <div class="card-content">
          <p class="eyebrow">RECOVERY TOOLS</p>
          <h3>Need a tool? They’re all here.</h3>
          <p>HALT and the full DBT collection live together in one organized toolbox.</p>
          <button class="text-button" type="button" data-open-recovery-toolbox aria-expanded="false">Open Recovery Toolbox →</button>
        </div>`;
      toolbox.parentNode?.insertBefore(linkCard, toolbox);
      linkCard.querySelector('[data-open-recovery-toolbox]')?.addEventListener('click', () => openToolbox({ navigate: false }));
    }
  }

  function openSkillByName(skillName) {
    const index = findSkillIndex(skillName);
    if (index < 0) return;
    openToolbox({ navigate: true, scroll: false });
    setTimeout(() => openViewer(index), 180);
  }

  function render() {
    if (count) count.textContent = `${state.skills.length} tools`;
    grid.innerHTML = state.skills.map((skill, index) => {
      const name = cleanName(skill.name);
      const isHalt = normalize(name) === normalize(GO_TO_SKILL);
      return `
        <button class="dbt-card-button${isHalt ? ' is-go-to' : ''}" type="button" data-dbt-index="${index}" aria-label="Open ${escapeHtml(name)} skill card">
          <img src="${skill.path}" alt="${escapeHtml(name)} skill card" loading="lazy">
          <span class="dbt-card-label">
            <strong>${escapeHtml(name)}</strong>
            <span>${isHalt ? 'John’s go-to · Tap to read' : 'Tap to read'}</span>
          </span>
        </button>`;
    }).join('');

    grid.querySelectorAll('[data-dbt-index]').forEach(button => {
      button.addEventListener('click', () => openViewer(Number(button.dataset.dbtIndex)));
    });
  }

  function enhanceFeelingResult() {
    const result = document.getElementById('feelingResult');
    if (!result || result.hidden || result.querySelector('.john-skill-options')) return;

    const existingSkill = result.querySelector('[data-learn-skill]');
    if (!existingSkill) return;

    const feeling = result.querySelector('.selected-feeling-summary h2')?.textContent?.trim() || '';
    const group = result.querySelector('.selected-feeling-summary small')?.textContent?.trim() || '';
    const suggested = existingSkill.dataset.learnSkill || result.querySelector('.skill-suggestion h3')?.textContent?.trim() || '';
    const high = HIGH_DYSREGULATION.has(feeling.toLowerCase());
    const requested = ALTERNATES_BY_GROUP[group] || ['HALT', suggested, 'TIPP', 'STOP', 'Self Soothe'];
    const available = new Set(state.skills.map(skill => normalize(skill.name)));
    const choices = [];

    [suggested, ...requested].forEach(name => {
      if (!name || !available.has(normalize(name))) return;
      if (!choices.some(item => normalize(item) === normalize(name))) choices.push(name);
    });

    if (!choices.some(item => normalize(item) === 'halt')) choices.unshift('HALT');

    const holder = document.createElement('div');
    holder.className = 'john-skill-options';
    holder.innerHTML = `
      ${high ? '<div class="john-halt-callout"><strong>Start with H.A.L.T.</strong><span>This is your go-to, John. Hungry? Angry? Lonely? Tired? Check the basics before trying to solve the whole day.</span></div>' : ''}
      <p class="eyebrow">TOOLS THAT MAY FIT</p>
      <h4>You are not locked into one skill.</h4>
      <p>The first suggestion is only a starting point. Pick what actually works for you. H.A.L.T. is always available.</p>
      <div class="john-skill-chip-row">
        ${choices.map(name => `<button class="john-skill-chip${normalize(name) === 'halt' ? ' is-halt' : ''}" type="button" data-john-skill="${escapeHtml(name)}">${normalize(name) === 'halt' ? '★ ' : ''}${escapeHtml(name)}</button>`).join('')}
      </div>`;

    result.appendChild(holder);
    holder.querySelectorAll('[data-john-skill]').forEach(button => {
      button.addEventListener('click', () => openSkillByName(button.dataset.johnSkill));
    });
  }

  function watchFeelingSuggestions() {
    const result = document.getElementById('feelingResult');
    if (!result) return;
    const observer = new MutationObserver(() => setTimeout(enhanceFeelingResult, 0));
    observer.observe(result, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    enhanceFeelingResult();
  }

  async function shareSkill() {
    const skill = state.skills[state.index];
    if (!skill) return;
    const shareTitle = `${cleanName(skill.name)} — GrizzlyJohn`;
    if (!navigator.share) {
      window.open(skill.path, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const response = await fetch(skill.path);
      const blob = await response.blob();
      const file = new File([blob], skill.name, { type: blob.type || 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: shareTitle, files: [file] });
      else await navigator.share({ title: shareTitle, url: new URL(skill.path, location.href).href });
    } catch {
      try { await navigator.share({ title: shareTitle, url: new URL(skill.path, location.href).href }); } catch {}
    }
  }

  injectStyles();
  render();
  setupToolboxAccess();
  watchFeelingSuggestions();

  randomButton?.addEventListener('click', () => openViewer(Math.floor(Math.random() * state.skills.length)));
  closeButton?.addEventListener('click', () => viewer.close());
  prevButton?.addEventListener('click', () => openViewer(state.index - 1));
  nextButton?.addEventListener('click', () => openViewer(state.index + 1));
  shareButton?.addEventListener('click', shareSkill);
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') openViewer(state.index - 1);
    if (event.key === 'ArrowRight') openViewer(state.index + 1);
  });
})();

[
  ['park-badges.js?v=20260820-3', 'parkBadges'],
  ['qa-fixes.js?v=20260820-3', 'qaFixes'],
  ['john-extras.js?v=20260820-3', 'johnExtras'],
  ['art-upgrades.js?v=20260820-3', 'artUpgrades'],
  ['listen-upgrades.js?v=20260820-3', 'listenUpgrades']
].forEach(([src, key]) => {
  const attr = `data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
  if (document.querySelector(`script[${attr}]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.setAttribute(attr, 'true');
  document.body.appendChild(script);
});
