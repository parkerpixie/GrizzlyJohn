(() => {
  'use strict';

  const STORAGE_KEY = 'grizzlyjohn:laneCheckIns';
  const ASSET_BASE = 'graphics/';
  const LANES = Object.freeze([
    { id: 'express-weaving', label: 'Express Lane / Weaving', short: 'Express / Weaving', image: 'lane-express-weaving.png', description: 'Darting around, chasing stimulation, reacting fast, or slipping toward old addictive patterns.' },
    { id: 'nascar-15mph', label: 'NASCAR Lane at 15–20 MPH', short: 'NASCAR 15–20', image: 'lane-nascar-15mph.png', description: 'Moving, but the lane does not match what you actually have in the tank.' },
    { id: 'third-cruise', label: '3rd Lane / Cruise But Go-Go', short: '3rd / Cruise', image: 'lane-third-cruise.png', description: 'Getting shit done and moving along, but the foot may still be a little heavy on the gas.' },
    { id: 'rv-tow-mode', label: '2nd Lane / RV Tow Mode', short: 'RV Tow Mode', image: 'lane-rv-tow-mode.png', description: 'Safe. Steady. No need to race. Happy enough with the pack.' },
    { id: 'wisconsin-nice', label: 'Far Right Lane / Wisconsin Nice', short: 'Wisconsin Nice', image: 'lane-wisconsin-nice.png', description: 'Slow down. Let people around. Make room for yourself and everybody else.' }
  ]);

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const laneById = id => LANES.find(lane => lane.id === id) || null;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
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

  function imageMarkup(lane, className = '') {
    return `<img class="${className}" src="${ASSET_BASE}${escapeHtml(lane.image)}" alt="${escapeHtml(lane.label)}" loading="lazy" onerror="this.hidden=true">`;
  }

  function laneTileMarkup(lane, currentId = '') {
    return `<button class="lane-mini-choice${lane.id === currentId ? ' is-current' : ''}" type="button" data-lane-id="${escapeHtml(lane.id)}" aria-pressed="false">
      ${imageMarkup(lane, 'lane-mini-image')}
      <span>${escapeHtml(lane.short)}</span>
    </button>`;
  }

  function selectionMarkup(lane) {
    return `<div class="lane-home-selection-copy">
      <div class="lane-home-selected-heading">
        ${imageMarkup(lane, 'lane-selected-thumb')}
        <div><p class="eyebrow">THIS LANE?</p><h3>${escapeHtml(lane.label)}</h3></div>
      </div>
      <p>${escapeHtml(lane.description)}</p>
      <label for="laneNote">My lane commentary <small>Optional</small></label>
      <textarea id="laneNote" rows="3" maxlength="2000" placeholder="What put you in this lane? Write whatever you want to remember..."></textarea>
      <button class="button button-primary" type="button" id="saveLane">Save my lane &amp; commentary</button>
      <p class="lane-status" id="laneStatus" role="status" aria-live="polite"></p>
    </div>`;
  }

  function currentMarkup(entry) {
    const lane = entry ? laneById(entry.laneId) : null;
    if (!lane) return '';
    return `<div class="lane-current-compact">
      ${imageMarkup(lane, 'lane-current-thumb')}
      <div><small>CURRENT · ${escapeHtml(timeLabel(entry.timestamp))}</small><strong>${escapeHtml(lane.short)}</strong><span>${escapeHtml(lane.description)}</span></div>
    </div>`;
  }

  function todayLogMarkup(day = dateKey()) {
    const entries = readEntries()
      .filter(entry => entry.date === day)
      .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    return `<section class="lane-day-history" aria-label="Today's saved lane check-ins">
      <div class="lane-day-history-heading"><h3>Today's lane log</h3><span>${entries.length} check-in${entries.length === 1 ? '' : 's'}</span></div>
      ${entries.length ? `<ol class="lane-day-list">${entries.map(entry => {
        const lane = laneById(entry.laneId);
        return `<li class="lane-day-entry" data-lane-entry="${escapeHtml(entry.id || '')}">
          <div class="lane-day-entry-heading"><time datetime="${escapeHtml(entry.timestamp || '')}">${escapeHtml(timeLabel(entry.timestamp))}</time><strong>${escapeHtml(lane?.short || 'Lane')}</strong></div>
          ${entry.note ? `<p class="lane-day-note">${escapeHtml(entry.note)}</p>` : '<p class="lane-day-empty-note">No commentary saved.</p>'}
          <button class="text-button lane-edit-note-button" type="button" data-edit-lane-note>Edit commentary</button>
          <div class="lane-inline-editor" hidden>
            <label for="lane-edit-${escapeHtml(entry.id || '')}">Commentary for this check-in</label>
            <textarea id="lane-edit-${escapeHtml(entry.id || '')}" rows="3" maxlength="2000"></textarea>
            <div class="lane-edit-actions"><button class="button button-primary" type="button" data-save-lane-note>Save commentary</button><button class="button button-secondary" type="button" data-cancel-lane-note>Cancel</button></div>
            <p class="lane-status" role="status" aria-live="polite"></p>
          </div>
        </li>`;
      }).join('')}</ol>` : '<p class="lane-day-empty-note">Your lane choices will show up here as you save them throughout the day.</p>'}
      <p class="lane-day-privacy">Saved on this device. Each choice keeps its own time and note, and appears in My Days.</p>
    </section>`;
  }

  function editSavedLaneNote(button) {
    const row = button.closest('[data-lane-entry]');
    const entryId = row?.dataset.laneEntry;
    const textarea = row?.querySelector('.lane-inline-editor textarea');
    const entry = readEntries().find(item => item.id === entryId);
    if (!entry || !textarea) return;
    const updated = readEntries().map(item => item.id === entryId ? { ...item, note: textarea.value.trim() } : item);
    if (!writeEntries(updated)) {
      const status = row.querySelector('.lane-inline-editor .lane-status');
      if (status) status.textContent = 'Could not save your edit. Your original note is still here.';
      return;
    }
    renderTodayCard(true);
    window.GrizzlyJohnMyDays?.refresh?.();
  }

  function removeOldLaneUi() {
    $('#chooseYourLane')?.remove();
    $('#laneRoadReport')?.remove();
  }

  function setupCardEvents(card) {
    if (card.dataset.laneEventsReady === 'true') return;
    card.dataset.laneEventsReady = 'true';
    card.addEventListener('click', event => {
      // Only actual lane-choice buttons select a lane. The note holder also has
      // data-lane-id, but taps in its textarea must never reset the editor.
      const choice = event.target.closest('.lane-mini-choice[data-lane-id]');
      if (choice) {
        const lane = laneById(choice.dataset.laneId);
        if (!lane) return;
        $$('.lane-mini-choice', card).forEach(button => {
          const selected = button === choice;
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
        const holder = $('#laneHomeSelection', card);
        if (!holder) return;
        holder.hidden = false;
        holder.dataset.laneId = lane.id;
        holder.innerHTML = selectionMarkup(lane);
        holder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      if (event.target.closest('#saveLane')) {
        saveSelectedLane(card);
        return;
      }
      const editButton = event.target.closest('[data-edit-lane-note]');
      if (editButton) {
        const row = editButton.closest('[data-lane-entry]');
        const entry = readEntries().find(item => item.id === row?.dataset.laneEntry);
        const editor = row?.querySelector('.lane-inline-editor');
        if (entry && editor) {
          editor.hidden = false;
          editButton.hidden = true;
          const textarea = editor.querySelector('textarea');
          textarea.value = entry.note || '';
          textarea.focus();
        }
        return;
      }
      if (event.target.closest('[data-save-lane-note]')) {
        editSavedLaneNote(event.target);
        return;
      }
      if (event.target.closest('[data-cancel-lane-note]')) {
        const row = event.target.closest('[data-lane-entry]');
        row.querySelector('.lane-inline-editor').hidden = true;
        row.querySelector('[data-edit-lane-note]').hidden = false;
      }
    });
  }

  function renderTodayCard(force = false) {
    const weather = $('#weatherCard');
    if (!weather) return false;
    let card = $('#todayLaneCard');
    if (!card) {
      card = document.createElement('article');
      card.className = 'card current-lane-card';
      card.id = 'todayLaneCard';
      weather.insertAdjacentElement('afterend', card);
    }
    setupCardEvents(card);
    // Delayed app initialization must not destroy a focused textarea or draft.
    if (!force && $('.lane-home-strip', card)) return true;

    const current = latestForDate();
    card.innerHTML = `
      <div class="lane-home-header">
        <div><p class="eyebrow">QUICK GUT CHECK</p><h2>🛣️ What lane are you in?</h2><p>Tap the one that feels most true right now.</p></div>
      </div>
      ${currentMarkup(current)}
      <div class="lane-home-strip" role="group" aria-label="Choose your current lane">
        ${LANES.map(lane => laneTileMarkup(lane, current?.laneId || '')).join('')}
      </div>
      <div class="lane-home-selection" id="laneHomeSelection" hidden></div>
      <div id="laneTodayHistory">${todayLogMarkup()}</div>`;
    return true;
  }

  function saveSelectedLane(card) {
    const holder = $('#laneHomeSelection', card);
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
    renderTodayCard(true);
    window.GrizzlyJohnMyDays?.refresh?.();
    window.dispatchEvent(new CustomEvent('grizzlyjohn:lane-saved', { detail: entry }));
  }

  function openLaneChooser() {
    document.querySelector('[data-nav="today"]')?.click();
    window.setTimeout(() => {
      const card = $('#todayLaneCard');
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card?.querySelector('.lane-mini-choice')?.focus({ preventScroll: true });
    }, 220);
  }

  function loadFeelingSummaryFix() {
    if (document.querySelector('script[data-feeling-summary-fix]')) return;
    const script = document.createElement('script');
    script.src = 'feeling-summary-fix.js?v=20261028-1';
    script.defer = true;
    script.dataset.feelingSummaryFix = 'true';
    document.head.appendChild(script);
  }

  function ensureFeature() {
    removeOldLaneUi();
    return renderTodayCard();
  }

  function start() {
    loadFeelingSummaryFix();
    ensureFeature();
    [120, 350, 800, 1600, 3200].forEach(delay => window.setTimeout(ensureFeature, delay));
  }

  window.GrizzlyJohnLanes = Object.freeze({ LANES, readEntries, latestForDate, openLaneChooser, refresh: ensureFeature });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
