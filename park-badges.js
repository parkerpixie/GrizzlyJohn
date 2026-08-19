(() => {
  const BADGE_STORAGE_KEY = 'grizzlyjohn:parkBadges';
  const PLACE_STORAGE_KEY = 'grizzlyjohn:places';
  const MANIFEST_CACHE_KEY = 'grizzlyjohn:parkBadgeManifest';
  const GITHUB_GRAPHICS_API = 'https://api.github.com/repos/parkerpixie/GrizzlyJohn/contents/graphics?ref=main';

  const DISPLAY_FIXES = new Map([
    ['black cannon of the gunnison national park', 'Black Canyon of the Gunnison National Park'],
    ['carlsbad cavrans national park', 'Carlsbad Caverns National Park'],
    ['great san dunes national park', 'Great Sand Dunes National Park'],
    ['hawaii volcanoes national park', 'Hawaiʻi Volcanoes National Park'],
    ['haleakala national park', 'Haleakalā National Park']
  ]);

  const FALLBACK_BADGES = [
    { file: 'graphics/Acadia National Park - ME.png' },
    { file: 'graphics/Arches National Park - UT.png' },
    { file: 'graphics/Badlands National Park - SD.png' },
    { file: 'graphics/Big Bend National Park - TX.png' },
    { file: 'graphics/Biscayne National Park - FL.png' },
    { file: 'graphics/Black Cannon of the Gunnison National Park - CO.png' },
    { file: 'graphics/Bryce Canyon National Park - UT.png' },
    { file: 'graphics/Canyonlands National Park - UT.png' },
    { file: 'graphics/Capitol Reef National Park - UT.png' },
    { file: 'graphics/Carlsbad Cavrans National Park - NM.png' }
  ];

  const backpackState = {
    badges: new Set(readJson(BADGE_STORAGE_KEY, [])),
    manifest: [],
    filter: 'all',
    search: ''
  };

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function normalizeText(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/national park(?: and preserve)?/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function slugify(value = '') {
    return normalizeText(value).replace(/\s+/g, '-');
  }

  function encodePath(path = '') {
    return path.split('/').map(part => encodeURIComponent(part)).join('/');
  }

  function parseBadgeFile(file) {
    const filename = file.split('/').pop().replace(/\.png$/i, '');
    const match = filename.match(/^(.*?)\s+-\s+(.+)$/);
    const rawParkName = (match ? match[1] : filename).trim();
    const region = (match ? match[2] : '').trim();
    const fixedName = DISPLAY_FIXES.get(rawParkName.toLowerCase()) || rawParkName;
    const name = /national park/i.test(fixedName) ? fixedName : `${fixedName} National Park`;
    return {
      id: slugify(name),
      name,
      region,
      file,
      image: encodePath(file)
    };
  }

  function isNationalParkAsset(item) {
    return item && item.type === 'file' && /national park/i.test(item.name || '') && /\.png$/i.test(item.name || '');
  }

  async function loadManifest() {
    const cached = readJson(MANIFEST_CACHE_KEY, []);
    if (Array.isArray(cached) && cached.length) backpackState.manifest = cached;

    try {
      const response = await fetch(GITHUB_GRAPHICS_API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const items = await response.json();
      const manifest = items
        .filter(isNationalParkAsset)
        .map(item => parseBadgeFile(item.path || `graphics/${item.name}`))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (manifest.length) {
        backpackState.manifest = manifest;
        writeJson(MANIFEST_CACHE_KEY, manifest);
      }
    } catch (error) {
      if (!backpackState.manifest.length) {
        backpackState.manifest = FALLBACK_BADGES.map(item => parseBadgeFile(item.file));
      }
      console.warn('GrizzlyJohn backpack could not refresh its badge manifest.', error);
    }

    collectBadgesFromVisitedPlaces();
    renderBackpack();
  }

  function findBadgeForPlace(placeName) {
    const target = normalizeText(placeName);
    if (!target) return null;
    return backpackState.manifest.find(badge => {
      const badgeName = normalizeText(badge.name);
      return badgeName === target || badgeName.includes(target) || target.includes(badgeName);
    }) || null;
  }

  function collectBadgesFromVisitedPlaces() {
    const places = readJson(PLACE_STORAGE_KEY, []);
    if (!Array.isArray(places) || !places.length || !backpackState.manifest.length) return;
    let changed = false;
    places.filter(place => place?.status === 'visited').forEach(place => {
      const badge = findBadgeForPlace(place.name);
      if (badge && !backpackState.badges.has(badge.id)) {
        backpackState.badges.add(badge.id);
        changed = true;
      }
    });
    if (changed) saveBadges();
  }

  function saveBadges() {
    writeJson(BADGE_STORAGE_KEY, [...backpackState.badges]);
  }

  function ensureStyles() {
    if (document.querySelector('link[data-park-badges]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'park-badges.css?v=20260819';
    link.dataset.parkBadges = 'true';
    document.head.appendChild(link);
  }

  function ensureBackpackMarkup() {
    const roam = document.getElementById('roam');
    if (!roam || document.getElementById('roamBackpack')) return;
    const stats = roam.querySelector('.stats-grid');
    if (!stats) return;

    const section = document.createElement('section');
    section.className = 'roam-backpack';
    section.id = 'roamBackpack';
    section.innerHTML = `
      <article class="card card-dark backpack-hero">
        <div class="backpack-art" aria-hidden="true">🎒</div>
        <div class="backpack-copy">
          <p class="eyebrow">JOHN'S ROAMING BACKPACK</p>
          <h2>National Park Badges</h2>
          <p>Visited a National Park? Its emblem belongs in the pack. Mark a park visited in the passport below and GrizzlyJohn will pack the matching badge automatically.</p>
          <div class="backpack-progress"><strong id="parkBadgeCount">0</strong><span id="parkBadgeTotal">of 0 packed</span></div>
        </div>
      </article>
      <div class="backpack-controls" aria-label="National Park badge filters">
        <div class="backpack-filter-row">
          <button class="backpack-filter is-active" type="button" data-badge-filter="all">All badges</button>
          <button class="backpack-filter" type="button" data-badge-filter="packed">In backpack</button>
          <button class="backpack-filter" type="button" data-badge-filter="unpacked">Still roaming</button>
        </div>
        <label class="backpack-search">Find a park<input id="parkBadgeSearch" type="search" placeholder="Yellowstone, Acadia, Zion…" autocomplete="off"></label>
      </div>
      <div class="backpack-message" id="backpackMessage" role="status" aria-live="polite"></div>
      <div class="park-badge-grid" id="parkBadgeGrid" aria-live="polite"></div>
    `;
    stats.insertAdjacentElement('afterend', section);

    section.querySelectorAll('[data-badge-filter]').forEach(button => {
      button.addEventListener('click', () => {
        backpackState.filter = button.dataset.badgeFilter;
        section.querySelectorAll('[data-badge-filter]').forEach(item => item.classList.toggle('is-active', item === button));
        renderBadgeGrid();
      });
    });

    section.querySelector('#parkBadgeSearch')?.addEventListener('input', event => {
      backpackState.search = event.currentTarget.value.trim().toLowerCase();
      renderBadgeGrid();
    });
  }

  function visibleBadges() {
    return backpackState.manifest.filter(badge => {
      const packed = backpackState.badges.has(badge.id);
      if (backpackState.filter === 'packed' && !packed) return false;
      if (backpackState.filter === 'unpacked' && packed) return false;
      if (backpackState.search) {
        const haystack = `${badge.name} ${badge.region}`.toLowerCase();
        if (!haystack.includes(backpackState.search)) return false;
      }
      return true;
    });
  }

  function renderBackpack() {
    ensureBackpackMarkup();
    const count = document.getElementById('parkBadgeCount');
    const total = document.getElementById('parkBadgeTotal');
    if (count) count.textContent = backpackState.badges.size;
    if (total) total.textContent = `of ${backpackState.manifest.length} packed`;
    renderBadgeGrid();
  }

  function renderBadgeGrid() {
    const grid = document.getElementById('parkBadgeGrid');
    if (!grid) return;
    const badges = visibleBadges();
    if (!badges.length) {
      grid.innerHTML = `<div class="backpack-empty"><span>🧭</span><h3>No badges match that trail.</h3><p>Try another park name or filter.</p></div>`;
      return;
    }

    grid.innerHTML = badges.map(badge => {
      const packed = backpackState.badges.has(badge.id);
      return `
        <article class="park-badge ${packed ? 'is-packed' : 'is-unpacked'}" data-badge-id="${badge.id}">
          <button class="park-badge-image-button" type="button" data-toggle-badge="${badge.id}" aria-pressed="${packed}" aria-label="${packed ? 'Remove' : 'Add'} ${badge.name} ${packed ? 'from' : 'to'} backpack">
            <img src="${badge.image}" alt="${badge.name} emblem" loading="lazy" decoding="async">
            <span class="badge-status-mark" aria-hidden="true">${packed ? '✓' : '+'}</span>
          </button>
          <div class="park-badge-copy">
            <strong>${badge.name}</strong>
            <small>${badge.region || 'National Park'}</small>
            <button class="badge-pack-button" type="button" data-toggle-badge="${badge.id}" aria-pressed="${packed}">${packed ? 'In backpack ✓' : 'Pack badge'}</button>
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('[data-toggle-badge]').forEach(button => {
      button.addEventListener('click', () => toggleBadge(button.dataset.toggleBadge));
    });
  }

  function toggleBadge(id) {
    const badge = backpackState.manifest.find(item => item.id === id);
    if (!badge) return;
    const wasPacked = backpackState.badges.has(id);
    if (wasPacked) backpackState.badges.delete(id);
    else backpackState.badges.add(id);
    saveBadges();
    renderBackpack();
    showMessage(wasPacked ? `${badge.name} removed from the backpack.` : `${badge.name} packed. Nice wandering, John. ✓`);
  }

  let messageTimer;
  function showMessage(message) {
    const box = document.getElementById('backpackMessage');
    if (!box) return;
    box.textContent = message;
    box.classList.add('is-visible');
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => box.classList.remove('is-visible'), 3200);
  }

  function setupPassportSync() {
    const form = document.getElementById('placeForm');
    if (!form) return;
    form.addEventListener('submit', () => {
      window.setTimeout(() => {
        const places = readJson(PLACE_STORAGE_KEY, []);
        const newest = Array.isArray(places) ? places[0] : null;
        if (!newest || newest.status !== 'visited') return;
        const badge = findBadgeForPlace(newest.name);
        if (!badge || backpackState.badges.has(badge.id)) return;
        backpackState.badges.add(badge.id);
        saveBadges();
        renderBackpack();
        showMessage(`${badge.name} badge automatically packed. ✓`);
      }, 0);
    });
  }

  window.addEventListener('storage', event => {
    if (event.key === BADGE_STORAGE_KEY) {
      backpackState.badges = new Set(readJson(BADGE_STORAGE_KEY, []));
      renderBackpack();
    }
    if (event.key === PLACE_STORAGE_KEY) {
      collectBadgesFromVisitedPlaces();
      renderBackpack();
    }
  });

  function init() {
    ensureStyles();
    ensureBackpackMarkup();
    setupPassportSync();
    renderBackpack();
    loadManifest();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
