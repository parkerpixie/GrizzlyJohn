const test = require('node:test');
const assert = require('node:assert/strict');
const { aggregateMyDays, findThisDayLastYear } = require('../my-days.js');

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
