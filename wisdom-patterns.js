(() => {
  'use strict';

  function derivePatternObservations(checkIns = [], guidedSessions = [], options = {}) {
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const localDateKey = options.localDateKey || (value => {
      const date = value instanceof Date ? value : new Date(value);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    const keyAt = offset => { const date = new Date(now); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - offset); return localDateKey(date); };
    const thisWeek = new Set(Array.from({ length: 7 }, (_, index) => keyAt(index)));
    const lastWeek = new Set(Array.from({ length: 7 }, (_, index) => keyAt(index + 7)));
    const entries = Array.isArray(checkIns) ? checkIns : [];
    const recent = entries.filter(entry => thisWeek.has(entry?.date));
    const previous = entries.filter(entry => lastWeek.has(entry?.date));
    const feelingCounts = new Map();
    recent.flatMap(entry => Array.isArray(entry?.feelings) ? entry.feelings : []).forEach(feeling => {
      const word = typeof feeling === 'string' ? feeling : feeling?.word;
      if (word) feelingCounts.set(word, (feelingCounts.get(word) || 0) + 1);
    });
    const repeatedFeeling = [...feelingCounts.entries()].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1])[0];
    const monthPrefix = localDateKey(now).slice(0, 7);
    const skillCounts = new Map();
    (Array.isArray(guidedSessions) ? guidedSessions : []).filter(session => String(session?.date || '').startsWith(monthPrefix)).forEach(session => {
      if (session?.skill) skillCounts.set(session.skill, (skillCounts.get(session.skill) || 0) + 1);
    });
    const repeatedSkill = [...skillCounts.entries()].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1])[0];
    const observations = [];
    if (repeatedFeeling) observations.push({ category: 'Feelings', text: `${repeatedFeeling[0]} has shown up ${repeatedFeeling[1]} times in the last 7 days.` });
    if (repeatedSkill) observations.push({ category: 'Tools', text: `${repeatedSkill[0]} has been one of the tools you’ve reached for several times this month.` });
    if (recent.length >= 3 && recent.length >= previous.length + 2) observations.push({ category: 'Check-In Rhythm', text: 'You checked in more often this week than last week.' });
    else if (previous.length >= 3 && previous.length >= recent.length + 2) observations.push({ category: 'Check-In Rhythm', text: 'You checked in less often this week than last week.' });
    return observations;
  }

  const exported = { derivePatternObservations };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (typeof window !== 'undefined') window.GrizzlyJohnWisdomPatterns = exported;
})();
