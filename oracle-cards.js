(() => {
  const API_URL = 'https://api.github.com/repos/parkerpixie/GrizzlyJohn/contents?ref=main';
  const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

  const state = {
    cards: [],
    currentIndex: 0,
    touchStartX: null
  };

  const $ = id => document.getElementById(id);

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
    const title = (parts[0] || full).replace(/\s*\(\d+\)\s*$/, '').replace(/[.]+$/, '').trim();
    return {
      title: title || full,
      subtitle: parts.slice(1).join(' — ')
    };
  }

  function isOracleCard(file) {
    if (file.type !== 'file' || !IMAGE_RE.test(file.name) || !file.download_url) return false;
    if (/ Skill\.png$/i.test(file.name)) return false;
    if (/^GrizzlyJohn /i.test(file.name)) return false;
    return file.name.includes(' - ');
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
          <img src="${card.download_url}" alt="${escapeHtml(cleanName(card.name))}" loading="lazy">
          <span class="oracle-thumb-label">
            <strong>${escapeHtml(name.title)}</strong>
            <span>Tap to read</span>
          </span>
        </button>
      `;
    }).join('');

    gallery.querySelectorAll('[data-oracle-index]').forEach(button => {
      button.addEventListener('click', () => openViewer(Number(button.dataset.oracleIndex)));
    });
  }

  function renderDailyCard() {
    if (!state.cards.length || !dailyCard) return;
    const index = stableDailyIndex(state.cards.length);
    const card = state.cards[index];
    const name = splitName(card.name);
    dailyImage.src = card.download_url;
    dailyImage.alt = cleanName(card.name);
    dailyTitle.textContent = name.title;
    dailyCard.hidden = false;
    dailyOpen.onclick = () => openViewer(index);
    dailyImage.closest('button').onclick = () => openViewer(index);
  }

  function openViewer(index) {
    if (!state.cards.length) return;
    state.currentIndex = (index + state.cards.length) % state.cards.length;
    const card = state.cards[state.currentIndex];
    viewerImage.src = card.download_url;
    viewerImage.alt = cleanName(card.name);
    viewerTitle.textContent = cleanName(card.name);
    if (!viewer.open) viewer.showModal();
  }

  function step(direction) {
    openViewer(state.currentIndex + direction);
  }

  async function shareCurrentCard() {
    const card = state.cards[state.currentIndex];
    if (!card) return;
    const title = cleanName(card.name);

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
      try {
        await navigator.share({ title, url: card.download_url });
      } catch {}
    }
  }

  function escapeHtml(value = '') {
    return value.replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  async function loadCards() {
    gallery.innerHTML = '<div class="oracle-loading">Loading John’s cards… 🐻</div>';

    try {
      const response = await fetch(API_URL, {
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!response.ok) throw new Error('Card library unavailable');
      const files = await response.json();

      state.cards = files
        .filter(isOracleCard)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (!state.cards.length) {
        gallery.innerHTML = '<div class="oracle-loading">No reflection card images found yet.</div>';
        return;
      }

      renderGallery();
      renderDailyCard();
    } catch {
      gallery.innerHTML = '<div class="oracle-loading">The card box would not open. Refresh and try again.</div>';
    }
  }

  drawButton?.addEventListener('click', () => {
    if (!state.cards.length) return;
    openViewer(Math.floor(Math.random() * state.cards.length));
  });

  viewerClose?.addEventListener('click', () => viewer.close());
  previousButton?.addEventListener('click', () => step(-1));
  nextButton?.addEventListener('click', () => step(1));
  shareButton?.addEventListener('click', shareCurrentCard);

  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });

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
