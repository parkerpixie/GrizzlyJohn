(() => {
  'use strict';

  const LITTLE_CREEK_SOURCE = 'https://littlecreekrecovery.org/principles-of-the-12-steps/';
  const SECULAR_REFERENCE = 'Twelve Secular Steps: An Addiction Recovery Guide';

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

  const PRINCIPLES = Object.freeze([
    {
      step: 1,
      name: 'Honesty',
      file: 'Honesty.png',
      caption: 'See it. Say it. Start here.',
      reflection: 'Recovery starts by naming what is actually happening, including the parts of addiction that have become unmanageable. That is not a moral verdict. It is usable information, and honesty gives you something real to work with.',
      john: 'If the facts suck, they still beat negotiating with fiction.'
    },
    {
      step: 2,
      name: 'Faith',
      file: 'Faith.png',
      caption: 'Recovery is possible. I don’t have to do it alone.',
      reflection: 'Here, faith means confidence that recovery is possible through honesty, effort, practice, and help from other people. It does not require a supernatural explanation. It is enough to believe that change can happen and that you can participate in it.',
      john: 'You do not need the whole answer. You need enough evidence to keep going and people who will answer the damn phone.'
    },
    {
      step: 3,
      name: 'Trust',
      file: 'Trust.png',
      caption: 'Choose the work. Keep choosing it.',
      reflection: 'Trust is the decision to actively work a recovery plan to the best of your ability. Not surrendering your judgment, not waiting for a sign, and not pretending the plan works by magic. You choose the work, try it, learn, and keep choosing what helps you recover.',
      john: 'Make the plan. Work the plan. Re-decide tomorrow. That is plenty.'
    },
    {
      step: 4,
      name: 'Soul Searching',
      file: 'Soul-Searching.png',
      caption: 'Look within. Be willing to see.',
      reflection: 'Take a searching, honest inventory of yourself. The point is not to build a prosecution case. It is to notice the patterns, fears, strengths, harms, habits, and choices that become easier to change once they are visible.',
      john: 'Inventory, not prosecution. Find the crap, label it, and stop pretending the closet is fine.'
    },
    {
      step: 5,
      name: 'Integrity',
      file: 'Integrity.png',
      caption: 'Say what I found. Own what is mine.',
      reflection: 'Integrity means being honest with yourself and another person about what your inventory uncovered, including the parts of your own behavior that need attention. Shame likes secrecy. Recovery gets stronger when the truth can survive being spoken out loud.',
      john: 'Say the thing without adding a closing argument about why it technically does not count.'
    },
    {
      step: 6,
      name: 'Acceptance',
      file: 'Acceptance.png',
      caption: 'Be willing to change what no longer works.',
      reflection: 'Acceptance is not deciding that every part of you is fine forever. It is seeing the habits and character patterns that cause trouble clearly enough to become willing to change them. You cannot work on the pattern you are still busy defending.',
      john: 'You can accept that the pattern exists without giving it a permanent parking spot.'
    },
    {
      step: 7,
      name: 'Humility',
      file: 'Humility.png',
      caption: 'Own my actions. Drop the excuses.',
      reflection: 'Humility is accepting responsibility for your actions without turning responsibility into self-hatred. You can own your part, repair what you can, and still remember that being wrong about something does not make you worthless.',
      john: 'Own your shit. You do not have to become the shit.'
    },
    {
      step: 8,
      name: 'Willingness',
      file: 'Willingness.png',
      caption: 'Name the harm. Get ready to repair it.',
      reflection: 'Willingness means looking directly at the people you have harmed and becoming open to making amends. You do not have to perform the repair before you are ready. First comes the willingness to stop avoiding the list.',
      john: 'You do not have to fix the whole damn thing today. You do have to stop pretending the list is blank.'
    },
    {
      step: 9,
      name: 'Forgiveness',
      file: 'Forgiveness.png',
      caption: 'Make the repair when it is safe.',
      reflection: 'This is about direct amends where possible, except when doing so would create more harm. Forgiveness is not something you get to demand from another person. Your job is the repair you can responsibly make, then allowing the other person to decide what happens next.',
      john: 'Clean up your side of the street. Do not drive the apology truck through somebody else’s living room.'
    },
    {
      step: 10,
      name: 'Maintenance',
      file: 'Maintenance.png',
      caption: 'Small actions keep me steady.',
      reflection: 'Recovery is maintained by continuing to notice your behavior, admit when you are wrong, and make corrections before a small problem grows legs and moves into the guest room. This is maintenance, not perfection.',
      john: 'Tiny boring shit works. Keep doing the tiny boring shit.'
    },
    {
      step: 11,
      name: 'Making Contact',
      file: 'Making-Contact.png',
      caption: 'Check my values. Act like I mean them.',
      reflection: 'Making contact does not have to mean contacting a deity. It can mean deliberately checking your ethical principles, values, and standards, then using them consistently when you make decisions. The goal is conscious alignment between what matters to you and what you actually do.',
      john: 'Before you do the thing, ask whether it lines up with who you keep saying you want to be.'
    },
    {
      step: 12,
      name: 'Service',
      file: 'Service.png',
      caption: 'Lift someone up. Pass it on.',
      reflection: 'Recovery becomes part of daily life when you keep using these principles and help other people where you can. Service does not mean rescuing everyone. It means letting what you learned make you more useful, connected, and willing to reach back.',
      john: 'Somebody helped your ass up the hill. Turn around and offer a hand.'
    }
  ]);

  const LAKOTA_ART_CANDIDATES = Object.freeze([
    'graphics/Lakota Prayer.png'
  ]);

  const THREE_PS_ART_CANDIDATES = Object.freeze([
    'graphics/The 3 Ps.png',
    'graphics/3 Ps.png',
    'assets/The 3 Ps.png',
    'assets/3 Ps.png'
  ]);

  function principleArtCandidates(item) {
    return [`graphics/${item.file}`];
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function attachCandidateImage(img, candidates, fallback) {
    if (!img || !Array.isArray(candidates) || !candidates.length) return;
    let index = 0;
    const tryNext = () => {
      if (index >= candidates.length) {
        img.hidden = true;
        if (fallback) fallback.hidden = false;
        return;
      }
      img.src = candidates[index++];
    };
    img.addEventListener('load', () => {
      img.hidden = false;
      if (fallback) fallback.hidden = true;
    });
    img.addEventListener('error', tryNext);
    tryNext();
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
          <img id="lakotaPrayerArt" alt="Lakota Prayer artwork with the complete prayer text" hidden>
          <div class="wisdom-prayer-native" id="lakotaPrayerFallback">
            <p class="eyebrow">LAKOTA PRAYER</p>
            <div class="wisdom-prayer-text">${escapeHtml(LAKOTA_PRAYER).replaceAll('\n', '<br>')}</div>
          </div>
        </div>
        <details class="wisdom-readable-copy">
          <summary>Read as text</summary>
          <div class="wisdom-prayer-text">${escapeHtml(LAKOTA_PRAYER).replaceAll('\n', '<br>')}</div>
        </details>
      </section>`;
    attachCandidateImage(body.querySelector('#lakotaPrayerArt'), LAKOTA_ART_CANDIDATES, body.querySelector('#lakotaPrayerFallback'));
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
          <p>John’s illustrated principles, framed through a secular recovery lens.</p>
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
          <p>Secular framing follows John’s preferred approach from <em>${SECULAR_REFERENCE}</em>. Little Creek Recovery PA remains a supplemental principles reference.</p>
          <a href="${LITTLE_CREEK_SOURCE}" target="_blank" rel="noopener noreferrer">Open the supplemental reference ↗</a>
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
      slide.innerHTML = `
        <div class="principle-art-panel">
          <div class="principle-art-fallback"><span>${item.step}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.caption)}</small></div>
          <img class="principle-art-image" data-principle-art alt="${escapeHtml(item.name)} principle artwork" hidden>
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
      attachCandidateImage(slide.querySelector('[data-principle-art]'), principleArtCandidates(item), slide.querySelector('.principle-art-fallback'));
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
        <img id="threePsArt" alt="The 3 Ps artwork" hidden>
        <div class="three-ps-native" id="threePsFallback">
          <p class="eyebrow">POCKET WISDOM</p>
          <h2>Nothing is Perfect,<br>Personal,<br>or Permanent.</h2>
          <p>Three Ps. Considerably fewer reasons to let one bad moment run the whole damn day.</p>
        </div>
      </section>`;
    attachCandidateImage(body.querySelector('#threePsArt'), THREE_PS_ART_CANDIDATES, body.querySelector('#threePsFallback'));
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
          <span><small>SECULAR RECOVERY</small><strong>Principles of the 12-Step Program</strong><em>Swipe through 12 cards →</em></span>
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
      <div><p class="eyebrow">FROM JOHN’S WISDOM SHELF</p><h3>12-Step Principles</h3><p>Twelve illustrated, secular recovery reminders. One card at a time.</p></div>
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

  const api = Object.freeze({ LAKOTA_PRAYER, PRINCIPLES, LITTLE_CREEK_SOURCE, SECULAR_REFERENCE, LAKOTA_ART_CANDIDATES, THREE_PS_ART_CANDIDATES, principleArtCandidates });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.GrizzlyJohnWisdomShelfV3 = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
