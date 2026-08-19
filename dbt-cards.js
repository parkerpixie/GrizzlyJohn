(() => {
  const API_URL = 'https://api.github.com/repos/parkerpixie/GrizzlyJohn/contents?ref=main';
  const SKILL_RE = / Skill\.png$/i;

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

  function cleanName(name) {
    return name.replace(/ Skill\.png$/i, '').trim();
  }

  function escapeHtml(value = '') {
    return value.replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function openViewer(index) {
    if (!state.skills.length) return;
    state.index = (index + state.skills.length) % state.skills.length;
    const skill = state.skills[state.index];
    image.src = skill.download_url;
    image.alt = `${cleanName(skill.name)} DBT skill card`;
    title.textContent = cleanName(skill.name);
    if (!viewer.open) viewer.showModal();
  }

  function render() {
    count.textContent = `${state.skills.length} skills`;
    grid.innerHTML = state.skills.map((skill, index) => `
      <button class="dbt-card-button" type="button" data-dbt-index="${index}" aria-label="Open ${escapeHtml(cleanName(skill.name))} skill card">
        <img src="${skill.download_url}" alt="${escapeHtml(cleanName(skill.name))} DBT skill card" loading="lazy">
        <span class="dbt-card-label">
          <strong>${escapeHtml(cleanName(skill.name))}</strong>
          <span>Tap to read</span>
        </span>
      </button>
    `).join('');

    grid.querySelectorAll('[data-dbt-index]').forEach(button => {
      button.addEventListener('click', () => openViewer(Number(button.dataset.dbtIndex)));
    });
  }

  async function shareSkill() {
    const skill = state.skills[state.index];
    if (!skill) return;
    const shareTitle = `${cleanName(skill.name)} — GrizzlyJohn`;

    if (!navigator.share) {
      window.open(skill.download_url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const response = await fetch(skill.download_url);
      const blob = await response.blob();
      const file = new File([blob], skill.name, { type: blob.type || 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: shareTitle, files: [file] });
      } else {
        await navigator.share({ title: shareTitle, url: skill.download_url });
      }
    } catch {
      try { await navigator.share({ title: shareTitle, url: skill.download_url }); } catch {}
    }
  }

  async function load() {
    grid.innerHTML = '<div class="dbt-loading">Unpacking the trail tools… 🧰</div>';
    try {
      const response = await fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error('Unavailable');
      const files = await response.json();
      state.skills = files
        .filter(file => file.type === 'file' && SKILL_RE.test(file.name) && file.download_url)
        .sort((a, b) => cleanName(a.name).localeCompare(cleanName(b.name)));

      if (!state.skills.length) {
        grid.innerHTML = '<div class="dbt-loading">No DBT skill cards found yet.</div>';
        return;
      }
      render();
    } catch {
      grid.innerHTML = '<div class="dbt-loading">The DBT toolbox would not open. Refresh and try again.</div>';
    }
  }

  randomButton?.addEventListener('click', () => {
    if (state.skills.length) openViewer(Math.floor(Math.random() * state.skills.length));
  });
  closeButton?.addEventListener('click', () => viewer.close());
  prevButton?.addEventListener('click', () => openViewer(state.index - 1));
  nextButton?.addEventListener('click', () => openViewer(state.index + 1));
  shareButton?.addEventListener('click', shareSkill);
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') openViewer(state.index - 1);
    if (event.key === 'ArrowRight') openViewer(state.index + 1);
  });

  load();
})();
