'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { derivePatternObservations, feelingDayCounts, familyDayCounts, gratitudeThemes, rollingDateSet, recordDate } = require('../wisdom-patterns.js');
const families = require('../feeling-families.js');

const now = new Date(2026, 7, 27, 12, 0, 0);
const localDateKey = value => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const date = offset => { const value = new Date(now); value.setDate(value.getDate() - offset); return localDateKey(value); };
const entry = (offset, ...feelings) => ({ date: date(offset), feelings: feelings.map(word => ({ word })) });
const texts = result => result.map(item => item.text);

test('A: seven-day feeling counts use distinct local days, not raw check-ins', () => {
  const checkIns = [entry(0, 'Sad'), entry(0, 'Sad'), entry(0, 'Sad'), entry(1, 'Sad'), entry(2, 'Sad'), entry(3, 'Sad')];
  const result = derivePatternObservations(checkIns, [], { now, localDateKey });
  assert.ok(texts(result).includes('Sad showed up on 4 of the last 7 days.'));
  assert.equal(texts(result).some(text => /6 of the last 7/.test(text)), false);
});

test('B: multiple feelings count once each per date and duplicates do not inflate them', () => {
  const dates = rollingDateSet(now, 7, localDateKey);
  const counts = feelingDayCounts([
    entry(0, 'Anxious', 'Hopeful', 'Anxious'), entry(0, 'Hopeful'), entry(1, 'Anxious', 'Hopeful')
  ], dates, localDateKey);
  assert.equal(counts.activeDays, 2);
  assert.deepEqual(counts.feelings.map(item => [item.feeling, item.days]), [['Anxious', 2], ['Hopeful', 2]]);
});

test('C: seven-day thresholds surface recurrence but suppress weak and sparse conclusions', () => {
  const useful = derivePatternObservations([
    entry(0, 'Calm', 'Tired'), entry(1, 'Calm'), entry(2, 'Calm'), entry(3, 'Calm'), entry(4, 'Tired')
  ], [], { now, localDateKey });
  assert.ok(texts(useful).some(text => /^Calm showed up/.test(text)));
  assert.equal(texts(useful).some(text => /^Tired showed up/.test(text)), false);
  const sparse = derivePatternObservations([entry(0, 'Calm'), entry(1, 'Calm'), entry(2, 'Calm')], [], { now, localDateKey });
  assert.deepEqual(sparse, []);
});

test('D: thirty-day results use distinct days, rank strongest feelings, cap output, and require enough data', () => {
  const checkIns = [];
  for (let offset = 0; offset < 12; offset += 1) {
    const feelings = ['Consistent'];
    if (offset < 9) feelings.push('Reflective');
    if (offset < 7) feelings.push('Wistful');
    if (offset < 5) feelings.push('Observant');
    checkIns.push(entry(offset, ...feelings));
  }
  checkIns.push(entry(8, 'Consistent'), entry(8, 'Consistent'));
  const monthly = derivePatternObservations(checkIns, [], { now, localDateKey }).filter(item => item.category === 'Last 30 days');
  assert.equal(monthly.length, 3);
  assert.deepEqual(monthly.map(item => item.text), [
    'Consistent appeared on 12 of the last 30 days.',
    'Reflective appeared on 9 of the last 30 days.',
    'Wistful appeared on 7 of the last 30 days.'
  ]);
  const sparse = derivePatternObservations([entry(10, 'Steady'), entry(11, 'Steady')], [], { now, localDateKey });
  assert.equal(sparse.some(item => item.category === 'Last 30 days'), false);
});

test('E: recurring positive feelings are eligible under the same rules', () => {
  const result = derivePatternObservations([0, 1, 2, 3, 4].map(offset => entry(offset, 'Joyful')), [], { now, localDateKey });
  assert.ok(texts(result).includes('Bright / good feelings were dominant on 5 of the last 7 days.'));
  assert.ok(texts(result).includes('Joyful appeared on 5 of the last 30 days.') === false, 'monthly summary still requires six active days');
});

