(() => {
  'use strict';

  const groups = Object.freeze([
    { id: 'bright', label: 'BRIGHT / GOOD', display: 'Bright / good', icon: '☀️', words: ['Great', 'Joyful', 'Happy', 'Content', 'Grateful', 'Hopeful', 'Proud', 'Playful', 'Excited', 'Energized', 'Inspired', 'Curious', 'Connected', 'Loved', 'Confident', 'Accomplished', 'Relieved'] },
    { id: 'calm', label: 'CALM / GROUNDED', display: 'Calm / grounded', icon: '🌲', words: ['Peaceful', 'Grounded', 'Centered', 'Safe', 'Comfortable', 'Relaxed', 'Patient', 'Open', 'Present', 'Steady', 'Trusting'] },
    { id: 'neutral', label: 'NEUTRAL / LOW ENERGY', display: 'Neutral / low energy', icon: '🌥️', words: ['Okay', 'Fine', 'Neutral', 'Indifferent', 'Bored', 'Tired', 'Flat', 'Detached', 'Distracted', 'Unmotivated', 'Restless'] },
    { id: 'sad', label: 'SAD / HURT', display: 'Sad / hurt', icon: '🌧️', words: ['Disappointed', 'Discouraged', 'Lonely', 'Hurt', 'Rejected', 'Unseen', 'Grieving', 'Heavy', 'Empty', 'Hopeless', 'Devastated', 'Vulnerable'] },
    { id: 'fear', label: 'FEAR / ANXIETY', display: 'Fear / anxiety', icon: '🌫️', words: ['Worried', 'Nervous', 'Uneasy', 'Apprehensive', 'Afraid', 'Panicked', 'Insecure', 'Dread', 'On edge', 'Overthinking', 'Pressured', 'Uncertain', 'Powerless'] },
    { id: 'anger', label: 'ANGER', display: 'Anger', icon: '🔥', words: ['Annoyed', 'Irritated', 'Frustrated', 'Resentful', 'Bitter', 'Defensive', 'Disrespected', 'Betrayed', 'Jealous', 'Provoked', 'Furious', 'Enraged'] },
    { id: 'shame', label: 'SHAME / SELF-CONSCIOUS', display: 'Shame / self-conscious', icon: '🪞', words: ['Embarrassed', 'Ashamed', 'Guilty', 'Inadequate', 'Exposed', 'Self-conscious', 'Regretful', 'Invalidated'] },
    { id: 'overwhelmed', label: 'OVERWHELMED / DYSREGULATED', display: 'Overwhelmed / dysregulated', icon: '🌪️', words: ['Overwhelmed', 'Flooded', 'Dysregulated', 'Scattered', 'Trapped', 'Stuck', 'Conflicted', 'Ambivalent', 'Shut down', 'Numb', 'Burned out', 'Helpless'] }
  ].map(group => Object.freeze({ ...group, words: Object.freeze([...group.words]) })));

  const byId = new Map(groups.map(group => [group.id, group]));
  const byLabel = new Map(groups.map(group => [group.label.toLocaleLowerCase(), group.id]));
  const byWord = new Map(groups.flatMap(group => group.words.map(word => [word.toLocaleLowerCase(), group.id])));

  function familyIdForFeeling(feeling) {
    if (!feeling) return null;
    if (typeof feeling === 'object') {
      const direct = String(feeling.groupId || '').trim().toLocaleLowerCase();
      if (byId.has(direct)) return direct;
      const group = String(feeling.group || '').trim().toLocaleLowerCase();
      if (byId.has(group)) return group;
      if (byLabel.has(group)) return byLabel.get(group);
    }
    const word = String(typeof feeling === 'string' ? feeling : feeling.word || '').trim().toLocaleLowerCase();
    return byWord.get(word) || null;
  }

  function feelingWord(feeling) {
    return String(typeof feeling === 'string' ? feeling : feeling?.word || '').trim();
  }

  function summarizeFeelingDay(checkIns) {
    const counts = new Map();
    (Array.isArray(checkIns) ? checkIns : []).forEach(entry => (Array.isArray(entry?.feelings) ? entry.feelings : []).forEach(feeling => {
      const family = familyIdForFeeling(feeling);
      if (family) counts.set(family, (counts.get(family) || 0) + 1);
    }));
    if (!counts.size) return { kind: 'activity', families: [], counts: {}, checkInCount: Array.isArray(checkIns) ? checkIns.length : 0 };
    const maximum = Math.max(...counts.values());
    const families = [...counts.entries()].filter(([, count]) => count === maximum).map(([family]) => family).sort();
    return { kind: families.length > 1 ? 'tie' : 'dominant', families, counts: Object.fromEntries(counts), checkInCount: checkIns.length };
  }

  function displayName(familyId) { return byId.get(familyId)?.display || familyId; }

  const api = Object.freeze({ groups, familyIdForFeeling, feelingWord, summarizeFeelingDay, displayName });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GrizzlyJohnFeelingFamilies = api;
})();
