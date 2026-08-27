(() => {
  const BADGE_STORAGE_KEY = 'grizzlyjohn:parkBadges';
  const PLACE_STORAGE_KEY = 'grizzlyjohn:places';

  const PARK_FILES = [
    'graphics/Acadia National Park - ME.png',
    'graphics/Arches National Park - UT.png',
    'graphics/Badlands National Park - SD.png',
    'graphics/Big Bend National Park - TX.png',
    'graphics/Biscayne National Park - FL.png',
    'graphics/Black Cannon of the Gunnison National Park - CO.png',
    'graphics/Bryce Canyon National Park - UT.png',
    'graphics/Canyonlands National Park - UT.png',
    'graphics/Capitol Reef National Park - UT.png',
    'graphics/Carlsbad Cavrans National Park - NM.png',
    'graphics/Channel Islands National Park - CA.png',
    'graphics/Congaree National Park - SC.png',
    'graphics/Crater Lake National Park - OR.png',
    'graphics/Cuyahoga Valley National Park - OH.png',
    'graphics/Death Valley National Park - CA & NV.png',
    'graphics/Denali National Park - AK.png',
    'graphics/Dry Tortugas National Park - FL.png',
    'graphics/Everglades National Park - FL.png',
    'graphics/Gates of the Arctic National Park - AK.png',
    'graphics/Gateway Arch National Park - MO.png',
    'graphics/Glacier Bay National Park - AK.png',
    'graphics/Glacier National Park - MT.png',
    'graphics/Grand Canyon National Park - AZ.png',
    'graphics/Grand Teton National Park - WY.png',
    'graphics/Great Basin National Park - NV.png',
    'graphics/Great San Dunes National Park - CO.png',
    'graphics/Great Smokey Mountains National Park - NC & TN.png',
    'graphics/Guadalupe Mountain National Park - TX.png',
    'graphics/Haleakala National Park - HI.png',
    "graphics/Hawai'i Volcanoes National Park - HI.png",
    'graphics/Hot Springs National Park - AR.png',
    'graphics/Indiana Dunes National Park - IN.png',
    'graphics/Isle Royal National Park - MI.png',
    'graphics/Joshua Tree National Park - CA.png',
    'graphics/Katmai National Park - AK.png',
    'graphics/Kenai Fjords National Park - AK.png',
    'graphics/Kings Canyon National Park - CA.png',
    'graphics/Kobuk Valley National Park - AK.png',
    'graphics/Lake Clark National Park - AK.png',
    'graphics/Lassen Volcanic National Park - CA.png',
    'graphics/Mammoth Cave National Park - KY.png',
    'graphics/Mesa Verde National Park - CO.png',
    'graphics/Mount Ranier National Park - Washington.png',
    'graphics/National Park of American Samoa - American Samoa.png',
    'graphics/New River Gorge National Park - WV.png',
    'graphics/North Cascades National Park - WA.png',
    'graphics/Olympic National Park - WA.png',
    'graphics/Petrified Forest National Park - AZ.png',
    'graphics/Pinnacles National Park - CA.png',
    'graphics/Redwood National Park - CA.png',
    'graphics/Rocky Mountain National Park - CO.png',
    'graphics/Saguaro National Park - AZ.png',
    'graphics/Sequoia National Park - CA.png',
    'graphics/Shenandoah National Park - ND.png',
    'graphics/Theodore Roosevelt National Park - ND.png',
    'graphics/Virgin Islands National Park - Virgin Islands.png',
    'graphics/Voyageurs National Park - MN.png',
    'graphics/White Sands National Park - NM.png',
    'graphics/Wind Cave National Park - SD.png',
    'graphics/Wrangel-St. Elias National Park - AK.png',
    'graphics/Yellowstone National Park - ID, MT & WY.png',
    'graphics/Yosemite National Park - CA.png',
    'graphics/Zion National Park - UT.png'
  ];

  const DISPLAY_FIXES = new Map([
    ['black cannon of the gunnison national park', 'Black Canyon of the Gunnison National Park'],
    ['carlsbad cavrans national park', 'Carlsbad Caverns National Park'],
    ['great san dunes national park', 'Great Sand Dunes National Park'],
    ['great smokey mountains national park', 'Great Smoky Mountains National Park'],
    ['guadalupe mountain national park', 'Guadalupe Mountains National Park'],
    ['haleakala national park', 'Haleakalā National Park'],
    ["hawai'i volcanoes national park", 'Hawaiʻi Volcanoes National Park'],
    ['isle royal national park', 'Isle Royale National Park'],
    ['mount ranier national park', 'Mount Rainier National Park'],
    ['wrangel-st. elias national park', 'Wrangell–St. Elias National Park']
  ]);

  const REGION_FIXES = new Map([
    ['shenandoah national park', 'VA'],
    ['mount rainier national park', 'WA'],
    ['national park of american samoa', 'American Samoa']
  ]);

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
    let region = (match ? match[2] : '').trim();
    const fixedName = DISPLAY_FIXES.get(rawParkName.toLowerCase()) || rawParkName;
    const name = /national park/i.test(fixedName) ? fixedName : `${fixedName} National Park`;
    region = REGION_FIXES.get(name.toLowerCase()) || region;
    return {
      id: slugify(name),
      name,
      region,
      file,
      image: encodePath(file)
    };
  }

  const backpackState = {
    badges: new Set(readJson(BADGE_STORAGE_KEY, [])),
    manifest: PARK_FILES.map(parseBadgeFile).sort((a, b) => a.name.localeCompare(b.name)),
    search: ''
  };

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
    if (!Array.isArray(places) || !places.length) return;
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
    link.href = 'park-badges.css?v=20260827-1';
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
          <p class="eyebrow">NATIONAL PARK PASSPORT</p>
          <h2>John’s park collection</h2>
          <p>Visited parks appear in full color. Parks still ahead stay locked until John marks them visited.</p>
          <div class="backpack-progress"><strong id="parkBadgeCount">0</strong><span id="parkBadgeTotal">of 0 visited</span></div>
        </div>
      </article>
      <div class="passport-picker" aria-label="Mark a National Park visited">
        <label for="parkPassportPicker"><span>Choose a park</span><select id="parkPassportPicker"></select></label>
        <button class="button button-primary" id="toggleSelectedPark" type="button">Mark visited</button>
      </div>
      <div class="backpack-message" id="backpackMessage" role="status" aria-live="polite"></div>
      <section class="visited-park-badges" aria-labelledby="visitedParkBadgesHeading"><div class="passport-collection-heading"><h3 id="visitedParkBadgesHeading">Visited parks</h3><span id="visitedParkCount"></span></div><div class="park-badge-grid" id="parkBadgeGrid" aria-live="polite"></div></section>
      <details class="locked-park-badges" id="lockedParkBadges"><summary><span><strong>Parks still ahead</strong><small id="lockedParkCount"></small></span><span aria-hidden="true">＋</span></summary><div class="locked-park-tools"><label class="backpack-search">Find a park<input id="parkBadgeSearch" type="search" placeholder="Yellowstone, Acadia, Zion…" autocomplete="off"></label></div><div class="park-badge-grid" id="lockedParkBadgeGrid"></div></details>`;
    stats.insertAdjacentElement('afterend', section);

    const picker = section.querySelector('#parkPassportPicker');
    picker.innerHTML = backpackState.manifest.map(badge => `<option value="${badge.id}">${badge.name} · ${badge.region}</option>`).join('');
    picker.addEventListener('change', updatePickerAction);
    section.querySelector('#toggleSelectedPark').addEventListener('click', () => toggleBadge(picker.value));

    section.querySelector('#parkBadgeSearch')?.addEventListener('input', event => {
      backpackState.search = event.currentTarget.value.trim().toLowerCase();
      renderBadgeGrid();
    });
    updatePickerAction();
  }

  function updatePickerAction() {
    const picker = document.getElementById('parkPassportPicker');
    const button = document.getElementById('toggleSelectedPark');
    if (!picker || !button) return;
    const visited = backpackState.badges.has(picker.value);
    button.textContent = visited ? 'Mark not visited' : 'Mark visited';
    button.setAttribute('aria-pressed', String(visited));
  }

  function renderBackpack() {
    ensureBackpackMarkup();
    const count = document.getElementById('parkBadgeCount');
    const total = document.getElementById('parkBadgeTotal');
    const visitedCount = document.getElementById('visitedParkCount');
    const lockedCount = document.getElementById('lockedParkCount');
    if (count) count.textContent = backpackState.badges.size;
    if (total) total.textContent = `of ${backpackState.manifest.length} visited`;
    if (visitedCount) visitedCount.textContent = `${backpackState.badges.size} collected`;
    if (lockedCount) lockedCount.textContent = `${backpackState.manifest.length - backpackState.badges.size} locked`;
    updatePickerAction();
    renderBadgeGrid();
  }

  function badgeMarkup(badge, packed) {
    return `<article class="park-badge ${packed ? 'is-packed' : 'is-unpacked'}" data-badge-id="${badge.id}"><button class="park-badge-image-button" type="button" data-toggle-badge="${badge.id}" aria-pressed="${packed}" aria-label="${packed ? 'Mark' : 'Mark'} ${badge.name} ${packed ? 'not visited' : 'visited'}"><img src="${badge.image}" alt="${badge.name} emblem" loading="lazy" decoding="async"><span class="badge-status-mark" aria-hidden="true">${packed ? '✓' : '+'}</span></button><div class="park-badge-copy"><strong>${badge.name}</strong><small>${badge.region || 'National Park'}</small><span class="park-visit-state">${packed ? 'Visited · Unlocked' : 'Not visited · Locked'}</span><button class="badge-pack-button" type="button" data-toggle-badge="${badge.id}" aria-pressed="${packed}">${packed ? 'Mark not visited' : 'Mark visited'}</button></div></article>`;
  }

  function bindBadgeActions(root) {
    root?.querySelectorAll('[data-toggle-badge]').forEach(button => button.addEventListener('click', () => toggleBadge(button.dataset.toggleBadge)));
  }

  function renderBadgeGrid() {
    const grid = document.getElementById('parkBadgeGrid');
    const lockedGrid = document.getElementById('lockedParkBadgeGrid');
    if (!grid || !lockedGrid) return;
    const visited = backpackState.manifest.filter(badge => backpackState.badges.has(badge.id));
    const locked = backpackState.manifest.filter(badge => !backpackState.badges.has(badge.id) && (!backpackState.search || `${badge.name} ${badge.region}`.toLowerCase().includes(backpackState.search)));
    grid.innerHTML = visited.length ? visited.map(badge => badgeMarkup(badge, true)).join('') : '<div class="backpack-empty"><span>🧭</span><h3>No parks checked off yet.</h3><p>Choose a park above to start John’s passport.</p></div>';
    lockedGrid.innerHTML = locked.length ? locked.map(badge => badgeMarkup(badge, false)).join('') : '<div class="backpack-empty"><span>✓</span><h3>No locked parks match.</h3><p>Try another park name.</p></div>';
    bindBadgeActions(grid);
    bindBadgeActions(lockedGrid);
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
    collectBadgesFromVisitedPlaces();
    renderBackpack();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
