(() => {
  const API_URL = 'https://api.github.com/repos/parkerpixie/GrizzlyJohn/contents?ref=main';
  const SKILL_RE = / Skill\.png$/i;
  const GO_TO_SKILL = 'HALT';
  const HALT_SKILL = {
    type: 'file',
    name: 'HALT Skill.png',
    download_url: 'https://raw.githubusercontent.com/parkerpixie/GrizzlyJohn/main/graphics/HALT%20Skill.png'
  };

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

  if (!grid || !viewer) return;

  const state = { skills: [], index: 0 };
  const HIGH_DYSREGULATION = new Set(['overwhelmed','flooded','dysregulated','scattered','panicked','furious','enraged','shut down','numb','burned out','helpless','trapped','powerless']);
  const ALTERNATES_BY_GROUP = {
    'OVERWHELMED / DYSREGULATED': ['HALT', 'TIPP', 'STOP', 'Self Soothe', 'IMPROVE'],
    'FEAR / ANXIETY': ['HALT', 'TIPP', 'Check The Facts', 'Cope Ahead', 'WISE MIND'],
    'ANGER': ['HALT', 'STOP', 'TIPP', 'Check The Facts', 'WISE MIND'],
    'SAD / HURT': ['HALT', 'Self Soothe', 'Opposite Action', 'IMPROVE'],
    'NEUTRAL / LOW ENERGY': ['HALT', 'ABC Please', 'Self Soothe'],
    'SHAME / SELF-CONSCIOUS': ['HALT', 'Check The Facts', 'Self Soothe', 'Opposite Action']
  };

  function cleanName(name) { return String(name || '').replace(/ Skill\.png$/i, '').trim(); }
  function normalizeSkillName(name = '') { return String(name).trim().toLowerCase().replace(/\./g, ''); }
  function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[char]); }

  function injectStyles() {
    if (document.getElementById('johnHaltSkillStyles')) return;
    const style = document.createElement('style');
    style.id = 'johnHaltSkillStyles';
    style.textContent = `.dbt-card-button.is-go-to{outline:3px solid #d59b35;outline-offset:2px}.dbt-card-button.is-go-to .dbt-card-label span{color:#8a5b12;font-weight:800}.john-skill-options{margin-top:.85rem;padding-top:.85rem;border-top:1px solid rgba(47,70,54,.12)}.john-skill-options h4{margin:.15rem 0 .35rem;color:var(--pine-dark,#2f4636)}.john-skill-options p{margin:0 0 .65rem}.john-skill-chip-row{display:flex;flex-wrap:wrap;gap:.45rem}.john-skill-chip{border:1px solid rgba(47,70,54,.18);border-radius:999px;background:#fff;color:var(--pine-dark,#2f4636);padding:.55rem .75rem;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}.john-skill-chip.is-halt{background:#f8ead0;border-color:#d59b35;color:#6c4910}.john-halt-callout{margin:.7rem 0;padding:.75rem;border-radius:14px;background:#f8ead0;border:1px solid rgba(213,155,53,.55)}.john-halt-callout strong{display:block;color:#6c4910;margin-bottom:.2rem}`;
    document.head.appendChild(style);
  }

  function findSkillIndex(skillName) {
    const wanted = normalizeSkillName(skillName);
    return state.skills.findIndex(skill => normalizeSkillName(cleanName(skill.name)) === wanted);
  }

  function openViewer(index) {
    if (!state.skills.length || index < 0) return;
    state.index = (index + state.skills.length) % state.skills.length;
    const skill = state.skills[state.index];
    image.src = skill.download_url;
    image.alt = `${cleanName(skill.name)} skill card`;
    title.textContent = cleanName(skill.name);
    if (!viewer.open) viewer.showModal();
  }

  function openSkillByName(skillName) {
    const index = findSkillIndex(skillName);
    if (index < 0) return;
    document.querySelector('[data-nav="wisdom"]')?.click();
    setTimeout(() => document.querySelector('[data-wisdom-panel="skillsPanel"]')?.click(), 40);
    setTimeout(() => openViewer(index), 90);
  }

  function render() {
    count.textContent = `${state.skills.length} skills`;
    grid.innerHTML = state.skills.map((skill,index) => {
      const name = cleanName(skill.name);
      const isHalt = normalizeSkillName(name) === 'halt';
      return `<button class="dbt-card-button${isHalt ? ' is-go-to' : ''}" type="button" data-dbt-index="${index}" aria-label="Open ${escapeHtml(name)} skill card"><img src="${skill.download_url}" alt="${escapeHtml(name)} skill card" loading="lazy"><span class="dbt-card-label"><strong>${escapeHtml(name)}</strong><span>${isHalt ? 'John’s go-to · Tap to read' : 'Tap to read'}</span></span></button>`;
    }).join('');
    grid.querySelectorAll('[data-dbt-index]').forEach(button => button.addEventListener('click', () => openViewer(Number(button.dataset.dbtIndex))));
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
    const available = new Set(state.skills.map(skill => normalizeSkillName(cleanName(skill.name))));
    const requested = ALTERNATES_BY_GROUP[group] || ['HALT', suggested, 'TIPP', 'STOP', 'Self Soothe'];
    const choices = [];
    [suggested, ...requested].forEach(name => {
      if (!name) return;
      const key = normalizeSkillName(name);
      if (!available.has(key)) return;
      if (!choices.some(item => normalizeSkillName(item) === key)) choices.push(name);
    });
    if (available.has('halt') && !choices.some(item => normalizeSkillName(item) === 'halt')) choices.unshift('HALT');

    const holder = document.createElement('div');
    holder.className = 'john-skill-options';
    holder.innerHTML = `${high ? `<div class="john-halt-callout"><strong>Before anything else: H.A.L.T.</strong><span>John, this is your go-to. Check hungry, angry, lonely, and tired before asking yourself to solve the whole damn day.</span></div>` : ''}<p class="eyebrow">OTHER TOOLS THAT MAY FIT</p><h4>You are not locked into one skill.</h4><p>The first suggestion is only a starting point. Pick the tool that actually works for you.</p><div class="john-skill-chip-row">${choices.map(name => `<button class="john-skill-chip${normalizeSkillName(name)==='halt'?' is-halt':''}" type="button" data-john-skill="${escapeHtml(name)}">${normalizeSkillName(name)==='halt'?'★ ':''}${escapeHtml(name)}</button>`).join('')}</div>`;
    result.appendChild(holder);
    holder.querySelectorAll('[data-john-skill]').forEach(button => button.addEventListener('click', () => openSkillByName(button.dataset.johnSkill)));
  }

  function watchFeelingSuggestions() {
    const result = document.getElementById('feelingResult');
    if (!result) return;
    const observer = new MutationObserver(() => setTimeout(enhanceFeelingResult, 0));
    observer.observe(result, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    enhanceFeelingResult();
  }

  async function shareSkill() {
    const skill = state.skills[state.index];
    if (!skill) return;
    const shareTitle = `${cleanName(skill.name)} — GrizzlyJohn`;
    if (!navigator.share) { window.open(skill.download_url,'_blank','noopener,noreferrer'); return; }
    try {
      const response = await fetch(skill.download_url);
      const blob = await response.blob();
      const file = new File([blob], skill.name, { type: blob.type || 'image/png' });
      if (navigator.canShare?.({ files:[file] })) await navigator.share({ title:shareTitle, files:[file] });
      else await navigator.share({ title:shareTitle, url:skill.download_url });
    } catch { try { await navigator.share({ title:shareTitle, url:skill.download_url }); } catch {} }
  }

  async function load() {
    grid.innerHTML = '<div class="dbt-loading">Unpacking the trail tools… 🧰</div>';
    try {
      const response = await fetch(API_URL, { headers:{ Accept:'application/vnd.github+json' } });
      if (!response.ok) throw new Error('Unavailable');
      const rootFiles = await response.json();
      const files = [...rootFiles, HALT_SKILL];
      const seen = new Set();
      state.skills = files.filter(file => file.type === 'file' && SKILL_RE.test(file.name) && file.download_url).filter(file => {
        const key = cleanName(file.name).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).sort((a,b) => {
        const aHalt = normalizeSkillName(cleanName(a.name)) === 'halt';
        const bHalt = normalizeSkillName(cleanName(b.name)) === 'halt';
        if (aHalt !== bHalt) return aHalt ? -1 : 1;
        return cleanName(a.name).localeCompare(cleanName(b.name));
      });
      if (!state.skills.length) { grid.innerHTML = '<div class="dbt-loading">No skill cards found yet.</div>'; return; }
      render();
      watchFeelingSuggestions();
    } catch {
      grid.innerHTML = '<div class="dbt-loading">The DBT toolbox would not open. Refresh and try again.</div>';
    }
  }

  injectStyles();
  randomButton?.addEventListener('click', () => { if (state.skills.length) openViewer(Math.floor(Math.random() * state.skills.length)); });
  closeButton?.addEventListener('click', () => viewer.close());
  prevButton?.addEventListener('click', () => openViewer(state.index - 1));
  nextButton?.addEventListener('click', () => openViewer(state.index + 1));
  shareButton?.addEventListener('click', shareSkill);
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') openViewer(state.index - 1); if (event.key === 'ArrowRight') openViewer(state.index + 1); });
  load();
})();

[
  ['park-badges.js?v=20260819-1', 'parkBadges'],
  ['qa-fixes.js?v=20260819-1', 'qaFixes'],
  ['john-extras.js?v=20260819-2', 'johnExtras'],
  ['art-upgrades.js?v=20260819-1', 'artUpgrades'],
  ['listen-upgrades.js?v=20260820-2', 'listenUpgrades']
].forEach(([src,key]) => {
  if (document.querySelector(`script[data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.dataset[key] = 'true';
  document.body.appendChild(script);
});
