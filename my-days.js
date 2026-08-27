(() => {
  'use strict';

  function validDateKey(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function aggregateMyDays(records = {}, options = {}) {
    const localDateKey = typeof options.localDateKey === 'function' ? options.localDateKey : value => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const days = new Map();
    const ensureDay = date => {
      if (!date) return null;
      if (!days.has(date)) days.set(date, { date, feelings: [], gratitude: [], badgeAwards: [], sideQuestEvents: [], guidedSkillSessions: [] });
      return days.get(date);
    };
    const dateFor = record => {
      if (validDateKey(record?.date)) return record.date;
      const timestamp = record?.timestamp || record?.addedAt || record?.awardedAt || record?.date;
      try { return timestamp ? localDateKey(timestamp) : null; }
      catch { return null; }
    };

    (Array.isArray(records.feelingCheckIns) ? records.feelingCheckIns : []).forEach(entry => {
      const day = ensureDay(dateFor(entry));
      if (day) day.feelings.push(entry);
    });
    (Array.isArray(records.gratitudeEntries) ? records.gratitudeEntries : []).forEach(entry => {
      const day = ensureDay(dateFor(entry));
      if (day) day.gratitude.push(entry);
    });
    (Array.isArray(records.badgeAwards) ? records.badgeAwards : []).forEach(entry => {
      const day = ensureDay(dateFor(entry));
      if (day) day.badgeAwards.push(entry);
    });
    (Array.isArray(records.sideQuestEvents) ? records.sideQuestEvents : []).forEach(entry => {
      const day = ensureDay(dateFor(entry));
      if (day) day.sideQuestEvents.push(entry);
    });
    (Array.isArray(records.guidedSkillSessions) ? records.guidedSkillSessions : []).forEach(entry => {
      const day = ensureDay(dateFor(entry));
      if (day) day.guidedSkillSessions.push(entry);
    });

    return [...days.values()].map(day => ({
      ...day,
      feelings: [...day.feelings].sort((a, b) => String(a?.timestamp || '').localeCompare(String(b?.timestamp || ''))),
      gratitude: [...day.gratitude].sort((a, b) => String(a?.timestamp || '').localeCompare(String(b?.timestamp || ''))),
      badgeAwards: [...day.badgeAwards].sort((a, b) => String(a?.awardedAt || '').localeCompare(String(b?.awardedAt || ''))),
      sideQuestEvents: [...day.sideQuestEvents].sort((a, b) => String(a?.timestamp || '').localeCompare(String(b?.timestamp || ''))),
      guidedSkillSessions: [...day.guidedSkillSessions].sort((a, b) => String(a?.timestamp || '').localeCompare(String(b?.timestamp || '')))
    })).sort((a, b) => b.date.localeCompare(a.date));
  }

  function findThisDayLastYear(days, todayKey) {
    if (!validDateKey(todayKey)) return null;
    const [year, month, day] = todayKey.split('-').map(Number);
    const target = `${year - 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return (Array.isArray(days) ? days : []).find(entry => entry?.date === target) || null;
  }

  const exported = { aggregateMyDays, findThisDayLastYear };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (typeof window === 'undefined') return;
  window.GrizzlyJohnMyDays = exported;

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

  function readDays() {
    const storage = window.GrizzlyJohnStorageV2;
    const gratitude = storage?.gratitude.all();
    const feelings = storage?.feelingCheckIns.all();
    const awards = storage?.goldStarDays.awards();
    const quests = storage?.sideQuestEvents.all();
    const guided = storage?.guidedSkillSessions.all();
    return aggregateMyDays({
      gratitudeEntries: gratitude?.ok ? gratitude.entries : [],
      feelingCheckIns: feelings?.ok ? feelings.entries : [],
      badgeAwards: awards?.ok ? awards.awards : [],
      sideQuestEvents: quests?.ok ? quests.events : [],
      guidedSkillSessions: guided?.ok ? guided.sessions : []
    }, { localDateKey: storage?.localDateKey });
  }

  function naturalDate(dateKey, includeYear = false) {
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', ...(includeYear ? { year: 'numeric' } : {}) });
  }

  function naturalTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function feelingWords(day) {
    return day.feelings.flatMap(entry => Array.isArray(entry?.feelings) ? entry.feelings.map(feeling => typeof feeling === 'string' ? feeling : feeling?.word).filter(Boolean) : []);
  }

  function daySummary(day) {
    const feelings = feelingWords(day);
    const preview = feelings.slice(0, 3).map(word => `<span>${escapeHtml(word)}</span>`).join('');
    const extra = feelings.length > 3 ? `<span>+${feelings.length - 3}</span>` : '';
    const signals = [
      day.gratitude.length ? `${day.gratitude.length} gratitude${day.gratitude.length === 1 ? '' : 's'}` : '',
      day.badgeAwards.length ? 'Gold Star Trail Day' : '',
      day.sideQuestEvents.length ? `${day.sideQuestEvents.length} Side Quest${day.sideQuestEvents.length === 1 ? '' : 's'}` : ''
    ].filter(Boolean).map(label => `<small>${escapeHtml(label)}</small>`).join('');
    return `<div class="my-days-summary-chips">${preview}${extra}</div><div class="my-days-summary-signals">${signals}</div>`;
  }

  function feelingDetails(day) {
    if (!day.feelings.length) return '';
    return `<section class="my-days-detail-group"><h4>Feelings</h4><div class="my-days-feeling-entries">${day.feelings.map(entry => `<div class="my-days-feeling-entry"><time>${escapeHtml(naturalTime(entry.timestamp))}</time><div>${(Array.isArray(entry.feelings) ? entry.feelings : []).map(feeling => `<span>${escapeHtml(typeof feeling === 'string' ? feeling : `${feeling.icon || ''} ${feeling.word || ''}`.trim())}</span>`).join('')}</div></div>`).join('')}</div></section>`;
  }

  function gratitudeDetails(day) {
    if (!day.gratitude.length) return '';
    return `<section class="my-days-detail-group"><h4>Gratitude</h4><ul>${day.gratitude.map(entry => `<li>${escapeHtml(entry?.text || '')}</li>`).join('')}</ul></section>`;
  }

  function badgeDetails(day) {
    if (!day.badgeAwards.length) return '';
    return `<section class="my-days-detail-group"><h4>Badges earned</h4>${day.badgeAwards.map(award => `<div class="my-days-badge"><span aria-hidden="true">⭐️</span><div><strong>Gold Star Trail Day</strong><p>Completed more than half of the day’s Gold Stars.</p><time>${escapeHtml(naturalTime(award.awardedAt))}</time></div></div>`).join('')}</section>`;
  }

  function sideQuestDetails(day) {
    if (!day.sideQuestEvents.length) return '';
    return `<section class="my-days-detail-group"><h4>Side Quests</h4><div class="my-days-quest-entries">${day.sideQuestEvents.map(entry => `<div class="my-days-quest-entry"><time>${escapeHtml(naturalTime(entry.timestamp))}</time><span>Completed: <strong>${escapeHtml(entry.title || entry.questId || 'Side Quest')}</strong></span></div>`).join('')}</div></section>`;
  }

  function guidedSkillDetails(day) {
    if (!day.guidedSkillSessions.length) return '';
    return `<section class="my-days-detail-group"><h4>Tools used</h4><div class="my-days-guided-entries">${day.guidedSkillSessions.map(entry => `<div class="my-days-guided-entry"><time>${escapeHtml(naturalTime(entry.timestamp))}</time><span><strong>${escapeHtml(entry.skill || 'Guided skill')}</strong>${entry.feeling ? ` · ${escapeHtml(entry.feeling)}` : ''}</span></div>`).join('')}</div></section>`;
  }

  function renderMyDays() {
    const holder = $('#myDaysList');
    if (!holder) return;
    const days = readDays();
    $('#myDaysCount').textContent = days.length ? `${days.length} day${days.length === 1 ? '' : 's'}` : 'No days yet';
    if (!days.length) {
      holder.innerHTML = '<div class="my-days-empty"><h3>Your days will start showing up here.</h3><p>Feelings, gratitude, and earned trail days stay available whenever you want to look back.</p></div>';
      $('#thisDayLastYear').hidden = true;
      return;
    }
    holder.innerHTML = days.map(day => `<details class="my-day-card"><summary><div class="my-day-date"><time datetime="${day.date}">${escapeHtml(naturalDate(day.date))}</time><span aria-hidden="true">＋</span></div>${daySummary(day)}</summary><div class="my-day-details">${feelingDetails(day)}${gratitudeDetails(day)}${badgeDetails(day)}${sideQuestDetails(day)}${guidedSkillDetails(day)}</div></details>`).join('');
    const storage = window.GrizzlyJohnStorageV2;
    const anniversary = findThisDayLastYear(days, storage.localDateKey(new Date()));
    const anniversaryHolder = $('#thisDayLastYear');
    anniversaryHolder.hidden = !anniversary;
    anniversaryHolder.innerHTML = anniversary ? `<strong>This day last year</strong><span>${escapeHtml(naturalDate(anniversary.date, true))} is already in My Days.</span>` : '';
  }

  function buildMyDays() {
    const wisdom = $('#wisdom');
    const toolbox = $('#johnToolboxLink');
    if (!wisdom || !toolbox) return false;
    if ($('#myDays')) return true;
    const section = document.createElement('section');
    section.className = 'my-days';
    section.id = 'myDays';
    section.innerHTML = `<details class="my-days-shell"><summary><div><p class="eyebrow">LOOK BACK</p><h2>Want to look closer?</h2><p>View My Days, then open the calendar when a date deserves a closer look.</p></div><span class="count-pill" id="myDaysCount">Days</span></summary><div class="my-days-content"><div class="this-day-last-year" id="thisDayLastYear" hidden></div><div class="my-days-list" id="myDaysList"></div></div></details>`;
    toolbox.insertAdjacentElement('beforebegin', section);
    const history = $('#checkInHistory');
    if (history) { history.hidden = false; $('.my-days-content', section).appendChild(history); }
    $('.my-days-shell', section).addEventListener('toggle', event => { if (event.currentTarget.open) renderMyDays(); });
    renderMyDays();
    return true;
  }

  function start() {
    if (buildMyDays()) return;
    [100, 350, 900].forEach(delay => window.setTimeout(buildMyDays, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
