const test = require('node:test');
const assert = require('node:assert/strict');
const { aggregateMyDays, findThisDayLastYear, shiftMonth, calendarMonth, goldStarSummary, anniversaryPreview } = require('../my-days.js');

test('aggregates gratitude, multiple feeling check-ins, and badge awards by local date', () => {
  const days = aggregateMyDays({
    feelingCheckIns: [
      { id: 'f2', date: '2026-08-24', timestamp: '2026-08-24T20:00:00-04:00', feelings: [{ word: 'Tired' }, { word: 'Grateful' }] },
      { id: 'f1', date: '2026-08-24', timestamp: '2026-08-24T08:00:00-04:00', feelings: [{ word: 'Hopeful' }] }
    ],
    gratitudeEntries: [{ id: 'g1', date: '2026-08-24', timestamp: '2026-08-24T09:00:00-04:00', text: 'Coffee outside' }],
    badgeAwards: [{ id: 'b1', date: '2026-08-24', awardedAt: '2026-08-24T21:00:00-04:00' }],
    guidedSkillSessions: [{ id: 's1', date: '2026-08-24', timestamp: '2026-08-24T08:30:00-04:00', feeling: 'Hopeful', skill: 'WISE MIND' }]
  });
  assert.equal(days.length, 1);
  assert.deepEqual(days[0].feelings.map(entry => entry.id), ['f1', 'f2']);
  assert.equal(days[0].feelings[1].feelings.length, 2);
  assert.equal(days[0].gratitude.length, 1);
  assert.equal(days[0].badgeAwards[0].id, 'b1');
  assert.equal(days[0].guidedSkillSessions[0].skill, 'WISE MIND');
});

test('keeps partial days and sorts newest first', () => {
  const days = aggregateMyDays({
    feelingCheckIns: [{ id: 'feelings-only', date: '2026-08-22', timestamp: '2026-08-22T12:00:00', feelings: [{ word: 'Okay' }] }],
    gratitudeEntries: [{ id: 'gratitude-only', date: '2026-08-23', timestamp: '2026-08-23T12:00:00', text: 'Blue' }],
    badgeAwards: [{ id: 'badge-only', date: '2026-08-24', awardedAt: '2026-08-24T12:00:00' }]
  });
  assert.deepEqual(days.map(day => day.date), ['2026-08-24', '2026-08-23', '2026-08-22']);
  assert.equal(days[0].feelings.length, 0);
  assert.equal(days[1].badgeAwards.length, 0);
  assert.equal(days[2].gratitude.length, 0);
});

test('uses the supplied local-date resolver for timestamp-only records', () => {
  const days = aggregateMyDays({ gratitudeEntries: [{ id: 'late', timestamp: '2026-08-25T01:30:00.000Z', text: 'Evening walk' }] }, { localDateKey: () => '2026-08-24' });
  assert.equal(days[0].date, '2026-08-24');
});

test('finds only the exact same local month and day one year earlier', () => {
  const days = [{ date: '2025-08-24' }, { date: '2025-08-23' }];
  assert.equal(findThisDayLastYear(days, '2026-08-24').date, '2025-08-24');
  assert.equal(findThisDayLastYear(days, 'not-a-date'), null);
});

test('adds dated Side Quest events to the correct day without fabricating cumulative history', () => {
  const days = aggregateMyDays({ sideQuestEvents: [
    { id: 'q2', date: '2026-08-24', timestamp: '2026-08-24T20:00:00-04:00', title: 'Take the scenic route' },
    { id: 'q1', date: '2026-08-24', timestamp: '2026-08-24T08:00:00-04:00', title: 'Explore a new trail' }
  ] });
  assert.equal(days.length, 1);
  assert.deepEqual(days[0].sideQuestEvents.map(event => event.id), ['q1', 'q2']);
});

test('days without Side Quest events retain their existing records', () => {
  const days = aggregateMyDays({
    feelingCheckIns: [{ id: 'f1', date: '2026-08-23', timestamp: '2026-08-23T08:00:00', feelings: [{ word: 'Steady' }] }],
    gratitudeEntries: [{ id: 'g1', date: '2026-08-23', timestamp: '2026-08-23T09:00:00', text: 'Blue' }],
    badgeAwards: [{ id: 'b1', date: '2026-08-23', awardedAt: '2026-08-23T10:00:00' }]
  });
  assert.equal(days[0].sideQuestEvents.length, 0);
  assert.equal(days[0].feelings.length, 1);
  assert.equal(days[0].gratitude.length, 1);
  assert.equal(days[0].badgeAwards.length, 1);
});

test('A: preserves stored Gold Star counts, completed labels, and badge awards without inventing missing detail', () => {
  const days = aggregateMyDays({
    goldStarDefinitions: [{ id: 'walk', label: 'Take a walk' }, { id: 'call', label: 'Call a friend' }],
    goldStarDays: [
      { date: '2026-08-24', activeStarIds: ['walk', 'call', 'unknown'], completedStarIds: ['walk', 'unknown'], updatedAt: '2026-08-24T20:00:00' },
      { date: '2026-08-23', completedStarIds: ['missing-definition'], updatedAt: '2026-08-23T20:00:00' }
    ],
    badgeAwards: [{ id: 'award', date: '2026-08-24', awardedAt: '2026-08-24T21:00:00', completedCount: 2, activeCount: 3 }]
  });
  const complete = goldStarSummary(days[0]);
  assert.equal(complete.completedCount, 2);
  assert.equal(complete.availableCount, 3);
  assert.deepEqual(complete.completedStars, [{ id: 'walk', label: 'Take a walk' }]);
  assert.equal(complete.badgeEarned, true);
  const older = goldStarSummary(days[1]);
  assert.equal(older.completedCount, 1);
  assert.equal(older.availableCount, null);
  assert.deepEqual(older.completedStars, []);
});