test('F: gratitude themes merge casing, ignore duplicate words and stop words, require recurrence, and cap output', () => {
  const gratitude = [
    { date: date(0), text: 'Blue blue BLUE made me laugh today' },
    { date: date(1), text: 'Walked with blue and Cedar' },
    { date: date(2), text: 'Grateful Blue curled up by Cedar' },
    { date: date(3), text: 'Cedar was good today' },
    { date: date(4), text: 'Coffee outside' },
    { date: date(5), text: 'coffee helped' },
    { date: date(6), text: 'Coffee and quiet' },
    { date: date(7), text: 'Sunrise one' }, { date: date(8), text: 'Sunrise two' }, { date: date(9), text: 'Sunrise three' }
  ];
  const themes = gratitudeThemes(gratitude, rollingDateSet(now, 30, localDateKey), localDateKey);
  assert.equal(themes.length, 3);
  assert.ok(themes.some(theme => theme.term === 'Blue' && theme.entries === 3));
  assert.equal(themes.some(theme => theme.term.toLowerCase() === 'today'), false);
  assert.equal(themes.some(theme => theme.term.toLowerCase() === 'laugh'), false);
});

test('G: gratitude observations reveal only the recurring term, not full entries', () => {
  const privatePhrase = 'private sentence about a difficult morning';
  const gratitudeEntries = [0, 1, 2].map(offset => ({ date: date(offset), text: `Blue ${privatePhrase}` }));
  const result = derivePatternObservations([], [], { now, localDateKey, gratitudeEntries });
  const theme = result.find(item => item.category === 'Gratitude themes' && item.text.startsWith('Blue '));
  assert.ok(theme);
  assert.equal(theme.text.includes(privatePhrase), false);
});

test('H: local date-only records remain stable across month and year boundaries', () => {
  const boundaryNow = new Date(2027, 0, 2, 12, 0, 0);
  const resolver = value => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('date-only values must not be parsed');
    return localDateKey(value);
  };
  const dates = rollingDateSet(boundaryNow, 7, resolver);
  const counts = feelingDayCounts([
    { date: '2026-12-31', feelings: [{ word: 'Steady' }] },
    { date: '2027-01-01', feelings: [{ word: 'Steady' }] }
  ], dates, resolver);
  assert.equal(counts.activeDays, 2);
  assert.equal(counts.feelings[0].days, 2);
  assert.equal(recordDate({ date: '2026-03-08', timestamp: '2026-03-09T01:30:00.000Z' }, resolver), '2026-03-08');
});

test('I: empty and partial data never crash or fabricate patterns', () => {
  assert.deepEqual(derivePatternObservations([], [], { now, localDateKey }), []);
  assert.deepEqual(derivePatternObservations([{ date: date(0) }, null, { feelings: 'bad shape' }], [], { now, localDateKey }), []);
  assert.equal(derivePatternObservations([], [], {
    now, localDateKey, gratitudeEntries: [0, 1, 2].map(offset => ({ date: date(offset), text: 'Blue' }))
  }).some(item => item.category === 'Gratitude themes'), true);
  assert.equal(derivePatternObservations([0, 1, 2, 3].map(offset => entry(offset, 'Steady')), [], {
    now, localDateKey, gratitudeEntries: []
  }).some(item => item.category === 'Last 7 days'), true);
});

test('J: repeated guided tool use remains an observational Wisdom insight', () => {
  const sessions = [0, 1, 2].map(offset => ({ date: date(offset), skill: 'TIPP' }));
  const result = derivePatternObservations([], sessions, { now, localDateKey });
  assert.ok(result.some(item => item.category === 'Tools' && /reached for several times/.test(item.text)));
});

test('K: different anger words combine into one weekly family pattern with representative words', () => {
  const result = derivePatternObservations([
    entry(0, 'Annoyed'), entry(1, 'Irritated'), entry(2, 'Frustrated'), entry(3, 'Resentful')
  ], [], { now, localDateKey });
  const pattern = result.find(item => item.familyId === 'anger' && item.category === 'Last 7 days');
  assert.equal(pattern.text, 'Anger feelings were dominant on 4 of the last 7 days.');
  assert.match(pattern.detail, /^Showing up as: /);
  assert.ok(pattern.detail.includes('Annoyed'));
  assert.equal(result.some(item => /^Annoyed showed up/.test(item.text)), false);
});

