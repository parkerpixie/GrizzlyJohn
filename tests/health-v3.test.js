'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createHealthStore,
  HEALTH_KEYS,
  HEALTH_SCHEMA_VERSION,
  localDateKey
} = require('../health-v3.js');

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function makeLayer(initial = {}) {
  const storage = new MemoryStorage(initial);
  let id = 0;
  const api = createHealthStore(storage, {
    now: () => '2026-09-10T14:00:00.000Z',
    idFactory: () => `health-${++id}`
  });
  return { storage, api };
}

test('initialization creates only Health V3 schema metadata and leaves existing V1/V2 data byte-for-byte unchanged', () => {
  const initial = {
    'grizzlyjohn:checkIns': '[{"id":"old","date":"2026-09-09","feeling":"Good","group":"BRIGHT"}]',
    'grizzlyjohn:v2:gratitudeEntries': '[{"id":"g1","date":"2026-09-10","timestamp":"2026-09-10T12:00:00.000Z","text":"Blue"}]',
    'unrelated:key': 'leave-me-alone'
  };
  const { storage, api } = makeLayer(initial);
  const result = api.initialize();

  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.equal(result.schema.healthSchemaVersion, HEALTH_SCHEMA_VERSION);
  Object.entries(initial).forEach(([key, raw]) => assert.equal(storage.getItem(key), raw));
  assert.equal(storage.getItem(HEALTH_KEYS.vitals), null);
  assert.equal(storage.getItem(HEALTH_KEYS.weightEntries), null);
});

test('date-only input remains the requested local calendar day instead of being UTC-shifted', () => {
  assert.equal(localDateKey('2026-09-10'), '2026-09-10');
  assert.throws(() => localDateKey('2026-02-30'), /valid local calendar date/i);
});

test('vitals accept multiple readings on one day and survive a fresh storage-layer instance', () => {
  const { storage, api } = makeLayer();
  api.initialize();

  const first = api.vitals.add(
    { systolic: 120, diastolic: 78, pulse: 68, note: 'After sitting' },
    { date: '2026-09-10', timestamp: '2026-09-10T13:00:00-05:00' }
  );
  const second = api.vitals.add(
    { systolic: 124, diastolic: 80, pulse: 71 },
    { date: '2026-09-10', timestamp: '2026-09-10T15:00:00-05:00' }
  );

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(api.vitals.forDate('2026-09-10').entries.length, 2);
  assert.equal(api.snapshot('2026-09-10').latestVitals.systolic, 124);

  const reloaded = createHealthStore(storage, { now: () => '2026-09-10T21:00:00.000Z' });
  assert.equal(reloaded.vitals.forDate('2026-09-10').entries.length, 2);
  assert.equal(reloaded.vitals.forDate('2026-09-10').entries[0].pulse, 71);
});

test('malformed or unexpected Health data is preserved and blocks destructive writes', () => {
  const malformed = '[{"id":"broken"';
  const { storage, api } = makeLayer({ [HEALTH_KEYS.vitals]: malformed });

  assert.equal(api.readers.vitals().status, 'malformed');
  const result = api.vitals.add({ systolic: 120, diastolic: 80, pulse: 70 });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'malformed');
  assert.equal(storage.getItem(HEALTH_KEYS.vitals), malformed);
});

test('medication uses one calm daily record and toggles morning, midday, and evening independently', () => {
  const { api } = makeLayer();
  api.initialize();

  assert.equal(api.medication.setWindow('2026-09-10', 'morning', true).ok, true);
  assert.equal(api.medication.setWindow('2026-09-10', 'midday', true).ok, true);
  assert.equal(api.medication.setWindow('2026-09-10', 'evening', false).ok, true);

  const day = api.medication.get('2026-09-10').entry;
  assert.deepEqual(
    { morning: day.morning, midday: day.midday, evening: day.evening },
    { morning: true, midday: true, evening: false }
  );
  assert.equal(api.medication.all().entries.length, 1);
  assert.equal(api.snapshot('2026-09-10').medicationCompleted, 2);
});

