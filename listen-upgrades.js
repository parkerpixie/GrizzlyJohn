(() => {
  const STORAGE_KEY = 'grizzlyjohn:listenShelf';
  const CATEGORY_ORDER = [
    'Mind & Life',
    'Science & Curiosity',
    'Strange & Mysterious',
    'Recovery',
    'History & Stories',
    'Audiobooks',
    "John's Picks"
  ];

  const RECOMMENDED_CATEGORIES = {
    'The Mel Robbins Podcast': 'Mind & Life',
    'How to Be a Better Human': 'Mind & Life',
    'Ologies with Alie Ward': 'Science & Curiosity',
    'Stuff You Should Know': 'Science & Curiosity',
    'MrBallen Podcast: Strange, Dark & Mysterious Stories': 'Strange & Mysterious'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function readShelf() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeShelf(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }

  function sourceFromUrl(value) {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      if (host.includes('audible.')) return { name: 'Audible', icon: '📚', kind: 'audiobook' };
      if (host.includes('spotify.')) return { name: 'Spotify', icon: '🎧', kind: url.pathname.includes('/episode/') ? 'episode' : 'podcast' };
      if (host === 'podcasts.apple.com') return { name: 'Apple Podcasts', icon: '🎙️', kind: 'podcast' };
      if (host.includes('music.amazon.')) return { name: 'Amazon Music', icon: '🎧', kind: 'podcast' };
      if (host.includes('youtube.') || host === 'youtu.be') return { name: 'YouTube', icon: '▶️', kind: 'video' };
      return { name: host, icon: '🔗', kind: 'link' };
    } catch {
      return { name: 'Link', icon: '🔗', kind: 'link' };
    }
  }

  function inferCategory({ title = '', url = '', kind = '' }) {
    const text = `${title} ${url}`.toLowerCase();
    if (kind === 'audiobook' || /audible|audiobook/.test(text)) return 'Audiobooks';
    if (/sober|sobriety|recovery|alcoholics anonymous|\baa\b/.test(text)) return 'Recovery';
    if (/crime|mystery|mysterious|dark|paranormal|strange/.test(text)) return 'Strange & Mysterious';
    if (/science|psychology|biology|physics|space|nature|ology|curiosity|facts/.test(text)) return 'Science & Curiosity';
    if (/history|historical|story|stories|culture|biography|memoir/.test(text)) return 'History & Stories';
    if (/mind|life|human|behavior|growth|relationship|purpose|mel robbins|self/.test(text)) return 'Mind & Life';
    return "John's Picks";
  }

  function categorizeRecommendations() {
    const list = $('#podcastList');
    if (!list || list.dataset.categorized === 'true') return Boolean(list);
    const cards = $$('.podcast-card', list);
    if (!cards.length) return false;

    const groups = new Map();
    cards.forEach(card => {
      const title = $('h2', card)?.textContent?.trim() || '';
      const category = RECOMMENDED_CATEGORIES[title] || "John's Picks";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(card);

      const copy = $('.podcast-copy', card);
      if (copy && !$('.listen-category-chip', copy)) {
        const chip = document.createElement('span');
        chip.className = 'listen-category-chip';
        chip.textContent = category;
        copy.insertBefore(chip, copy.firstChild);
      }
    });

    list.textContent = '';
    CATEGORY_ORDER.forEach(category => {
      const groupCards = groups.get(category);
      if (!groupCards?.length) return;
      const section = document.createElement('section');
      section.className = 'recommended-listen-group';
      section.innerHTML = `<div class="listen-group-heading"><h3>${escapeHtml(category)}</h3><span>${groupCards.length}</span></div><div class="recommended-listen-cards"></div>`;
      const holder = $('.recommended-listen-cards', section);
      groupCards.forEach(card => holder.appendChild(card));
      list.appendChild(section);
    });
    list.dataset.categorized = 'true';
    return true;
  }

  function renderShelf() {
    const container = $('#johnListenShelf');
    if (!container) return;
    const items = readShelf();

    if (!items.length) {
      container.innerHTML = `
        <div class="listen-shelf-empty">
          <span>🎧</span>
          <h3>Nothing saved yet.</h3>
          <p>Paste a podcast, audiobook, episode, or other good listen above. Grizz will do the annoying filing.</p>
        </div>`;
      return;
    }

    const grouped = new Map();
    items.forEach(item => {
      const category = item.category || "John's Picks";
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(item);
    });

    container.innerHTML = CATEGORY_ORDER.map(category => {
      const group = grouped.get(category);
      if (!group?.length) return '';
      return `
        <section class="custom-listen-group">
          <div class="listen-group-heading"><h3>${escapeHtml(category)}</h3><span>${group.length}</span></div>
          <div class="custom-listen-grid">
            ${group.map(item => {
              const source = sourceFromUrl(item.url);
              const art = item.image
                ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
                : `<span class="custom-listen-fallback" aria-hidden="true">${source.icon}</span>`;
              return `
                <article class="card custom-listen-card" data-listen-id="${escapeHtml(item.id)}">
                  <div class="custom-listen-art">${art}</div>
                  <div class="custom-listen-copy">
                    <div class="custom-listen-meta"><span>${escapeHtml(item.source || source.name)}</span><span>${escapeHtml(item.kind || source.kind)}</span></div>
                    <h3>${escapeHtml(item.title || 'Saved listen')}</h3>
                    <div class="custom-listen-actions">
                      <a class="button button-primary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open →</a>
                      <button class="text-button danger-text" type="button" data-remove-listen="${escapeHtml(item.id)}">Remove</button>
                    </div>
                  </div>
                </article>`;
            }).join('')}
          </div>
        </section>`;
    }).join('');

    $$('[data-remove-listen]', container).forEach(button => {
      button.addEventListener('click', () => {
        const next = readShelf().filter(item => item.id !== button.dataset.removeListen);
        writeShelf(next);
        renderShelf();
      });
    });
  }

  function ensureShelfUI() {
    const listen = $('#listen');
    const list = $('#podcastList');
    if (!listen || !list) return false;
    if ($('#listenShelfSection')) return true;

    const oldHeading = $('#listen .section-heading');
    if (oldHeading) {
      oldHeading.innerHTML = '<div><p class="eyebrow">LISTENING NOTES</p><h2>Stuff that stuck</h2><p>Notes from things John already listened to.</p></div>';
    }

    const section = document.createElement('section');
    section.className = 'listen-shelf-section';
    section.id = 'listenShelfSection';
    section.innerHTML = `
      <div class="section-heading listen-shelf-heading">
        <div>
          <p class="eyebrow">JOHN'S SHELF</p>
          <h2>Found something good?</h2>
          <p>Paste the link. That is the only part John has to know.</p>
        </div>
      </div>
      <article class="card add-listen-card">
        <form id="addListenForm" class="stack-form">
          <label class="listen-url-label">Paste the link
            <input id="listenUrl" name="url" type="url" inputmode="url" autocomplete="url" placeholder="Spotify, Apple Podcasts, Audible, YouTube…" required>
            <small>Grizz will try to grab the name, picture, and source automatically.</small>
          </label>
          <div class="listen-preview" id="listenPreview" hidden>
            <div class="listen-preview-art" id="listenPreviewArt">🎧</div>
            <div><strong id="listenPreviewTitle">Checking the link…</strong><small id="listenPreviewSource"></small></div>
          </div>
          <p class="listen-preview-status" id="listenPreviewStatus" aria-live="polite"></p>
          <details class="listen-details" id="listenDetails">
            <summary>Want to change anything?</summary>
            <div class="listen-detail-fields">
              <label>Name
                <input id="listenTitle" name="title" type="text" maxlength="180" placeholder="We’ll fill this in if we can">
              </label>
              <label>Put it on this shelf
                <select id="listenCategory" name="category">
                  <option value="auto">Let Grizz decide</option>
                  ${CATEGORY_ORDER.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}
                </select>
              </label>
            </div>
          </details>
          <button class="button button-primary" id="saveListen" type="submit">Save to my shelf</button>
        </form>
      </article>
      <div id="johnListenShelf" class="john-listen-shelf"></div>`;

    list.insertAdjacentElement('afterend', section);
    setupForm(section);
    renderShelf();
    return true;
  }

  function setupForm(section) {
    const form = $('#addListenForm', section);
    const urlInput = $('#listenUrl', section);
    const titleInput = $('#listenTitle', section);
    const categoryInput = $('#listenCategory', section);
    const preview = $('#listenPreview', section);
    const previewArt = $('#listenPreviewArt', section);
    const previewTitle = $('#listenPreviewTitle', section);
    const previewSource = $('#listenPreviewSource', section);
    const status = $('#listenPreviewStatus', section);
    const save = $('#saveListen', section);
    let previewData = null;
    let previewTimer = null;
    let requestToken = 0;

    function validUrl(value) {
      try {
        const url = new URL(value);
        return /^https?:$/.test(url.protocol);
      } catch {
        return false;
      }
    }

    async function previewLink() {
      const value = urlInput.value.trim();
      if (!validUrl(value)) {
        preview.hidden = true;
        status.textContent = value ? 'That does not look like a complete link yet.' : '';
        return;
      }

      const token = ++requestToken;
      const fallback = sourceFromUrl(value);
      previewData = { title: '', image: '', siteName: fallback.name, kind: fallback.kind, url: value };
      preview.hidden = false;
      previewArt.textContent = fallback.icon;
      previewTitle.textContent = 'Checking the link…';
      previewSource.textContent = fallback.name;
      status.textContent = 'Getting the cover and title…';

      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(value)}`);
        if (!response.ok) throw new Error('preview unavailable');
        const data = await response.json();
        if (token !== requestToken) return;
        previewData = { ...previewData, ...data };
        const title = data.title || titleInput.value.trim() || 'Saved listen';
        previewTitle.textContent = title;
        previewSource.textContent = data.siteName || fallback.name;
        if (!titleInput.value.trim() && data.title) titleInput.value = data.title;
        if (data.image) {
          previewArt.innerHTML = `<img src="${escapeHtml(data.image)}" alt="" referrerpolicy="no-referrer">`;
        } else {
          previewArt.textContent = fallback.icon;
        }
        status.textContent = data.title || data.image ? 'Got it. You can save this now.' : 'I found the link. Add a name only if you want one.';
      } catch {
        if (token !== requestToken) return;
        previewTitle.textContent = titleInput.value.trim() || 'Link ready to save';
        previewSource.textContent = fallback.name;
        previewArt.textContent = fallback.icon;
        status.textContent = 'I could not grab the cover, but the link is still perfectly usable.';
      }
    }

    urlInput.addEventListener('input', () => {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(previewLink, 450);
    });
    urlInput.addEventListener('paste', () => {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(previewLink, 80);
    });
    urlInput.addEventListener('blur', previewLink);

    form.addEventListener('submit', event => {
      event.preventDefault();
      const url = urlInput.value.trim();
      if (!validUrl(url)) {
        status.textContent = 'Paste the full link first, John.';
        urlInput.focus();
        return;
      }

      const fallback = sourceFromUrl(url);
      const title = titleInput.value.trim() || previewData?.title || `${fallback.name} listen`;
      const requestedCategory = categoryInput.value;
      const category = requestedCategory === 'auto'
        ? inferCategory({ title, url, kind: previewData?.kind || fallback.kind })
        : requestedCategory;

      const items = readShelf();
      items.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title,
        url,
        category,
        image: previewData?.image || '',
        source: previewData?.siteName || fallback.name,
        kind: previewData?.kind || fallback.kind,
        addedAt: new Date().toISOString()
      });
      writeShelf(items.slice(0, 120));
      renderShelf();
      form.reset();
      preview.hidden = true;
      previewData = null;
      status.textContent = 'Saved. Nice find, John. ✓';
      save.textContent = 'Saved ✓';
      setTimeout(() => { save.textContent = 'Save to my shelf'; }, 1600);
    });
  }

  function loadStyles() {
    if ($('link[data-listen-upgrades]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'listen-upgrades.css?v=20260819-1';
    link.dataset.listenUpgrades = 'true';
    document.head.appendChild(link);
  }

  function start() {
    loadStyles();
    const ready = () => categorizeRecommendations() && ensureShelfUI();
    if (ready()) return;
    const observer = new MutationObserver(() => {
      if (ready()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
