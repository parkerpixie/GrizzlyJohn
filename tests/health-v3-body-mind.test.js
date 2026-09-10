'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { deriveBodyMindObservations } = require('../health-v3-body-mind.js');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const checkIn = (date, feelings) => ({ id: `f-${date}`, date, timestamp: `${date}T12:00:00-05:00`, feelings });
const sleep = (date, hours, quality = 'Okay') => ({ id: `s-${date}`, date, timestamp: `${date}T08:00:00-05:00`, hours, quality });

test('Body + Mind stays quiet when there is not enough repeated cross-domain history', () => {
  const observations = deriveBodyMindObservations(
    { sleep: [sleep('2026-09-10', 5)], vitals: [], weights: [], activities: [], medication: [], notes: [], bodyFeels: [] },
    [checkIn('2026-09-10', ['Tired'])],
    { endDate: '2026-09-10' }
  );
  assert.deepEqual(observations, []);
});

test('repeated Tired plus short sleep is described as an overlap and can surface HALT', () => {
  const dates = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'];
  const observations = deriveBodyMindObservations(
    {
      sleep: [sleep(dates[0], 5), sleep(dates[1], 5.5), sleep(dates[2], 4.75), sleep(dates[3], 7)],
      vitals: [], weights: [], activities: [], medication: [], notes: [], bodyFeels: []
    },
    dates.map(date => checkIn(date, ['Tired'])),
    { endDate: '2026-09-10' }
  );
  const item = observations.find(observation => observation.id.startsWith('tired-short-sleep'));
  assert.ok(item);
  assert.match(item.text, /Tired was logged on 4 days/);
  assert.match(item.text, /Sleep under 6 hours was also logged on 3/);
  assert.equal(item.skill, 'HALT');
});

test('symptom tags can be paired with repeated Rough or Bad body-feel days without claiming causation', () => {
  const dates = ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'];
  const observations = deriveBodyMindObservations(
    {
      sleep: dates.slice(3).map(date => sleep(date, 7)),
      notes: dates.slice(0, 3).map(date => ({ id: `n-${date}`, date, timestamp: `${date}T12:00:00-05:00`, text: 'Logged', tags: ['dizziness'] })),
      bodyFeels: [
        { id: 'b1', date: dates[0], timestamp: `${dates[0]}T12:00:00-05:00`, value: 'Rough' },
        { id: 'b2', date: dates[1], timestamp: `${dates[1]}T12:00:00-05:00`, value: 'Bad' }
      ],
      vitals: [], weights: [], activities: [], medication: []
    },
    dates.map(date => checkIn(date, ['Good'])),
    { endDate: '2026-09-10' }
  );
  const item = observations.find(observation => observation.id.startsWith('symptom-body-dizziness'));
  assert.ok(item);
  assert.match(item.text, /Dizziness was logged on 3 days/);
  assert.match(item.text, /Rough or Bad body feel was also logged on 2/);
  assert.doesNotMatch(item.text, /caus|because|resulted|led to/i);
});

test('activity and calm feelings can be reported as same-day co-occurrence only', () => {
  const dates = ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'];
  const observations = deriveBodyMindObservations(
    {
      activities: dates.map(date => ({ id: `a-${date}`, date, timestamp: `${date}T17:00:00-05:00`, activityType: 'Walking', durationMinutes: 35 })),
      vitals: [], weights: [], medication: [], sleep: [], notes: [], bodyFeels: []
    },
    dates.map((date, index) => checkIn(date, [index < 3 ? 'Peaceful' : 'Okay'])),
    { endDate: '2026-09-10' }
  );
  const item = observations.find(observation => observation.id.startsWith('activity-calm'));
  assert.ok(item);
  assert.match(item.text, /30\+ active minutes/);
  assert.match(item.text, /Calm \/ grounded feelings were also logged/);
  assert.doesNotMatch(item.text, /improved|caused|helped|because/i);
});

test('vitals comparison uses Johns own period average and does not label the reading medically', () => {
  const dates = ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'];
  const systolic = [120, 122, 124, 130, 132, 134];
  const observations = deriveBodyMindObservations(
    {
      vitals: dates.map((date, index) => ({ id: `v-${date}`, date, timestamp: `${date}T09:00:00-05:00`, systolic: systolic[index], diastolic: 80, pulse: 70 })),
      weights: [], activities: [], medication: [], sleep: [], notes: [], bodyFeels: []
    },
    dates.map((date, index) => checkIn(date, [index >= 4 ? 'Worried' : 'Okay'])),
    { endDate: '2026-09-10' }
  );
  const item = observations.find(observation => observation.id.startsWith('vitals-fear'));
  assert.ok(item);
  assert.match(item.text, /above your own 7-day average/);
  assert.match(item.text, /Fear \/ anxiety feelings were also logged on 2/);
  assert.doesNotMatch(item.text, /high blood pressure|hypertension|danger|abnormal/i);
});

test('Body + Mind UI lives between goals and Health History and links recovery tools back to Wisdom', () => {
  const source = read('health-v3-body-mind.js');
  const css = read('health-v3-body-mind.css');
  assert.match(source, /BODY \+ MIND/);
  assert.match(source, /A few things showing up together\./);
  assert.match(source, /history\.insertAdjacentElement\('beforebegin', section\)/);
  assert.match(source, /data-body-mind-skill/);
  assert.match(source, /\[data-nav="wisdom"\]/);
  assert.match(source, /not explanations, diagnoses, or medical advice/);
  assert.match(css, /\.health-body-mind-observation/);
  assert.match(css, /\.health-body-mind-empty/);
});