(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ROAM_SITES = [
    {
      name: 'The Dyrt',
      url: 'https://thedyrt.com/',
      icon: '🏕️',
      note: 'Campground research, reviews, maps, and trip planning.'
    },
    {
      name: 'Campendium',
      url: 'https://www.campendium.com/',
      icon: '🚐',
      note: 'Campground reviews, RV-friendly stops, and places worth investigating.'
    },
    {
      name: 'AllStays',
      url: 'https://www.allstays.com/',
      icon: '🗺️',
      note: 'Camping and road-trip research without rebuilding the internet inside this app.'
    }
  ];

  function ensureStyles() {
    if ($('#roamV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'roamV2Styles';
    style.textContent = `
      .roam-v2-hub{display:grid;gap:1rem;margin:1rem 0 1.25rem}
      .roam-v2-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem}
      .roam-v2-heading h2{margin:.15rem 0 0}
      .roam-resource-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}
      .roam-resource-card{display:flex;flex-direction:column;gap:.5rem;text-decoration:none;background:#fff;border:1px solid rgba(47,70,54,.12);border-radius:20px;padding:1rem;box-shadow:0 10px 26px rgba(47,70,54,.06);color:inherit;min-height:150px}
      .roam-resource-card:hover,.roam-resource-card:focus-visible{transform:translateY(-1px);box-shadow:0 14px 28px rgba(47,70,54,.1)}
      .roam-resource-icon{font-size:1.65rem}
      .roam-resource-card strong{font-size:1.05rem;color:var(--pine-dark,#2f4636)}
      .roam-resource-card p{margin:0;line-height:1.45}
      .roam-resource-cta{margin-top:auto;font-weight:800;color:var(--pine-dark,#2f4636)}
      .roam-side-quest-card{background:linear-gradient(145deg,#f7f1e5,#fff);border:1px solid rgba(47,70,54,.12);border-radius:22px;padding:1rem}
      .roam-side-quest-main{display:grid;grid-template-columns:auto 1fr;gap:.9rem;align-items:start}
      .roam-side-quest-emoji{font-size:2rem;line-height:1}
      .roam-side-quest-card h3{margin:.15rem 0 .35rem}
      .roam-side-quest-category{display:inline-flex;margin-top:.5rem;padding:.3rem .6rem;border-radius:999px;background:rgba(47,70,54,.08);font-size:.72rem;font-weight:800;letter-spacing:.04em}
      .roam-side-quest-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.9rem}
      .roam-badges-shell{margin-top:1rem}
      .roam-badges-shell .section-heading{margin-bottom:.65rem}
      .roam-v2-divider{height:1px;background:rgba(47,70,54,.12);margin:1rem 0}
      [data-nav="quest"].roam-nav-retired{display:none!important}
      @media (max-width:760px){
        .roam-resource-grid{grid-template-columns:1fr}
        .roam-resource-card{min-height:unset}
      }
    `;
    document.head.appendChild(style);
  }

  function adventureQuestPool() {
    const quests = window.GRIZZLY_DATA?.quests || [];
    const preferred = ['OUTDOORS', 'WILD CARD', 'BLUE TIME', 'CURIOSITY'];
    const filtered = quests.filter(quest => preferred.includes(String(quest.category || '').toUpperCase()));
    return filtered.length ? filtered : quests;
  }

  function drawRoamQuest(holder) {
    const pool = adventureQuestPool();
    if (!pool.length) return;
    const quest = pool[Math.floor(Math.random() * pool.length)];
    $('[data-roam-quest-emoji]', holder).textContent = quest.emoji || '🧭';
    $('[data-roam-quest-title]', holder).textContent = quest.title || 'Take the scenic route.';
    $('[data-roam-quest-copy]', holder).textContent = quest.description || 'Go find something worth noticing.';
    $('[data-roam-quest-category]', holder).textContent = quest.category || 'ROAM';
  }

  function buildTopHub() {
    const roam = $('#roam');
    const intro = $('#roam .screen-intro');
    if (!roam || !intro) return false;
    if ($('#roamV2Hub')) return true;

    const hub = document.createElement('section');
    hub.className = 'roam-v2-hub';
    hub.id = 'roamV2Hub';
    hub.innerHTML = `
      <div class="roam-v2-heading">
        <div>
          <p class="eyebrow">TRAILHEAD TOOLS</p>
          <h2>Start the next wander here.</h2>
        </div>
      </div>
      <div class="roam-resource-grid">
        ${ROAM_SITES.map(site => `
          <a class="roam-resource-card" href="${site.url}" target="_blank" rel="noopener noreferrer">
            <span class="roam-resource-icon" aria-hidden="true">${site.icon}</span>
            <strong>${site.name}</strong>
            <p>${site.note}</p>
            <span class="roam-resource-cta">Open ${site.name} ↗</span>
          </a>`).join('')}
      </div>
      <article class="roam-side-quest-card" id="roamSideQuest">
        <p class="eyebrow">SIDE QUEST</p>
        <div class="roam-side-quest-main">
          <div class="roam-side-quest-emoji" data-roam-quest-emoji>🧭</div>
          <div>
            <h3 data-roam-quest-title>Find something worth noticing.</h3>
            <p data-roam-quest-copy>Small adventures count. The point is to go look.</p>
            <span class="roam-side-quest-category" data-roam-quest-category>ROAM</span>
          </div>
        </div>
        <div class="roam-side-quest-actions">
          <button class="button button-primary" type="button" data-new-roam-quest>Give me another</button>
        </div>
      </article>`;

    intro.insertAdjacentElement('afterend', hub);
    drawRoamQuest(hub);
    $('[data-new-roam-quest]', hub)?.addEventListener('click', () => drawRoamQuest(hub));
    return true;
  }

  function moveBadgesIntoRoam() {
    const roam = $('#roam');
    const grid = $('#stampGrid');
    if (!roam || !grid) return false;
    if ($('#roamTrailBadges')) return true;

    const originalSection = grid.closest('section, article, .card');
    const shell = document.createElement('section');
    shell.className = 'roam-badges-shell';
    shell.id = 'roamTrailBadges';
    shell.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">TRAIL BADGES</p>
          <h2>Proof you actually did the thing.</h2>
          <p>Badges earned from Side Quests and future daily wins live here, with the rest of the wandering record.</p>
        </div>
      </div>`;

    const backpack = $('#roamBackpack');
    if (backpack) roam.insertBefore(shell, backpack);
    else roam.appendChild(shell);

    if (originalSection && originalSection !== roam && !originalSection.contains(shell)) {
      const oldHeading = originalSection.querySelector('.section-heading, h2, h3');
      if (oldHeading && originalSection.children.length <= 2) {
        shell.appendChild(originalSection);
      } else {
        shell.appendChild(grid);
      }
    } else {
      shell.appendChild(grid);
    }
    return true;
  }

  function retireQuestNav() {
    $$('[data-nav="quest"]').forEach(button => button.classList.add('roam-nav-retired'));
  }

  function tuneRoamIntro() {
    const intro = $('#roam .screen-intro');
    if (!intro || intro.dataset.roamV2Tuned === 'true') return;
    intro.innerHTML = `
      <p class="eyebrow">ROAM</p>
      <h1>Go somewhere. Find something.</h1>
      <p>Camping research, Side Quests, badges, and John’s own roaming record. The internet does the giant campground databases. GrizzlyJohn keeps the good stuff easy to reach.</p>`;
    intro.dataset.roamV2Tuned = 'true';
  }

  function organizeExistingRoam() {
    const backpack = $('#roamBackpack');
    if (backpack && !backpack.previousElementSibling?.classList?.contains('roam-v2-divider')) {
      const divider = document.createElement('div');
      divider.className = 'roam-v2-divider';
      backpack.insertAdjacentElement('beforebegin', divider);
    }
  }

  function upgrade() {
    tuneRoamIntro();
    retireQuestNav();
    const hubReady = buildTopHub();
    const badgesReady = moveBadgesIntoRoam();
    organizeExistingRoam();
    return hubReady && badgesReady;
  }

  function start() {
    ensureStyles();
    upgrade();
    const observer = new MutationObserver(() => {
      if (upgrade()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 20000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
