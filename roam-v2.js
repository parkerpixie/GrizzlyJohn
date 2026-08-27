(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ROAM_SITES = [
    { name: 'The Dyrt', url: 'https://thedyrt.com/', icon: '🏕️', note: 'Campgrounds, reviews, maps, and trip research.' },
    { name: 'Campendium', url: 'https://www.campendium.com/', icon: '🚐', note: 'Campground reviews, RV-friendly stops, and places worth investigating.' },
    { name: 'AllStays', url: 'https://www.allstays.com/', icon: '🗺️', note: 'Camping and road-trip research in one familiar starting place.' }
  ];

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }

  function readQuestCount() {
    const result = window.GrizzlyJohnStorageV2?.readers.questCount();
    return result?.status === 'valid' ? result.value : 0;
  }

  function nextQuestBadge(count) {
    const seen = new Set();
    return (window.GRIZZLY_DATA?.stamps || [])
      .filter(stamp => stamp?.id && !seen.has(stamp.id) && seen.add(stamp.id))
      .sort((a, b) => Number(a.requirement) - Number(b.requirement))
      .find(stamp => Number(stamp.requirement) > count) || null;
  }

  function renderQuestBadgeConnection() {
    const line = $('#questBadgeConnection');
    if (!line) return;
    const count = readQuestCount();
    const next = nextQuestBadge(count);
    line.textContent = next
      ? `Side Quests count toward Trail Badges. ${count} completed · next existing badge at ${next.requirement}.`
      : 'Side Quests count toward Trail Badges. Every completed quest still belongs in the story.';
  }

  function buildRoamHub() {
    const roam = $('#roam');
    const intro = $('#roam .screen-intro');
    if (!roam || !intro) return false;
    if ($('#roamV2Hub')) return true;

    intro.innerHTML = '<p class="eyebrow">ROAM</p><h1>Where do I want to go?</h1><p>Research a trip, revisit the park passport, or save somewhere worth finding.</p>';

    const hub = document.createElement('div');
    hub.id = 'roamV2Hub';
    hub.innerHTML = `
      <section class="roam-v2-section trailhead-tools" aria-labelledby="trailheadToolsHeading">
        <div class="roam-v2-heading"><div><p class="eyebrow">TRAILHEAD TOOLS</p><h2 id="trailheadToolsHeading">John’s favorite places to start looking</h2></div></div>
        <div class="roam-resource-grid">${ROAM_SITES.map(site => `<a class="roam-resource-card" href="${site.url}" target="_blank" rel="noopener noreferrer"><span class="roam-resource-icon" aria-hidden="true">${site.icon}</span><span><strong>${site.name}</strong><p>${site.note}</p></span><span class="roam-resource-cta">OPEN ${site.name.toUpperCase()} ↗</span></a>`).join('')}</div>
      </section>`;
    intro.insertAdjacentElement('afterend', hub);
    return true;
  }

  function formatAwardDate(date) {
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function badgeTile({ id, icon, name, current, requirement, earned, explanation, justUnlocked = false }) {
    const safeId = escapeHtml(id);
    const progress = requirement ? Math.min(100, Math.round((current / requirement) * 100)) : 100;
    return `<button class="trail-badge-tile ${earned ? 'is-earned' : 'is-locked'} ${justUnlocked ? 'is-just-unlocked' : ''}" type="button" data-trail-badge="${safeId}" aria-expanded="false" aria-controls="trailBadgeDetail" data-name="${escapeHtml(name)}" data-icon="${escapeHtml(icon)}" data-current="${current}" data-requirement="${requirement}" data-earned="${earned}" data-explanation="${escapeHtml(explanation)}"><span class="trail-badge-icon" aria-hidden="true">${escapeHtml(icon)}</span><span class="trail-badge-name">${escapeHtml(name)}</span>${requirement ? `<span class="trail-badge-progress" role="progressbar" aria-label="Progress toward ${escapeHtml(name)}" aria-valuemin="0" aria-valuemax="${requirement}" aria-valuenow="${Math.min(current, requirement)}"><span style="width:${progress}%"></span></span>` : ''}</button>`;
  }

  function openBadgeDetail(tile) {
    const panel = $('#trailBadgeDetail');
    if (!panel) return;
    $$('.trail-badge-tile').forEach(button => button.setAttribute('aria-expanded', String(button === tile)));
    const earned = tile.dataset.earned === 'true';
    const requirement = Number(tile.dataset.requirement);
    panel.innerHTML = `<span class="trail-badge-detail-icon" aria-hidden="true">${escapeHtml(tile.dataset.icon)}</span><div><p class="eyebrow">${earned ? 'UNLOCKED' : 'LOCKED'}</p><h3>${escapeHtml(tile.dataset.name)}</h3><strong class="trail-badge-detail-progress">${requirement ? `${Math.min(Number(tile.dataset.current), requirement)} / ${requirement}` : 'Earned'}</strong><p>${escapeHtml(tile.dataset.explanation)}</p></div><button class="trail-badge-detail-close" type="button" aria-label="Close badge details">×</button>`;
    panel.hidden = false;
    $('.trail-badge-detail-close', panel)?.addEventListener('click', () => {
      panel.hidden = true;
      tile.setAttribute('aria-expanded', 'false');
      tile.focus();
    });
  }

  function renderTrailBadges(justUnlockedAt = null) {
    const holder = $('#trailBadgeList');
    if (!holder) return;
    const awardResult = window.GrizzlyJohnStorageV2?.goldStarDays.awards();
    const dailyAwards = awardResult?.ok ? [...awardResult.awards].sort((a, b) => String(b.date).localeCompare(String(a.date))) : [];
    const count = readQuestCount();
    const questBadges = [...new Map((window.GRIZZLY_DATA?.stamps || []).filter(badge => badge?.id).map(badge => [badge.id, badge])).values()].sort((a, b) => Number(a.requirement) - Number(b.requirement));
    const dailyMarkup = dailyAwards.map(award => badgeTile({ id: `gold-star-${award.date}`, icon: '⭐️', name: `Gold Star · ${formatAwardDate(award.date)}`, current: 1, requirement: 0, earned: true, explanation: 'Completed more than half of the day’s Gold Stars.' })).join('');
    const questMarkup = questBadges.map(badge => { const requirement = Number(badge.requirement); const earned = count >= requirement; return badgeTile({ id: badge.id, icon: badge.icon || '🥾', name: badge.name, current: count, requirement, earned, justUnlocked: justUnlockedAt === requirement, explanation: earned ? `Earned by completing ${requirement} Side Quest${requirement === 1 ? '' : 's'}.` : `Complete ${requirement} Side Quest${requirement === 1 ? '' : 's'} to unlock this badge.` }); }).join('');
    holder.innerHTML = dailyMarkup || questMarkup ? `${dailyMarkup}${questMarkup}` : '<div class="roam-badge-empty"><span aria-hidden="true">🧭</span><h3>No Trail Badges yet.</h3><p>Complete Side Quests or earn a qualifying Gold Star day and they’ll start showing up here.</p></div>';
    $$('[data-trail-badge]', holder).forEach(tile => tile.addEventListener('click', () => openBadgeDetail(tile)));
  }

  function organizeRoamingRecord() {
    const roam = $('#roam');
    const hub = $('#roamV2Hub');
    if (!roam || !hub) return false;
    let passport = $('#nationalParkPassport');
    if (!passport) {
      passport = document.createElement('section');
      passport.className = 'national-park-passport';
      passport.id = 'nationalParkPassport';
      passport.setAttribute('aria-labelledby', 'nationalParkPassportHeading');
      passport.innerHTML = '<div class="roam-v2-heading"><div><p class="eyebrow">NATIONAL PARK PASSPORT</p><h2 id="nationalParkPassportHeading">John’s park collection</h2></div></div><div class="passport-body"></div>';
      hub.insertAdjacentElement('afterend', passport);
    }
    const passportBody = $('.passport-body', passport);
    const backpack = $('#roamBackpack');
    if (backpack && !passportBody.contains(backpack)) passportBody.appendChild(backpack);

    let roamingList = $('#johnRoamingList');
    if (!roamingList) {
      roamingList = document.createElement('section');
      roamingList.className = 'john-roaming-list';
      roamingList.id = 'johnRoamingList';
      roamingList.setAttribute('aria-labelledby', 'johnRoamingListHeading');
      roamingList.innerHTML = '<div class="roam-v2-heading roaming-list-heading"><div><p class="eyebrow">SAVED PLACES</p><h2 id="johnRoamingListHeading">John’s Roaming List</h2><p>Campgrounds, trails, roads, towns, stops, and ideas outside the National Park Passport.</p></div></div><div class="roaming-list-body"></div>';
      passport.insertAdjacentElement('afterend', roamingList);
    }
    $('#roamExplorerVisuals')?.remove();
    const listBody = $('.roaming-list-body', roamingList);
    const blue = $('#blueRoamCompanion');
    if (blue && !roamingList.contains(blue)) roamingList.insertBefore(blue, listBody);
    const stats = $('#roam .stats-grid');
    if (stats) {
      stats.id = 'roamingListStats';
      if (!listBody.contains(stats)) listBody.appendChild(stats);
    }
    const editorCard = $('#placeForm')?.closest('article');
    let editor = $('#placeEditorDetails');
    if (editorCard && !editor) {
      editor = document.createElement('details');
      editor.className = 'place-editor-details';
      editor.id = 'placeEditorDetails';
      editor.innerHTML = '<summary><span><strong>＋ Add a place</strong><small>Name is the only required field</small></span><span aria-hidden="true">＋</span></summary>';
      editorCard.insertAdjacentElement('beforebegin', editor);
      editor.appendChild(editorCard);
    }
    [editor, $('#roam .roaming-list-filter-bar'), $('#placeList')].filter(element => element && !listBody.contains(element)).forEach(element => listBody.appendChild(element));

    const suggestion = $('#backpackSuggestionCard');
    if (suggestion && !roamingList.contains(suggestion)) roamingList.insertAdjacentElement('afterend', suggestion);
    $('#roamingRecordDetails')?.remove();
    return Boolean($('#roamBackpack'));
  }

  function upgrade() {
    buildRoamHub();
    renderQuestBadgeConnection();
    renderTrailBadges();
    organizeRoamingRecord();
  }

  function start() {
    upgrade();
    [100, 350, 900, 1800].forEach(delay => window.setTimeout(upgrade, delay));
    document.addEventListener('click', event => {
      if (event.target.closest('[data-nav="quest"]')) window.setTimeout(() => { renderQuestBadgeConnection(); renderTrailBadges(); }, 0);
      if (event.target.closest('[data-nav="roam"]')) window.setTimeout(organizeRoamingRecord, 0);
    });
    document.addEventListener('grizzly-quest-updated', event => {
      renderQuestBadgeConnection();
      renderTrailBadges(event.detail?.count);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