test('L: the shared daily classifier counts only dominant families and preserves ties', () => {
  const dates = rollingDateSet(now, 7, localDateKey);
  const checkIns = [
    entry(0, 'Annoyed', 'Irritated', 'Frustrated'), entry(0, 'Hopeful'),
    entry(1, 'Annoyed'), entry(1, 'Hopeful')
  ];
  const counts = familyDayCounts(checkIns, dates, localDateKey);
  assert.equal(counts.families.find(item => item.family === 'anger').days, 2);
  assert.equal(counts.families.find(item => item.family === 'bright').days, 1);
  const dayZero = families.summarizeFeelingDay(checkIns.filter(item => item.date === date(0)));
  assert.deepEqual(dayZero.families, ['anger']);
  const dayOne = families.summarizeFeelingDay(checkIns.filter(item => item.date === date(1)));
  assert.deepEqual(dayOne.families, ['anger', 'bright']);
});

test('M: multiple check-ins aggregate by date, and representatives rank distinct days with a three-word cap', () => {
  const dates = rollingDateSet(now, 7, localDateKey);
  const counts = familyDayCounts([
    entry(0, 'Annoyed'), entry(0, 'Annoyed', 'Irritated'),
    entry(1, 'Annoyed', 'Frustrated'), entry(2, 'Irritated', 'Resentful'), entry(3, 'Jealous')
  ], dates, localDateKey);
  const anger = counts.families.find(item => item.family === 'anger');
  assert.equal(anger.days, 4);
  assert.equal(anger.words.length, 3);
  assert.deepEqual(anger.words.map(item => [item.word, item.days]), [['Annoyed', 2], ['Irritated', 2], ['Frustrated', 1]]);
});

test('N: weekly and monthly family thresholds use active days and remain positive-family neutral', () => {
  const threeOfFive = derivePatternObservations([
    entry(0, 'Hopeful'), entry(1, 'Joyful'), entry(2, 'Grateful'), entry(3, 'Tired'), entry(4, 'Worried')
  ], [], { now, localDateKey });
  assert.ok(threeOfFive.some(item => item.familyId === 'bright' && /3 of the last 7/.test(item.text)));
  const threeOfFour = derivePatternObservations([
    entry(0, 'Hopeful'), entry(1, 'Joyful'), entry(2, 'Grateful'), entry(3, 'Tired')
  ], [], { now, localDateKey });
  assert.equal(threeOfFour.some(item => item.familyId === 'bright'), false);
  const monthly = derivePatternObservations([
    entry(8, 'Annoyed'), entry(9, 'Irritated'), entry(10, 'Frustrated'), entry(11, 'Resentful'), entry(12, 'Tired'), entry(13, 'Worried')
  ], [], { now, localDateKey });
  assert.ok(monthly.some(item => item.familyId === 'anger' && item.category === 'Last 30 days'));
  const monthlySparse = derivePatternObservations([
    entry(8, 'Annoyed'), entry(9, 'Irritated'), entry(10, 'Frustrated'), entry(11, 'Resentful'), entry(12, 'Tired')
  ], [], { now, localDateKey });
  assert.equal(monthlySparse.some(item => item.familyId === 'anger' && item.category === 'Last 30 days'), false);
});

test('O: family counting honors date-only records and the supplied local timestamp boundary', () => {
  const resolver = value => typeof value === 'string' && value === 'boundary' ? '2026-08-26' : localDateKey(value);
  const counts = familyDayCounts([
    { date: '2026-08-27', feelings: [{ word: 'Annoyed' }] },
    { timestamp: 'boundary', feelings: [{ word: 'Irritated' }] }
  ], rollingDateSet(now, 7, localDateKey), resolver);
  assert.equal(counts.families.find(item => item.family === 'anger').days, 2);
});
