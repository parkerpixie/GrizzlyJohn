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
    binoculars: 'graphics/GrizzlyJohn%20Binoculars%20Grizz.png',
    blue: [
      'graphics/GrizzlyJohn%20Blue%2001.png',
      'graphics/GrizzlyJohn%20Blue%2002.png',
      'graphics/GrizzlyJohn%20Blue%2003.png',
      'graphics/GrizzlyJohn%20Blue%2004.png',
      'graphics/GrizzlyJohn%20Blue%2005.png'
    ]
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let completionIndex = Math.floor(Math.random() * ART.breathComplete.length);
  let selectedQuestCategory = 'ALL';

  function ensureStyles() {
    if ($('link[data-art-upgrades]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'art-upgrades.css?v=20260819-2';
    link.dataset.artUpgrades = 'true';
    document.head.appendChild(link);
  }

  function loadFollowupScripts() {
    [
      ['feeling-drag.js?v=20260819-1', 'feeling-drag'],
      ['listen-upgrades.js?v=20260819-1', 'listen-upgrades']
    ].forEach(([src, key]) => {
      if (document.querySelector(`script[data-${key}]`)) return;
      const script = document.createElement('script');
      script.src = src;
      script.setAttribute(`data-${key}`, 'true');
      document.body.appendChild(script);
    });
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
    visual.className = 'section-art campfire-radio-visual blue-listen-hero';
    visual.id = 'campfireRadioVisual';
    visual.appendChild(makeImage(
      ART.blue[4],
      'campfire-radio-art',
      'Grizz and Blue relaxing together'
    ));
    const note = document.createElement('p');
    note.className = 'blue-hero-caption';
    note.textContent = 'Blue has no notes on the podcast. He does approve the couch.';
    visual.appendChild(note);
    intro.insertAdjacentElement('afterend', visual);
    return true;
  }

  function addRoamArt() {
    $('#roamExplorerVisuals')?.remove();
    return Boolean($('#roam'));
  }

  function companionCard({ id, image, eyebrow, title, copy, target, position = 'afterend' }) {
    if ($(`#${id}`)) return true;
    const anchor = $(target);
    if (!anchor) return false;
    const card = document.createElement('article');
    card.className = 'blue-companion-card';
    card.id = id;
    card.innerHTML = `
      <img src="${image}" alt="Grizz and Blue together" loading="lazy" decoding="async">
      <div class="blue-companion-copy">
        <p class="eyebrow">${eyebrow}</p>
        <h3>${title}</h3>
        <p>${copy}</p>
      </div>`;
    anchor.insertAdjacentElement(position, card);
    return true;
  }

  function addBlueCompanions() {
    const placements = [
      companionCard({
        id: 'blueQuestCompanion',
        image: ART.blue[2],
        eyebrow: 'NEW QUEST CATEGORY',
        title: 'Blue Time is officially on the board.',
        copy: 'Some quests now include the golden coworker. His performance reviews remain suspiciously perfect.',
        target: '#quest .screen-intro'
      }),
      companionCard({
        id: 'blueRoamCompanion',
        image: ART.blue[3],
        eyebrow: 'JOHN’S ROAMING LIST',
        title: 'Some routes are automatically better with Blue.',
        copy: 'Save the campgrounds, trails, roads, towns, stops, and places worth remembering.',
        target: '#johnRoamingList',
        position: 'afterbegin'
      })
    ];
    return placements.every(Boolean);
  }

  function setQuestCard(quest) {
    if (!quest) return;
    if (window.GrizzlyJohnQuest?.setCurrentQuest) {
      window.GrizzlyJohnQuest.setCurrentQuest(quest);
      return;
    }
    const title = $('#questTitle');
    const description = $('#questDescription');
    const emoji = $('#questEmoji');
    const category = $('#questCategory');
    if (title) title.textContent = quest.title;
    if (description) description.textContent = quest.description;
    if (emoji) emoji.textContent = quest.emoji;
    if (category) category.textContent = quest.category;
  }

  function drawQuestFromSelectedCategory() {
    const quests = window.GRIZZLY_DATA?.quests || [];
    const pool = selectedQuestCategory === 'ALL'
      ? quests
      : quests.filter(quest => quest.category === selectedQuestCategory);
    if (!pool.length) return;
    setQuestCard(pool[Math.floor(Math.random() * pool.length)]);
  }

  function setupQuestCategories() {
    const questScreen = $('#quest');
    const generator = $('#quest .quest-generator');
    if (!questScreen || !generator || !window.GRIZZLY_DATA?.quests?.length) return false;
    if ($('#questCategoryPicker')) return true;

    const preferredOrder = ['ALL', 'BLUE TIME', 'CIVIC SASS', 'OUTDOORS', 'RECOVERY', 'CURIOSITY', 'PEOPLE', 'WILD CARD'];
    const actual = new Set(GRIZZLY_DATA.quests.map(quest => quest.category));
    const categories = preferredOrder.filter(category => category === 'ALL' || actual.has(category));

    const picker = document.createElement('section');
    picker.className = 'quest-category-picker';
    picker.id = 'questCategoryPicker';
    picker.innerHTML = `
      <div class="quest-picker-heading">
        <div><p class="eyebrow">PICK A FLAVOR</p><h2>What kind of trouble are we looking for?</h2></div>
        <small>Tap a category, then “Different quest” stays in that lane.</small>
      </div>
      <div class="quest-category-chips">
        ${categories.map(category => `<button type="button" class="quest-category-chip ${category === 'ALL' ? 'is-active' : ''}" data-quest-category="${category}">${category === 'ALL' ? '🎲 Anything' : category === 'BLUE TIME' ? '🐕 Blue Time' : category === 'CIVIC SASS' ? '🏛️ Civic Sass' : category}</button>`).join('')}
      </div>`;
    generator.insertAdjacentElement('beforebegin', picker);

    $$('[data-quest-category]', picker).forEach(button => {
      button.addEventListener('click', () => {
        selectedQuestCategory = button.dataset.questCategory;
        $$('[data-quest-category]', picker).forEach(item => item.classList.toggle('is-active', item === button));
        drawQuestFromSelectedCategory();
        generator.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    const different = $('#newQuest');
    if (different && different.dataset.categoryGuard !== 'true') {
      different.dataset.categoryGuard = 'true';
      different.addEventListener('click', event => {
        if (selectedQuestCategory === 'ALL') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        drawQuestFromSelectedCategory();
      }, true);
    }

    return true;
  }

  function upgradeAll() {
    return [
      upgradeBreathing(),
      upgradeBackpackHero(),
      upgradeBackpackSuggestion(),
      addListenArt(),
      addRoamArt(),
      addBlueCompanions(),
      setupQuestCategories()
    ].every(Boolean);
  }

  let observer;
  function start() {
    ensureStyles();
    loadFollowupScripts();
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
