(() => {
  'use strict';

  const BUILT_IN_REFLECTIONS = [
    {
      id: 'lakota-prayer',
      title: 'Lakota Prayer',
      category: 'Spirituality & Meaning',
      description: 'A grounding prayer already kept in GrizzlyJohn.',
      image: 'graphics/Lakota%20Prayer.png',
      alt: 'Lakota Prayer reflection graphic'
    },
    {
      id: 'brene-resilience',
      title: 'What Makes Up Resilience?',
      category: 'Resilience & Growth',
      description: 'The Brené Brown resilience reflection from the trail.',
      image: 'graphics/Brene%20Brown%20Quote.png',
      alt: 'What Makes Up Resilience reflection graphic based on Brené Brown\'s writing'
    },
    {
      id: 'aa-daily-reflection',
      title: 'AA Daily Reflection',
      category: 'Recovery',
      description: 'Today’s official Daily Reflection from Alcoholics Anonymous.',
      url: 'https://www.aa.org/daily-reflections'
    },
    {
      id: 'john-reflection-deck',
      title: 'John’s Reflection Deck',
      category: 'Mind & Life',
      description: 'The full reflection-card deck lives in Wisdom and belongs within reach of the Campfire too.',
      internal: 'wisdom'
    }
  ];

  function ensureArtworkStyles() {
    if (document.getElementById('grizzly-podcast-artwork-fix')) return;
    const style = document.createElement('style');
    style.id = 'grizzly-podcast-artwork-fix';
    style.textContent = `
      .podcast-art { overflow: hidden !important; }
      .podcast-artwork-image {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        object-position: center !important;
        box-sizing: border-box !important;
      }
      .campfire-reflection-shelf { display:grid; gap:10px; }
      .campfire-built-reflection {
        display:grid;
        grid-template-columns:78px minmax(0,1fr);
        gap:12px;
        align-items:center;
        padding:12px;
        border:1px solid rgba(47,70,54,.14);
        border-radius:18px;
        background:var(--paper,#fffaf0);
      }
      .campfire-built-reflection-thumb {
        display:grid;
        place-items:center;
        width:78px;
        height:78px;
        overflow:hidden;
        border-radius:14px;
        background:rgba(47,70,54,.07);
        font-size:1.8rem;
      }
      .campfire-built-reflection-thumb img {
        width:100%;
        height:100%;
        object-fit:contain;
        background:#fff;
      }
      .campfire-built-reflection h3 { margin:2px 0 5px; font-size:1rem; }
      .campfire-built-reflection p { margin:0 0 8px; font-size:.82rem; }
      .campfire-built-reflection-meta {
        display:inline-block;
        margin-bottom:3px;
        color:var(--rust,#ad5f3f);
        font-size:.65rem;
        font-weight:800;
        letter-spacing:.08em;
        text-transform:uppercase;
      }
      .campfire-reflection-viewer {
        width:min(94vw,760px);
        max-height:92vh;
        border:0;
        border-radius:22px;
        padding:0;
        background:#f7f0e4;
        box-shadow:0 20px 70px rgba(0,0,0,.3);
      }
      .campfire-reflection-viewer::backdrop { background:rgba(25,34,27,.72); }
      .campfire-reflection-viewer-inner { position:relative; padding:14px; max-height:92vh; overflow:auto; }
      .campfire-reflection-viewer img { display:block; width:100%; height:auto; border-radius:16px; background:#fff; }
      .campfire-reflection-viewer-close {
        position:sticky;
        top:0;
        float:right;
        z-index:2;
        width:42px;
        height:42px;
        margin:0 0 -42px auto;
        border:0;
        border-radius:999px;
        background:#fff;
        color:#2f4636;
        font-size:1.5rem;
        font-weight:800;
        box-shadow:0 3px 12px rgba(0,0,0,.18);
        cursor:pointer;
      }
      @media (max-width:520px) {
        .campfire-built-reflection { grid-template-columns:68px minmax(0,1fr); }
        .campfire-built-reflection-thumb { width:68px; height:68px; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureCampfireEnhancements() {
    if (!document.querySelector('link[data-listen-upgrades]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'listen-upgrades.css?v=20260911-2';
      link.dataset.listenUpgrades = 'true';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-listen-upgrades-script]')) {
      const script = document.createElement('script');
      script.src = 'listen-upgrades.js?v=20260911-2';
      script.defer = true;
      script.dataset.listenUpgradesScript = 'true';
      document.head.appendChild(script);
    }
  }

  function artworkFor(podcast = {}) {
    const title = String(podcast.title || 'Podcast').trim() || 'Podcast';
    const src = typeof podcast.artwork === 'string' ? podcast.artwork.trim() : '';
    return { src, alt: `${title} podcast cover`, fallback: '🎙️' };
  }

  function applyArtworkFallback(image) {
    if (!image) return false;
    image.hidden = true;
    image.parentElement?.classList.add('is-fallback');
    return true;
  }

  function openReflectionImage(item) {
    let dialog = document.getElementById('campfireReflectionViewer');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'campfire-reflection-viewer';
      dialog.id = 'campfireReflectionViewer';
      dialog.innerHTML = '<div class="campfire-reflection-viewer-inner"><button class="campfire-reflection-viewer-close" type="button" aria-label="Close reflection">×</button><img alt=""></div>';
      document.body.appendChild(dialog);
      dialog.querySelector('.campfire-reflection-viewer-close')?.addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    }
    const image = dialog.querySelector('img');
    image.src = item.image;
    image.alt = item.alt || item.title;
    dialog.showModal();
  }

  function openWisdomDeck() {
    const nav = document.querySelector('[data-nav="wisdom"]');
    if (nav) nav.click();
    else {
      document.querySelectorAll('[data-screen]').forEach(screen => screen.classList.remove('is-active'));
      document.getElementById('wisdom')?.classList.add('is-active');
    }
    window.setTimeout(() => {
      (document.getElementById('oracleLibrary') || document.getElementById('wisdom'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }

  function addReflectionShelf() {
    if (document.getElementById('campfireBuiltInReflections')) return true;
    const library = document.getElementById('campfireLibrary');
    if (!library) return false;

    const savedSection = library.querySelector('.saved-campfire');
    const section = document.createElement('section');
    section.id = 'campfireBuiltInReflections';
    section.className = 'campfire-v2-block campfire-built-in-reflections';
    section.setAttribute('aria-labelledby', 'campfireReflectionsHeading');
    section.innerHTML = `
      <div class="campfire-section-heading">
        <div>
          <p class="eyebrow">REFLECTIONS BY THE FIRE</p>
          <h2 id="campfireReflectionsHeading">Words worth sitting with.</h2>
          <p>Prayers, readings, and reflection pieces already built into GrizzlyJohn.</p>
        </div>
      </div>
      <div class="campfire-reflection-shelf">
        ${BUILT_IN_REFLECTIONS.map(item => `
          <article class="campfire-built-reflection" data-built-reflection="${item.id}">
            <div class="campfire-built-reflection-thumb" aria-hidden="true">${item.image ? `<img src="${item.image}" alt="">` : '📖'}</div>
            <div>
              <span class="campfire-built-reflection-meta">${item.category}</span>
              <h3>${item.title}</h3>
              <p>${item.description}</p>
              ${item.image ? '<button class="button button-secondary" type="button" data-open-built-reflection>Read reflection →</button>' : ''}
              ${item.url ? `<a class="button button-secondary" href="${item.url}" target="_blank" rel="noopener noreferrer">Read today’s reflection ↗</a>` : ''}
              ${item.internal ? '<button class="button button-secondary" type="button" data-open-wisdom-deck>Open reflection deck →</button>' : ''}
            </div>
          </article>`).join('')}
      </div>`;

    if (savedSection) library.insertBefore(section, savedSection);
    else library.appendChild(section);

    section.querySelectorAll('[data-open-built-reflection]').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('[data-built-reflection]');
        const item = BUILT_IN_REFLECTIONS.find(entry => entry.id === card?.dataset.builtReflection);
        if (item?.image) openReflectionImage(item);
      });
    });
    section.querySelectorAll('[data-open-wisdom-deck]').forEach(button => button.addEventListener('click', openWisdomDeck));
    return true;
  }

  function bootCampfire() {
    ensureArtworkStyles();
    ensureCampfireEnhancements();
    [150, 400, 900, 1600, 3000].forEach(delay => window.setTimeout(addReflectionShelf, delay));
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootCampfire, { once: true });
    else bootCampfire();
  }

  const api = { artworkFor, applyArtworkFallback };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GrizzlyJohnPodcastArtwork = api;
})();
