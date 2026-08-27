(() => {
  'use strict';

  const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
  const STOP_WORDS = new Set([
    'about', 'after', 'again', 'also', 'and', 'because', 'been', 'being', 'day', 'felt', 'for',
    'good', 'grateful', 'gratitude', 'had', 'have', 'into', 'just', 'made', 'nice', 'really',
    'that', 'the', 'their', 'them', 'there', 'thing', 'this', 'thankful', 'time', 'today', 'very',
    'was', 'were', 'with', 'would', 'you', 'your'
  ]);

  function defaultLocalDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function recordDate(record, localDateKey) {
    if (DATE_ONLY.test(record?.date || '')) return record.date;
    const source = record?.timestamp || record?.date;
    if (!source) return '';
    try { return localDateKey(source); } catch { return ''; }
  }

  function rollingDateSet(now, length, localDateKey) {
    const dates = new Set();
    for (let offset = 0; offset < length; offset += 1) {
      const date = new Date(now);
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      dates.add(localDateKey(date));
    }
    return dates;
  }

  function feelingDayCounts(checkIns, dates, localDateKey) {
    const activeDays = new Set();
    const daysByFeeling = new Map();
    (Array.isArray(checkIns) ? checkIns : []).forEach(entry => {
      const date = recordDate(entry, localDateKey);
      if (!dates.has(date) || !Array.isArray(entry?.feelings)) return;
      const feelings = new Map();
      entry.feelings.forEach(feeling => {
        const raw = typeof feeling === 'string' ? feeling : feeling?.word;
        const word = String(raw || '').trim();
        if (word) feelings.set(word.toLocaleLowerCase(), word);
      });
      if (!feelings.size) return;
      activeDays.add(date);
      feelings.forEach((display, normalized) => {
        if (!daysByFeeling.has(normalized)) daysByFeeling.set(normalized, { display, dates: new Set() });
        daysByFeeling.get(normalized).dates.add(date);
      });
    });
    return {
      activeDays: activeDays.size,
      feelings: [...daysByFeeling.values()]
        .map(item => ({ feeling: item.display, days: item.dates.size }))
        .sort((left, right) => right.days - left.days || left.feeling.localeCompare(right.feeling))
    };
  }

  function gratitudeThemes(entries, dates, localDateKey, limit = 3) {
    const terms = new Map();
    (Array.isArray(entries) ? entries : []).forEach(entry => {
      const date = recordDate(entry, localDateKey);
      const text = typeof entry?.text === 'string' ? entry.text : '';
      if (!dates.has(date) || !text.trim()) return;
      const seen = new Set();
      const tokens = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
      tokens.forEach(token => {
        const normalized = token.toLocaleLowerCase().replace(/^[’']+|[’']+$/g, '');
        if (normalized.length < 3 || STOP_WORDS.has(normalized) || seen.has(normalized)) return;
        seen.add(normalized);
        if (!terms.has(normalized)) terms.set(normalized, { display: token, entries: 0, dates: new Set() });
        const term = terms.get(normalized);
        term.entries += 1;
        term.dates.add(date);
        const titleCased = /^[A-Z][\p{Ll}\p{N}'’-]*$/u.test(token);
        if (term.display === term.display.toLocaleLowerCase() && titleCased) term.display = token;
      });
    });
    return [...terms.values()]
      .filter(term => term.entries >= 3 && term.dates.size >= 2)
      .sort((left, right) => right.entries - left.entries || right.dates.size - left.dates.size || left.display.localeCompare(right.display))
      .slice(0, limit)
      .map(term => ({ term: term.display, entries: term.entries, days: term.dates.size }));
  }

  function derivePatternObservations(checkIns = [], guidedSessions = [], options = {}) {
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const localDateKey = options.localDateKey || defaultLocalDateKey;
    const sevenDates = rollingDateSet(now, 7, localDateKey);
    const thirtyDates = rollingDateSet(now, 30, localDateKey);
    const weekly = feelingDayCounts(checkIns, sevenDates, localDateKey);
    const monthly = feelingDayCounts(checkIns, thirtyDates, localDateKey);
    const observations = [];

    // Four distinct check-in days are required before a seven-day pattern is described.
    if (weekly.activeDays >= 4) {
      weekly.feelings
        .filter(item => item.days >= 4 || (item.days === 3 && weekly.activeDays >= 5))
        .slice(0, 2)
        .forEach(item => observations.push({ category: 'Last 7 days', text: `${item.feeling} showed up on ${item.days} of the last 7 days.` }));
    }

    // Six distinct check-in days are required for the broader monthly summary.
    if (monthly.activeDays >= 6) {
      monthly.feelings
        .filter(item => item.days >= 4)
        .slice(0, 3)
        .forEach(item => observations.push({ category: 'Last 30 days', text: `${item.feeling} appeared on ${item.days} of the last 30 days.` }));
    }

    gratitudeThemes(options.gratitudeEntries, thirtyDates, localDateKey).forEach(theme => {
      observations.push({ category: 'Gratitude themes', text: `${theme.term} came up several times in your gratitude over the last 30 days.` });
    });

    const skillCounts = new Map();
    (Array.isArray(guidedSessions) ? guidedSessions : []).forEach(session => {
      const date = recordDate(session, localDateKey);
      if (thirtyDates.has(date) && session?.skill) skillCounts.set(session.skill, (skillCounts.get(session.skill) || 0) + 1);
    });
    const repeatedSkill = [...skillCounts.entries()].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1])[0];
    if (repeatedSkill) observations.push({ category: 'Tools', text: `${repeatedSkill[0]} has been one of the tools you’ve reached for several times this month.` });
    return observations;
  }

  const exported = { derivePatternObservations, feelingDayCounts, gratitudeThemes, rollingDateSet, recordDate, STOP_WORDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (typeof window !== 'undefined') window.GrizzlyJohnWisdomPatterns = exported;
})();
