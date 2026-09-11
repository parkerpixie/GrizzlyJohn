(() => {
  'use strict';

  const familyApi = typeof module !== 'undefined' && module.exports
    ? require('./feeling-families.js')
    : window.GrizzlyJohnFeelingFamilies;

  const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
  const LOW_BODY_FEELS = new Set(['Rough', 'Bad']);
  const PERIODS = Object.freeze([
    { days: 7, minFeelingDays: 4, minHealthDays: 4 },
    { days: 30, minFeelingDays: 6, minHealthDays: 6 }
  ]);

  function defaultLocalDateKey(value = new Date()) {
    if (typeof value === 'string' && DATE_ONLY.test(value)) return value;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function dateFromKey(key) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function keyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function rollingDateSet(endDate, days) {
    const end = DATE_ONLY.test(String(endDate || '')) ? dateFromKey(endDate) : new Date(endDate || Date.now());
    if (!end || Number.isNaN(end.getTime())) return new Set();
    const dates = new Set();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(end);
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      dates.add(keyFromDate(date));
    }
    return dates;
  }

  function recordDate(record, localDateKey = defaultLocalDateKey) {
    if (DATE_ONLY.test(String(record?.date || ''))) return record.date;
    const source = record?.timestamp || record?.date;
    if (!source) return '';
    try { return localDateKey(source); } catch { return ''; }
  }

  function groupByDate(entries, localDateKey = defaultLocalDateKey) {
    const grouped = new Map();
    (Array.isArray(entries) ? entries : []).forEach(entry => {
      const date = recordDate(entry, localDateKey);
      if (!date) return;
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(entry);
    });
    return grouped;
  }

  function feelingDays(checkIns, dates, localDateKey = defaultLocalDateKey) {
    const byDate = new Map();
    (Array.isArray(checkIns) ? checkIns : []).forEach(entry => {
      const date = recordDate(entry, localDateKey);
      if (!dates.has(date) || !Array.isArray(entry?.feelings)) return;
      if (!byDate.has(date)) byDate.set(date, { words: new Set(), families: new Set() });
      const bucket = byDate.get(date);
      entry.feelings.forEach(feeling => {
        const word = familyApi?.feelingWord ? familyApi.feelingWord(feeling) : String(typeof feeling === 'string' ? feeling : feeling?.word || '').trim();
        const family = familyApi?.familyIdForFeeling ? familyApi.familyIdForFeeling(feeling) : null;
        if (word) bucket.words.add(word);
        if (family) bucket.families.add(family);
      });
    });
    return byDate;
  }

  function healthDaySet(data, dates, localDateKey = defaultLocalDateKey) {
    const active = new Set();
    ['vitals', 'weights', 'activities', 'medication', 'sleep', 'notes', 'bodyFeels'].forEach(key => {
      (Array.isArray(data?.[key]) ? data[key] : []).forEach(entry => {
        const date = recordDate(entry, localDateKey);
        if (dates.has(date)) active.add(date);
      });
    });
    return active;
  }

  function dayActivityMinutes(entries) {
    return (entries || []).reduce((sum, entry) => sum + (Number.isFinite(Number(entry?.durationMinutes)) ? Number(entry.durationMinutes) : 0), 0);
  }

  function dayVitalsSystolic(entries) {
    const values = (entries || []).map(entry => Number(entry?.systolic)).filter(Number.isFinite);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function capitalize(value) {
    const text = String(value || '').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  function deriveForPeriod(data, checkIns, endDate, period, localDateKey) {
    const dates = rollingDateSet(endDate, period.days);
    const feelingsByDate = feelingDays(checkIns, dates, localDateKey);
    const activeHealthDays = healthDaySet(data, dates, localDateKey);
    if (feelingsByDate.size < period.minFeelingDays || activeHealthDays.size < period.minHealthDays) return [];

    const sleepByDate = groupByDate(data.sleep, localDateKey);
    const activityByDate = groupByDate(data.activities, localDateKey);
    const notesByDate = groupByDate(data.notes, localDateKey);
    const bodyByDate = groupByDate(data.bodyFeels, localDateKey);
    const vitalsByDate = groupByDate(data.vitals, localDateKey);
    const results = [];

    const tiredDates = [...feelingsByDate.entries()].filter(([, bucket]) => [...bucket.words].some(word => word.toLocaleLowerCase() === 'tired')).map(([date]) => date);
    const shortSleepWithTired = tiredDates.filter(date => (sleepByDate.get(date) || []).some(entry => Number(entry?.hours) < 6));
    if (tiredDates.length >= 4 && shortSleepWithTired.length >= 3) {
      results.push({
        id: `tired-short-sleep-${period.days}`,
        priority: 100,
        days: period.days,
        icon: '🌙',
        text: `Tired was logged on ${tiredDates.length} day${tiredDates.length === 1 ? '' : 's'} in the last ${period.days} days. Sleep under 6 hours was also logged on ${shortSleepWithTired.length} of those days.`,
        skill: 'HALT',
        skillLabel: 'HALT might be useful →'
      });
    }

    const tagDates = new Map();
    notesByDate.forEach((entries, date) => {
      if (!dates.has(date)) return;
      const seen = new Set();
      entries.forEach(entry => (Array.isArray(entry?.tags) ? entry.tags : []).forEach(tag => {
        const cleaned = String(tag || '').trim();
        if (cleaned) seen.add(cleaned.toLocaleLowerCase());
      }));
      seen.forEach(tag => {
        if (!tagDates.has(tag)) tagDates.set(tag, new Set());
        tagDates.get(tag).add(date);
      });
    });
    const symptomCandidates = [...tagDates.entries()]
      .map(([tag, tagDaySet]) => {
        const rough = [...tagDaySet].filter(date => (bodyByDate.get(date) || []).some(entry => LOW_BODY_FEELS.has(entry?.value)));
        return { tag, tagDays: tagDaySet.size, roughDays: rough.length };
      })
      .filter(item => item.tagDays >= 3 && item.roughDays >= 2)
      .sort((a, b) => b.roughDays - a.roughDays || b.tagDays - a.tagDays || a.tag.localeCompare(b.tag));
    if (symptomCandidates[0]) {
      const item = symptomCandidates[0];
      results.push({
        id: `symptom-body-${item.tag}-${period.days}`,
        priority: 80,
        days: period.days,
        icon: '📝',
        text: `${capitalize(item.tag)} was logged on ${item.tagDays} days in the last ${period.days} days. Rough or Bad body feel was also logged on ${item.roughDays} of those days.`
      });
    }

    const active30Dates = [...activityByDate.entries()].filter(([date, entries]) => dates.has(date) && dayActivityMinutes(entries) >= 30).map(([date]) => date);
    if (active30Dates.length >= 3) {
      const familyCandidates = ['calm', 'bright'].map(family => ({
        family,
        count: active30Dates.filter(date => feelingsByDate.get(date)?.families.has(family)).length
      })).filter(item => item.count >= 2).sort((a, b) => b.count - a.count);
      if (familyCandidates[0]) {
        const item = familyCandidates[0];
        const label = familyApi?.displayName ? familyApi.displayName(item.family) : item.family;
        results.push({
          id: `activity-${item.family}-${period.days}`,
          priority: 60,
          days: period.days,
          icon: '🥾',
          text: `You logged 30+ active minutes on ${active30Dates.length} days in the last ${period.days} days. ${label} feelings were also logged on ${item.count} of those days.`
        });
      }
    }

    const vitalDayValues = [...vitalsByDate.entries()]
      .filter(([date]) => dates.has(date))
      .map(([date, entries]) => ({ date, systolic: dayVitalsSystolic(entries) }))
      .filter(item => item.systolic !== null);
    if (vitalDayValues.length >= 6) {
      const ownAverage = vitalDayValues.reduce((sum, item) => sum + item.systolic, 0) / vitalDayValues.length;
      const aboveAverageDays = vitalDayValues.filter(item => item.systolic > ownAverage).map(item => item.date);
      const fearDays = aboveAverageDays.filter(date => feelingsByDate.get(date)?.families.has('fear'));
      if (aboveAverageDays.length >= 3 && fearDays.length >= 2) {
        results.push({
          id: `vitals-fear-${period.days}`,
          priority: 40,
          days: period.days,
          icon: '🩺',
          text: `Systolic readings were above your own ${period.days}-day average on ${aboveAverageDays.length} logged days. Fear / anxiety feelings were also logged on ${fearDays.length} of those days.`
        });
      }
    }

    return results;
  }

  function deriveBodyMindObservations(data = {}, checkIns = [], options = {}) {
    const localDateKey = options.localDateKey || defaultLocalDateKey;
    const endDate = DATE_ONLY.test(String(options.endDate || '')) ? options.endDate : localDateKey(options.now || new Date());
    const all = [];
    PERIODS.forEach(period => all.push(...deriveForPeriod(data, checkIns, endDate, period, localDateKey)));

    const seenKinds = new Set();
    return all
      .sort((a, b) => b.priority - a.priority || a.days - b.days)
      .filter(item => {
        const kind = item.id.replace(/-(7|30)$/, '');
        if (seenKinds.has(kind)) return false;
        seenKinds.add(kind);
        return true;
      })
      .slice(0, Number(options.limit) > 0 ? Number(options.limit) : 3)
      .map(({ priority, ...item }) => item);
  }

  function browserHealthData(health) {
    const sources = {
      vitals: health.vitals.all(),
      weights: health.weights.all(),
      activities: health.activities.all(),
      medication: health.medication.all(),
      sleep: health.sleep.all(),
      notes: health.notes.all(),
      bodyFeels: health.bodyFeel.all()
    };
    if (Object.values(sources).some(result => !result?.ok)) return null;
    return Object.fromEntries(Object.entries(sources).map(([key, result]) => [key, result.entries || []]));
  }

  function openWisdomSkill(skill) {
    document.querySelector('[data-nav="wisdom"]')?.click();
    window.setTimeout(() => {
      const opener = document.querySelector('#johnToolboxLink [data-open-recovery-toolbox]') || document.querySelector('[data-open-recovery-toolbox]');
      if (opener) opener.click();
      else {
        const toolbox = document.getElementById('dbtToolbox');
        if (toolbox) toolbox.hidden = false;
      }
      window.setTimeout(() => {
        const target = [...document.querySelectorAll('#dbtCardGrid .dbt-card-button')]
          .find(button => button.querySelector('strong')?.textContent?.trim().toLowerCase() === String(skill || '').toLowerCase());
        target?.click();
      }, 160);
    }, 120);
  }

  function initBrowser() {
    const health = window.GrizzlyJohnHealthV3;
    const storageV2 = window.GrizzlyJohnStorageV2;
    const history = document.getElementById('healthHistoryDashboard');
    if (!health || !storageV2?.feelingCheckIns || !history) return;

    if (!document.getElementById('healthBodyMindDashboard')) {
      const section = document.createElement('section');
      section.className = 'health-body-mind-dashboard';
      section.id = 'healthBodyMindDashboard';
      section.setAttribute('aria-labelledby', 'healthBodyMindHeading');
      section.innerHTML = `
        <div class="health-subsection-heading">
          <div>
            <p class="eyebrow">BODY + MIND</p>
            <h2 id="healthBodyMindHeading">Grizz spotted a pattern. 🐻</h2>
            <p>A few things have been traveling together often enough to catch his attention. He is observing, not diagnosing.</p>
          </div>
        </div>
        <div class="health-body-mind-content" id="healthBodyMindContent"></div>
        <p class="health-body-mind-disclaimer">Based only on your own check-ins. Not a medical conclusion.</p>`;
      history.insertAdjacentElement('beforebegin', section);
    }

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

    function render() {
      const node = document.getElementById('healthBodyMindContent');
      if (!node) return;
      const data = browserHealthData(health);
      const feelings = storageV2.feelingCheckIns.all();
      if (!data || !feelings?.ok) {
        node.innerHTML = '<article class="health-body-mind-empty"><span>🧭</span><div><strong>Body + Mind is unavailable right now.</strong><p>Your saved data was left untouched.</p></div></article>';
        return;
      }
      const observations = deriveBodyMindObservations(data, feelings.entries, {
        now: new Date(),
        localDateKey: health.localDateKey,
        limit: 3
      });
      if (!observations.length) {
        node.innerHTML = '<article class="health-body-mind-empty"><span>🧭</span><div><strong>Still gathering a trail.</strong><p>After a few different days with both Health and feeling check-ins, repeated overlaps can appear here.</p></div></article>';
        return;
      }
      node.innerHTML = observations.map(item => `
        <article class="health-body-mind-observation">
          <span class="health-body-mind-icon" aria-hidden="true">${item.icon || '🧭'}</span>
          <div>
            <small>LAST ${item.days} DAYS</small>
            <p>${escapeHtml(item.text)}</p>
            ${item.skill ? `<button type="button" class="health-body-mind-skill" data-body-mind-skill="${escapeHtml(item.skill)}">${escapeHtml(item.skillLabel || `${item.skill} →`)}</button>` : ''}
          </div>
        </article>`).join('');
    }

    document.addEventListener('click', event => {
      const skill = event.target.closest('[data-body-mind-skill]');
      if (skill) openWisdomSkill(skill.dataset.bodyMindSkill);
      if (event.target.closest('[data-nav="health"]')) window.setTimeout(render, 0);
    });
    const todayLog = document.getElementById('healthTodayLog');
    if (todayLog) new MutationObserver(() => window.setTimeout(render, 0)).observe(todayLog, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
    window.addEventListener('storage', event => { if (String(event.key || '').startsWith('grizzlyjohn:')) render(); });
    render();
    window.GrizzlyJohnBodyMindV3 = Object.freeze({ render });
  }

  const api = Object.freeze({ deriveBodyMindObservations, rollingDateSet, feelingDays, healthDaySet, recordDate });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(initBrowser, 0), { once: true });
    else window.setTimeout(initBrowser, 0);
  }
})();