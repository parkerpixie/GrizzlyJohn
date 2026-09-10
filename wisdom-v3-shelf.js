(() => {
  'use strict';

  const LITTLE_CREEK_SOURCE = 'https://littlecreekrecovery.org/principles-of-the-12-steps/';

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
      reflection: 'Recovery gets lighter when you stop spending energy defending a version of reality you already know is not true. Honesty is the door that lets the rest of the work in.',
      john: 'Quit bullshitting yourself. You are the one guy in the room who already knows the whole story.'
    },
    {
      step: 2,
      name: 'Faith',
      reflection: 'Faith does not require certainty. It asks for enough openness to believe that your worst day does not get to be the final authority on what comes next.',
      john: 'You do not need the whole map. Just stop insisting you are the only qualified driver in the universe.'
    },
    {
      step: 3,
      name: 'Turning it over',
      reflection: 'Some peace arrives when you stop demanding control over every person, outcome, and tomorrow. You can still show up fully without white-knuckling the steering wheel.',
      john: 'Do your part. Then put down the damn clipboard. You are not management for the entire cosmos.'
    },
    {
      step: 4,
      name: 'Soul Searching',
      reflection: 'Looking inward with courage means making room for the whole story: the good, the painful, and the parts you would rather edit. Awareness gives you choices.',
      john: 'Open the junk drawer. We are not throwing you away. We are figuring out why there are seventeen mystery keys.'
    },
    {
      step: 5,
      name: 'Integrity',
      reflection: 'Integrity turns honesty into something lived. It is the quiet alignment between what you know, what you say, and what you do when nobody is grading you.',
      john: 'Same guy in every room. Considerably less paperwork.'
    },
    {
      step: 6,
      name: 'Acceptance',
      reflection: 'Acceptance makes room for reality without asking you to approve of it. Once you stop arguing with what already is, you get your hands back for what comes next.',
      john: 'You can hate the weather. It is still raining. Grab the damn jacket.'
    },
    {
      step: 7,
      name: 'Humility',
      reflection: 'Humility is not making yourself smaller. It is remembering that you are human, teachable, connected, and allowed to need help.',
      john: 'You are not the worst person alive or the messiah. Congratulations, you are a guy. Proceed accordingly.'
    },
    {
      step: 8,
      name: 'Willingness',
      reflection: 'You do not have to feel ready for every next step. Sometimes willingness is simply leaving the door unlocked for change.',
      john: 'You do not have to sprint toward enlightenment. Just stop barricading the door.'
    },
    {
      step: 9,
      name: 'Forgiveness',
      reflection: 'Forgiveness can loosen the grip of old harm without rewriting what happened. Sometimes it is less about excusing someone and more about refusing to keep carrying them.',
      john: 'You can put the suitcase down without sending the asshole a thank-you card.'
    },
    {
      step: 10,
      name: 'Maintenance',
      reflection: 'Recovery is built in ordinary moments after the dramatic ones are over. Notice, own, repair, repeat. Small course corrections keep you on the road.',
      john: 'Clean up today’s mess while it still fits in a dustpan.'
    },
    {
      step: 11,
      name: 'Making Contact',
      reflection: 'Quiet creates room to listen for something larger than impulse, fear, or noise. Prayer and meditation can be less about getting answers and more about becoming available to them.',
      john: 'Maybe stop talking for sixty seconds. Terrifying concept, I know.'
    },
    {
      step: 12,
      name: 'Service',
      reflection: 'What you survived becomes more meaningful when some of what you learned can help another person feel less alone. Service turns recovery outward.',
      john: 'Hold the door for the next guy. Somebody held it for you.'
    }
  ]);

  const ART_CANDIDATES = Object.freeze({
    lakota: [
      'assets/Lakota Prayer.png',
      'graphics/Lakota Prayer.png',
      'Lakota Prayer.png'
    ],
    threePs: [
      'assets/The 3 Ps.png',
      'assets/3 Ps.png',
      'graphics/The 3 Ps.png',
      'graphics/3 Ps.png'
    ]
  });

  function principleArtCandidates(item) {
    const number = String(item.step).padStart(2, '0');
    const safeName = item.name;
    return [
      `assets/12-step-principles/${number} - ${safeName}.png`,
      `assets/12-step-principles/${number}-${safeName}.png`,
      `assets/${number} - ${safeName}.png`,
      `assets/${safeName}.png`,
      `graphics/12-step-principles/${number} - ${safeName}.png`,
      `graphics/${number} - ${safeName}.png`,
      `graphics/${safeName}.png`
    ];
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
    return dialog;
  }

  function renderLakota(dialog) {
    const title = dialog.querySelector('#wisdomShelfViewerTitle');
    const body = dialog.querySelector('#wisdomShelfViewerBody');
    title.textContent = 'Lakota Prayer';
    body.innerHTML = `
      <section class="wisdom-prayer-reader">
        <div class="wisdom-prayer-art-stage">
          <img id="lakotaPrayerArt" alt="Lakota Prayer artwork" hidden>
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
    attachCandidateImage(body.querySelector('#lakotaPrayerArt'), ART_CANDIDATES.lakota, body.querySelector('#lakotaPrayerFallback'));
  }

  function renderPrinciples(dialog) {
    const title = dialog.querySelector('#wisdomShelfViewerTitle');
    const body = dialog.querySelector('#wisdomShelfViewerBody');
    title.textContent = 'Principles of the 12-Step Program';
    body.innerHTML = `
      <section class="principles-reader">
        <div class="principles-reader-intro">
          <p class="eyebrow">TWELVE PRINCIPLES · ONE AT A TIME</p>
          <h2>The useful part, with a little John translation.</h2>
          <p>Each principle gets the reflective version and the version Grizz suspects John would actually remember.</p>
        </div>
        <div class="principles-grid">
          ${PRINCIPLES.map(item => `
            <article class="principle-card" data-principle-step="${item.step}">
              <div class="principle-art">
                <img alt="Step ${item.step}: ${escapeHtml(item.name)}" hidden>
                <div class="principle-art-fallback">
                  <span>${item.step}</span>
                  <strong>${escapeHtml(item.name)}</strong>
                </div>
              </div>
              <div class="principle-copy">
                <p class="eyebrow">STEP ${item.step}</p>
                <h3>${escapeHtml(item.name)}</h3>
                <div class="principle-reflection">
                  <strong>💛 The mushy reflection</strong>
                  <p>${escapeHtml(item.reflection)}</p>
                </div>
                <div class="principle-john">
                  <strong>🐻 John’s interpretation</strong>
                  <p>${escapeHtml(item.john)}</p>
                </div>
              </div>
            </article>`).join('')}
        </div>
        <footer class="principles-source">
          <p>Principle names and step pairing are attributed to Little Creek Recovery PA. Reflections and John interpretations are original GrizzlyJohn copy.</p>
          <a href="${LITTLE_CREEK_SOURCE}" target="_blank" rel="noopener noreferrer">View the Little Creek source ↗</a>
        </footer>
      </section>`;

    body.querySelectorAll('[data-principle-step]').forEach(card => {
      const item = PRINCIPLES.find(principle => principle.step === Number(card.dataset.principleStep));
      attachCandidateImage(card.querySelector('img'), principleArtCandidates(item), card.querySelector('.principle-art-fallback'));
    });
  }

  function renderThreePs(dialog) {
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
    attachCandidateImage(body.querySelector('#threePsArt'), ART_CANDIDATES.threePs, body.querySelector('#threePsFallback'));
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
          <span><small>PRAYER</small><strong>Lakota Prayer</strong><em>Open full screen →</em></span>
        </button>
        <button type="button" class="wisdom-shelf-card" data-wisdom-shelf-item="principles">
          <span class="wisdom-shelf-icon">🧭</span>
          <span><small>RECOVERY</small><strong>Principles of the 12-Step Program</strong><em>12 principles →</em></span>
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

  function init() {
    if (buildShelf()) return;
    const observer = new MutationObserver(() => {
      if (buildShelf()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  const api = Object.freeze({ LAKOTA_PRAYER, PRINCIPLES, LITTLE_CREEK_SOURCE, principleArtCandidates });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.GrizzlyJohnWisdomShelfV3 = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
