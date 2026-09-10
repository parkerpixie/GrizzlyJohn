(() => {
  'use strict';

  const LITTLE_CREEK_SOURCE = 'https://littlecreekrecovery.org/principles-of-the-12-steps/';
  const LAKOTA_ART = 'assets/wisdom/lakota-prayer.png';
  const PRINCIPLE_SPRITE = 'assets/wisdom/principles-sprite.webp';

  const LAKOTA_PRAYER = `Wakan Tanka, Great Mystery,
teach me how to trust
my heart,
my mind,
my intuition,
my inner knowing,
the senses of my body,
the blessings of my spirit.
Teach me to trust these things
so that I may enter my Sacred Space
and love beyond my fear,
and thus Walk in Balance
with the passing of each glorious Day
And
Passing Season`;

  // This is John's illustrated principle set, preserved in the order supplied for GrizzlyJohn.
  // The card captions are part of the artwork concept and are also rendered as readable text.
  const PRINCIPLES = Object.freeze([
    {
      step: 1,
      name: 'Honesty',
      caption: 'See it. Say it. Start here.',
      reflection: 'Recovery starts with being willing to see what is actually true. Honesty is not punishment. It is the point where you finally stop spending energy protecting the story and can use that energy to move forward.',
      john: 'If you have to explain the loophole three times, you probably already know the answer.'
    },
    {
      step: 2,
      name: 'Faith',
      caption: 'I don’t have to see the whole path.',
      reflection: 'Faith does not require certainty or a perfect map. Sometimes it is simply trusting that the next useful step can exist before you can see where the whole trail ends.',
      john: 'Take the next damn step. The trail does not owe you a satellite view.'
    },
    {
      step: 3,
      name: 'Trust',
      caption: 'Open hands. Let go.',
      reflection: 'Trust asks you to loosen your grip on the things you cannot control without giving up on the things that are yours to do. You can participate fully without trying to supervise every outcome.',
      john: 'Open your hands. Not everything improves because John supervises it harder.'
    },
    {
      step: 4,
      name: 'Soul Searching',
      caption: 'Look within. Be willing to see.',
      reflection: 'Looking inward takes courage because the point is not to build a case against yourself. It is to notice the patterns, fears, strengths, hurts, and choices that become easier to work with once they are visible.',
      john: 'Inventory, not prosecution. Find the crap, label it, and stop pretending the closet is fine.'
    },
    {
      step: 5,
      name: 'Integrity',
      caption: 'Do the right thing anyway.',
      reflection: 'Integrity is what happens when what you know, what you say, and what you do begin lining up. It is less about looking good and more about becoming someone you can reliably live with.',
      john: 'Do the right thing even when nobody is handing out Gold Stars. Annoying, but apparently that is the deal.'
    },
    {
      step: 6,
      name: 'Acceptance',
      caption: 'Let reality be what it is.',
      reflection: 'Acceptance does not mean approval. It means letting reality be real enough that you can respond to what is actually happening instead of spending all your strength arguing with the fact that it happened.',
      john: 'Reality already RSVP’d. You can argue with it or deal with what actually showed up.'
    },
    {
      step: 7,
      name: 'Humility',
      caption: 'I am part of something bigger.',
      reflection: 'Humility is not shrinking yourself. It is remembering that you matter without having to be the center of everything, and that being teachable, connected, and willing to need other people is a kind of strength.',
      john: 'Important? Yes. Center of the fucking universe? Tragically, no.'
    },
    {
      step: 8,
      name: 'Willingness',
      caption: 'Show up. Stay open. Try.',
      reflection: 'Willingness is often quieter than confidence. You do not have to feel ready or enthusiastic. You only have to stay open enough to try the next thing recovery is asking of you.',
      john: 'You do not have to love the idea. Just stop welding the door shut.'
    },
    {
      step: 9,
      name: 'Forgiveness',
      caption: 'Release the weight. Keep going.',
      reflection: 'Forgiveness can mean releasing your obligation to keep carrying an old injury every day. It does not erase what happened, excuse harm, or require renewed access to you. It makes room for your own life to keep moving.',
      john: 'Put down the suitcase. You do not have to invite the person back into the house.'
    },
    {
      step: 10,
      name: 'Maintenance',
      caption: 'Small actions keep me steady.',
      reflection: 'Recovery is maintained in ordinary moments. Notice what is happening, own your part, make the repair when one is needed, and keep returning to the practices that help you stay steady.',
      john: 'Tiny boring shit works. Keep doing the tiny boring shit.'
    },
    {
      step: 11,
      name: 'Making Contact',
      caption: 'Be still. Listen. Stay connected.',
      reflection: 'Making contact means creating enough quiet to hear something beyond the loudest thought in your head. Prayer, meditation, nature, community, and stillness can all become places where direction has room to arrive.',
      john: 'Shut up for a minute. There may be useful information arriving.'
    },
    {
      step: 12,
      name: 'Service',
      caption: 'Lift someone up. Pass it on.',
      reflection: 'What recovery has given you becomes even more powerful when some of it can be passed along. Service does not require saving anyone. Sometimes it is simply being the person who reaches back with a steady hand.',
      john: 'Somebody helped your ass up the hill. Turn around and offer a hand.'
    }
  ]);

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function artPosition(index) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = col === 0 ? 0 : col === 1 ? 33.333 : col === 2 ? 66.667 : 100;
    const y = row === 0 ? 0 : row === 1 ? 50 : 100;
    return { x, y };
  }

  function buildDialog() {
    if (document.getElementById('wisdomShelfViewer')) return document.getElementById('wisdomShelfViewer');
    const dialog = document.createElement('dialog');
    dialog.id = 'wisdomShelfViewer';
    dialog.className = 'wisdom-shelf-viewer';
    dialog.innerHTML = `
      <div class="wisdom-shelf-viewer-shell">
        <header class="wisdom-shelf-viewer-topbar">
          <div><p class="eyebrow">JOHN’S WISDOM SHELF</p><strong id="wisdomShelfViewerTitle">Worth keeping close</strong></div>
          <button type="button" class="wisdom-shelf-close" data-wisdom-shelf-close aria-label="Close Wisdom Shelf">×</button>
        </header>
        <div class="wisdom-shelf-viewer-body" id="wisdomShelfViewerBody"></div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-wisdom-shelf-close]')) dialog.close();
    });
    dialog.addEventListener('keydown', event => {
      if (dialog.dataset.viewerMode !== 'principles') return;
      if (event.key === 'ArrowLeft') dialog.querySelector('[data-principle-prev]')?.click();
      if (event.key === 'ArrowRight') dialog.querySelector('[data-principle-next]')?.click();
    });
    return dialog;
  }

  function renderLakota(dialog) {
    dialog.dataset.viewerMode = 'lakota';
    const title = dialog.querySelector('#wisdomShelfViewerTitle');
    const body = dialog.querySelector('#wisdomShelfViewerBody');
    title.textContent = 'Lakota Prayer';
    body.innerHTML = `
      <section class="wisdom-prayer-reader">
        <div class="wisdom-prayer-art-stage">
          <img src="${LAKOTA_ART}" alt="Lakota Prayer artwork with the complete prayer text">
        </div>
        <details class="wisdom-readable-copy">
          <summary>Read as text</summary>
          <div class="wisdom-prayer-text">${escapeHtml(LAKOTA_PRAYER).replaceAll('\n', '<br>')}</div>
        </details>
      </section>`;
  }

  function renderPrinciples(dialog) {
    dialog.dataset.viewerMode = 'principles';
    const title = dialog.querySelector('#wisdomShelfViewerTitle');
    const body = dialog.querySelector('#wisdomShelfViewerBody');
    title.textContent = 'Principles of the 12-Step Program';
    body.innerHTML = `
      <section class="principles-reader">
        <div class="principles-reader-intro">
          <p class="eyebrow">TWELVE PRINCIPLES · ONE CARD AT A TIME</p>
          <h2>Swipe the trail.</h2>
          <p>The artwork gets the big seat. Reflection underneath. John gets the last word.</p>
        </div>
        <div class="principle-deck" data-principle-deck>
          <article class="principle-slide" data-principle-slide tabindex="0" aria-live="polite"></article>
          <nav class="principle-swipe-nav" aria-label="Move through the twelve principles">
            <button class="principle-arrow" type="button" data-principle-prev aria-label="Previous principle">‹</button>
            <div class="principle-progress">
              <strong data-principle-count>1 of 12</strong>
              <div class="principle-dots" data-principle-dots></div>
            </div>
            <button class="principle-arrow" type="button" data-principle-next aria-label="Next principle">›</button>
          </nav>
          <p class="principle-swipe-hint">Swipe left or right, use the arrows, or tap a dot.</p>
        </div>
        <footer class="principles-source">
          <p>John’s saved illustrated principle set is shown here as supplied. Reference: Little Creek Recovery PA.</p>
          <a href="${LITTLE_CREEK_SOURCE}" target="_blank" rel="noopener noreferrer">Open the reference source ↗</a>
        </footer>
      </section>`;

    const slide = body.querySelector('[data-principle-slide]');
    const count = body.querySelector('[data-principle-count]');
    const dots = body.querySelector('[data-principle-dots]');
    const prev = body.querySelector('[data-principle-prev]');
    const next = body.querySelector('[data-principle-next]');
    let index = 0;
    let touchStartX = null;
    let touchStartY = null;

    dots.innerHTML = PRINCIPLES.map((item, dotIndex) => `<button type="button" class="principle-dot" data-principle-dot="${dotIndex}" aria-label="Open ${escapeHtml(item.name)}"></button>`).join('');

    function paint() {
      const item = PRINCIPLES[index];
      const position = artPosition(index);
      slide.innerHTML = `
        <div class="principle-art-panel">
          <div class="principle-art-fallback" aria-hidden="true"><span>${item.step}</span><strong>${escapeHtml(item.name)}</strong></div>
          <div class="principle-art-sprite" style="--art-x:${position.x}%; --art-y:${position.y}%; background-image:url('${PRINCIPLE_SPRITE}')" role="img" aria-label="${escapeHtml(item.name)} illustration. ${escapeHtml(item.caption)}"></div>
        </div>
        <div class="principle-copy">
          <p class="eyebrow">STEP ${item.step} · ${escapeHtml(item.name).toUpperCase()}</p>
          <p class="principle-card-caption">${escapeHtml(item.caption)}</p>
          <div class="principle-reflection">
            <strong>💛 The mushy reflection</strong>
            <p>${escapeHtml(item.reflection)}</p>
          </div>
          <div class="principle-john">
            <strong>🐻 John’s interpretation</strong>
            <p>${escapeHtml(item.john)}</p>
          </div>
        </div>`;
      count.textContent = `${index + 1} of ${PRINCIPLES.length}`;
      dots.querySelectorAll('[data-principle-dot]').forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
      prev.disabled = index === 0;
      next.disabled = index === PRINCIPLES.length - 1;
      slide.scrollTop = 0;
    }

    function go(delta) {
      const nextIndex = Math.min(PRINCIPLES.length - 1, Math.max(0, index + delta));
      if (nextIndex === index) return;
      index = nextIndex;
      paint();
    }

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    dots.addEventListener('click', event => {
      const dot = event.target.closest('[data-principle-dot]');
      if (!dot) return;
      index = Number(dot.dataset.principleDot);
      paint();
    });
    slide.addEventListener('touchstart', event => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });
    slide.addEventListener('touchend', event => {
      if (touchStartX === null || touchStartY === null) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;
      if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
      go(dx < 0 ? 1 : -1);
    }, { passive: true });
    paint();
  }

  function renderThreePs(dialog) {
    dialog.dataset.viewerMode = 'threePs';
    const title = dialog.querySelector('#wisdomShelfViewerTitle');
    const body = dialog.querySelector('#wisdomShelfViewerBody');
    title.textContent = 'The 3 Ps';
    body.innerHTML = `
      <section class="three-ps-reader">
        <img src="assets/wisdom/the-3-ps.png" alt="The 3 Ps artwork" onerror="this.hidden=true;this.nextElementSibling.hidden=false" hidden>
        <div class="three-ps-native">
          <p class="eyebrow">POCKET WISDOM</p>
          <h2>Nothing is Perfect,<br>Personal,<br>or Permanent.</h2>
          <p>Three Ps. Considerably fewer reasons to let one bad moment run the whole damn day.</p>
        </div>
      </section>`;
  }

  function openItem(item) {
    const dialog = buildDialog();
    if (item === 'lakota') renderLakota(dialog);
    if (item === 'principles') renderPrinciples(dialog);
    if (item === 'threePs') renderThreePs(dialog);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.wisdom-shelf-viewer-body')?.scrollTo({ top: 0 });
  }

  function buildShelf() {
    if (document.getElementById('johnWisdomShelf')) return true;
    const wisdom = document.getElementById('wisdom');
    if (!wisdom) return false;
    const anchor = document.getElementById('dbtToolbox') || document.getElementById('wisdomGrid');
    if (!anchor) return false;

    const shelf = document.createElement('section');
    shelf.id = 'johnWisdomShelf';
    shelf.className = 'john-wisdom-shelf';
    shelf.setAttribute('aria-labelledby', 'johnWisdomShelfHeading');
    shelf.innerHTML = `
      <div class="wisdom-shelf-heading">
        <div>
          <p class="eyebrow">JOHN’S WISDOM SHELF</p>
          <h2 id="johnWisdomShelfHeading">The stuff worth keeping close.</h2>
          <p>Prayers, principles, and recovery wisdom John actually wants to find again.</p>
        </div>
        <span aria-hidden="true">📚</span>
      </div>
      <div class="wisdom-shelf-grid">
        <button type="button" class="wisdom-shelf-card" data-wisdom-shelf-item="lakota">
          <span class="wisdom-shelf-icon">🌄</span>
          <span><small>PRAYER</small><strong>Lakota Prayer</strong><em>Open the artwork full screen →</em></span>
        </button>
        <button type="button" class="wisdom-shelf-card" data-wisdom-shelf-item="principles">
          <span class="wisdom-shelf-icon">🧭</span>
          <span><small>RECOVERY</small><strong>Principles of the 12-Step Program</strong><em>Swipe through 12 cards →</em></span>
        </button>
        <button type="button" class="wisdom-shelf-card" data-wisdom-shelf-item="threePs">
          <span class="wisdom-shelf-icon">🪧</span>
          <span><small>POCKET WISDOM</small><strong>The 3 Ps</strong><em>Perfect · Personal · Permanent →</em></span>
        </button>
      </div>`;
    anchor.insertAdjacentElement('beforebegin', shelf);
    shelf.addEventListener('click', event => {
      const button = event.target.closest('[data-wisdom-shelf-item]');
      if (button) openItem(button.dataset.wisdomShelfItem);
    });
    buildDialog();
    return true;
  }

  function buildCampfireShortcut() {
    if (document.getElementById('principlesCampfireShortcut')) return true;
    const campfire = document.getElementById('listen');
    if (!campfire) return false;
    const intro = campfire.querySelector('.screen-intro');
    if (!intro) return false;
    const card = document.createElement('article');
    card.id = 'principlesCampfireShortcut';
    card.className = 'card wisdom-campfire-shortcut';
    card.innerHTML = `
      <span class="wisdom-campfire-icon" aria-hidden="true">🧭</span>
      <div><p class="eyebrow">FROM JOHN’S WISDOM SHELF</p><h3>12-Step Principles</h3><p>Twelve illustrated reminders. One card at a time.</p></div>
      <button type="button" class="button button-secondary" data-open-principles>Swipe the cards</button>`;
    intro.insertAdjacentElement('afterend', card);
    card.querySelector('[data-open-principles]').addEventListener('click', () => openItem('principles'));
    return true;
  }

  function init() {
    const ready = () => buildShelf() && buildCampfireShortcut();
    if (ready()) return;
    const observer = new MutationObserver(() => {
      if (ready()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  const api = Object.freeze({ LAKOTA_PRAYER, PRINCIPLES, LITTLE_CREEK_SOURCE, LAKOTA_ART, PRINCIPLE_SPRITE, artPosition });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.GrizzlyJohnWisdomShelfV3 = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
