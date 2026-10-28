(() => {
  'use strict';

  const STORAGE_KEY = 'grizzlyjohn:laneCheckIns';
  const ASSET_BASE = 'assets/';
  const LANES = Object.freeze([
    {
      id: 'express-weaving',
      label: 'Express Lane / Weaving',
      short: 'Express / Weaving',
      image: 'lane-express-weaving.png',
      description: 'Darting around, chasing stimulation, reacting fast, or slipping toward old addictive patterns.',
      signals: ['Fast', 'Reactive', 'Chasing stimulation']
    },
    {
      id: 'nascar-15mph',
      label: 'NASCAR Lane at 15–20 MPH',
      short: 'NASCAR at 15–20 MPH',
      image: 'lane-nascar-15mph.png',
      description: 'I’m moving, but the lane I’m in does not match what I actually have in the tank.',
      signals: ['Wrong lane for my capacity', 'Low fuel', 'Friction']
    },
    {
      id: 'third-cruise',
      label: '3rd Lane / Cruise But Go-Go',
      short: '3rd Lane / Cruise',
      image: 'lane-third-cruise.png',
      description: 'Getting shit done and moving along, but I might still have my foot a little heavy on the gas.',
      signals: ['Functional', 'Busy', 'Still pushing']
    },
    {
      id: 'rv-tow-mode',
      label: '2nd Lane / RV Tow Mode',
      short: 'RV Tow Mode',
      image: 'lane-rv-tow-mode.png',
      description: 'Safe. Steady. No need to race. Happy enough with the pack.',
      signals: ['Steady', 'Safe', 'Connected']
    },
    {
      id: 'wisconsin-nice',
      label: 'Far Right Lane / Wisconsin Nice',
      short: 'Wisconsin Nice',
      image: 'lane-wisconsin-nice.png',
      description: 'Slow down. Let people around. Make room for myself and everybody else.',
      signals: ['Slower', 'Considerate', 'Enough']
    }
  ]);

  const laneById = id => LANES.find(lane => lane.id === id) || null;
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'\"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  function dateKey(value = new Date()) {
    try {
      if (window.GrizzlyJohnStorageV2?.localDateKey) return window.GrizzlyJohnStorageV2.localDateKey(value);
    } catch {}
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function readEntries() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(entry => entry && laneById(entry.laneId)) : [];
    } catch {
      return [];
    }
  }

  function writeEntries(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch {
      return false;
    }
  }

  function latestForDate(day = dateKey()) {
    return readEntries()
      .filter(entry => entry.date === day)
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))[0] || null;
  }

  function timeLabel(timestamp) {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function naturalDate(day) {
    const date = new Date(`${day}T12:00:00`);
    return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function imageMarkup(lane, className = '') {
    return `<img class="${className}" src="${ASSET_BASE}${escapeHtml(lane.image)}" alt="${escapeHtml(lane.label)}" onerror="this.hidden=true">`;
  }

  function openLaneChooser() {
    const nav = document.querySelector('[data-nav="wisdom"]');
    if (nav) nav.click();
    window.setTimeout(() => {
      const chooser = $('#chooseYourLane');
      chooser?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      chooser?.querySelector('.lane-choice')?.focus({ preventScroll: true });
    }, 260);
  }

  function renderTodayCard() {
    const weather = $('#weatherCard');
    if (!weather) return false;
    let card = $('#todayLaneCard');
    if (!card) {
      card = document.createElement('article');
      card.className = 'card current-lane-card';
      card.id = 'todayLaneCard';
      weather.insertAdjacentElement('afterend', card);
      card.addEventListener('click', event => {
        if (event.target.closest('[data-open-lanes]')) openLaneChooser();
      });
    }

    const current = latestForDate();
    if (!current) {
      card.innerHTML = `
        <div class="current-lane-copy">
          <p class="eyebrow">QUICK GUT CHECK</p>
          <h2>🛣️ What lane are you in?</h2>
          <p>No diagnosis. No grade. Just notice where you’re driving.</p>
        </div>
        <button class="button button-primary" type="button" data-open-lanes>Check my lane →</button>`;
      return true;
    }

    const lane = laneById(current.laneId);
    card.innerHTML = `
      <div class="current-lane-thumb">${imageMarkup(lane, 'current-lane-image')}</div>
      <div class="current-lane-copy">
        <p class="eyebrow">YOUR CURRENT LANE · ${escapeHtml(timeLabel(current.timestamp))}</p>
        <h2>${escapeHtml(lane.short)}</h2>
        <p>${escapeHtml(lane.description)}</p>
        <button class="text-button" type="button" data-open-lanes>Change lane →</button>
      </div>`;
    return true;
  }

  function laneCardMarkup(lane) {
    return `<button class="lane-choice" type="button" data-lane-id="${escapeHtml(lane.id)}" aria-pressed="false">
      ${imageMarkup(lane, 'lane-choice-image')}
      <span class="lane-choice-fallback">${escapeHtml(lane.short)}</span>
    </button>`;
  }

  function selectedMarkup(lane) {
    return `<div class="lane-selection-copy">
      <p class="eyebrow">YOU PICKED</p>
      <h3>${escapeHtml(lane.label)}</h3>
      <p>${escapeHtml(lane.description)}</p>
      <div class="lane-signal-row">${lane.signals.map(signal => `<span>${escapeHtml(signal)}</span>`).join('')}</div>
      <label class="lane-note-label" for="laneNote">What put you in this lane? <small>Optional</small></label>
      <textarea id="laneNote" rows="3" maxlength="500" placeholder="A few words is plenty..."></textarea>
      <div class="lane-save-row">
        <button class="button button-primary" type="button" id="saveLane">Save my lane</button>
        <p class="lane-status" id="laneStatus" role="status" aria-live="polite"></p>
      </div>
    </div>`;
  }

  function renderWisdomChooser() {
    const feelings = $('#feelingCheckIn');
    if (!feelings) return false;
    if ($('#chooseYourLane')) return true;

    const section = document.createElement('section');
    section.className = 'card choose-your-lane';
    section.id = 'chooseYourLane';
    section.innerHTML = `
      <div class="lane-header-art">${imageMarkup({ image: 'choose-your-lane-header.png', label: 'Choose Your Lane' }, 'lane-header-image')}</div>
      <div class="lane-intro">
        <p class="eyebrow">CHECK IN</p>
        <h2>What lane are you in right now?</h2>
        <p>How are you moving through the world? Don’t overthink it. Tap the road that feels most true right now.</p>
      </div>
      <div class="lane-grid" role="group" aria-label="Choose your current lane">${LANES.map(laneCardMarkup).join('')}</div>
      <div class="lane-selection" id="laneSelection" hidden></div>`;
    feelings.insertAdjacentElement('beforebegin', section);

    section.addEventListener('click', event => {
      const choice = event.target.closest('[data-lane-id]');
      if (choice) {
        const lane = laneById(choice.dataset.laneId);
        if (!lane) return;
        section.querySelectorAll('.lane-choice').forEach(button => {
          const selected = button === choice;
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
        const holder = $('#laneSelection', section);
        holder.hidden = false;
        holder.dataset.laneId = lane.id;
        holder.innerHTML = selectedMarkup(lane);
        holder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      if (event.target.closest('#saveLane')) {
        saveSelectedLane(section);
        return;
      }

      if (event.target.closest('[data-continue-feelings]')) {
        feelings.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => $('#feelingPrev')?.focus({ preventScroll: true }), 300);
      }
    });
    return true;
  }

  function saveSelectedLane(section) {
    const holder = $('#laneSelection', section);
    const lane = laneById(holder?.dataset.laneId);
    if (!lane) return;
    const timestamp = new Date().toISOString();
    const note = $('#laneNote', holder)?.value?.trim() || '';
    const entry = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `lane-${Date.now()}`,
      date: dateKey(timestamp),
      timestamp,
      laneId: lane.id,
      note
    };
    const entries = readEntries();
    if (!writeEntries([entry, ...entries])) {
      const status = $('#laneStatus', holder);
      if (status) status.textContent = 'That did not save. Nothing was overwritten.';
      return;
    }

    holder.innerHTML = `<div class="lane-saved">
      <span class="lane-saved-mark" aria-hidden="true">✓</span>
      <div><p class="eyebrow">LANE SAVED</p><h3>${escapeHtml(lane.short)} · ${escapeHtml(timeLabel(timestamp))}</h3><p>That’s information, not a verdict.</p></div>
      <button class="button button-secondary" type="button" data-continue-feelings>Now, how are you feeling? →</button>
    </div>`;
    renderTodayCard();
    renderRoadReport();
    window.dispatchEvent(new CustomEvent('grizzlyjohn:lane-saved', { detail: entry }));
  }

  function roadEntriesMarkup(entries) {
    return entries.slice(0, 12).map(entry => {
      const lane = laneById(entry.laneId);
      if (!lane) return '';
      return `<div class="road-report-entry">
        <div class="road-report-time"><strong>${escapeHtml(naturalDate(entry.date))}</strong><span>${escapeHtml(timeLabel(entry.timestamp))}</span></div>
        <div class="road-report-lane"><strong>${escapeHtml(lane.short)}</strong>${entry.note ? `<p>“${escapeHtml(entry.note)}”</p>` : `<p>${escapeHtml(lane.description)}</p>`}</div>
      </div>`;
    }).join('');
  }

  function renderRoadReport() {
    const myDays = $('#myDays');
    if (!myDays) return false;
    const shell = $('.my-days-shell', myDays) || myDays;
    let report = $('#laneRoadReport', myDays);
    if (!report) {
      report = document.createElement('details');
      report.id = 'laneRoadReport';
      report.className = 'lane-road-report';
      const content = $('.my-days-content', shell);
      if (content) content.insertAdjacentElement('beforebegin', report);
      else shell.appendChild(report);
    }
    const entries = readEntries().sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    report.hidden = !entries.length;
    if (!entries.length) return true;
    report.innerHTML = `<summary><span><strong>🛣️ Road Report</strong><small>Recent lane check-ins</small></span><span aria-hidden="true">＋</span></summary><div class="road-report-list">${roadEntriesMarkup(entries)}</div>`;
    return true;
  }

  function ensureFeature() {
    const todayReady = renderTodayCard();
    const wisdomReady = renderWisdomChooser();
    const daysReady = renderRoadReport();
    return todayReady && wisdomReady && daysReady;
  }

  function start() {
    ensureFeature();
    [120, 350, 800, 1600].forEach(delay => window.setTimeout(ensureFeature, delay));
    const observer = new MutationObserver(() => {
      renderTodayCard();
      renderWisdomChooser();
      renderRoadReport();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 7000);
  }

  window.GrizzlyJohnLanes = Object.freeze({ LANES, readEntries, latestForDate, openLaneChooser, refresh: ensureFeature });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
