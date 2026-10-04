(() => {
  'use strict';

  const ACTIVE_KEY = 'grizzlyjohn:v3:health:activeSleep';
  const SLEEP_ENTRIES_KEY = 'grizzlyjohn:v3:health:sleepEntries';
  const QUALITIES = Object.freeze(['Poor', 'Okay', 'Good', 'Great']);
  const QUALITY_SCORES = Object.freeze({ Poor: 0, Okay: 1, Good: 2, Great: 3 });
  const INTERVENTIONS = Object.freeze([
    Object.freeze({ type: 'medication', icon: '💊', label: 'Medication' }),
    Object.freeze({ type: 'reading', icon: '📖', label: 'Reading' }),
    Object.freeze({ type: 'breathing', icon: '🫁', label: 'Breathing / relaxing' }),
    Object.freeze({ type: 'listening', icon: '🎧', label: 'Listening to something' }),
    Object.freeze({ type: 'getting-up', icon: '🚶', label: 'Getting up for a bit' }),
    Object.freeze({ type: 'thoughts', icon: '📝', label: 'Getting thoughts out' }),
    Object.freeze({ type: 'other', icon: '✨', label: 'Something else' })
  ]);

  function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function safeIso(value) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function localDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('A valid date is required.');
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function hoursBetween(start, end) {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
    return Math.round(((endMs - startMs) / 3600000) * 100) / 100;
  }

  function aggregateQuality(stretches = []) {
    const rated = stretches.filter(stretch => QUALITIES.includes(stretch?.quality));
    if (!rated.length) return 'Okay';
    let weightedTotal = 0;
    let totalWeight = 0;
    rated.forEach(stretch => {
      const hours = Number(stretch.hours);
      const weight = Number.isFinite(hours) && hours > 0 ? hours : 1;
      weightedTotal += QUALITY_SCORES[stretch.quality] * weight;
      totalWeight += weight;
    });
    const rounded = Math.max(0, Math.min(3, Math.round(weightedTotal / totalWeight)));
    return QUALITIES[rounded];
  }

  function totalSleepHours(stretches = []) {
    return Math.round(stretches.reduce((total, stretch) => {
      const hours = Number(stretch?.hours);
      return total + (Number.isFinite(hours) && hours >= 0 ? hours : 0);
    }, 0) * 100) / 100;
  }

  function createIdFactory() {
    return () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
      return Date.now() + '-' + Math.random().toString(36).slice(2);
    };
  }

  function createSleepTracker(storage, options = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('A localStorage-compatible adapter is required.');
    }

    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    const makeId = typeof options.idFactory === 'function' ? options.idFactory : createIdFactory();

    function readJson(key, expected) {
      let raw;
      try {
        raw = storage.getItem(key);
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
      if (raw === null) return { ok: true, value: null };
      try {
        const value = JSON.parse(raw);
        if (!expected(value)) return { ok: false, reason: 'Saved sleep data has an unexpected shape and was left unchanged.' };
        return { ok: true, value };
      } catch {
        return { ok: false, reason: 'Saved sleep data could not be read and was left unchanged.' };
      }
    }

    function writeJson(key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
    }

    function remove(key) {
      try {
        storage.removeItem(key);
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
    }

    function active() {
      return readJson(ACTIVE_KEY, value => Boolean(value) && typeof value === 'object' && !Array.isArray(value));
    }

    function completed() {
      const result = readJson(SLEEP_ENTRIES_KEY, Array.isArray);
      if (!result.ok) return result;
      return { ok: true, entries: result.value || [] };
    }

    function saveActive(record) {
      return writeJson(ACTIVE_KEY, { ...record, updatedAt: safeIso(now()) || new Date().toISOString() });
    }

    function startNight(options = {}) {
      const existing = active();
      if (!existing.ok) return existing;
      if (existing.value) return { ok: false, reason: 'A sleep night is already in progress.' };
      const startedAt = safeIso(options.timestamp || now());
      if (!startedAt) return { ok: false, reason: 'A valid start time is required.' };
      const record = {
        version: 1,
        id: options.id || makeId(),
        startedAt,
        status: 'sleeping',
        phase: null,
        currentStretch: { id: makeId(), startedAt },
        stretches: [],
        awakeEvents: [],
        updatedAt: startedAt
      };
      const written = saveActive(record);
      return written.ok ? { ok: true, active: record } : written;
    }

    function wake(options = {}) {
      const result = active();
      if (!result.ok) return result;
      const record = result.value;
      if (!record || record.status !== 'sleeping' || !record.currentStretch?.startedAt) {
        return { ok: false, reason: 'There is no active sleep stretch to stop.' };
      }
      const endedAt = safeIso(options.timestamp || now());
      if (!endedAt) return { ok: false, reason: 'A valid wake time is required.' };
      const hours = hoursBetween(record.currentStretch.startedAt, endedAt);
      if (hours === null) return { ok: false, reason: 'Wake time cannot be before the sleep stretch began.' };
      const stretch = {
        id: record.currentStretch.id || makeId(),
        startedAt: record.currentStretch.startedAt,
        endedAt,
        hours,
        quality: null
      };
      const next = {
        ...record,
        status: 'awake',
        phase: 'quality',
        currentStretch: null,
        stretches: [...(record.stretches || []), stretch]
      };
      const written = saveActive(next);
      return written.ok ? { ok: true, active: next, stretch } : written;
    }

    function rateStretch(quality) {
      if (!QUALITIES.includes(quality)) return { ok: false, reason: 'Choose Poor, Okay, Good, or Great.' };
      const result = active();
      if (!result.ok) return result;
      const record = result.value;
      if (!record || record.status !== 'awake' || record.phase !== 'quality') {
        return { ok: false, reason: 'There is not a sleep stretch waiting for a quality rating.' };
      }
      const stretches = [...(record.stretches || [])];
      if (!stretches.length) return { ok: false, reason: 'No completed sleep stretch was found.' };
      stretches[stretches.length - 1] = { ...stretches[stretches.length - 1], quality };
      const next = { ...record, stretches, phase: 'decision' };
      const written = saveActive(next);
      return written.ok ? { ok: true, active: next } : written;
    }

    function stayUpForNow() {
      const result = active();
      if (!result.ok) return result;
      const record = result.value;
      if (!record || record.status !== 'awake' || record.phase !== 'decision') {
        return { ok: false, reason: 'Rate the sleep stretch first.' };
      }
      const next = { ...record, phase: 'actions' };
      const written = saveActive(next);
      return written.ok ? { ok: true, active: next } : written;
    }

    function logAwakeAction(input = {}, options = {}) {
      const result = active();
      if (!result.ok) return result;
      const record = result.value;
      if (!record || record.status !== 'awake' || record.phase !== 'actions') {
        return { ok: false, reason: 'Awake-time actions can only be logged while the night is paused.' };
      }
      const intervention = INTERVENTIONS.find(item => item.type === input.type);
      if (!intervention) return { ok: false, reason: 'Choose one of the available sleep actions.' };
      const detail = cleanText(input.detail);
      if ((input.type === 'medication' || input.type === 'other') && !detail) {
        return { ok: false, reason: input.type === 'medication' ? 'Add the medication name or description.' : 'Add a short description.' };
      }
      const timestamp = safeIso(options.timestamp || now());
      if (!timestamp) return { ok: false, reason: 'A valid action time is required.' };
      const event = {
        id: options.id || makeId(),
        timestamp,
        type: intervention.type,
        label: intervention.label
      };
      if (detail) event.detail = detail;
      const next = { ...record, awakeEvents: [...(record.awakeEvents || []), event] };
      const written = saveActive(next);
      return written.ok ? { ok: true, active: next, event } : written;
    }

    function backToSleep(options = {}) {
      const result = active();
      if (!result.ok) return result;
      const record = result.value;
      if (!record || record.status !== 'awake' || record.phase !== 'actions') {
        return { ok: false, reason: 'Choose that you are not up for the day first.' };
      }
      const startedAt = safeIso(options.timestamp || now());
      if (!startedAt) return { ok: false, reason: 'A valid sleep time is required.' };
      const next = {
        ...record,
        status: 'sleeping',
        phase: null,
        currentStretch: { id: makeId(), startedAt }
      };
      const written = saveActive(next);
      return written.ok ? { ok: true, active: next } : written;
    }

    function finishNight(options = {}) {
      const result = active();
      if (!result.ok) return result;
      const record = result.value;
      if (!record || record.status !== 'awake' || !['decision', 'actions'].includes(record.phase)) {
        return { ok: false, reason: 'Tap “I’m Awake” and rate the last stretch before finishing the night.' };
      }
      const stretches = [...(record.stretches || [])];
      if (!stretches.length || stretches.some(stretch => !QUALITIES.includes(stretch.quality))) {
        return { ok: false, reason: 'Every sleep stretch needs a quick quality rating before the night can be wrapped up.' };
      }

      const entriesResult = completed();
      if (!entriesResult.ok) return entriesResult;
      const lastStretch = stretches[stretches.length - 1];
      const endedAt = lastStretch.endedAt;
      const date = localDateKey(new Date(endedAt));
      const timestamp = safeIso(options.timestamp || now());
      if (!timestamp) return { ok: false, reason: 'A valid finish time is required.' };

      const entry = {
        id: record.id || makeId(),
        date,
        timestamp,
        hours: totalSleepHours(stretches),
        quality: aggregateQuality(stretches),
        formatVersion: 2,
        startedAt: record.startedAt,
        endedAt,
        stretches,
        awakeEvents: [...(record.awakeEvents || [])]
      };

      const entries = [...entriesResult.entries];
      const existingIndex = entries.findIndex(item => item?.date === date);
      if (existingIndex >= 0) entries[existingIndex] = entry;
      else entries.unshift(entry);

      const written = writeJson(SLEEP_ENTRIES_KEY, entries);
      if (!written.ok) return written;
      const cleared = remove(ACTIVE_KEY);
      if (!cleared.ok) return { ok: false, reason: 'The night was saved, but the active sleep timer could not be cleared.' };
      return { ok: true, entry };
    }

    function latestCompleted() {
      const result = completed();
      if (!result.ok) return result;
      const entries = [...result.entries].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      return { ok: true, entry: entries[0] || null };
    }

    return Object.freeze({
      ACTIVE_KEY,
      SLEEP_ENTRIES_KEY,
      QUALITIES,
      INTERVENTIONS,
      active,
      completed,
      latestCompleted,
      startNight,
      wake,
      rateStretch,
      stayUpForNow,
      logAwakeAction,
      backToSleep,
      finishNight
    });
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function timeLabel(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function durationLabel(hours) {
    const number = Number(hours);
    if (!Number.isFinite(number)) return '';
    if (number < 1) return Math.round(number * 60) + ' min';
    const rounded = Math.round(number * 10) / 10;
    return rounded + ' hr';
  }

  function elapsedLabel(startedAt) {
    const hours = hoursBetween(startedAt, new Date());
    if (hours === null) return '';
    const totalMinutes = Math.max(0, Math.round(hours * 60));
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!wholeHours) return minutes + ' min';
    return wholeHours + ' hr ' + minutes + ' min';
  }

  function timelineMarkup(record) {
    const items = [];
    (record?.stretches || []).forEach(stretch => items.push({
      timestamp: stretch.startedAt,
      kind: 'sleep',
      icon: '🌙',
      title: timeLabel(stretch.startedAt) + '–' + timeLabel(stretch.endedAt),
      meta: durationLabel(stretch.hours) + ' sleep' + (stretch.quality ? ' • ' + stretch.quality : '')
    }));
    (record?.awakeEvents || []).forEach(event => items.push({
      timestamp: event.timestamp,
      kind: 'awake',
      icon: INTERVENTIONS.find(item => item.type === event.type)?.icon || '•',
      title: timeLabel(event.timestamp) + ' • ' + event.label,
      meta: event.detail || ''
    }));
    items.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    if (!items.length) return '';
    return '<div class="sleep-timeline">' + items.map(item =>
      '<div class="sleep-timeline-row sleep-timeline-' + item.kind + '">' +
        '<span class="sleep-timeline-icon" aria-hidden="true">' + item.icon + '</span>' +
        '<div><strong>' + escapeHtml(item.title) + '</strong>' +
        (item.meta ? '<small>' + escapeHtml(item.meta) + '</small>' : '') + '</div>' +
      '</div>'
    ).join('') + '</div>';
  }

  function compatibilityFields(entry) {
    const hours = Number.isFinite(Number(entry?.hours)) ? String(entry.hours) : '';
    const quality = QUALITIES.includes(entry?.quality) ? entry.quality : '';
    return '<input type="hidden" name="hours" value="' + escapeHtml(hours) + '">' +
      '<div hidden aria-hidden="true">' + QUALITIES.map(item =>
        '<input type="radio" name="quality" value="' + item + '"' + (item === quality ? ' checked' : '') + '>'
      ).join('') + '</div>';
  }

  function createBrowserUi(tracker, health) {
    let pendingActionType = null;
    let statusMessage = '';
    let statusTimer = null;
    let tickTimer = null;

    function setStatus(message) {
      statusMessage = message || '';
      clearTimeout(statusTimer);
      if (statusMessage) statusTimer = setTimeout(() => { statusMessage = ''; render(); }, 3200);
    }

    function installCard() {
      const healthScreen = document.getElementById('health');
      const snapshot = healthScreen?.querySelector('.health-snapshot-card');
      if (!healthScreen || !snapshot) return;
      if (!document.getElementById('sleepTrackerCard')) {
        snapshot.insertAdjacentHTML('afterend', '<article class="card sleep-tracker-card" id="sleepTrackerCard" aria-live="polite"></article>');
      }
      const form = document.querySelector('[data-health-form="sleep"]');
      if (form && !form.dataset.sleepTrackerBound) {
        form.dataset.sleepTrackerBound = 'true';
        form.addEventListener('submit', event => {
          event.preventDefault();
          event.stopImmediatePropagation();
        }, true);
      }
    }

    function actionEditorMarkup() {
      if (!pendingActionType) return '';
      const isMedication = pendingActionType === 'medication';
      const label = isMedication ? 'What did you take?' : 'What are you trying?';
      const placeholder = isMedication ? 'Medication name + dose, if useful' : 'A short description';
      return '<div class="sleep-action-editor">' +
        '<label><span>' + label + '</span><input data-sleep-action-detail type="text" maxlength="160" placeholder="' + placeholder + '" autocomplete="off"></label>' +
        '<div class="sleep-action-editor-buttons">' +
          '<button class="button button-primary" type="button" data-sleep-action="save-detail">Log it</button>' +
          '<button class="button button-secondary" type="button" data-sleep-action="cancel-detail">Cancel</button>' +
        '</div>' +
        (isMedication ? '<small>GrizzlyJohn records what you took and when. It does not recommend doses or medication changes.</small>' : '') +
      '</div>';
    }

    function interventionsMarkup(record) {
      const events = record?.awakeEvents || [];
      return '<div class="sleep-awake-panel">' +
        '<div class="sleep-section-heading"><p class="eyebrow">NOT UP YET</p><h3>What are you going to try?</h3><p>Log one thing or five. The timestamp is automatic.</p></div>' +
        '<div class="sleep-intervention-grid">' + INTERVENTIONS.map(item =>
          '<button type="button" class="sleep-intervention" data-sleep-intervention="' + item.type + '">' +
            '<span>' + item.icon + '</span><strong>' + escapeHtml(item.label) + '</strong>' +
          '</button>'
        ).join('') + '</div>' +
        actionEditorMarkup() +
        (events.length ? '<div class="sleep-awake-events"><strong>While awake</strong>' + events.map(event =>
          '<div><span>' + timeLabel(event.timestamp) + '</span><p>' + escapeHtml(event.label) +
          (event.detail ? ' • ' + escapeHtml(event.detail) : '') + '</p></div>'
        ).join('') + '</div>' : '') +
        '<button class="button button-primary sleep-big-action" type="button" data-sleep-action="back-to-sleep">😴 Back to Sleep</button>' +
        '<button class="sleep-text-action" type="button" data-sleep-action="finish">☀️ Actually, I’m up for the day</button>' +
      '</div>';
    }

    function activeMarkup(record) {
      const timeline = timelineMarkup(record);
      if (record.status === 'sleeping') {
        const started = record.currentStretch?.startedAt || record.startedAt;
        return '<div class="sleep-tracker-state sleep-is-sleeping">' +
          '<div class="sleep-live-orb" aria-hidden="true">🌙</div>' +
          '<p class="eyebrow">SLEEP CLOCK RUNNING</p>' +
          '<h3>Sleeping since ' + escapeHtml(timeLabel(started)) + '</h3>' +
          '<p class="sleep-live-elapsed">' + escapeHtml(elapsedLabel(started)) + ' so far</p>' +
          '<button class="button button-primary sleep-big-action" type="button" data-sleep-action="wake">👀 I’m Awake</button>' +
          (timeline ? '<details class="sleep-details"><summary>Tonight so far</summary>' + timeline + '</details>' : '') +
        '</div>';
      }

      const lastStretch = (record.stretches || [])[record.stretches.length - 1];
      if (record.phase === 'quality') {
        return '<div class="sleep-tracker-state">' +
          '<p class="eyebrow">AWAKE</p><h3>How was that sleep stretch?</h3>' +
          '<p>' + escapeHtml(timeLabel(lastStretch?.startedAt)) + '–' + escapeHtml(timeLabel(lastStretch?.endedAt)) +
          ' • ' + escapeHtml(durationLabel(lastStretch?.hours)) + '</p>' +
          '<div class="sleep-quality-grid">' + QUALITIES.map(quality =>
            '<button type="button" data-sleep-quality="' + quality + '">' + quality + '</button>'
          ).join('') + '</div>' +
          (timeline ? timeline : '') +
        '</div>';
      }

      if (record.phase === 'decision') {
        return '<div class="sleep-tracker-state">' +
          '<p class="eyebrow">AWAKE</p><h3>Are you up for the day?</h3>' +
          '<div class="sleep-decision-grid">' +
            '<button class="button button-primary" type="button" data-sleep-action="finish">☀️ Yes, I’m up</button>' +
            '<button class="button button-secondary" type="button" data-sleep-action="not-up">🌙 Nope, not yet</button>' +
          '</div>' +
          (timeline ? '<details class="sleep-details"><summary>Tonight so far</summary>' + timeline + '</details>' : '') +
        '</div>';
      }

      return interventionsMarkup(record) + (timeline ? '<details class="sleep-details" open><summary>Tonight so far</summary>' + timeline + '</details>' : '');
    }

    function idleMarkup(entry) {
      const rich = entry?.formatVersion === 2 && Array.isArray(entry.stretches);
      const summary = entry
        ? '<div class="sleep-last-summary"><div><strong>' + escapeHtml(durationLabel(entry.hours)) + '</strong><small>Total sleep</small></div>' +
          '<div><strong>' + escapeHtml(entry.quality || '—') + '</strong><small>Overall quality</small></div>' +
          (rich ? '<div><strong>' + entry.stretches.length + '</strong><small>Sleep stretch' + (entry.stretches.length === 1 ? '' : 'es') + '</small></div>' : '') +
          '</div>' +
          (rich ? '<details class="sleep-details" open><summary>Last completed night</summary>' + timelineMarkup(entry) + '</details>' :
            '<p class="sleep-legacy-note">Last sleep log: ' + escapeHtml(durationLabel(entry.hours)) + ' • ' + escapeHtml(entry.quality || '') + '. Older logs still work normally.</p>')
        : '<p class="sleep-empty-copy">When you’re actually going to sleep, tap once. GrizzlyJohn handles the clock from there.</p>';

      return '<div class="sleep-tracker-state">' +
        '<p class="eyebrow">SLEEP</p><h3>Let the bear do the remembering.</h3>' +
        '<p>Start the clock at bedtime. If you wake up, log what happens without reconstructing the whole night tomorrow.</p>' +
        summary +
        '<button class="button button-primary sleep-big-action" type="button" data-sleep-action="start">🌙 Going to Sleep</button>' +
      '</div>';
    }

    function surfaceMarkup(record, latest, includeCompatibility) {
      const body = record ? activeMarkup(record) : idleMarkup(latest);
      return (includeCompatibility ? compatibilityFields(latest) : '') +
        '<div class="sleep-tracker-surface">' + body +
        (statusMessage ? '<p class="sleep-tracker-status" role="status">' + escapeHtml(statusMessage) + '</p>' : '') +
        '</div>';
    }

    function updateChoice(record) {
      const choice = document.querySelector('[data-health-log-type="sleep"] small');
      if (!choice) return;
      if (!record) choice.textContent = 'Start / wake / back to sleep';
      else if (record.status === 'sleeping') choice.textContent = 'Sleep clock is running';
      else choice.textContent = 'Night paused • log what helps';
    }

    function render() {
      installCard();
      const activeResult = tracker.active();
      const latestResult = tracker.latestCompleted();
      const record = activeResult.ok ? activeResult.value : null;
      const latest = latestResult.ok ? latestResult.entry : null;
      const card = document.getElementById('sleepTrackerCard');
      const form = document.querySelector('[data-health-form="sleep"]');

      if (card) {
        if (!activeResult.ok || !latestResult.ok) {
          card.innerHTML = '<div class="sleep-tracker-state"><p class="eyebrow">SLEEP</p><h3>Sleep data needs attention.</h3><p>' +
            escapeHtml(activeResult.reason || latestResult.reason || 'The saved sleep data could not be read.') +
            '</p><p>Your existing data was left unchanged.</p></div>';
        } else {
          card.innerHTML = surfaceMarkup(record, latest, false);
        }
      }
      if (form) {
        form.innerHTML = surfaceMarkup(record, latest, true);
      }
      updateChoice(record);
      clearInterval(tickTimer);
      if (record?.status === 'sleeping') tickTimer = setInterval(render, 60000);
    }

    function afterHealthWrite() {
      if (window.GrizzlyJohnHealthUIV3?.render) window.GrizzlyJohnHealthUIV3.render();
      render();
    }

    function handleResult(result, successMessage, refreshHealth = false) {
      if (!result?.ok) {
        setStatus(result?.reason || 'That could not be saved.');
        render();
        return;
      }
      pendingActionType = null;
      if (successMessage) setStatus(successMessage);
      if (refreshHealth) afterHealthWrite();
      else render();
    }

    document.addEventListener('click', event => {
      const sleepChoice = event.target.closest('[data-health-log-type="sleep"]');
      if (sleepChoice) setTimeout(render, 0);

      const qualityButton = event.target.closest('[data-sleep-quality]');
      if (qualityButton) {
        handleResult(tracker.rateStretch(qualityButton.dataset.sleepQuality), 'Stretch rated.');
        return;
      }

      const interventionButton = event.target.closest('[data-sleep-intervention]');
      if (interventionButton) {
        const type = interventionButton.dataset.sleepIntervention;
        if (type === 'medication' || type === 'other') {
          pendingActionType = type;
          render();
          setTimeout(() => document.querySelector('[data-sleep-action-detail]')?.focus(), 20);
        } else {
          handleResult(tracker.logAwakeAction({ type }), 'Logged at ' + timeLabel(new Date()) + '.');
        }
        return;
      }

      const actionButton = event.target.closest('[data-sleep-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.sleepAction;

      if (action === 'start') handleResult(tracker.startNight(), 'Sleep clock started.');
      if (action === 'wake') handleResult(tracker.wake(), 'Sleep stretch stopped.');
      if (action === 'not-up') handleResult(tracker.stayUpForNow(), '');
      if (action === 'back-to-sleep') handleResult(tracker.backToSleep(), 'New sleep stretch started.');
      if (action === 'finish') handleResult(tracker.finishNight(), 'Night wrapped up.', true);
      if (action === 'cancel-detail') {
        pendingActionType = null;
        render();
      }
      if (action === 'save-detail') {
        const surface = actionButton.closest('.sleep-tracker-surface');
        const detail = cleanText(surface?.querySelector('[data-sleep-action-detail]')?.value);
        handleResult(tracker.logAwakeAction({ type: pendingActionType, detail }), 'Logged at ' + timeLabel(new Date()) + '.');
      }
    });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-nav="health"]')) setTimeout(render, 0);
    });

    render();
    return Object.freeze({ render });
  }

  const api = {
    ACTIVE_KEY,
    SLEEP_ENTRIES_KEY,
    QUALITIES,
    INTERVENTIONS,
    hoursBetween,
    aggregateQuality,
    totalSleepHours,
    createSleepTracker
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window.localStorage && typeof document !== 'undefined') {
    const init = () => {
      const tracker = createSleepTracker(window.localStorage);
      window.GrizzlyJohnSleepTracker = tracker;
      createBrowserUi(tracker, window.GrizzlyJohnHealthV3);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
