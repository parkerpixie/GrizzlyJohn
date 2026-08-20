(() => {
  const CARD_FILES = [
    'Antelope - Awareness is strength.png',
    'Badger - I stay grounded.png',
    'Beaver - I shape my environment.png',
    'Bee () - I release overwork.png',
    'Bison - I honor what sustains me.png',
    "Bobcat (8) - I trust what others don't see.png",
    'Brown Bear - I honor rest.png',
    'Butterfly - I trust my transformation.png',
    'Canary - My sensitivity is intelligence.png',
    'Capybara - Calm Presense over Deregulated Chaos.png',
    'Cat - I honor my independence.png',
    'Chameleon - I stand out when it matters.png',
    'Cow - I remain Steady.png',
    "Coyote - Confusion doesn't mean you're lost.png",
    'Deer - I move with grace.png',
    'Dog - Loyalty is Sacred.png',
    'Dolphin - Two things can be True.png',
    'Dove - I allow softness.png',
    'Dragonfly (22) - I allow clarity to guide me.png',
    'Eagle (23) - I rise above reactive emotion.png',
    'Elephant (23) - I rise above reactive emotion.png',
    'Flamingo - I honor space in stillness.png',
    'Fox - I Trust my instincts.png',
    'Frog - I simplify before I strategize.png',
    'Giraffe - I do not rush decisions.png',
    'Groundhog (32) - Let go of what no longer fits.png',
    'Hawk - What you focus on expands.png',
    'Horse (33) - You are not fenced in.png',
    'Koi Fish - I act from belief in abundance.png',
    'Lion - I stand Confidently.png',
    'Moose - I am allowed to take up space.png',
    'Moth (39) - I can Exist in the in-between.png',
    'Mouse (40) - I respect small, stead acts.png',
    "Nightingale (41) - Calm words carry further than sharp ones.png",
    'Octopus - I can pause, pivot and proceed.png',
    'Otter - Joy is a form of wisdom.png',
    'Owl - I move with Awareness.png',
    "Panther - I don't wait for permission.png",
    'Parrot. - I talk to myself with Kindness.png',
    "Peacock - I shine because I'm Real.png",
    'Porcupine - I allow wonder to lead.png',
    'Rabbit - I take small risks.png',
    "Rhino - I don't force progress.png",
    'Sandpiper - some paths are meant to be danced across.png',
    'Seahorse - I anchor myself to what matters.png',
    'Snake (55) - I release what no longer fits.png',
    'Squirrel - I notice what matters.png',
    'Stag - Hold Your Ground Calmly.png',
    'Starfish - I choose regeneration.png',
    "Swan (60) - I listen for what's real.png",
    'Turkey - I give without costing myself.png',
    'Turtle - I remain stead.png',
    'Turtle - Protection is not avoidance.png',
    'Vulture (63) -  Nothing in Life is Wasted.png',
    'Wasp - I release what hurt me.png',
    'Wolf - I honor independence & Pack.png'
  ];

  const state = {
    cards: CARD_FILES.map(name => ({
      name,
      url: encodeURIComponent(name)
    })),
    currentIndex: 0,
    touchStartX: null
  };

  const $ = id => document.getElementById(id);

  function ensureDailyCard() {
    const home = $('today');
    if (!home) return;
    const existing = $('dailyOracleCard');
    if (existing?.closest('#today')) return;
    if (existing) existing.remove();

    const reflection = home.querySelector('.reflection-card');
    if (!reflection) return;

    const card = document.createElement('article');
    card.className = 'card oracle-daily-card compact-home-card home-oracle-card';
    card.id = 'dailyOracleCard';
    card.hidden = true;
    card.innerHTML = `
      <button class="oracle-daily-image-button" type="button" aria-label="Open today's spirit animal card">
        <img class="oracle-daily-image" id="dailyOracleImage" alt="">
      </button>
      <div class="oracle-daily-copy">
        <p class="eyebrow">TODAY'S SPIRIT ANIMAL</p>
        <h3 id="dailyOracleTitle">Today's guide</h3>
        <p class="daily-oracle-subtitle">One card for today. Tap it when you want the full-sized version.</p>
        <button class="text-button" id="openDailyOracle" type="button">Open today's card →</button>
      </div>`;
    reflection.insertAdjacentElement('afterend', card);
  }

  ensureDailyCard();

  const gallery = $('oracleCardGrid');
  const library = $('oracleLibrary');
  const libraryCount = $('oracleLibraryCount');
  const drawButton = $('drawOracleCard');
  const viewer = $('oracleViewer');
  const viewerImage = $('oracleViewerImage');
  const viewerTitle = $('oracleViewerTitle');
  const viewerClose = $('oracleViewerClose');
  const previousButton = $('oraclePrevious');
  const nextButton = $('oracleNext');
  const shareButton = $('oracleShare');
  const dailyCard = $('dailyOracleCard');
  const dailyImage = $('dailyOracleImage');
  const dailyTitle = $('dailyOracleTitle');
  const dailyOpen = $('openDailyOracle');

  if (!gallery || !viewer) return;

  function cleanName(filename) {
    return filename.replace(/\.(png|jpe?g|webp)$/i, '').replace(/\s+/g, ' ').trim();
  }

  function cleanDisplayText(value = '') {
    return String(value)
      .replace(/\bPresense\b/gi, 'Presence')
      .replace(/\bstead acts\b/gi, 'steady acts')
      .replace(/\bremain stead\b/gi, 'remain steady')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function splitName(filename) {
    const full = cleanName(filename);
    const parts = full.split(/\s+-\s+/);
    const rawTitle = parts[0] || full;
    const title = cleanDisplayText(rawTitle
      .replace(/\s*\(\s*\d*\s*\)\s*/g, ' ')
      .replace(/[.]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim());
    let subtitle = cleanDisplayText(parts.slice(1).join(' — '));
    if (!/[a-z0-9]/i.test(subtitle)) subtitle = '';
    return { title: title || full, subtitle };
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function stableDailyIndex(length) {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let hash = 0;
    for (const char of key) hash = ((hash << 5) - hash) + char.charCodeAt(0);
    return Math.abs(hash) % length;
  }

  function renderGallery() {
    library.hidden = false;
    libraryCount.textContent = `${state.cards.length} cards`;
    gallery.innerHTML = state.cards.map((card, index) => {
      const name = splitName(card.name);
      return `
        <button class="oracle-thumb" type="button" data-oracle-index="${index}" aria-label="Open ${escapeHtml(name.title)} card">
          <img src="${card.url}" alt="${escapeHtml(name.title)} spirit animal card" loading="lazy">
          <span class="oracle-thumb-label">
            <strong>${escapeHtml(name.title)}</strong>
            <span>Tap to read</span>
          </span>
        </button>`;
    }).join('');

    gallery.querySelectorAll('[data-oracle-index]').forEach(button => {
      button.addEventListener('click', () => openViewer(Number(button.dataset.oracleIndex)));
    });
  }

  function renderDailyCard() {
    if (!state.cards.length || !dailyCard || !dailyImage || !dailyTitle || !dailyOpen) return;
    const index = stableDailyIndex(state.cards.length);
    const card = state.cards[index];
    const name = splitName(card.name);
    dailyImage.src = card.url;
    dailyImage.alt = `${name.title} spirit animal card`;
    dailyTitle.textContent = name.title;
    dailyCard.hidden = false;
    dailyOpen.onclick = () => openViewer(index);
    const imageButton = dailyImage.closest('button');
    if (imageButton) imageButton.onclick = () => openViewer(index);
  }

  function openViewer(index) {
    if (!state.cards.length) return;
    state.currentIndex = (index + state.cards.length) % state.cards.length;
    const card = state.cards[state.currentIndex];
    const name = splitName(card.name);
    viewerImage.src = card.url;
    viewerImage.alt = `${name.title} spirit animal card`;
    viewerTitle.textContent = name.subtitle ? `${name.title} · ${name.subtitle}` : name.title;
    if (!viewer.open) viewer.showModal();
  }

  function step(direction) {
    openViewer(state.currentIndex + direction);
  }

  async function shareCurrentCard() {
    const card = state.cards[state.currentIndex];
    if (!card) return;
    const shareTitle = `${splitName(card.name).title} — GrizzlyJohn`;
    const fullUrl = new URL(card.url, location.href).href;

    if (!navigator.share) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const response = await fetch(card.url);
      const blob = await response.blob();
      const file = new File([blob], card.name, { type: blob.type || 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: shareTitle, files: [file] });
      else await navigator.share({ title: shareTitle, url: fullUrl });
    } catch {
      try { await navigator.share({ title: shareTitle, url: fullUrl }); } catch {}
    }
  }

  renderGallery();
  renderDailyCard();

  drawButton?.addEventListener('click', () => openViewer(Math.floor(Math.random() * state.cards.length)));
  viewerClose?.addEventListener('click', () => viewer.close());
  previousButton?.addEventListener('click', () => step(-1));
  nextButton?.addEventListener('click', () => step(1));
  shareButton?.addEventListener('click', shareCurrentCard);
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  });

  viewerImage.addEventListener('touchstart', event => {
    state.touchStartX = event.changedTouches[0]?.screenX ?? null;
  }, { passive: true });

  viewerImage.addEventListener('touchend', event => {
    if (state.touchStartX === null) return;
    const endX = event.changedTouches[0]?.screenX ?? state.touchStartX;
    const delta = endX - state.touchStartX;
    state.touchStartX = null;
    if (Math.abs(delta) < 55) return;
    step(delta > 0 ? -1 : 1);
  }, { passive: true });
})();
