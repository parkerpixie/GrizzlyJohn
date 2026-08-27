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
      if (!days.has(date)) days.set(date, { date, feelings: [], gratitude: [], goldStarDays: [], badgeAwards: [], sideQuestEvents: [], guidedSkillSessions: [] });
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
    (Array.isArray(records.goldStarDays) ? records.goldStarDays : []).forEach(entry => {
      const completed = Array.isArray(entry?.completedStarIds) ? entry.completedStarIds : [];
      if (!completed.length) return;
      const day = ensureDay(dateFor(entry));
      if (day) day.goldStarDays.push(entry);
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

    const definitions = new Map((Array.isArray(records.goldStarDefinitions) ? records.goldStarDefinitions : []).filter(item => item?.id).map(item => [item.id, item]));
    return [...days.values()].map(day => ({
      ...day,
      feelings: [...day.feelings].sort((a, b) => String(a?.timestamp || '').localeCompare(String(b?.timestamp || ''))),
      gratitude: [...day.gratitude].sort((a, b) => String(a?.timestamp || '').localeCompare(String(b?.timestamp || ''))),
      goldStarDays: day.goldStarDays.map(entry => ({
        ...entry,
        completedStars: (Array.isArray(entry?.completedStarIds) ? entry.completedStarIds : []).flatMap(id => {
          const definition = definitions.get(id);
          return definition ? [{ id, label: definition.label }] : [];
        })
      })),
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

  function monthKey(dateKey) {
    return validDateKey(dateKey) ? dateKey.slice(0, 7) : null;
  }

  function shiftMonth(month, offset) {
    if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month) || !Number.isInteger(offset)) return null;
    const [year, monthNumber] = month.split('-').map(Number);
    const absolute = year * 12 + monthNumber - 1 + offset;
    const shiftedYear = Math.floor(absolute / 12);
    const shiftedMonth = ((absolute % 12) + 12) % 12 + 1;
    return `${shiftedYear}-${String(shiftedMonth).padStart(2, '0')}`;
  }

  function calendarMonth(days, viewedMonth, options = {}) {
    const currentDate = validDateKey(options.currentDate) ? options.currentDate : null;
    const selectedDate = validDateKey(options.selectedDate) ? options.selectedDate : null;
    if (!/^\d{4}-\d{2}$/.test(viewedMonth || '')) return null;
    const [year, monthNumber] = viewedMonth.split('-').map(Number);
    const activeDates = new Set((Array.isArray(days) ? days : []).map(day => day?.date).filter(validDateKey));
    const leadingBlanks = new Date(year, monthNumber - 1, 1, 12).getDay();
    const dayCount = new Date(year, monthNumber, 0, 12).getDate();
    const entries = Array.from({ length: dayCount }, (_, index) => {
      const day = index + 1;
      const date = `${viewedMonth}-${String(day).padStart(2, '0')}`;
      return { day, date, active: activeDates.has(date), selected: date === selectedDate, future: Boolean(currentDate && date > currentDate) };
    });
    const label = new Date(year, monthNumber - 1, 1, 12).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { month: viewedMonth, label, leadingBlanks, days: entries, canGoNext: !currentDate || viewedMonth < currentDate.slice(0, 7) };
  }

  function goldStarSummary(day) {
    const activity = Array.isArray(day?.goldStarDays) ? day.goldStarDays[0] : null;
    const completedIds = Array.isArray(activity?.completedStarIds) ? activity.completedStarIds : [];
    const availableIds = Array.isArray(activity?.activeStarIds) ? activity.activeStarIds : null;
    return {
      completedCount: completedIds.length,
      availableCount: availableIds ? availableIds.length : null,
      completedStars: Array.isArray(activity?.completedStars) ? activity.completedStars : [],
      badgeEarned: Boolean(day?.badgeAwards?.length)
    };
  }

  const FAMILY_NAMES = Object.freeze({ bright: 'Bright', calm: 'Calm', neutral: 'Neutral', sad: 'Sad', fear: 'Fear', anger: 'Anger', shame: 'Shame', overwhelmed: 'Overwhelmed' });

  function feelingFamilySummary(day) {
    const counts = new Map();
    const checkIns = Array.isArray(day?.feelings) ? day.feelings : [];
    checkIns.forEach(entry => (Array.isArray(entry?.feelings) ? entry.feelings : []).forEach(feeling => {
      if (!feeling || typeof feeling === 'string') return;
      const family = String(feeling.groupId || '').trim().toLowerCase();
      if (!FAMILY_NAMES[family]) return;
      counts.set(family, (counts.get(family) || 0) + 1);
    }));
    if (!counts.size) return { kind: 'activity', families: [], counts: {}, checkInCount: checkIns.length };
    const maximum = Math.max(...counts.values());
    const families = [...counts.entries()].filter(([, count]) => count === maximum).map(([family]) => family).sort();
    return { kind: families.length > 1 ? 'tie' : 'dominant', families, counts: Object.fromEntries(counts), checkInCount: checkIns.length };
  }

  function anniversaryPreview(day) {
    if (!day) return null;
    const feelings = day.feelings?.flatMap(entry => Array.isArray(entry?.feelings) ? entry.feelings.map(feeling => typeof feeling === 'string' ? feeling : feeling?.word).filter(Boolean) : []) || [];
    const stars = goldStarSummary(day);
    return {
      date: day.date,
      feelings: feelings.slice(0, 2),
      gratitudeCount: day.gratitude?.length || 0,
      goldStarCount: stars.completedCount,
      badgeEarned: stars.badgeEarned,
      sideQuestCount: day.sideQuestEvents?.length || 0
    };
  }

  const exported = { aggregateMyDays, findThisDayLastYear, monthKey, shiftMonth, calendarMonth, goldStarSummary, feelingFamilySummary, anniversaryPreview };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (typeof window === 'undefined') return;
  window.GrizzlyJohnMyDays = exported;

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  let viewedMonth = null;
  let selectedDate = null;

  function readDays() {
    const storage = window.GrizzlyJohnStorageV2;
    const gratitude = storage?.gratitude.all();
    const feelings = storage?.feelingCheckIns.all();
    const goldDays = storage?.readers.goldStarDays();
    const goldDefinitions = storage?.goldStars.list({ includeInactive: true });
    const awards = storage?.goldStarDays.awards();
    const quests = storage?.sideQuestEvents.all();
    const guided = storage?.guidedSkillSessions.all();
    return aggregateMyDays({
      gratitudeEntries: gratitude?.ok ? gratitude.entries : [],
      feelingCheckIns: feelings?.ok ? feelings.entries : [],
      goldStarDays: ['valid', 'unexpected'].includes(goldDays?.status) && Array.isArray(goldDays.value) ? goldDays.value : [],
      goldStarDefinitions: goldDefinitions?.ok ? goldDefinitions.definitions : [],
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
    const stars = goldStarSummary(day);
    const preview = feelings.slice(0, 3).map(word => `<span>${escapeHtml(word)}</span>`).join('');
    const extra = feelings.length > 3 ? `<span>+${feelings.length - 3}</span>` : '';
    const signals = [
      day.gratitude.length ? `${day.gratitude.length} gratitude${day.gratitude.length === 1 ? '' : 's'}` : '',
      stars.completedCount ? `Gold Stars: ${stars.completedCount}${stars.availableCount === null ? '' : ` of ${stars.availableCount}`}` : '',
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

  function goldStarDetails(day) {
    const stars = goldStarSummary(day);
    if (!stars.completedCount) return '';
    const count = stars.availableCount === null ? `${stars.completedCount} completed` : `${stars.completedCount} of ${stars.availableCount} completed`;
    const items = stars.completedStars.length ? `<ul>${stars.completedStars.map(star => `<li>${escapeHtml(star.label)}</li>`).join('')}</ul>` : '<p>Completed Star names were not stored for this day.</p>';
    return `<section class="my-days-detail-group my-days-gold-stars"><h4>Gold Stars</h4><strong>${escapeHtml(count)}</strong>${items}</section>`;
  }

  function sideQuestDetails(day) {
    if (!day.sideQuestEvents.length) return '';
    return `<section class="my-days-detail-group"><h4>Side Quests</h4><div class="my-days-quest-entries">${day.sideQuestEvents.map(entry => `<div class="my-days-quest-entry"><time>${escapeHtml(naturalTime(entry.timestamp))}</time><span>Completed: <strong>${escapeHtml(entry.title || entry.questId || 'Side Quest')}</strong></span></div>`).join('')}</div></section>`;
  }

  function guidedSkillDetails(day) {
    if (!day.guidedSkillSessions.length) return '';
    return `<section class="my-days-detail-group"><h4>Tools used</h4><div class="my-days-guided-entries">${day.guidedSkillSessions.map(entry => `<div class="my-days-guided-entry"><time>${escapeHtml(naturalTime(entry.timestamp))}</time><span><strong>${escapeHtml(entry.skill || 'Guided skill')}</strong>${entry.feeling ? ` · ${escapeHtml(entry.feeling)}` : ''}</span></div>`).join('')}</div></section>`;
  }

  function dayDetails(day) {
    if (!day) return '<p class="history-empty">No saved activity for this day.</p>';
    return `${feelingDetails(day)}${gratitudeDetails(day)}${goldStarDetails(day)}${badgeDetails(day)}${sideQuestDetails(day)}${guidedSkillDetails(day)}`;
  }

  function renderCalendar(days, today) {
    const calendar = $('#checkInCalendar');
    if (!calendar) return;
    if (!viewedMonth) {
      viewedMonth = monthKey(today);
      selectedDate = today;
    }
    const model = calendarMonth(days, viewedMonth, { currentDate: today, selectedDate });
    if (!model) return;
    const blanks = Array.from({ length: model.leadingBlanks }, () => '<span aria-hidden="true"></span>').join('');
    const buttons = model.days.map(entry => {
      const day = days.find(item => item.date === entry.date) || null;
      const summary = day ? feelingFamilySummary(day) : null;
      const familyNames = summary?.families.map(family => FAMILY_NAMES[family]);
      const description = !entry.active
        ? 'No activity'
        : summary?.kind === 'dominant'
          ? `${familyNames[0]} most reported. ${summary.checkInCount} check-in${summary.checkInCount === 1 ? '' : 's'}.`
          : summary?.kind === 'tie'
            ? `${familyNames.join(' and ')} tied as most reported. ${summary.checkInCount} check-in${summary.checkInCount === 1 ? '' : 's'}.`
            : 'Activity recorded. No feeling check-in.';
      const familyClasses = familyNames?.length ? `has-feelings ${summary.families.map(family => `dominant-${family}`).join(' ')}` : '';
      const markers = familyNames?.length
        ? `<span class="calendar-feeling-markers" aria-hidden="true">${summary.families.map(family => `<i class="family-${family}"></i>`).join('')}</span>`
        : entry.active ? '<i class="calendar-activity-dot" aria-hidden="true"></i>' : '';
      const label = `${naturalDate(entry.date, true)}: ${description}`;
      return `<button type="button" class="calendar-day ${entry.selected ? 'is-selected' : ''} ${entry.active ? 'has-activity' : ''} ${familyClasses}" data-my-day-date="${entry.date}" aria-label="${escapeHtml(label)}" ${entry.active ? '' : 'disabled'}><span>${entry.day}</span>${markers}</button>`;
    }).join('');
    calendar.innerHTML = `<div class="my-days-calendar-heading"><button type="button" class="my-days-month-button" data-my-days-month="previous" aria-label="Previous month">‹</button><strong>${escapeHtml(model.label)}</strong><button type="button" class="my-days-month-button" data-my-days-month="next" aria-label="Next month" ${model.canGoNext ? '' : 'disabled'}>›</button></div><div class="calendar-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="calendar-days">${blanks}${buttons}</div>`;
    const selected = days.find(day => day.date === selectedDate) || null;
    const heading = $('#checkInHistoryDate');
    if (heading) heading.textContent = selected ? naturalDate(selected.date, true) : 'Choose a day with activity';
    const details = $('#checkInHistoryList');
    if (details) details.innerHTML = dayDetails(selected);
  }

  function renderAnniversary(days, today) {
    const holder = $('#thisDayLastYear');
    if (!holder) return;
    const anniversary = findThisDayLastYear(days, today);
    const preview = anniversaryPreview(anniversary);
    holder.hidden = !preview;
    if (!preview) { holder.innerHTML = ''; return; }
    const signals = [
      preview.feelings.length ? preview.feelings.join(' · ') : '',
      preview.gratitudeCount ? `${preview.gratitudeCount} gratitude${preview.gratitudeCount === 1 ? '' : 's'}` : '',
      preview.goldStarCount ? `${preview.goldStarCount} Gold Star${preview.goldStarCount === 1 ? '' : 's'}` : '',
      preview.badgeEarned ? 'Trail Day badge' : '',
      preview.sideQuestCount ? `${preview.sideQuestCount} Side Quest${preview.sideQuestCount === 1 ? '' : 's'}` : ''
    ].filter(Boolean);
    holder.innerHTML = `<div><strong>This day last year</strong><span>${escapeHtml(naturalDate(preview.date, true))}</span><small>${escapeHtml(signals.join(' · '))}</small></div><button type="button" class="text-button" data-open-my-day="${preview.date}">View that day →</button>`;
  }

  function renderMyDays(preferredDate) {
    const holder = $('#myDaysList');
    if (!holder) return;
    const days = readDays();
    const storage = window.GrizzlyJohnStorageV2;
    const today = storage.localDateKey(new Date());
    if (validDateKey(preferredDate)) {
      selectedDate = preferredDate;
      viewedMonth = monthKey(preferredDate);
    }
    $('#myDaysCount').textContent = days.length ? `${days.length} day${days.length === 1 ? '' : 's'}` : 'No days yet';
    if (!days.length) {
      holder.innerHTML = '<div class="my-days-empty"><h3>Your days will start showing up here.</h3><p>Feelings, gratitude, and earned trail days stay available whenever you want to look back.</p></div>';
      $('#thisDayLastYear').hidden = true;
      renderCalendar(days, today);
      return;
    }
    holder.innerHTML = days.map(day => `<details class="my-day-card" data-my-day-card="${day.date}"><summary><div class="my-day-date"><time datetime="${day.date}">${escapeHtml(naturalDate(day.date, true))}</time><span aria-hidden="true">＋</span></div>${daySummary(day)}</summary><div class="my-day-details">${dayDetails(day)}</div></details>`).join('');
    renderCalendar(days, today);
    renderAnniversary(days, today);
  }

  function buildMyDays() {
    const wisdom = $('#wisdom');
    const toolbox = $('#johnToolboxLink');
    if (!wisdom || !toolbox) return false;
    if ($('#myDays')) return true;
    const section = document.createElement('section');
    section.className = 'my-days';
    section.id = 'myDays';
    section.innerHTML = `<div class="my-days-shell"><div class="my-days-heading"><div><p class="eyebrow">MY DAYS</p><h2 id="myDaysHeading" tabindex="-1">See how the days have been feeling.</h2><p>The calendar stays open. Choose a day for the full story.</p></div><span class="count-pill" id="myDaysCount">Days</span></div><div class="my-days-content"><div class="this-day-last-year" id="thisDayLastYear" hidden></div><details class="my-days-deeper"><summary>Browse the full day-by-day list</summary><div class="my-days-list" id="myDaysList"></div></details></div></div>`;
    toolbox.insertAdjacentElement('beforebegin', section);
    const history = $('#checkInHistory');
    if (history) {
      history.hidden = false;
      $('.history-heading .eyebrow', history).textContent = 'MY DAYS CALENDAR';
      $('.history-heading h2', history).textContent = 'Browse your days';
      $('.my-days-content', section).insertBefore(history, $('.my-days-deeper', section));
    }
    section.addEventListener('click', event => {
      const monthButton = event.target.closest('[data-my-days-month]');
      if (monthButton) {
        const next = shiftMonth(viewedMonth, monthButton.dataset.myDaysMonth === 'previous' ? -1 : 1);
        const currentMonth = monthKey(window.GrizzlyJohnStorageV2.localDateKey(new Date()));
        if (next && next <= currentMonth) { viewedMonth = next; selectedDate = null; renderMyDays(); }
        return;
      }
      const dayButton = event.target.closest('[data-my-day-date]');
      if (dayButton) {
        selectedDate = dayButton.dataset.myDayDate;
        renderMyDays();
        return;
      }
      const anniversaryButton = event.target.closest('[data-open-my-day]');
      if (anniversaryButton) {
        renderMyDays(anniversaryButton.dataset.openMyDay);
        const card = $(`[data-my-day-card="${anniversaryButton.dataset.openMyDay}"]`);
        if (card) card.open = true;
        $('#checkInHistory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    renderMyDays();
    exported.refresh = renderMyDays;
    exported.reveal = preferredDate => {
      renderMyDays(preferredDate);
      const heading = $('#myDaysHeading');
      heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => heading?.focus({ preventScroll: true }), 350);
    };
    return true;
  }

  function start() {
    if (buildMyDays()) return;
    [100, 350, 900].forEach(delay => window.setTimeout(buildMyDays, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