test('B: activity dates include each supported category and exclude a truly empty Gold Star record', () => {
  const days = aggregateMyDays({
    feelingCheckIns: [{ id: 'f', date: '2026-08-20', feelings: [{ word: 'Fine' }] }],
    gratitudeEntries: [{ id: 'g', date: '2026-08-21', text: 'Blue' }],
    goldStarDays: [
      { date: '2026-08-22', activeStarIds: ['one'], completedStarIds: ['one'] },
      { date: '2026-08-19', activeStarIds: ['one'], completedStarIds: [] }
    ],
    badgeAwards: [{ id: 'b', date: '2026-08-23' }]
  });
  assert.deepEqual(days.map(day => day.date), ['2026-08-23', '2026-08-22', '2026-08-21', '2026-08-20']);
  const calendar = calendarMonth(days, '2026-08', { currentDate: '2026-08-24' });
  assert.equal(calendar.days.find(day => day.date === '2026-08-20').active, true);
  assert.equal(calendar.days.find(day => day.date === '2026-08-21').active, true);
  assert.equal(calendar.days.find(day => day.date === '2026-08-22').active, true);
  assert.equal(calendar.days.find(day => day.date === '2026-08-23').active, true);
  assert.equal(calendar.days.find(day => day.date === '2026-08-19').active, false);
});

test('C: multiple check-ins remain grouped in one local calendar day', () => {
  const days = aggregateMyDays({ feelingCheckIns: [
    { id: 'morning', date: '2026-08-24', timestamp: '2026-08-24T08:00:00-05:00', feelings: [{ word: 'Hopeful' }] },
    { id: 'evening', date: '2026-08-24', timestamp: '2026-08-25T01:00:00.000Z', feelings: [{ word: 'Tired' }] }
  ] });
  assert.equal(days.length, 1);
  assert.deepEqual(days[0].feelings.map(entry => entry.id), ['morning', 'evening']);
});

test('D: calendar month navigation crosses year boundaries and constrains future months', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2025-12', 1), '2026-01');
  const previous = calendarMonth([{ date: '2025-12-31' }], '2025-12', { currentDate: '2026-01-15', selectedDate: '2025-12-31' });
  assert.equal(previous.label, 'December 2025');
  assert.equal(previous.days.find(day => day.date === '2025-12-31').selected, true);
  assert.equal(previous.canGoNext, true);
  const current = calendarMonth([], '2026-01', { currentDate: '2026-01-15' });
  assert.equal(current.canGoNext, false);
});

test('E: This Day Last Year appears only for real activity and previews persisted signals', () => {
  const days = aggregateMyDays({
    gratitudeEntries: [{ id: 'g', date: '2025-08-27', text: 'A good walk' }],
    goldStarDays: [{ date: '2025-08-27', activeStarIds: ['walk'], completedStarIds: ['walk'] }]
  });
  const match = findThisDayLastYear(days, '2026-08-27');
  assert.equal(match.date, '2025-08-27');
  assert.deepEqual(anniversaryPreview(match), {
    date: '2025-08-27', feelings: [], gratitudeCount: 1, goldStarCount: 1, badgeEarned: false, sideQuestCount: 0
  });
  assert.equal(findThisDayLastYear(days, '2026-08-26'), null);
  assert.equal(anniversaryPreview(null), null);
});

test('F: each partial historical day remains useful without empty companion categories', () => {
  const days = aggregateMyDays({
    gratitudeEntries: [{ id: 'g', date: '2026-06-01', text: 'Only gratitude' }],
    badgeAwards: [{ id: 'b', date: '2026-06-02', awardedAt: '2026-06-02T12:00:00' }]
  });
  assert.equal(days.find(day => day.date === '2026-06-01').feelings.length, 0);
  assert.equal(days.find(day => day.date === '2026-06-01').gratitude.length, 1);
  assert.equal(days.find(day => day.date === '2026-06-02').goldStarDays.length, 0);
  assert.equal(days.find(day => day.date === '2026-06-02').badgeAwards.length, 1);
});

test('G: date-only records stay on month-end and year-end local dates', () => {
  const days = aggregateMyDays({
    gratitudeEntries: [
      { id: 'month-end', date: '2026-08-31', timestamp: '2026-09-01T01:00:00.000Z', text: 'August' },
      { id: 'year-end', date: '2026-12-31', timestamp: '2027-01-01T02:00:00.000Z', text: 'December' }
    ]
  }, { localDateKey: () => { throw new Error('date-only values must not be converted'); } });
  assert.deepEqual(days.map(day => day.date), ['2026-12-31', '2026-08-31']);
  assert.equal(calendarMonth(days, '2026-08', { currentDate: '2026-12-31' }).days.find(day => day.day === 31).active, true);
  assert.equal(calendarMonth(days, '2026-12', { currentDate: '2026-12-31' }).days.find(day => day.day === 31).active, true);
});
