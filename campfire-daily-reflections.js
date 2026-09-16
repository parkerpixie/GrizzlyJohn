(() => {
  'use strict';

  const CAC_URL = 'https://cac.org/daily-meditations/';

  function openLakotaPrayer() {
    const shelfButton = document.querySelector('[data-wisdom-shelf-item="lakota"]');
    if (shelfButton) {
      shelfButton.click();
      return;
    }
    window.open('graphics/Lakota%20Prayer.png', '_blank', 'noopener,noreferrer');
  }

  function buildReflectionShelf() {
    if (document.getElementById('campfireDailyReflections')) return true;

    const campfire = document.getElementById('listen');
    if (!campfire) return false;

    const library = document.getElementById('campfireLibrary');
    const listenShelf = library?.querySelector('.campfire-listen-links');
    const savedShelf = library?.querySelector('.saved-campfire');
    const host = library || campfire;

    const section = document.createElement('section');
    section.id = 'campfireDailyReflections';
    section.className = 'campfire-v2-block campfire-daily-reflections';
    section.setAttribute('aria-labelledby', 'campfireDailyReflectionsHeading');
    section.innerHTML = `
      <div class="campfire-section-heading">
        <div>
          <p class="eyebrow">QUIET BY THE FIRE</p>
          <h2 id="campfireDailyReflectionsHeading">Daily reflection & spiritual practice</h2>
          <p>Two places to slow down, notice what is happening inside, and come back to what matters.</p>
        </div>
      </div>
      <div class="campfire-unified-list">
        <article class="campfire-library-card campfire-library-reflection">
          <span class="campfire-library-icon" aria-hidden="true">🌄</span>
          <div class="campfire-library-copy">
            <div class="campfire-card-meta"><span>Spirituality & Meaning</span><span>Prayer</span></div>
            <h3>Lakota Prayer</h3>
            <p>A grounding reminder to trust heart, mind, intuition, body, spirit, and the practice of walking in balance.</p>
            <div class="campfire-card-actions">
              <button class="button button-primary" type="button" data-open-campfire-lakota>Open prayer</button>
            </div>
          </div>
        </article>

        <article class="campfire-library-card campfire-library-reflection">
          <span class="campfire-library-icon" aria-hidden="true">🕯️</span>
          <div class="campfire-library-copy">
            <div class="campfire-card-meta"><span>Spirituality & Meaning</span><span>Daily Meditation</span></div>
            <h3>Center for Action and Contemplation Daily Meditations</h3>
            <p>A daily contemplative reflection John can use as part of emotional sobriety and spiritual practice. Readings come from Richard Rohr, CAC faculty, and guest teachers, with an emphasis on compassion and living the practice.</p>
            <div class="campfire-card-actions">
              <a class="button button-primary" href="${CAC_URL}" target="_blank" rel="noopener noreferrer">Read today’s meditation ↗</a>
            </div>
          </div>
        </article>
      </div>`;

    if (listenShelf) listenShelf.insertAdjacentElement('afterend', section);
    else if (savedShelf) savedShelf.insertAdjacentElement('beforebegin', section);
    else {
      const intro = campfire.querySelector('.screen-intro');
      if (intro) intro.insertAdjacentElement('afterend', section);
      else host.prepend(section);
    }

    section.querySelector('[data-open-campfire-lakota]')?.addEventListener('click', openLakotaPrayer);
    return true;
  }

  function init() {
    if (buildReflectionShelf()) return;

    const observer = new MutationObserver(() => {
      if (buildReflectionShelf()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
    [100, 350, 900, 1800].forEach(delay => window.setTimeout(buildReflectionShelf, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