test('sleep stores one record per local day and later saves update that night instead of duplicating it', () => {
  const { api } = makeLayer();
  api.initialize();

  const first = api.sleep.set(
    { hours: 6.5, quality: 'Okay' },
    { date: '2026-09-10', timestamp: '2026-09-10T07:30:00-05:00' }
  );
  const corrected = api.sleep.set(
    { hours: 7, quality: 'Good' },
    { date: '2026-09-10', timestamp: '2026-09-10T08:00:00-05:00' }
  );

  assert.equal(first.ok, true);
  assert.equal(corrected.ok, true);
  assert.equal(api.sleep.forDate('2026-09-10').entries.length, 1);
  assert.equal(api.sleep.forDate('2026-09-10').entries[0].hours, 7);
  assert.equal(api.sleep.forDate('2026-09-10').entries[0].quality, 'Good');
  assert.equal(api.sleep.set({ hours: 7, quality: 'Excellent' }, { date: '2026-09-10' }).ok, false);
});

test('notes can occur repeatedly through the day with optional tags and severity', () => {
  const { api } = makeLayer();
  api.initialize();

  api.notes.add(
    { text: 'Head felt weird for a bit', tags: ['headache', 'fatigue', 'headache'], severity: 'Mild' },
    { date: '2026-09-10', timestamp: '2026-09-10T09:15:00-05:00' }
  );
  api.notes.add(
    { text: 'Dizzy after standing up', tags: ['dizziness'] },
    { date: '2026-09-10', timestamp: '2026-09-10T14:30:00-05:00' }
  );

  const notes = api.notes.forDate('2026-09-10').entries;
  assert.equal(notes.length, 2);
  assert.deepEqual(notes[1].tags, ['headache', 'fatigue']);
  assert.equal(api.snapshot('2026-09-10').noteCount, 2);
});

test('body feel is optional and keeps one broad signal per day', () => {
  const { api } = makeLayer();
  api.initialize();

  api.bodyFeel.set('Rough', { date: '2026-09-10', timestamp: '2026-09-10T08:00:00-05:00' });
  api.bodyFeel.set('Good', { date: '2026-09-10', timestamp: '2026-09-10T18:00:00-05:00' });

  assert.equal(api.bodyFeel.forDate('2026-09-10').entries.length, 1);
  assert.equal(api.snapshot('2026-09-10').bodyFeel.value, 'Good');
  assert.equal(api.bodyFeel.set('Terrible', { date: '2026-09-10' }).ok, false);
});

test('snapshot is trend-ready: latest weight, total activity minutes, sleep, medication, and notes are derived without scoring', () => {
  const { api } = makeLayer();
  api.initialize();

  api.weights.add(190, { date: '2026-09-08', timestamp: '2026-09-08T07:00:00-05:00' });
  api.weights.add(188.5, { date: '2026-09-10', timestamp: '2026-09-10T07:00:00-05:00' });
  api.activities.add({ activityType: 'Walking', durationMinutes: 25 }, { date: '2026-09-10', timestamp: '2026-09-10T10:00:00-05:00' });
  api.activities.add({ activityType: 'Biking', durationMinutes: 35, intensity: 'Easy', estimatedCalories: 220 }, { date: '2026-09-10', timestamp: '2026-09-10T16:00:00-05:00' });
  api.sleep.set({ hours: 6, quality: 'Okay' }, { date: '2026-09-10', timestamp: '2026-09-10T07:15:00-05:00' });
  api.medication.setWindow('2026-09-10', 'morning', true);
  api.notes.add({ text: 'A little tired', tags: ['fatigue'] }, { date: '2026-09-10' });

  const snapshot = api.snapshot('2026-09-10');
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.latestWeight.weight, 188.5);
  assert.equal(snapshot.activityMinutes, 60);
  assert.equal(snapshot.activityCount, 2);
  assert.equal(snapshot.sleep.hours, 6);
  assert.equal(snapshot.medicationCompleted, 1);
  assert.equal(snapshot.noteCount, 1);
});


