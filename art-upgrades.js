(() => {
  const ART = {
    breathing: 'graphics/GrizzlyJohn%20Breathing%20Bear.png',
    breathComplete: [
      'graphics/GrizzlyJohn%20Breath%20Complete%2001.png',
      'graphics/GrizzlyJohn%20Breath%20Complete%2002.png',
      'graphics/GrizzlyJohn%20Breath%20Complete%2003.png'
    ],
    backpack: 'graphics/GrizzlyJohn%20Backpack.png',
    backpackIdea: 'graphics/GrizzlyJohn%20Backpack%20Idea%20Patch.png',
    campfireRadio: 'graphics/GrizzlyJohn%20Campfire%20Radio.png',
    map: 'graphics/GrizzlyJohn%20Map%20Grizz.png',
    binoculars: 'graphics/GrizzlyJohn%20Binoculars%20Grizz.png'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  let completionIndex = Math.floor(Math.random() * ART.breathComplete.length);

  function ensureStyles() {
    if ($('link[data-art-upgrades]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'art-upgrades.css?v=20260819-1';
    link.dataset.artUpgrades = 'true';
    document.head.appendChild(link);
  }

  function makeImage(src, className, alt = '') {
    const image = document.createElement('img');
    image.src = src;
    image.className = className;
    image.alt = alt;
    image.decoding = 'async';
    return image;
  }

  function upgradeBreathing() {
    const center = $('#breathingCenter');
    if (!center) return false;
    if (center.dataset.grizzlyArtReady === 'true') return true;

    const syncArt = () => {
      if (center.querySelector('img')) return;
      const token = center.textContent.trim();
      if (token === '🌿') {
        completionIndex = (completionIndex + 1) % ART.breathComplete.length;
        center.classList.add('is-complete-scene');
        center.replaceChildren(makeImage(
          ART.breathComplete[completionIndex],
          'breathing-complete-art',
          'Grizz relaxing after three breaths'
        ));
      } else {
        center.classList.remove('is-complete-scene');
        center.replaceChildren(makeImage(
          ART.breathing,
          'breathing-bear-art',
          ''
        ));
      }
    };

    syncArt();
    const observer = new MutationObserver(syncArt);
    observer.observe(center, { childList: true, subtree: true, characterData: true });
    center.dataset.grizzlyArtReady = 'true';
    return true;
  }

  function upgradeBackpackHero() {
    const art = $('#roamBackpack .backpack-art');
    if (!art) return false;
    if (art.dataset.grizzlyArtReady === 'true') return true;
    art.textContent = '';
    art.appendChild(makeImage(ART.backpack, 'roaming-backpack-art', ''));
    art.dataset.grizzlyArtReady = 'true';
    return true;
  }

  function upgradeBackpackSuggestion() {
    const card = $('#backpackSuggestionCard');
    if (!card) return false;
    if (card.dataset.grizzlyArtReady === 'true') return true;
    const patch = makeImage(
      ART.backpackIdea,
      'backpack-idea-patch',
      'Backpack ideas patch'
    );
    const eyebrow = $('.eyebrow', card);
    if (eyebrow) eyebrow.insertAdjacentElement('beforebegin', patch);
    card.dataset.grizzlyArtReady = 'true';
    return true;
  }

  function addListenArt() {
    const listen = $('#listen');
    const intro = $('#listen .screen-intro');
    if (!listen || !intro) return false;
    if ($('#campfireRadioVisual')) return true;

    const visual = document.createElement('div');
    visual.className = 'section-art campfire-radio-visual';
    visual.id = 'campfireRadioVisual';
    visual.appendChild(makeImage(
      ART.campfireRadio,
      'campfire-radio-art',
      'Grizz listening by the campfire'
    ));
    intro.insertAdjacentElement('afterend', visual);
    return true;
  }

  function addRoamArt() {
    const roam = $('#roam');
    const intro = $('#roam .screen-intro');
    if (!roam || !intro) return false;
    if ($('#roamExplorerVisuals')) return true;

    const row = document.createElement('div');
    row.className = 'roam-explorer-visuals';
    row.id = 'roamExplorerVisuals';
    row.innerHTML = `
      <figure class="roam-explorer-visual">
        <img src="${ART.map}" alt="Grizz planning a trip with a map" loading="lazy" decoding="async">
        <figcaption>Plot the next wander.</figcaption>
      </figure>
      <figure class="roam-explorer-visual">
        <img src="${ART.binoculars}" alt="Grizz exploring with binoculars" loading="lazy" decoding="async">
        <figcaption>See what is still out there.</figcaption>
      </figure>`;
    intro.insertAdjacentElement('afterend', row);
    return true;
  }

  function upgradeAll() {
    return [
      upgradeBreathing(),
      upgradeBackpackHero(),
      upgradeBackpackSuggestion(),
      addListenArt(),
      addRoamArt()
    ].every(Boolean);
  }

  let observer;
  function start() {
    ensureStyles();
    upgradeAll();
    observer = new MutationObserver(() => {
      if (upgradeAll()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer?.disconnect(), 20000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
