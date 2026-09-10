(() => {
  'use strict';

  const PREFS_KEY = 'grizzlyjohn:v3:health:dashboardPrefs';
  const PREFS_VERSION = 1;
  const CHECKIN_TYPES = Object.freeze([
    ['vitals', 'Vitals'],
    ['weight', 'Weight'],
    ['activity', 'Activity'],
    ['medication', 'Medication'],
    ['sleep', 'Sleep'],
    ['note', 'Note / symptom'],
    ['bodyFeel', 'Body feel']
  ]);
  const TYPE_ICONS = Object.freeze({ vitals: '🩺', weight: '⚖️', activity: '🥾', medication: '💊', sleep: '🌙', note: '📝', bodyFeel: '🌤️' });
  const DEFAULT_PREFS = Object.freeze({
    version: PREFS_VERSION,
    checkInItems: ['sleep', 'bodyFeel'],
    goals: {
      activity: { enabled: false, targetMinutes: 30 },
      sleep: { enabled: false, minHours: 7, maxHours: 8 },
      medication: { enabled: false, targetWindows: 3 },
      weight: { enabled: false, targetWeight: null, startingWeight: null },
      vitals: { enabled: false, systolicMin: null, systolicMax: null, diastolicMin: null, diastolicMax: null, pulseMin: null, pulseMax: null }
    }
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function average(values) {
    const usable = values.map(finite).filter(value => value !== null);
    if (!usable.length) return null;
    return usable.reduce((sum, value) => sum + value, 0) / usable.length;
  }

  function round(value, digits = 1) {
    if (!Number.isFinite(Number(value))) return null;
    const factor = 10 ** digits;
    return Math.round(Number(value) * factor) / factor;
  }

  function dateFromKey(key) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function keyFromDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function shiftDateKey(key, days) {
    const date = dateFromKey(key);
    if (!date) return key;
    date.setDate(date.getDate() + days);
    return keyFromDate(date);
  }

  function rangeForDays(endDate, days) {
    const end = String(endDate);
    return { start: shiftDateKey(end, -(Math.max(1, days) - 1)), end };
  }

  function inRange(entry, range) {
    return Boolean(entry?.date && entry.date >= range.start && entry.date <= range.end);
  }

  function mode(values) {
    const counts = new Map();
    values.filter(Boolean).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] || null;
  }

  function summarizeData(data, days, endDate) {
    const range = rangeForDays(endDate, days);
    const vitals = (data.vitals || []).filter(entry => inRange(entry, range));
    const weights = (data.weights || []).filter(entry => inRange(entry, range));
    const activities = (data.activities || []).filter(entry => inRange(entry, range));
    const medication = (data.medication || []).filter(entry => inRange(entry, range));
    const sleep = (data.sleep || []).filter(entry => inRange(entry, range));
    const notes = (data.notes || []).filter(entry => inRange(entry, range));
    const bodyFeels = (data.bodyFeels || []).filter(entry => inRange(entry, range));

    const chronologicalWeights = [...weights].sort((a, b) => String(a.timestamp || a.date).localeCompare(String(b.timestamp || b.date)));
    const weightFirst = chronologicalWeights[0]?.weight ?? null;
    const weightLast = chronologicalWeights[chronologicalWeights.length - 1]?.weight ?? null;
    const activityTotal = activities.reduce((sum, entry) => sum + (finite(entry.durationMinutes) || 0), 0);
    const activityDays = new Set(activities.map(entry => entry.date)).size;
    const medicationCompleted = medication.reduce((sum, entry) => sum + ['morning', 'midday', 'evening'].filter(name => entry?.[name]).length, 0);
    const medicationPossible = medication.length * 3;
    const qualityCounts = sleep.reduce((counts, entry) => {
      if (entry.quality) counts[entry.quality] = (counts[entry.quality] || 0) + 1;
      return counts;
    }, {});
    const tagCounts = notes.flatMap(entry => Array.isArray(entry.tags) ? entry.tags : []).reduce((counts, tag) => {
      const cleaned = String(tag || '').trim();
      if (cleaned) counts[cleaned] = (counts[cleaned] || 0) + 1;
      return counts;
    }, {});
    const recurringTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
    const bodyFeelCounts = bodyFeels.reduce((counts, entry) => {
      if (entry.value) counts[entry.value] = (counts[entry.value] || 0) + 1;
      return counts;
    }, {});

    return {
      days,
      range,
      vitals: {
        count: vitals.length,
        avgSystolic: round(average(vitals.map(entry => entry.systolic)), 0),
        avgDiastolic: round(average(vitals.map(entry => entry.diastolic)), 0),
        avgPulse: round(average(vitals.map(entry => entry.pulse)), 0),
        pulseMin: vitals.length ? Math.min(...vitals.map(entry => finite(entry.pulse)).filter(value => value !== null)) : null,
        pulseMax: vitals.length ? Math.max(...vitals.map(entry => finite(entry.pulse)).filter(value => value !== null)) : null
      },
      weight: {
        count: weights.length,
        average: round(average(weights.map(entry => entry.weight)), 1),
        first: finite(weightFirst),
        latest: finite(weightLast),
        change: finite(weightFirst) !== null && finite(weightLast) !== null ? round(Number(weightLast) - Number(weightFirst), 1) : null
      },
      activity: {
        count: activities.length,
        activeDays: activityDays,
        totalMinutes: round(activityTotal, 0),
        averageMinutesPerDay: round(activityTotal / Math.max(1, days), 0)
      },
      medication: {
        loggedDays: medication.length,
        completedWindows: medicationCompleted,
        possibleLoggedWindows: medicationPossible,
        completionPercent: medicationPossible ? round((medicationCompleted / medicationPossible) * 100, 0) : null
      },
      sleep: {
        loggedNights: sleep.length,
        averageHours: round(average(sleep.map(entry => entry.hours)), 1),
        commonQuality: mode(sleep.map(entry => entry.quality)),
        qualityCounts
      },
      notes: { count: notes.length, recurringTags },
      bodyFeel: { loggedDays: bodyFeels.length, common: mode(bodyFeels.map(entry => entry.value)), counts: bodyFeelCounts }
    };
  }

  function weightGoalProgress(start, target, current) {
    const a = finite(start); const b = finite(target); const c = finite(current);
    if ([a, b, c].includes(null) || a === b) return null;
    const total = Math.abs(a - b);
    const traveled = Math.abs(a - c);
    const movingToward = (b < a && c <= a) || (b > a && c >= a);
    if (!movingToward) return 0;
    return Math.max(0, Math.min(100, round((traveled / total) * 100, 0)));
  }

  function loadPrefs(storage) {
    const defaults = clone(DEFAULT_PREFS);
    try {
      const raw = storage.getItem(PREFS_KEY);
      if (raw === null) return { ok: true, prefs: defaults, isDefault: true };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, prefs: defaults, reason: 'Saved Health goals could not be read. They were left unchanged.' };
      const prefs = defaults;
      if (Array.isArray(parsed.checkInItems)) prefs.checkInItems = parsed.checkInItems.filter(type => CHECKIN_TYPES.some(([key]) => key === type));
      if (parsed.goals && typeof parsed.goals === 'object' && !Array.isArray(parsed.goals)) {
        Object.keys(prefs.goals).forEach(key => {
          if (parsed.goals[key] && typeof parsed.goals[key] === 'object' && !Array.isArray(parsed.goals[key])) prefs.goals[key] = { ...prefs.goals[key], ...parsed.goals[key] };
        });
      }
      return { ok: true, prefs, isDefault: false };
    } catch {
      return { ok: false, prefs: defaults, reason: 'Saved Health goals could not be read. They were left unchanged.' };
    }
  }

  function savePrefs(storage, prefs) {
    try {
      storage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, version: PREFS_VERSION }));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: String(error?.message || error) };
    }
  }

  function browserData(health) {
    const sources = {
      vitals: health.vitals.all(), weights: health.weights.all(), activities: health.activities.all(),
      medication: health.medication.all(), sleep: health.sleep.all(), notes: health.notes.all(), bodyFeels: health.bodyFeel.all()
    };
    const failed = Object.values(sources).find(result => !result.ok);
    if (failed) return { ok: false, reason: failed.reason || 'Health history could not be read.' };
    return {
      ok: true,
      data: {
        vitals: sources.vitals.entries, weights: sources.weights.entries, activities: sources.activities.entries,
        medication: sources.medication.entries, sleep: sources.sleep.entries, notes: sources.notes.entries, bodyFeels: sources.bodyFeels.entries
      }
    };
  }

  function initBrowser() {
    const health = window.GrizzlyJohnHealthV3;
    const storageV2 = window.GrizzlyJohnStorageV2;
    if (!health || !document.getElementById('health')) return;
    const localStorage = window.localStorage;
    let prefsState = loadPrefs(localStorage);
    let prefs = prefsState.prefs;
    let periodDays = 30;
    let selectedDate = health.localDateKey(new Date());
    let visibleMonth = dateFromKey(selectedDate);
    let doctorOpen = false;
    let rendering = false;

    const fmt = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
    const dayLabel = key => dateFromKey(key)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) || key;
    const monthLabel = date => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

    function installMarkup() {
      if (document.getElementById('healthGoalsDashboard')) return;
      const snapshot = document.querySelector('.health-snapshot-card');
      if (!snapshot) return;
      snapshot.insertAdjacentHTML('afterend', `
        <section class="health-goals-dashboard" id="healthGoalsDashboard" aria-labelledby="healthGoalsHeading">
          <div class="health-subsection-heading">
            <div><p class="eyebrow">MY HEALTH GOALS</p><h2 id="healthGoalsHeading">Progress, not perfection.</h2><p>Goals are John's choices. The app tracks them; it does not prescribe them.</p></div>
            <button class="button button-secondary health-manage-goals" id="healthManageGoals" type="button">Set goals</button>
          </div>
          <article class="health-checkin-card" id="healthCheckInCard"></article>
          <div class="health-goal-grid" id="healthGoalGrid"></div>
        </section>

        <section class="health-history-dashboard" id="healthHistoryDashboard" aria-labelledby="healthHistoryHeading">
          <div class="health-subsection-heading health-history-heading">
            <div><p class="eyebrow">HEALTH HISTORY</p><h2 id="healthHistoryHeading">Look back without digging.</h2><p>Choose a range for the summary, then tap any calendar day for the details.</p></div>
          </div>
          <div class="health-history-toolbar">
            <div class="health-period-tabs" role="group" aria-label="Health summary range">
              <button type="button" data-health-period="7">7 Days</button>
              <button type="button" data-health-period="30" class="is-active">30 Days</button>
              <button type="button" data-health-period="90">90 Days</button>
            </div>
            <button class="button button-secondary health-doctor-button" id="healthDoctorView" type="button">🩺 Doctor View</button>
          </div>
          <div class="health-period-summary" id="healthPeriodSummary"></div>
          <div class="health-doctor-summary" id="healthDoctorSummary" hidden></div>

          <article class="health-calendar-card">
            <div class="health-calendar-header">
              <button type="button" class="health-calendar-nav" id="healthCalendarPrev" aria-label="Previous month">←</button>
              <div><strong id="healthCalendarMonth"></strong><button type="button" class="health-calendar-today" id="healthCalendarToday">Today</button></div>
              <button type="button" class="health-calendar-nav" id="healthCalendarNext" aria-label="Next month">→</button>
            </div>
            <div class="health-calendar-weekdays" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
            <div class="health-calendar-grid" id="healthCalendarGrid"></div>
          </article>
          <div class="health-selected-day" id="healthSelectedDay"></div>
        </section>
      `);

      document.body.insertAdjacentHTML('beforeend', `
        <dialog class="health-goals-dialog" id="healthGoalsDialog" aria-labelledby="healthGoalsDialogTitle">
          <form method="dialog" class="health-goals-dialog-shell" id="healthGoalsForm">
            <div class="health-goals-dialog-header"><div><p class="eyebrow">HEALTH SETTINGS</p><h2 id="healthGoalsDialogTitle">Goals + daily check-in</h2></div><button type="button" id="healthGoalsClose" aria-label="Close">×</button></div>
            <div class="health-goals-dialog-content">
              <section class="health-goals-form-section"><h3>What counts as my daily Health Check-In?</h3><p>Complete the items you choose and GrizzlyJohn awards one regular Gold Star. The star is for showing up, not for hitting the numbers.</p><div class="health-checkin-picker" id="healthCheckInPicker"></div></section>
              <section class="health-goals-form-section"><h3>Goals I want to see</h3><p>Turn on only the goals that are useful. Notes and Body Feel stay observational rather than becoming targets.</p>
                <div class="health-goal-editor">
                  <label class="health-goal-toggle"><input type="checkbox" name="goalActivityEnabled"><span><strong>🥾 Activity</strong><small>Daily active minutes</small></span></label><div class="health-goal-fields" data-goal-fields="activity"><label>Minutes per day<input type="number" name="goalActivityMinutes" min="1" max="1440" step="1"></label></div>
                </div>
                <div class="health-goal-editor">
                  <label class="health-goal-toggle"><input type="checkbox" name="goalSleepEnabled"><span><strong>🌙 Sleep</strong><small>My target range</small></span></label><div class="health-goal-fields health-goal-fields-two" data-goal-fields="sleep"><label>Minimum hours<input type="number" name="goalSleepMin" min="0" max="24" step="0.25"></label><label>Maximum hours<input type="number" name="goalSleepMax" min="0" max="24" step="0.25"></label></div>
                </div>
                <div class="health-goal-editor">
                  <label class="health-goal-toggle"><input type="checkbox" name="goalMedicationEnabled"><span><strong>💊 Medication windows</strong><small>Windows I want to complete</small></span></label><div class="health-goal-fields" data-goal-fields="medication"><label>Windows per day<select name="goalMedicationWindows"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label></div>
                </div>
                <div class="health-goal-editor">
                  <label class="health-goal-toggle"><input type="checkbox" name="goalWeightEnabled"><span><strong>⚖️ Weight</strong><small>Optional personal target</small></span></label><div class="health-goal-fields" data-goal-fields="weight"><label>Target weight (lb)<input type="number" name="goalWeightTarget" min="1" step="0.1"></label></div>
                </div>
                <div class="health-goal-editor">
                  <label class="health-goal-toggle"><input type="checkbox" name="goalVitalsEnabled"><span><strong>🩺 Vitals</strong><small>Target range from my clinician</small></span></label><div class="health-goal-fields" data-goal-fields="vitals"><p class="health-clinician-note">Only enter ranges John has chosen with his clinician. GrizzlyJohn will compare the latest reading to the saved range without diagnosing it.</p><div class="health-goal-fields-two"><label>Systolic min<input type="number" name="goalSysMin" min="1" step="1"></label><label>Systolic max<input type="number" name="goalSysMax" min="1" step="1"></label><label>Diastolic min<input type="number" name="goalDiaMin" min="1" step="1"></label><label>Diastolic max<input type="number" name="goalDiaMax" min="1" step="1"></label><label>Pulse min<input type="number" name="goalPulseMin" min="1" step="1"></label><label>Pulse max<input type="number" name="goalPulseMax" min="1" step="1"></label></div></div>
                </div>
              </section>
              <p class="health-goals-error" id="healthGoalsError" role="alert"></p>
            </div>
            <div class="health-goals-dialog-actions"><button type="button" class="button button-secondary" id="healthGoalsCancel">Cancel</button><button type="submit" class="button button-primary">Save goals</button></div>
          </form>
        </dialog>`);
      document.body.classList.add('health-history-ready');
    }

    function getTodaySnapshot() {
      const result = health.snapshot(health.localDateKey(new Date()));
      return result.ok ? result : null;
    }

    function sameDayWeight(date) {
      const result = health.weights.forDate(date);
      return result.ok ? result.entries[0] || null : null;
    }

    function checkInStatus(date) {
      const snapshot = health.snapshot(date);
      if (!snapshot.ok) return { ok: false, complete: false, done: [], total: prefs.checkInItems.length };
      const weight = sameDayWeight(date);
      const status = {
        vitals: Boolean(snapshot.latestVitals),
        weight: Boolean(weight),
        activity: snapshot.activityCount > 0,
        medication: Boolean(snapshot.medication),
        sleep: Boolean(snapshot.sleep),
        note: snapshot.noteCount > 0,
        bodyFeel: Boolean(snapshot.bodyFeel)
      };
      const selected = prefs.checkInItems || [];
      const done = selected.filter(type => status[type]);
      return { ok: true, status, selected, done, total: selected.length, complete: selected.length > 0 && done.length === selected.length };
    }

    function syncGoldStar() {
      if (!storageV2?.goldStars || !storageV2?.goldStarDays) return;
      const today = health.localDateKey(new Date());
      const check = checkInStatus(today);
      if (!check.complete) return;
      const ensured = storageV2.goldStars.ensureActive('Health check-in');
      if (!ensured.ok || !ensured.definition?.id) return;
      const day = storageV2.goldStarDays.get(today, { syncActiveDefinitions: true });
      if (!day.ok) return;
      const completed = Array.isArray(day.day.completedStarIds) && day.day.completedStarIds.includes(ensured.definition.id);
      if (!completed) storageV2.goldStarDays.toggle(today, ensured.definition.id, true);
    }

    function progressBar(percent) {
      if (percent === null || !Number.isFinite(Number(percent))) return '';
      const safe = Math.max(0, Math.min(100, Number(percent)));
      return `<div class="health-goal-progress" aria-label="${safe}% progress"><span style="width:${safe}%"></span></div>`;
    }

    function renderCheckIn() {
      const node = document.getElementById('healthCheckInCard');
      if (!node) return;
      const check = checkInStatus(health.localDateKey(new Date()));
      const names = Object.fromEntries(CHECKIN_TYPES);
      if (!check.total) {
        node.innerHTML = `<div class="health-checkin-star">☆</div><div><strong>Choose your daily Health Check-In</strong><p>Pick the few things that mean “I showed up for my health today.”</p><button type="button" class="health-inline-link" data-open-health-goals>Choose items →</button></div>`;
        return;
      }
      const chips = check.selected.map(type => `<span class="${check.status[type] ? 'is-done' : ''}">${check.status[type] ? '✓' : '○'} ${escapeHtml(names[type] || type)}</span>`).join('');
      node.classList.toggle('is-complete', check.complete);
      node.innerHTML = `<div class="health-checkin-star">${check.complete ? '⭐' : '☆'}</div><div class="health-checkin-copy"><div class="health-checkin-topline"><strong>${check.complete ? 'Health Check-In complete' : `${check.done.length} of ${check.total} check-in items`}</strong><button type="button" class="health-inline-link" data-open-health-goals>Edit</button></div><p>${check.complete ? 'Gold Star earned for showing up today.' : 'Complete your chosen check-in items to earn today’s Health Gold Star.'}</p><div class="health-checkin-chips">${chips}</div></div>`;
    }

    function vitalsRangeCopy(goal, reading) {
      if (!reading) return 'No vitals logged today';
      const pairs = [
        ['systolic', goal.systolicMin, goal.systolicMax],
        ['diastolic', goal.diastolicMin, goal.diastolicMax],
        ['pulse', goal.pulseMin, goal.pulseMax]
      ];
      const comparable = pairs.filter(([, min, max]) => finite(min) !== null || finite(max) !== null);
      if (!comparable.length) return 'Add a clinician-provided range';
      const matches = comparable.every(([field, min, max]) => {
        const value = finite(reading[field]); const low = finite(min); const high = finite(max);
        return value !== null && (low === null || value >= low) && (high === null || value <= high);
      });
      return matches ? 'Latest reading matches your saved range' : 'Latest reading is outside your saved range';
    }

    function renderGoals() {
      const grid = document.getElementById('healthGoalGrid');
      const manage = document.getElementById('healthManageGoals');
      if (!grid) return;
      const snap = getTodaySnapshot();
      const cards = [];
      const goals = prefs.goals;
      if (goals.activity.enabled) {
        const current = snap?.activityMinutes || 0; const target = finite(goals.activity.targetMinutes) || 1; const percent = Math.min(100, Math.round((current / target) * 100));
        cards.push(`<article class="health-goal-card"><div class="health-goal-card-heading"><span>🥾</span><strong>Activity</strong></div><div class="health-goal-value">${fmt(current, 0)} <small>/ ${fmt(target, 0)} min</small></div>${progressBar(percent)}<p>${percent >= 100 ? 'Today’s activity goal reached.' : `${fmt(Math.max(0, target - current), 0)} minutes to your goal.`}</p></article>`);
      }
      if (goals.sleep.enabled) {
        const hours = snap?.sleep?.hours ?? null; const min = finite(goals.sleep.minHours); const max = finite(goals.sleep.maxHours);
        const percent = hours !== null && min !== null && min > 0 ? Math.min(100, Math.round((Number(hours) / min) * 100)) : null;
        cards.push(`<article class="health-goal-card"><div class="health-goal-card-heading"><span>🌙</span><strong>Sleep</strong></div><div class="health-goal-value">${hours === null ? '—' : `${fmt(hours)} hr`} <small>target ${fmt(min)}–${fmt(max)} hr</small></div>${progressBar(percent)}<p>${hours === null ? 'Log last night’s sleep to see progress.' : Number(hours) >= min && Number(hours) <= max ? 'Within your saved target range.' : 'Compared with your saved target range.'}</p></article>`);
      }
      if (goals.medication.enabled) {
        const current = snap?.medicationCompleted || 0; const target = Math.max(1, Math.min(3, finite(goals.medication.targetWindows) || 3)); const percent = Math.min(100, Math.round((current / target) * 100));
        cards.push(`<article class="health-goal-card"><div class="health-goal-card-heading"><span>💊</span><strong>Medication windows</strong></div><div class="health-goal-value">${current} <small>/ ${target} complete</small></div>${progressBar(percent)}<p>${percent >= 100 ? 'Your chosen completion goal is marked complete.' : `${Math.max(0, target - current)} window${target - current === 1 ? '' : 's'} remaining in your goal.`}</p></article>`);
      }
      if (goals.weight.enabled) {
        const current = snap?.latestWeight?.weight ?? null; const target = finite(goals.weight.targetWeight); const start = finite(goals.weight.startingWeight); const percent = weightGoalProgress(start, target, current);
        cards.push(`<article class="health-goal-card"><div class="health-goal-card-heading"><span>⚖️</span><strong>Weight</strong></div><div class="health-goal-value">${current === null ? '—' : `${fmt(current)} lb`} <small>target ${fmt(target)} lb</small></div>${progressBar(percent)}<p>${current === null ? 'Log a weight to see progress.' : percent === null ? 'Current and target weight saved.' : `${fmt(percent, 0)}% of the way from your starting point to your target.`}</p></article>`);
      }
      if (goals.vitals.enabled) {
        const latest = snap?.latestVitals;
        cards.push(`<article class="health-goal-card"><div class="health-goal-card-heading"><span>🩺</span><strong>Clinician target range</strong></div><div class="health-goal-value">${latest ? `${fmt(latest.systolic, 0)} / ${fmt(latest.diastolic, 0)}` : '— / —'} <small>${latest ? `pulse ${fmt(latest.pulse, 0)}` : 'latest vitals'}</small></div><p>${escapeHtml(vitalsRangeCopy(goals.vitals, latest))}. This is a comparison to John’s saved range, not a medical interpretation.</p></article>`);
      }
      if (!cards.length) {
        grid.innerHTML = `<article class="health-goals-empty"><span>🎯</span><div><strong>No number goals yet</strong><p>Health can stay informational until John chooses something worth aiming at.</p></div></article>`;
        manage.textContent = 'Set goals';
      } else {
        grid.innerHTML = cards.join('');
        manage.textContent = 'Edit goals';
      }
    }

    function collectCalendarMap(data) {
      const map = new Map();
      const add = (entries, type) => entries.forEach(entry => {
        if (!entry?.date) return;
        if (!map.has(entry.date)) map.set(entry.date, new Set());
        map.get(entry.date).add(type);
      });
      add(data.vitals, 'vitals'); add(data.weights, 'weight'); add(data.activities, 'activity'); add(data.medication, 'medication'); add(data.sleep, 'sleep'); add(data.notes, 'note'); add(data.bodyFeels, 'bodyFeel');
      return map;
    }

    function renderSummary(data) {
      const summary = summarizeData(data, periodDays, health.localDateKey(new Date()));
      const node = document.getElementById('healthPeriodSummary');
      if (!node) return summary;
      const cards = [
        ['🩺', 'Blood pressure', summary.vitals.count ? `${fmt(summary.vitals.avgSystolic, 0)} / ${fmt(summary.vitals.avgDiastolic, 0)}` : '— / —', summary.vitals.count ? `${summary.vitals.count} reading${summary.vitals.count === 1 ? '' : 's'} • pulse avg ${fmt(summary.vitals.avgPulse, 0)}` : 'No readings'],
        ['⚖️', 'Weight', summary.weight.average === null ? '—' : `${fmt(summary.weight.average)} lb`, summary.weight.count ? `${summary.weight.count} reading${summary.weight.count === 1 ? '' : 's'}${summary.weight.change === null ? '' : ` • change ${summary.weight.change > 0 ? '+' : ''}${fmt(summary.weight.change)} lb`}` : 'No readings'],
        ['🥾', 'Activity', `${fmt(summary.activity.averageMinutesPerDay, 0)} min/day`, `${fmt(summary.activity.totalMinutes, 0)} total • ${summary.activity.activeDays} active day${summary.activity.activeDays === 1 ? '' : 's'}`],
        ['💊', 'Medication', summary.medication.completionPercent === null ? '—' : `${fmt(summary.medication.completionPercent, 0)}%`, summary.medication.loggedDays ? `${summary.medication.completedWindows}/${summary.medication.possibleLoggedWindows} windows on ${summary.medication.loggedDays} logged day${summary.medication.loggedDays === 1 ? '' : 's'}` : 'No logged medication days'],
        ['🌙', 'Sleep', summary.sleep.averageHours === null ? '—' : `${fmt(summary.sleep.averageHours)} hr`, summary.sleep.loggedNights ? `${summary.sleep.loggedNights} logged night${summary.sleep.loggedNights === 1 ? '' : 's'}${summary.sleep.commonQuality ? ` • most common ${summary.sleep.commonQuality}` : ''}` : 'No logged nights'],
        ['📝', 'Notes / symptoms', String(summary.notes.count), summary.notes.recurringTags.length ? `Top tags: ${summary.notes.recurringTags.map(([tag, count]) => `${tag} (${count})`).join(', ')}` : 'No recurring tags'],
        ['🌤️', 'Body feel', summary.bodyFeel.common || '—', summary.bodyFeel.loggedDays ? `${summary.bodyFeel.loggedDays} logged day${summary.bodyFeel.loggedDays === 1 ? '' : 's'}` : 'No body-feel entries']
      ];
      node.innerHTML = cards.map(([icon, label, value, meta]) => `<article><span>${icon}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong><p>${escapeHtml(meta)}</p></div></article>`).join('');
      renderDoctorSummary(summary);
      return summary;
    }

    function doctorText(summary) {
      const lines = [`GrizzlyJohn Health Summary — Last ${summary.days} Days`, `${dayLabel(summary.range.start)} through ${dayLabel(summary.range.end)}`, ''];
      lines.push(`Blood pressure: ${summary.vitals.count ? `${fmt(summary.vitals.avgSystolic, 0)}/${fmt(summary.vitals.avgDiastolic, 0)} average across ${summary.vitals.count} readings` : 'No readings logged'}`);
      lines.push(`Pulse: ${summary.vitals.count ? `${fmt(summary.vitals.avgPulse, 0)} average${summary.vitals.pulseMin !== null ? `, range ${fmt(summary.vitals.pulseMin, 0)}–${fmt(summary.vitals.pulseMax, 0)}` : ''}` : 'No readings logged'}`);
      lines.push(`Weight: ${summary.weight.average === null ? 'No readings logged' : `${fmt(summary.weight.average)} lb average across ${summary.weight.count} readings${summary.weight.change === null ? '' : `; change ${summary.weight.change > 0 ? '+' : ''}${fmt(summary.weight.change)} lb from first to latest reading`}`}`);
      lines.push(`Activity: ${fmt(summary.activity.averageMinutesPerDay, 0)} minutes/day average; ${fmt(summary.activity.totalMinutes, 0)} total minutes`);
      lines.push(`Medication windows: ${summary.medication.completionPercent === null ? 'No logged medication days' : `${fmt(summary.medication.completionPercent, 0)}% of windows marked complete on ${summary.medication.loggedDays} logged days`}`);
      lines.push(`Sleep: ${summary.sleep.averageHours === null ? 'No sleep logged' : `${fmt(summary.sleep.averageHours)} hours average across ${summary.sleep.loggedNights} logged nights${summary.sleep.commonQuality ? `; most common quality ${summary.sleep.commonQuality}` : ''}`}`);
      lines.push(`Notes/symptoms: ${summary.notes.count}${summary.notes.recurringTags.length ? `; top tags ${summary.notes.recurringTags.map(([tag, count]) => `${tag} (${count})`).join(', ')}` : ''}`);
      lines.push(`Body feel: ${summary.bodyFeel.common ? `${summary.bodyFeel.common} most common across ${summary.bodyFeel.loggedDays} logged days` : 'No entries logged'}`);
      lines.push('', 'This summary reports John’s saved observations only. It does not diagnose or interpret them.');
      return lines.join('\n');
    }

    function renderDoctorSummary(summary) {
      const node = document.getElementById('healthDoctorSummary');
      if (!node) return;
      node.hidden = !doctorOpen;
      if (!doctorOpen) return;
      const text = doctorText(summary);
      node.innerHTML = `<div class="health-doctor-summary-heading"><div><p class="eyebrow">DOCTOR VIEW</p><h3>Last ${periodDays} days, stripped down.</h3></div><button type="button" class="button button-secondary" id="healthCopyDoctorSummary">Copy summary</button></div><pre>${escapeHtml(text)}</pre>`;
    }

    function renderCalendar(data) {
      const grid = document.getElementById('healthCalendarGrid');
      const label = document.getElementById('healthCalendarMonth');
      const next = document.getElementById('healthCalendarNext');
      if (!grid || !label) return;
      const today = health.localDateKey(new Date());
      const todayDate = dateFromKey(today);
      label.textContent = monthLabel(visibleMonth);
      const sameCurrentMonth = visibleMonth.getFullYear() === todayDate.getFullYear() && visibleMonth.getMonth() === todayDate.getMonth();
      if (next) next.disabled = sameCurrentMonth;
      const map = collectCalendarMap(data);
      const year = visibleMonth.getFullYear(); const month = visibleMonth.getMonth();
      const first = new Date(year, month, 1, 12); const lastDay = new Date(year, month + 1, 0, 12).getDate();
      const cells = [];
      for (let blank = 0; blank < first.getDay(); blank += 1) cells.push('<span class="health-calendar-blank"></span>');
      for (let day = 1; day <= lastDay; day += 1) {
        const key = keyFromDate(new Date(year, month, day, 12)); const types = [...(map.get(key) || [])]; const future = key > today;
        const markers = types.slice(0, 3).map(type => `<span title="${escapeHtml(Object.fromEntries(CHECKIN_TYPES)[type])}">${TYPE_ICONS[type]}</span>`).join('') + (types.length > 3 ? `<small>+${types.length - 3}</small>` : '');
        cells.push(`<button type="button" class="health-calendar-day ${key === selectedDate ? 'is-selected' : ''} ${key === today ? 'is-today' : ''} ${types.length ? 'has-data' : ''}" data-health-date="${key}" ${future ? 'disabled' : ''}><strong>${day}</strong><span class="health-calendar-markers">${markers}</span></button>`);
      }
      grid.innerHTML = cells.join('');
    }

    function renderSelectedDay() {
      const node = document.getElementById('healthSelectedDay');
      if (!node) return;
      const snapshot = health.snapshot(selectedDate); const weight = sameDayWeight(selectedDate);
      if (!snapshot.ok) { node.innerHTML = `<article class="health-day-card"><p>${escapeHtml(snapshot.reason || 'This day could not be read.')}</p></article>`; return; }
      const sameDaySources = [
        ['vitals', health.vitals.forDate(selectedDate)], ['weight', health.weights.forDate(selectedDate)], ['activity', health.activities.forDate(selectedDate)],
        ['sleep', health.sleep.forDate(selectedDate)], ['note', health.notes.forDate(selectedDate)], ['bodyFeel', health.bodyFeel.forDate(selectedDate)]
      ];
      const entries = [];
      sameDaySources.forEach(([type, result]) => { if (result.ok) result.entries.forEach(entry => entries.push({ type, entry, timestamp: entry.timestamp })); });
      if (snapshot.medication) entries.push({ type: 'medication', entry: snapshot.medication, timestamp: snapshot.medication.updatedAt });
      entries.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      const cards = [
        ['🩺', snapshot.latestVitals ? `${fmt(snapshot.latestVitals.systolic, 0)} / ${fmt(snapshot.latestVitals.diastolic, 0)}` : '— / —', snapshot.latestVitals ? `Pulse ${fmt(snapshot.latestVitals.pulse, 0)}` : 'No vitals'],
        ['⚖️', weight ? `${fmt(weight.weight)} lb` : '—', weight ? 'Weight logged' : 'No weight'],
        ['🥾', `${fmt(snapshot.activityMinutes, 0)} min`, `${snapshot.activityCount} activit${snapshot.activityCount === 1 ? 'y' : 'ies'}`],
        ['💊', `${snapshot.medicationCompleted}/3`, snapshot.medication ? 'Windows marked complete' : 'No medication log'],
        ['🌙', snapshot.sleep ? `${fmt(snapshot.sleep.hours)} hr` : '—', snapshot.sleep?.quality || 'No sleep log'],
        ['🌤️', snapshot.bodyFeel?.value || '—', 'Body feel'],
        ['📝', String(snapshot.noteCount), `Note${snapshot.noteCount === 1 ? '' : 's'} / symptoms`]
      ];
      const detailRows = entries.map(item => {
        const e = item.entry; let title = ''; let meta = '';
        if (item.type === 'vitals') { title = `${fmt(e.systolic, 0)} / ${fmt(e.diastolic, 0)} • pulse ${fmt(e.pulse, 0)}`; meta = e.note || 'Vitals'; }
        if (item.type === 'weight') { title = `${fmt(e.weight)} lb`; meta = 'Weight'; }
        if (item.type === 'activity') { title = `${e.activityType} • ${fmt(e.durationMinutes, 0)} min`; meta = e.intensity || 'Activity'; }
        if (item.type === 'medication') { const names = ['morning','midday','evening'].filter(name => e[name]).map(name => name[0].toUpperCase() + name.slice(1)); title = `${names.length}/3 medication windows`; meta = names.join(' • ') || 'No windows marked complete'; }
        if (item.type === 'sleep') { title = `${fmt(e.hours)} hr • ${e.quality}`; meta = 'Sleep'; }
        if (item.type === 'note') { title = e.text; meta = [e.severity, ...(e.tags || [])].filter(Boolean).join(' • ') || 'Health note'; }
        if (item.type === 'bodyFeel') { title = e.value; meta = 'Body feel'; }
        return `<div class="health-day-entry"><span>${TYPE_ICONS[item.type]}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta)}</small></div><time>${item.timestamp ? new Date(item.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}</time></div>`;
      }).join('');
      node.innerHTML = `<article class="health-day-card"><div class="health-day-card-heading"><div><p class="eyebrow">SELECTED DAY</p><h3>${escapeHtml(dayLabel(selectedDate))}</h3></div><span>${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}</span></div><div class="health-day-snapshot">${cards.map(([icon, value, meta]) => `<div><span>${icon}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(meta)}</small></div>`).join('')}</div>${entries.length ? `<details class="health-day-details"><summary>View all entries <span>⌄</span></summary><div>${detailRows}</div></details>` : '<p class="health-day-empty">Nothing was logged on this day.</p>'}</article>`;
    }

    function renderAll() {
      if (rendering) return;
      rendering = true;
      try {
        prefsState = loadPrefs(localStorage); prefs = prefsState.prefs;
        renderCheckIn(); renderGoals(); syncGoldStar();
        const loaded = browserData(health);
        if (!loaded.ok) return;
        renderSummary(loaded.data); renderCalendar(loaded.data); renderSelectedDay();
      } finally { rendering = false; }
    }

    function openGoals() {
      const dialog = document.getElementById('healthGoalsDialog'); const form = document.getElementById('healthGoalsForm');
      if (!dialog || !form) return;
      document.getElementById('healthCheckInPicker').innerHTML = CHECKIN_TYPES.map(([type, label]) => `<label><input type="checkbox" name="checkInItem" value="${type}"><span>${TYPE_ICONS[type]} ${escapeHtml(label)}</span></label>`).join('');
      form.querySelectorAll('[name="checkInItem"]').forEach(input => { input.checked = prefs.checkInItems.includes(input.value); });
      form.elements.goalActivityEnabled.checked = Boolean(prefs.goals.activity.enabled); form.elements.goalActivityMinutes.value = prefs.goals.activity.targetMinutes ?? 30;
      form.elements.goalSleepEnabled.checked = Boolean(prefs.goals.sleep.enabled); form.elements.goalSleepMin.value = prefs.goals.sleep.minHours ?? 7; form.elements.goalSleepMax.value = prefs.goals.sleep.maxHours ?? 8;
      form.elements.goalMedicationEnabled.checked = Boolean(prefs.goals.medication.enabled); form.elements.goalMedicationWindows.value = prefs.goals.medication.targetWindows ?? 3;
      form.elements.goalWeightEnabled.checked = Boolean(prefs.goals.weight.enabled); form.elements.goalWeightTarget.value = prefs.goals.weight.targetWeight ?? '';
      form.elements.goalVitalsEnabled.checked = Boolean(prefs.goals.vitals.enabled);
      form.elements.goalSysMin.value = prefs.goals.vitals.systolicMin ?? ''; form.elements.goalSysMax.value = prefs.goals.vitals.systolicMax ?? ''; form.elements.goalDiaMin.value = prefs.goals.vitals.diastolicMin ?? ''; form.elements.goalDiaMax.value = prefs.goals.vitals.diastolicMax ?? ''; form.elements.goalPulseMin.value = prefs.goals.vitals.pulseMin ?? ''; form.elements.goalPulseMax.value = prefs.goals.vitals.pulseMax ?? '';
      updateGoalFieldVisibility(); document.getElementById('healthGoalsError').textContent = '';
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    }

    function closeGoals() {
      const dialog = document.getElementById('healthGoalsDialog');
      if (dialog?.open && typeof dialog.close === 'function') dialog.close(); else dialog?.removeAttribute('open');
    }

    function updateGoalFieldVisibility() {
      const form = document.getElementById('healthGoalsForm'); if (!form) return;
      [['activity','goalActivityEnabled'],['sleep','goalSleepEnabled'],['medication','goalMedicationEnabled'],['weight','goalWeightEnabled'],['vitals','goalVitalsEnabled']].forEach(([goal, input]) => {
        const fields = form.querySelector(`[data-goal-fields="${goal}"]`); if (fields) fields.hidden = !form.elements[input].checked;
      });
    }

    function numberOrNull(value) { const trimmed = String(value ?? '').trim(); return trimmed === '' ? null : finite(trimmed); }

    function saveGoals(event) {
      event.preventDefault();
      const form = event.currentTarget; const error = document.getElementById('healthGoalsError');
      const next = clone(prefs);
      next.checkInItems = [...form.querySelectorAll('[name="checkInItem"]:checked')].map(input => input.value);
      next.goals.activity = { enabled: form.elements.goalActivityEnabled.checked, targetMinutes: numberOrNull(form.elements.goalActivityMinutes.value) };
      next.goals.sleep = { enabled: form.elements.goalSleepEnabled.checked, minHours: numberOrNull(form.elements.goalSleepMin.value), maxHours: numberOrNull(form.elements.goalSleepMax.value) };
      next.goals.medication = { enabled: form.elements.goalMedicationEnabled.checked, targetWindows: numberOrNull(form.elements.goalMedicationWindows.value) };
      const latestWeight = health.weights.latest({ throughDate: health.localDateKey(new Date()) });
      next.goals.weight = { enabled: form.elements.goalWeightEnabled.checked, targetWeight: numberOrNull(form.elements.goalWeightTarget.value), startingWeight: prefs.goals.weight.startingWeight ?? (latestWeight.ok ? latestWeight.entry?.weight ?? null : null) };
      next.goals.vitals = { enabled: form.elements.goalVitalsEnabled.checked, systolicMin: numberOrNull(form.elements.goalSysMin.value), systolicMax: numberOrNull(form.elements.goalSysMax.value), diastolicMin: numberOrNull(form.elements.goalDiaMin.value), diastolicMax: numberOrNull(form.elements.goalDiaMax.value), pulseMin: numberOrNull(form.elements.goalPulseMin.value), pulseMax: numberOrNull(form.elements.goalPulseMax.value) };
      if (next.goals.activity.enabled && (!next.goals.activity.targetMinutes || next.goals.activity.targetMinutes <= 0)) { error.textContent = 'Add a positive activity-minute goal.'; return; }
      if (next.goals.sleep.enabled && (next.goals.sleep.minHours === null || next.goals.sleep.maxHours === null || next.goals.sleep.maxHours < next.goals.sleep.minHours)) { error.textContent = 'Sleep needs a minimum and maximum, with the maximum at least as large as the minimum.'; return; }
      if (next.goals.weight.enabled && (!next.goals.weight.targetWeight || next.goals.weight.targetWeight <= 0)) { error.textContent = 'Add a positive target weight or turn that goal off.'; return; }
      const rangePairs = [['systolicMin','systolicMax'],['diastolicMin','diastolicMax'],['pulseMin','pulseMax']];
      if (next.goals.vitals.enabled && rangePairs.some(([min,max]) => next.goals.vitals[min] !== null && next.goals.vitals[max] !== null && next.goals.vitals[max] < next.goals.vitals[min])) { error.textContent = 'A clinician range cannot have a maximum below its minimum.'; return; }
      const saved = savePrefs(localStorage, next); if (!saved.ok) { error.textContent = saved.reason || 'Goals could not be saved.'; return; }
      prefs = next; closeGoals(); renderAll();
    }

    function bind() {
      document.addEventListener('click', event => {
        if (event.target.closest('#healthManageGoals, [data-open-health-goals]')) openGoals();
        const period = event.target.closest('[data-health-period]');
        if (period) {
          periodDays = Number(period.dataset.healthPeriod) || 30;
          document.querySelectorAll('[data-health-period]').forEach(button => button.classList.toggle('is-active', button === period));
          const loaded = browserData(health); if (loaded.ok) renderSummary(loaded.data);
        }
        const dateButton = event.target.closest('[data-health-date]');
        if (dateButton) { selectedDate = dateButton.dataset.healthDate; renderAll(); }
      });
      document.getElementById('healthCalendarPrev')?.addEventListener('click', () => { visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1, 12); renderAll(); });
      document.getElementById('healthCalendarNext')?.addEventListener('click', () => { visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1, 12); renderAll(); });
      document.getElementById('healthCalendarToday')?.addEventListener('click', () => { selectedDate = health.localDateKey(new Date()); visibleMonth = dateFromKey(selectedDate); renderAll(); });
      document.getElementById('healthDoctorView')?.addEventListener('click', () => { doctorOpen = !doctorOpen; document.getElementById('healthDoctorView').textContent = doctorOpen ? 'Close Doctor View' : '🩺 Doctor View'; const loaded = browserData(health); if (loaded.ok) renderSummary(loaded.data); });
      document.addEventListener('click', async event => {
        if (event.target.id !== 'healthCopyDoctorSummary') return;
        const loaded = browserData(health); if (!loaded.ok) return; const text = doctorText(summarizeData(loaded.data, periodDays, health.localDateKey(new Date())));
        try { await navigator.clipboard.writeText(text); event.target.textContent = 'Copied ✓'; setTimeout(() => { if (event.target) event.target.textContent = 'Copy summary'; }, 1600); } catch { event.target.textContent = 'Copy unavailable'; }
      });
      document.getElementById('healthGoalsClose')?.addEventListener('click', closeGoals);
      document.getElementById('healthGoalsCancel')?.addEventListener('click', closeGoals);
      document.getElementById('healthGoalsForm')?.addEventListener('submit', saveGoals);
      document.getElementById('healthGoalsForm')?.addEventListener('change', updateGoalFieldVisibility);
      const log = document.getElementById('healthTodayLog');
      if (log) new MutationObserver(() => setTimeout(renderAll, 0)).observe(log, { childList: true, subtree: true });
      window.addEventListener('storage', event => { if (String(event.key || '').startsWith('grizzlyjohn:')) renderAll(); });
    }

    installMarkup(); bind(); renderAll();
    window.GrizzlyJohnHealthHistoryV3 = Object.freeze({ render: renderAll, openGoals });
  }

  const api = { PREFS_KEY, DEFAULT_PREFS, summarizeData, rangeForDays, weightGoalProgress, loadPrefs, savePrefs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(initBrowser, 0), { once: true });
    else setTimeout(initBrowser, 0);
  }
})();