test('meals persist independently by local day without changing existing Health records', () => {
  const { storage, api } = makeLayer();
  api.medication.setWindow('2026-09-10', 'morning', true);
  api.sleep.set({ hours: 7, quality: 'Good' }, { date: '2026-09-10' });
  const previous = Object.fromEntries(storage.values);
  assert.deepEqual(api.meals.get('2026-09-10').entry, { breakfast: false, lunch: false, dinner: false, snacks: false, note: '' });
  for (const name of ['breakfast', 'lunch', 'dinner', 'snacks']) {
    assert.equal(api.meals.set('2026-09-10', { [name]: true }).ok, true);
  }
  api.meals.set('2026-09-10', { lunch: false, note: 'Soup & toast' });
  api.meals.set('2026-09-09', { dinner: true });
  const reopened = createHealthStore(storage);
  const meal = reopened.snapshot('2026-09-10').meals.entry;
  assert.equal(meal.breakfast, true);
  assert.equal(meal.lunch, false);
  assert.equal(meal.dinner, true);
  assert.equal(meal.snacks, true);
  assert.equal(meal.note, 'Soup & toast');
  assert.equal(reopened.meals.get('2026-09-09').entry.breakfast, false);
  assert.equal(reopened.meals.get('2026-09-09').entry.dinner, true);
  for (const [key, value] of Object.entries(previous)) assert.equal(storage.getItem(key), value);
  assert.equal(api.meals.set('2026-02-30', { breakfast: true }).ok, false);
  assert.equal(api.meals.set('2026-09-10', { breakfast: 'yes' }).ok, false);
});

test('optional meal fields default safely and malformed meals remain untouched', () => {
  const key = HEALTH_KEYS.mealDays;
  const { api, storage } = makeLayer({ [key]: JSON.stringify([{ date: '2026-09-10', updatedAt: '2026-09-10T14:00:00Z' }]) });
  assert.equal(api.meals.get('2026-09-10').entry.breakfast, false);
  assert.equal(api.meals.get('2026-09-10').entry.note, '');
  storage.setItem(key, '{broken');
  assert.equal(api.meals.set('2026-09-10', { breakfast: true }).ok, false);
  assert.equal(storage.getItem(key), '{broken');
  assert.equal(api.snapshot('2026-09-10').ok, true);
  assert.equal(api.snapshot('2026-09-10').meals.ok, false);
});

test('meal local dates and storage failures preserve data', () => {
  const { api, storage } = makeLayer();
  const local = new Date(2026, 8, 10, 23, 59);
  assert.equal(api.meals.set(local, { snacks: true }).entry.date, '2026-09-10');
  const before = storage.getItem(HEALTH_KEYS.mealDays);
  storage.setItem = () => { throw new Error('Storage full'); };
  assert.equal(api.meals.set('2026-09-10', { note: 'Unsaved' }).ok, false);
  assert.equal(storage.getItem(HEALTH_KEYS.mealDays), before);
});


test('meals round-trip through the existing portable backup with older Health data', () => {
  const { createStorageLayer } = require('../storage-v2.js');
  const { api, storage } = makeLayer();
  api.meals.set('2026-09-10', { breakfast: true, note: 'Oatmeal' });
  api.medication.setWindow('2026-09-10', 'morning', true);
  const backup = createStorageLayer(storage).createBackup();
  assert.equal(backup.ok, true);
  const restored = new MemoryStorage();
  const result = createStorageLayer(restored).restoreBackup(backup.json);
  assert.equal(result.ok, true);
  const health = createHealthStore(restored);
  assert.equal(health.meals.get('2026-09-10').entry.note, 'Oatmeal');
  assert.equal(health.medication.get('2026-09-10').entry.morning, true);
});
