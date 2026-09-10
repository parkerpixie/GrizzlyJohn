(() => {
  'use strict';

  const ACTIVITY_METS = Object.freeze({
    Walking: Object.freeze({ Easy: 2.8, Moderate: 3.5, Hard: 4.3 }),
    Hiking: Object.freeze({ Easy: 4.0, Moderate: 5.3, Hard: 7.0 }),
    Cycling: Object.freeze({ Easy: 4.0, Moderate: 6.8, Hard: 8.0 }),
    'Strength / Gym': Object.freeze({ Easy: 2.5, Moderate: 3.5, Hard: 5.0 }),
    'Yard / House Work': Object.freeze({ Easy: 2.5, Moderate: 3.5, Hard: 5.0 })
  });

  function estimateActivityCalories({ activityType, intensity, durationMinutes, weightPounds }) {
    const minutes = Number(durationMinutes);
    const pounds = Number(weightPounds);
    if (!ACTIVITY_METS[activityType] || !Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(pounds) || pounds <= 0) return null;
    const level = ['Easy', 'Moderate', 'Hard'].includes(intensity) ? intensity : 'Moderate';
    const met = ACTIVITY_METS[activityType][level];
    const kilograms = pounds / 2.2046226218;
    return Math.max(0, Math.round((met * 3.5 * kilograms / 200) * minutes));
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function compactNumber(value, maximumFractionDigits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toLocaleString(undefined, { maximumFractionDigits });
  }

  function localDateLabel(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return '';
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function timeLabel(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function installMarkup() {
    if (!document.getElementById('health')) {
      const main = document.querySelector('.app-shell main');
      main?.insertAdjacentHTML('beforeend', `
        <section class="screen health-screen" id="health" data-screen>
          <div class="screen-intro health-intro">
            <p class="eyebrow">HEALTH</p>
            <h1>What has your body been doing?</h1>
            <p>A few useful signals, logged in seconds. No homework. No score. No tiny doctor living in the app.</p>
          </div>

          <article class="card health-snapshot-card" aria-labelledby="healthSnapshotHeading">
            <div class="health-snapshot-heading">
              <div>
                <p class="eyebrow">TODAY'S BODY SNAPSHOT</p>
                <h2 id="healthSnapshotHeading">At a glance, not at a glare.</h2>
              </div>
              <span class="health-snapshot-date" id="healthSnapshotDate">Today</span>
            </div>

            <div class="health-snapshot-grid">
              <div class="health-snapshot-item">
                <span class="health-snapshot-icon" aria-hidden="true">🩺</span>
                <strong id="healthSnapshotVitals">— / —</strong>
                <small id="healthSnapshotPulse">Blood pressure + pulse</small>
              </div>
              <div class="health-snapshot-item">
                <span class="health-snapshot-icon" aria-hidden="true">⚖️</span>
                <strong id="healthSnapshotWeight">—</strong>
                <small id="healthSnapshotWeightMeta">Most recent weight</small>
              </div>
              <div class="health-snapshot-item">
                <span class="health-snapshot-icon" aria-hidden="true">🥾</span>
                <strong id="healthSnapshotActivity">0 min</strong>
                <small>Active minutes today</small>
              </div>
              <div class="health-snapshot-item">
                <span class="health-snapshot-icon" aria-hidden="true">💊</span>
                <strong id="healthSnapshotMedication">0 / 3</strong>
                <small>Medication windows</small>
              </div>
              <div class="health-snapshot-item">
                <span class="health-snapshot-icon" aria-hidden="true">🌙</span>
                <strong id="healthSnapshotSleep">—</strong>
                <small id="healthSnapshotSleepMeta">Last night's sleep</small>
              </div>
              <div class="health-snapshot-item">
                <span class="health-snapshot-icon" aria-hidden="true">📝</span>
                <strong id="healthSnapshotNotes">0</strong>
                <small>Notes / symptoms today</small>
              </div>
              <div class="health-snapshot-item health-snapshot-wide">
                <span class="health-snapshot-icon" aria-hidden="true">🌤️</span>
                <strong id="healthSnapshotBodyFeel">—</strong>
                <small>Optional body feel</small>
              </div>
            </div>

            <button class="button button-primary health-log-main-button" id="openHealthLog" type="button">+ Log Health</button>
            <p class="health-main-status" id="healthMainStatus" role="status" aria-live="polite"></p>
            <p class="health-privacy-note">Health stays on this device and is included in GrizzlyJohn Backup.</p>
          </article>

          <section class="health-today-section" aria-labelledby="healthTodayHeading">
            <div class="health-section-heading">
              <p class="eyebrow">TODAY</p>
              <h2 id="healthTodayHeading">What you've logged</h2>
              <p>Just the record. No grades, streaks, or alarm bells.</p>
            </div>
            <div class="health-log-list" id="healthTodayLog"></div>
          </section>
        </section>`);
    }

    const nav = document.querySelector('.bottom-nav');
    if (nav && !nav.querySelector('.nav-item[data-nav="health"]')) {
      nav.insertAdjacentHTML('beforeend', '<button class="nav-item" data-nav="health" type="button"><span>🩺</span><small>Health</small></button>');
    }

    if (!document.getElementById('healthLogDialog')) {
      document.body.insertAdjacentHTML('beforeend', `
        <dialog class="health-log-dialog" id="healthLogDialog" aria-labelledby="healthLogTitle">
          <div class="health-log-shell">
            <div class="health-log-header">
              <button class="health-log-back" id="healthLogBack" type="button" aria-label="Back to health log choices" hidden>←</button>
              <h2 id="healthLogTitle">Log Health</h2>
              <button class="health-log-close" id="healthLogClose" type="button" aria-label="Close Health log">×</button>
            </div>
            <div class="health-log-content">
              <section class="health-log-chooser" id="healthLogChooser">
                <p>What are you logging right now?</p>
                <div class="health-log-choices">
                  <button class="health-log-choice" type="button" data-health-log-type="vitals"><span>🩺</span><strong>Vitals</strong><small>Blood pressure + pulse</small></button>
                  <button class="health-log-choice" type="button" data-health-log-type="weight"><span>⚖️</span><strong>Weight</strong><small>One number</small></button>
                  <button class="health-log-choice" type="button" data-health-log-type="activity"><span>🥾</span><strong>Activity</strong><small>What you did + how long</small></button>
                  <button class="health-log-choice" type="button" data-health-log-type="medication"><span>💊</span><strong>Medication</strong><small>Morning / midday / evening</small></button>
                  <button class="health-log-choice" type="button" data-health-log-type="sleep"><span>🌙</span><strong>Sleep</strong><small>Hours + simple quality</small></button>
                  <button class="health-log-choice" type="button" data-health-log-type="note"><span>📝</span><strong>Note / symptom</strong><small>Capture the weird human stuff</small></button>
                  <button class="health-log-choice" type="button" data-health-log-type="bodyFeel"><span>🌤️</span><strong>Body feel</strong><small>Optional broad signal</small></button>
                </div>
                <p class="health-footnote">GrizzlyJohn records observations only. It does not diagnose symptoms, interpret readings, or recommend medication changes.</p>
              </section>

              <form class="health-log-form" data-health-form="vitals" hidden>
                <div class="health-form-intro"><h3>Blood pressure + pulse</h3><p>The time is added automatically. Add a note only if it matters.</p></div>
                <div class="health-vitals-row">
                  <label class="health-field"><span>Systolic</span><input name="systolic" type="number" inputmode="numeric" min="1" step="1" required></label>
                  <label class="health-field"><span>Diastolic</span><input name="diastolic" type="number" inputmode="numeric" min="1" step="1" required></label>
                  <label class="health-field"><span>Pulse</span><input name="pulse" type="number" inputmode="numeric" min="1" step="1" required></label>
                </div>
                <label class="health-field"><span>Optional note</span><input name="note" type="text" maxlength="220" placeholder="After sitting, after a walk, etc."></label>
                <p class="health-form-status" data-health-form-status></p>
                <div class="health-form-actions"><button class="button button-primary" type="submit">Save vitals</button></div>
              </form>

              <form class="health-log-form" data-health-form="weight" hidden>
                <div class="health-form-intro"><h3>Weight</h3><p>Log it when it is useful. This is not asking for a daily weigh-in.</p></div>
                <label class="health-field"><span>Weight (lb)</span><input name="weight" type="number" inputmode="decimal" min="1" step="0.1" required></label>
                <p class="health-form-status" data-health-form-status></p>
                <div class="health-form-actions"><button class="button button-primary" type="submit">Save weight</button></div>
              </form>

              <form class="health-log-form" data-health-form="activity" hidden>
                <div class="health-form-intro"><h3>Activity</h3><p>Movement you actually did. Estimated calories are optional context, not a goal.</p></div>
                <label class="health-field"><span>Activity type</span><select name="activityType" required><option value="">Choose one</option><option>Walking</option><option>Hiking</option><option>Cycling</option><option>Strength / Gym</option><option>Yard / House Work</option><option>Other</option></select></label>
                <label class="health-field"><span>Minutes</span><input name="durationMinutes" type="number" inputmode="numeric" min="1" max="1440" step="1" required></label>
                <label class="health-field"><span>Intensity (optional)</span><select name="intensity"><option value="">Not specified</option><option>Easy</option><option>Moderate</option><option>Hard</option></select></label>
                <p class="health-estimate" id="healthActivityEstimate">A calorie estimate will appear here when there is enough information.</p>
                <p class="health-form-status" data-health-form-status></p>
                <div class="health-form-actions"><button class="button button-primary" type="submit">Save activity</button></div>
              </form>

              <form class="health-log-form" data-health-form="medication" hidden>
                <div class="health-form-intro"><h3>Medication windows</h3><p>Just whether the window is complete. No medication names or doses.</p></div>
                <fieldset class="health-fieldset"><legend>Completed today</legend><div class="health-med-grid">
                  <label class="health-med-option"><input name="morning" type="checkbox"><span>Morning</span></label>
                  <label class="health-med-option"><input name="midday" type="checkbox"><span>Midday</span></label>
                  <label class="health-med-option"><input name="evening" type="checkbox"><span>Evening</span></label>
                </div></fieldset>
                <p class="health-form-status" data-health-form-status></p>
                <div class="health-form-actions"><button class="button button-primary" type="submit">Save medication</button></div>
              </form>

              <form class="health-log-form" data-health-form="sleep" hidden>
                <div class="health-form-intro"><h3>Last night's sleep</h3><p>Keep it simple: roughly how long and how it felt.</p></div>
                <label class="health-field"><span>Hours slept</span><input name="hours" type="number" inputmode="decimal" min="0" max="24" step="0.25" required></label>
                <fieldset class="health-fieldset"><legend>Sleep quality</legend><div class="health-chip-grid">
                  <label class="health-chip"><input type="radio" name="quality" value="Poor" required><span>Poor</span></label>
                  <label class="health-chip"><input type="radio" name="quality" value="Okay"><span>Okay</span></label>
                  <label class="health-chip"><input type="radio" name="quality" value="Good"><span>Good</span></label>
                  <label class="health-chip"><input type="radio" name="quality" value="Great"><span>Great</span></label>
                </div></fieldset>
                <p class="health-form-status" data-health-form-status></p>
                <div class="health-form-actions"><button class="button button-primary" type="submit">Save sleep</button></div>
              </form>

              <form class="health-log-form" data-health-form="note" hidden>
                <div class="health-form-intro"><h3>Note or symptom</h3><p>Capture what happened in your own words. Tags are optional.</p></div>
                <label class="health-field"><span>What happened?</span><textarea name="text" maxlength="800" placeholder="A quick note is plenty." required></textarea></label>
                <fieldset class="health-fieldset"><legend>Optional quick tags</legend><div class="health-chip-grid">
                  <label class="health-chip"><input type="checkbox" name="tags" value="headache"><span>Headache</span></label>
                  <label class="health-chip"><input type="checkbox" name="tags" value="pain"><span>Pain</span></label>
                  <label class="health-chip"><input type="checkbox" name="tags" value="dizziness"><span>Dizziness</span></label>
                  <label class="health-chip"><input type="checkbox" name="tags" value="nausea"><span>Nausea</span></label>
                  <label class="health-chip"><input type="checkbox" name="tags" value="fatigue"><span>Fatigue</span></label>
                  <label class="health-chip"><input type="checkbox" name="tags" value="GI"><span>GI</span></label>
                  <label class="health-chip"><input type="checkbox" name="tags" value="sick/ill"><span>Sick / ill</span></label>
                  <label class="health-chip"><input type="checkbox" name="tags" value="other"><span>Other</span></label>
                </div></fieldset>
                <label class="health-field"><span>Severity (optional)</span><select name="severity"><option value="">Not specified</option><option>Mild</option><option>Moderate</option><option>Strong</option></select></label>
                <p class="health-form-status" data-health-form-status></p>
                <div class="health-form-actions"><button class="button button-primary" type="submit">Save note</button></div>
              </form>

              <form class="health-log-form" data-health-form="bodyFeel" hidden>
                <div class="health-form-intro"><h3>Body feel</h3><p>One broad signal, only when it feels useful.</p></div>
                <fieldset class="health-fieldset"><legend>How does your body feel overall?</legend><div class="health-chip-grid">
                  <label class="health-chip"><input type="radio" name="value" value="Great" required><span>Great</span></label>
                  <label class="health-chip"><input type="radio" name="value" value="Good"><span>Good</span></label>
                  <label class="health-chip"><input type="radio" name="value" value="Okay"><span>Okay</span></label>
                  <label class="health-chip"><input type="radio" name="value" value="Rough"><span>Rough</span></label>
                  <label class="health-chip"><input type="radio" name="value" value="Bad"><span>Bad</span></label>
                </div></fieldset>
                <p class="health-form-status" data-health-form-status></p>
                <div class="health-form-actions"><button class="button button-primary" type="submit">Save body feel</button></div>
              </form>
            </div>
          </div>
        </dialog>`);
    }
  }

  function createUi(health) {
    const $ = selector => document.querySelector(selector);
    const $$ = selector => [...document.querySelectorAll(selector)];
    const dialog = $('#healthLogDialog');
    const chooser = $('#healthLogChooser');
    const title = $('#healthLogTitle');
    const back = $('#healthLogBack');
    const forms = $$('[data-health-form]');
    const todayKey = () => health.localDateKey(new Date());
    let mainStatusTimer = null;

    function setMainStatus(message = '') {
      const node = $('#healthMainStatus');
      if (!node) return;
      node.textContent = message;
      clearTimeout(mainStatusTimer);
      if (message) mainStatusTimer = setTimeout(() => { node.textContent = ''; }, 2800);
    }

    function formStatus(form, message = '') {
      const node = form?.querySelector('[data-health-form-status]');
      if (node) node.textContent = message;
    }

    function showChooser() {
      chooser.hidden = false;
      forms.forEach(form => { form.hidden = true; formStatus(form, ''); });
      back.hidden = true;
      title.textContent = 'Log Health';
      setTimeout(() => chooser.querySelector('[data-health-log-type]')?.focus(), 20);
    }

    function prefill(type) {
      const date = todayKey();
      if (type === 'medication') {
        const form = document.querySelector('[data-health-form="medication"]');
        const result = health.medication.get(date);
        const entry = result.ok ? result.entry : null;
        ['morning', 'midday', 'evening'].forEach(windowName => {
          const input = form?.elements?.[windowName];
          if (input) input.checked = Boolean(entry?.[windowName]);
        });
      }
      if (type === 'sleep') {
        const form = document.querySelector('[data-health-form="sleep"]');
        const result = health.sleep.forDate(date);
        const entry = result.ok ? result.entries[0] : null;
        if (entry && form) {
          form.elements.hours.value = entry.hours;
          const quality = form.querySelector(`input[name="quality"][value="${entry.quality}"]`);
          if (quality) quality.checked = true;
        }
      }
      if (type === 'bodyFeel') {
        const form = document.querySelector('[data-health-form="bodyFeel"]');
        const result = health.bodyFeel.forDate(date);
        const entry = result.ok ? result.entries[0] : null;
        if (entry && form) {
          const value = form.querySelector(`input[name="value"][value="${entry.value}"]`);
          if (value) value.checked = true;
        }
      }
    }

    function showForm(type) {
      const form = document.querySelector(`[data-health-form="${type}"]`);
      if (!form) return;
      chooser.hidden = true;
      forms.forEach(item => { item.hidden = item !== form; formStatus(item, ''); });
      const names = {
        vitals: 'Log vitals', weight: 'Log weight', activity: 'Log activity', medication: 'Medication',
        sleep: 'Log sleep', note: 'Add a note', bodyFeel: 'Body feel'
      };
      title.textContent = names[type] || 'Log Health';
      back.hidden = false;
      prefill(type);
      if (type === 'activity') updateActivityEstimate();
      setTimeout(() => form.querySelector('input:not([type="radio"]):not([type="checkbox"]), select, textarea, input')?.focus(), 20);
    }

    function openDialog(type) {
      if (!dialog) return;
      if (type) showForm(type); else showChooser();
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }

    function closeDialog() {
      if (!dialog) return;
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
      showChooser();
    }

    function updateActivityEstimate() {
      const form = document.querySelector('[data-health-form="activity"]');
      const estimateNode = $('#healthActivityEstimate');
      if (!form || !estimateNode) return null;
      const data = new FormData(form);
      const activityType = data.get('activityType');
      const durationMinutes = Number(data.get('durationMinutes'));
      const intensity = data.get('intensity');
      const weightResult = health.weights.latest({ throughDate: todayKey() });
      const weight = weightResult.ok ? weightResult.entry?.weight : null;

      if (!activityType || !durationMinutes) {
        estimateNode.textContent = 'A calorie estimate will appear here when there is enough information.';
        return null;
      }
      if (activityType === 'Other') {
        estimateNode.textContent = 'This activity will save without a calorie estimate.';
        return null;
      }
      if (!weight) {
        estimateNode.textContent = 'No weight is on file, so this activity will save without a calorie estimate.';
        return null;
      }
      const estimate = estimateActivityCalories({ activityType, intensity, durationMinutes, weightPounds: weight });
      if (estimate === null) {
        estimateNode.textContent = 'This activity will save without a calorie estimate.';
        return null;
      }
      estimateNode.textContent = `Estimated activity calories: about ${estimate}. This is a rough estimate based on activity, duration, intensity, and the most recent weight.`;
      return estimate;
    }

    function completeSave(label, form, { keepFormValues = false } = {}) {
      if (!keepFormValues) form?.reset();
      render();
      closeDialog();
      setMainStatus(`${label} saved.`);
    }

    function saveMedication(form) {
      const date = todayKey();
      const current = health.medication.get(date);
      if (!current.ok) return current;
      const previous = current.entry || { morning: false, midday: false, evening: false };
      const desired = {
        morning: form.elements.morning.checked,
        midday: form.elements.midday.checked,
        evening: form.elements.evening.checked
      };
      const changed = ['morning', 'midday', 'evening'].filter(windowName => Boolean(previous[windowName]) !== desired[windowName]);
      if (!changed.length) return { ok: true, unchanged: true };
      for (const windowName of changed) {
        const result = health.medication.setWindow(date, windowName, desired[windowName]);
        if (!result.ok) return result;
      }
      return { ok: true };
    }

    function handleSubmit(event) {
      const form = event.target.closest('[data-health-form]');
      if (!form) return;
      event.preventDefault();
      if (!form.reportValidity()) return;
      formStatus(form, '');
      const type = form.dataset.healthForm;
      const data = new FormData(form);
      let result;
      let label;

      try {
        if (type === 'vitals') {
          result = health.vitals.add({
            systolic: data.get('systolic'),
            diastolic: data.get('diastolic'),
            pulse: data.get('pulse'),
            note: data.get('note')
          });
          label = 'Vitals';
        } else if (type === 'weight') {
          result = health.weights.add(data.get('weight'));
          label = 'Weight';
        } else if (type === 'activity') {
          const estimate = updateActivityEstimate();
          const activity = {
            activityType: data.get('activityType'),
            durationMinutes: data.get('durationMinutes'),
            intensity: data.get('intensity')
          };
          if (estimate !== null) activity.estimatedCalories = estimate;
          result = health.activities.add(activity);
          label = 'Activity';
        } else if (type === 'medication') {
          result = saveMedication(form);
          label = 'Medication';
        } else if (type === 'sleep') {
          result = health.sleep.set({ hours: data.get('hours'), quality: data.get('quality') });
          label = 'Sleep';
        } else if (type === 'note') {
          result = health.notes.add({
            text: data.get('text'),
            tags: data.getAll('tags'),
            severity: data.get('severity')
          });
          label = 'Note';
        } else if (type === 'bodyFeel') {
          result = health.bodyFeel.set(data.get('value'));
          label = 'Body feel';
        }
      } catch (error) {
        result = { ok: false, reason: String(error?.message || error) };
      }

      if (!result?.ok) {
        formStatus(form, result?.reason || 'That could not be saved. Your existing Health data was left alone.');
        return;
      }
      completeSave(label, form);
    }

    function renderSnapshot() {
      const result = health.snapshot(todayKey());
      if (!result.ok) {
        setMainStatus(result.reason || 'Health data could not be read. Existing data was left unchanged.');
        return false;
      }
      $('#healthSnapshotDate').textContent = localDateLabel(result.date) || 'Today';

      if (result.latestVitals) {
        $('#healthSnapshotVitals').textContent = `${compactNumber(result.latestVitals.systolic, 0)} / ${compactNumber(result.latestVitals.diastolic, 0)}`;
        $('#healthSnapshotPulse').textContent = `Pulse ${compactNumber(result.latestVitals.pulse, 0)} • ${timeLabel(result.latestVitals.timestamp)}`;
      } else {
        $('#healthSnapshotVitals').textContent = '— / —';
        $('#healthSnapshotPulse').textContent = 'Blood pressure + pulse';
      }

      if (result.latestWeight) {
        $('#healthSnapshotWeight').textContent = `${compactNumber(result.latestWeight.weight)} lb`;
        $('#healthSnapshotWeightMeta').textContent = result.latestWeight.date === result.date ? `Logged ${timeLabel(result.latestWeight.timestamp)}` : `Most recent • ${localDateLabel(result.latestWeight.date)}`;
      } else {
        $('#healthSnapshotWeight').textContent = '—';
        $('#healthSnapshotWeightMeta').textContent = 'Most recent weight';
      }

      $('#healthSnapshotActivity').textContent = `${compactNumber(result.activityMinutes, 0)} min`;
      $('#healthSnapshotMedication').textContent = `${result.medicationCompleted} / 3`;

      if (result.sleep) {
        $('#healthSnapshotSleep').textContent = `${compactNumber(result.sleep.hours)} hr`;
        $('#healthSnapshotSleepMeta').textContent = result.sleep.quality;
      } else {
        $('#healthSnapshotSleep').textContent = '—';
        $('#healthSnapshotSleepMeta').textContent = "Last night's sleep";
      }

      $('#healthSnapshotNotes').textContent = String(result.noteCount);
      $('#healthSnapshotBodyFeel').textContent = result.bodyFeel?.value || '—';
      return true;
    }

    function renderTodayLog() {
      const date = todayKey();
      const sources = [
        ['vitals', health.vitals.forDate(date)],
        ['weight', health.weights.forDate(date)],
        ['activity', health.activities.forDate(date)],
        ['sleep', health.sleep.forDate(date)],
        ['note', health.notes.forDate(date)],
        ['bodyFeel', health.bodyFeel.forDate(date)]
      ];
      const failed = sources.find(([, result]) => !result.ok);
      const list = $('#healthTodayLog');
      if (!list) return;
      if (failed) {
        list.innerHTML = `<div class="health-empty"><span>🌲</span><p>${escapeHtml(failed[1].reason || 'Health history could not be read. Existing data was preserved.')}</p></div>`;
        return;
      }

      const items = [];
      sources.forEach(([type, result]) => result.entries.forEach(entry => items.push({ type, entry, timestamp: entry.timestamp })));
      const medication = health.medication.get(date);
      if (medication.ok && medication.entry) items.push({ type: 'medication', entry: medication.entry, timestamp: medication.entry.updatedAt });

      items.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      if (!items.length) {
        list.innerHTML = '<div class="health-empty"><span>🌲</span><p>Nothing logged yet. That is allowed. Use <strong>+ Log Health</strong> when there is something worth capturing.</p></div>';
        return;
      }

      const icon = { vitals: '🩺', weight: '⚖️', activity: '🥾', medication: '💊', sleep: '🌙', note: '📝', bodyFeel: '🌤️' };
      const details = item => {
        const entry = item.entry;
        if (item.type === 'vitals') return { title: `${compactNumber(entry.systolic, 0)} / ${compactNumber(entry.diastolic, 0)} • pulse ${compactNumber(entry.pulse, 0)}`, body: entry.note || 'Vitals' };
        if (item.type === 'weight') return { title: `${compactNumber(entry.weight)} lb`, body: 'Weight' };
        if (item.type === 'activity') {
          const estimate = Number.isFinite(Number(entry.estimatedCalories)) ? ` • ~${compactNumber(entry.estimatedCalories, 0)} cal estimate` : '';
          const intensity = entry.intensity ? ` • ${entry.intensity}` : '';
          return { title: `${escapeHtml(entry.activityType)} • ${compactNumber(entry.durationMinutes, 0)} min`, body: `${intensity.replace(/^ • /, '')}${estimate}`.replace(/^ • /, '') || 'Activity' };
        }
        if (item.type === 'medication') {
          const completed = ['morning', 'midday', 'evening'].filter(name => entry[name]).map(name => name[0].toUpperCase() + name.slice(1));
          return { title: completed.length ? `${completed.length} of 3 medication windows` : 'Medication windows', body: completed.length ? completed.join(' • ') : 'No windows marked complete' };
        }
        if (item.type === 'sleep') return { title: `${compactNumber(entry.hours)} hr • ${escapeHtml(entry.quality)}`, body: 'Sleep' };
        if (item.type === 'note') {
          const tags = Array.isArray(entry.tags) && entry.tags.length ? ` • ${entry.tags.join(', ')}` : '';
          const severity = entry.severity ? `${entry.severity}${tags}` : tags.replace(/^ • /, '');
          return { title: escapeHtml(entry.text), body: severity || 'Health note' };
        }
        if (item.type === 'bodyFeel') return { title: escapeHtml(entry.value), body: 'Body feel' };
        return { title: 'Health entry', body: '' };
      };

      list.innerHTML = items.map(item => {
        const copy = details(item);
        return `<article class="health-log-entry"><span class="health-log-entry-icon" aria-hidden="true">${icon[item.type] || '•'}</span><div><strong>${copy.title}</strong><p>${escapeHtml(copy.body)}</p></div><time datetime="${escapeHtml(item.timestamp || '')}">${escapeHtml(timeLabel(item.timestamp))}</time></article>`;
      }).join('');
    }

    function render() {
      renderSnapshot();
      renderTodayLog();
    }

    $('#openHealthLog')?.addEventListener('click', () => openDialog());
    $('#healthLogClose')?.addEventListener('click', closeDialog);
    back?.addEventListener('click', showChooser);
    dialog?.addEventListener('click', event => {
      const choice = event.target.closest('[data-health-log-type]');
      if (choice) showForm(choice.dataset.healthLogType);
    });
    dialog?.addEventListener('submit', handleSubmit);
    dialog?.addEventListener('input', event => {
      if (event.target.closest('[data-health-form="activity"]')) updateActivityEstimate();
    });
    dialog?.addEventListener('change', event => {
      if (event.target.closest('[data-health-form="activity"]')) updateActivityEstimate();
    });
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });

    document.addEventListener('click', event => {
      const healthNav = event.target.closest('[data-nav="health"]');
      if (healthNav) setTimeout(render, 0);
    });

    render();
    return Object.freeze({ render, openDialog, showForm, updateActivityEstimate });
  }

  function init() {
    const health = window.GrizzlyJohnHealthV3;
    if (!health) return;
    installMarkup();
    const ui = createUi(health);
    window.GrizzlyJohnHealthUIV3 = Object.freeze({ ...ui, estimateActivityCalories, ACTIVITY_METS });
  }

  const api = { estimateActivityCalories, ACTIVITY_METS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
