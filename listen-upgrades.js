(() => {
  const CATEGORIES = ['Mind & Life', 'Resilience & Growth', 'Spirituality & Meaning', 'Relationships & Connection', 'Recovery', 'Science & Curiosity', 'Strange & Mysterious', 'History & Stories', 'Audiobooks', "John's Picks"];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

  let typeFilter = 'all';
  let categoryFilter = 'all';
  let addKind = 'stream';

  function sourceFor(url = '') {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      if (host.includes('spotify')) return ['Spotify', '🎧'];
      if (host === 'podcasts.apple.com') return ['Apple Podcasts', '🎙️'];
      if (host.includes('youtube') || host === 'youtu.be') return ['YouTube', '▶️'];
      if (host.includes('audible')) return ['Audible', '📚'];
      if (host.includes('amazon')) return ['Amazon', '🎧'];
      return [host || 'Link', '🔗'];
    } catch { return ['Link', '🔗']; }
  }

  function itemKind(item) {
    if (item?.kind === 'reflection' || (!item?.kind && item?.body)) return 'reflection';
    return 'stream';
  }

  function ensureStyles() {
    if ($('link[data-listen-upgrades]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'listen-upgrades.css?v=20260823-1';
    link.dataset.listenUpgrades = 'true';
    document.head.appendChild(link);
  }

  function categoryOptions() {
    return CATEGORIES.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  }

  function buildCampfire() {
    const listen = $('#listen');
    const podcastList = $('#podcastList');
    const listeningLog = $('#listeningLog');
    if (!listen || !podcastList || !listeningLog) return false;
    if ($('#campfireLibrary')) return true;

    const intro = $('.screen-intro', listen);
    if (intro) intro.innerHTML = '<p class="eyebrow">CAMPFIRE</p><h1>Stuff worth coming back to.</h1><p>Slow down. Listen to something, read something, or save something worth returning to.</p>';

    const oldLogHeading = listeningLog.previousElementSibling;
    if (oldLogHeading?.classList.contains('section-heading')) oldLogHeading.remove();

    const section = document.createElement('div');
    section.id = 'campfireLibrary';
    section.className = 'campfire-library-section';
    section.innerHTML = `
      <section class="campfire-v2-block campfire-listen-links" aria-labelledby="listenByFireHeading"><div class="campfire-section-heading"><div><p class="eyebrow">LISTEN BY THE FIRE</p><h2 id="listenByFireHeading">John’s listening shelf</h2><p>Five familiar shows and their existing streaming links.</p></div></div><div class="campfire-recommended"><div id="campfirePodcastHome"></div></div></section>
      <section class="campfire-v2-block saved-campfire" aria-labelledby="savedCampfireHeading"><div class="campfire-section-heading"><div><p class="eyebrow">SAVED FOR THE CAMPFIRE</p><h2 id="savedCampfireHeading">Things worth coming back to.</h2></div><span class="campfire-count-pill" id="campfireItemCount">0</span></div><div class="campfire-browse" aria-label="Filter saved Campfire items"><div class="campfire-filter-chips"><button class="campfire-filter-chip is-active" type="button" data-campfire-type="all">All</button><button class="campfire-filter-chip" type="button" data-campfire-type="stream">Listen</button><button class="campfire-filter-chip" type="button" data-campfire-type="reflection">Reflections</button></div><label>Category<select id="campfireCategoryFilter"><option value="all">All categories</option></select></label></div><div class="campfire-unified-list" id="campfireItemList"></div><details class="campfire-history"><summary>Listening history</summary><div id="campfireListeningLogHome"></div></details></section>
      <section class="campfire-v2-block campfire-add-launch"><div><p class="eyebrow">ADD SOMETHING</p><h2>Found something worth keeping?</h2><p>Save a link or reflection on this device.</p></div><button class="button button-primary" id="openCampfireAdd" type="button">+ Add to Campfire</button></section>
      <dialog class="campfire-add-dialog" id="campfireAddDialog"><div class="campfire-dialog-shell"><div class="campfire-dialog-heading"><div><p class="eyebrow">ADD TO CAMPFIRE</p><h2>What are we keeping?</h2></div><button class="dialog-close" id="closeCampfireAdd" type="button" aria-label="Close Add to Campfire">×</button></div><div class="campfire-kind-picker"><button class="campfire-kind-button is-active" data-campfire-kind="stream" type="button"><span>🔗</span>Save a URL</button><button class="campfire-kind-button" data-campfire-kind="reflection" type="button"><span>📖</span>Reflection text</button></div><form id="campfireForm" class="stack-form"><label>Title<input id="campfireTitle" maxlength="180" required placeholder="Something worth returning to"></label><div id="campfireUrlFields"><label>URL<input id="campfireUrl" type="url" inputmode="url" placeholder="https://..."></label></div><div id="campfireReflectionFields" hidden><label>Reflection text<textarea id="campfireBody" rows="8" placeholder="Text John or Jen supplied, or material the app can store"></textarea></label><label>Source or author <span>(optional)</span><input id="campfireSource" maxlength="220"></label><label>Source URL <span>(optional)</span><input id="campfireSourceUrl" type="url" inputmode="url" placeholder="https://..."></label></div><label>Category<select id="campfireCategory">${categoryOptions()}</select></label><div class="campfire-dialog-actions"><button class="button button-secondary" id="cancelCampfireAdd" type="button">Cancel</button><button class="button button-primary" type="submit">Save to Campfire</button></div><p class="campfire-local-note">Saved only on this device. Third-party articles belong here as links, not copied full text.</p><p id="campfireStatus" class="listen-preview-status" role="status" aria-live="polite"></p></form></div></dialog>`;

    podcastList.insertAdjacentElement('beforebegin', section);
    $('#campfirePodcastHome', section).appendChild(podcastList);
    $('#campfireListeningLogHome', section).appendChild(listeningLog);
    setupInteractions(section);
    renderLibrary();
    return true;
  }

  function setupInteractions(section) {
    $$('[data-campfire-type]', section).forEach(button => button.addEventListener('click', () => {
      typeFilter = button.dataset.campfireType;
      $$('[data-campfire-type]', section).forEach(item => item.classList.toggle('is-active', item === button));
      renderLibrary();
    }));
    $('#campfireCategoryFilter', section).addEventListener('change', event => { categoryFilter = event.target.value; renderLibrary(); });

    const dialog = $('#campfireAddDialog', section);
    const close = () => { if (dialog.open) dialog.close(); };
    $('#openCampfireAdd', section).addEventListener('click', () => dialog.showModal());
    $('#closeCampfireAdd', section).addEventListener('click', close);
    $('#cancelCampfireAdd', section).addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });

    $$('[data-campfire-kind]', section).forEach(button => button.addEventListener('click', () => {
      addKind = button.dataset.campfireKind;
      $$('[data-campfire-kind]', section).forEach(item => item.classList.toggle('is-active', item === button));
      $('#campfireUrlFields', section).hidden = addKind !== 'stream';
      $('#campfireReflectionFields', section).hidden = addKind !== 'reflection';
    }));

    $('#campfireForm', section).addEventListener('submit', event => {
      event.preventDefault();
      const title = $('#campfireTitle', section).value.trim();
      const category = $('#campfireCategory', section).value;
      const source = sourceFor($('#campfireUrl', section).value.trim());
      const item = addKind === 'stream'
        ? { kind: 'stream', title, url: $('#campfireUrl', section).value.trim(), category, source: source[0] }
        : { kind: 'reflection', title, body: $('#campfireBody', section).value.trim(), source: $('#campfireSource', section).value.trim(), sourceUrl: $('#campfireSourceUrl', section).value.trim(), category };
      const result = window.GrizzlyJohnStorageV2?.campfire.add(item);
      const status = $('#campfireStatus', section);
      status.textContent = result?.ok ? 'Saved to the Campfire. ✓' : result?.reason || 'This item could not be saved safely.';
      if (!result?.ok) return;
      event.target.reset();
      window.setTimeout(() => { close(); status.textContent = ''; }, 450);
      renderLibrary();
    });

    $('#campfireItemList', section).addEventListener('click', event => {
      const button = event.target.closest('[data-remove-campfire]');
      if (!button || !window.confirm('Remove this saved item from the Campfire?')) return;
      const result = window.GrizzlyJohnStorageV2?.campfire.remove(button.dataset.removeCampfire);
      if (result?.ok) renderLibrary();
    });
  }

  function updateCategoryFilter(items) {
    const select = $('#campfireCategoryFilter');
    if (!select) return;
    const categories = [...new Set(items.map(item => item?.category).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
    const current = categories.includes(categoryFilter) ? categoryFilter : 'all';
    select.innerHTML = `<option value="all">All categories</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}`;
    select.value = current;
    categoryFilter = current;
  }

  function streamCard(item) {
    const source = sourceFor(item?.url || '');
    const hasUrl = /^https?:\/\//i.test(item?.url || '');
    return `<article class="campfire-library-card"><span class="campfire-library-icon" aria-hidden="true">${source[1]}</span><div class="campfire-library-copy"><div class="campfire-card-meta"><span>${escapeHtml(item?.category || "John's Picks")}</span><span>${escapeHtml(item?.source || source[0])}</span></div><h3>${escapeHtml(item?.title || 'Saved listen')}</h3>${item?.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<div class="campfire-card-actions">${hasUrl ? `<a class="button button-primary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Listen ↗</a>` : '<span class="campfire-unavailable">Link unavailable</span>'}<button class="text-button danger-text" data-remove-campfire="${escapeHtml(item?.id)}" type="button">Remove</button></div></div></article>`;
  }

  function reflectionCard(item) {
    return `<article class="campfire-library-card campfire-library-reflection"><span class="campfire-library-icon" aria-hidden="true">📖</span><div class="campfire-library-copy"><div class="campfire-card-meta"><span>${escapeHtml(item?.category || "John's Picks")}</span><span>Reflection</span></div><h3>${escapeHtml(item?.title || 'Saved reflection')}</h3>${item?.source ? `<p class="campfire-reflection-source">${escapeHtml(item.source)}</p>` : ''}${item?.body ? `<details><summary>Read reflection</summary><div class="campfire-reflection-body">${escapeHtml(item.body)}</div></details>` : '<p class="campfire-unavailable">Reflection text unavailable.</p>'}<div class="campfire-card-actions">${/^https?:\/\//i.test(item?.sourceUrl || '') ? `<a class="text-button" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : ''}<button class="text-button danger-text" data-remove-campfire="${escapeHtml(item?.id)}" type="button">Remove</button></div></div></article>`;
  }

  function renderLibrary() {
    const result = window.GrizzlyJohnStorageV2?.campfire.all();
    const holder = $('#campfireItemList');
    if (!holder) return;
    if (!result?.ok) {
      holder.innerHTML = '<div class="campfire-empty"><strong>Your saved Campfire data is being preserved.</strong><p>It could not be read safely right now.</p></div>';
      return;
    }
    updateCategoryFilter(result.items);
    const filtered = result.items.filter(item => typeFilter === 'all' || itemKind(item) === typeFilter).filter(item => categoryFilter === 'all' || item?.category === categoryFilter);
    $('#campfireItemCount').textContent = String(filtered.length);
    holder.innerHTML = filtered.length ? filtered.map(item => itemKind(item) === 'reflection' ? reflectionCard(item) : streamCard(item)).join('') : '<div class="campfire-empty"><strong>Nothing saved here yet.</strong><p>Change the filter or add something whenever it is worth keeping.</p></div>';
  }

  function start() {
    ensureStyles();
    if (buildCampfire()) return;
    [100, 350, 900].forEach(delay => window.setTimeout(buildCampfire, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
