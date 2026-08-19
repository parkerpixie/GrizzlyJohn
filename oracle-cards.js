(() => {
  const API_URL = 'https://api.github.com/repos/parkerpixie/GrizzlyJohn/contents?ref=main';
  const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

  const state = {
    cards: [],
    currentIndex: 0,
    touchStartX: null
  };

  const $ = id => document.getElementById(id);

  function ensureDailyCard() {
    if ($('dailyOracleCard')) return;
    const home = $('today');
    const reflection = home?.querySelector('.reflection-card');
    if (!home || !reflection) return;

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

  function splitName(filename) {
    const full = cleanName(filename);
    const parts = full.split(/\s+-\s+/);
    const rawTitle = parts[0] || full;
    const title = rawTitle
      .replace(/\s*\(\s*\d*\s*\)\s*/g, ' ')
      .replace(/[.]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const subtitle = parts.slice(1).join(' — ').replace(/\s+/g, ' ').trim();
    return { title: title || full, subtitle };
  }

  function isOracleCard(file) {
    if (file.type !== 'file' || !IMAGE_RE.test(file.name) || !file.download_url) return false;
    if (/ Skill\.png$/i.test(file.name)) return false;
    if (/^GrizzlyJohn /i.test(file.name)) return false;
    if (/National Park/i.test(file.name)) return false;
    if (/State (?:Emblem|Badge)/i.test(file.name)) return false;
    return file.name.includes(' - ');
  }

  function uniqueCards(files) {
    const byTitle = new Map();
    files.filter(isOracleCard).forEach(card => {
      const parsed = splitName(card.name);
      const key = parsed.title.toLowerCase();
      const hasNumber = /\(\s*\d+\s*\)/.test(card.name);
      const hasSubtitle = Boolean(parsed.subtitle);
      const score = (hasSubtitle ? 20 : 0) + (hasNumber ? 0 : 10);
      const previous = byTitle.get(key);
      if (!previous || score > previous.score) byTitle.set(key, { card, score });
    });
    return [...byTitle.values()].map(item => item.card).sort((a, b) => splitName(a.name).title.localeCompare(splitName(b.name).title));
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
          <img src="${card.download_url}" alt="${escapeHtml(name.title)} spirit animal card" loading="lazy">
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
    dailyImage.src = card.download_url;
    dailyImage.alt = `${name.title} spirit animal card`;
    dailyTitle.textContent = name.title;
    dailyCard.hidden = false;
    dailyOpen.onclick = () => openViewer(index);
    dailyImage.closest('button')?.addEventListener('click', () => openViewer(index));
  }

  function openViewer(index) {
    if (!state.cards.length) return;
    state.currentIndex = (index + state.cards.length) % state.cards.length;
    const card = state.cards[state.currentIndex];
    const name = splitName(card.name);
    viewerImage.src = card.download_url;
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
    const title = `${splitName(card.name).title} — GrizzlyJohn`;

    if (!navigator.share) {
      window.open(card.download_url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const response = await fetch(card.download_url);
      const blob = await response.blob();
      const file = new File([blob], card.name, { type: blob.type || 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title, files: [file] });
      } else {
        await navigator.share({ title, url: card.download_url });
      }
    } catch {
      try { await navigator.share({ title, url: card.download_url }); } catch {}
    }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  async function loadCards() {
    gallery.innerHTML = '<div class="oracle-loading">Loading John’s cards… 🐻</div>';

    try {
      const response = await fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error('Card library unavailable');
      const files = await response.json();
      state.cards = uniqueCards(files);

      if (!state.cards.length) {
        gallery.innerHTML = '<div class="oracle-loading">No spirit animal cards found yet.</div>';
        return;
      }

      renderGallery();
      renderDailyCard();
    } catch {
      gallery.innerHTML = '<div class="oracle-loading">The card box would not open. Refresh and try again.</div>';
    }
  }

  drawButton?.addEventListener('click', () => {
    if (state.cards.length) openViewer(Math.floor(Math.random() * state.cards.length));
  });

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

  loadCards();
})();
