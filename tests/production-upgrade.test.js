'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createStorageLayer, LEGACY_KEYS, V2_KEYS, localDateKey } = require('../storage-v2.js');
const { createV1ProductionStorage, records } = require('./fixtures/v1-production-storage.js');

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const fixedNow = () => '2026-08-24T15:00:00.000Z';

function layer(initial = {}) {
  const storage = new MemoryStorage(initial);
  let nextId = 0;
  const options = { now: fixedNow, idFactory: () => `upgrade-id-${++nextId}` };
  return { storage, options, api: createStorageLayer(storage, options) };
}

function snapshot(storage) {
  return Object.fromEntries([...storage.values.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function assertLegacyReaders(api) {
  assert.deepEqual(api.readers.checkIns().value, records.checkIns);
  assert.deepEqual(api.readers.places().value, records.places);
  assert.equal(api.readers.questCount().value, 12);
  assert.deepEqual(api.readers.listeningLog().value, records.listeningLog);
  assert.deepEqual(api.readers.campfireLibrary().value, records.campfireLibrary);
  assert.deepEqual(api.readers.listenShelf().value, records.listenShelf);
  assert.deepEqual(api.readers.parkBadges().value, records.parkBadges);
  assert.equal(api.readers.weatherPreference().value, true);
  assert.equal(api.readers.installState().complete.value, true);
  assert.equal(api.readers.installState().dismissed.value, false);
}

test('A: clean install initializes V2 without inventing legacy records', () => {
  const { storage, api } = layer();
  const result = api.initialize();
  assert.equal(result.backup.ok, true);
  assert.deepEqual(api.readers.fullCheckInHistory().value, []);
  assert.deepEqual(api.readers.feelingCheckIns().value, []);
  assert.deepEqual(api.readers.campfireItems().value, []);
  Object.values(LEGACY_KEYS).forEach(key => assert.equal(storage.getItem(key), null));
});

test('B: realistic production V1 data remains exact, backed up, readable, and available to V2', () => {
  const initial = createV1ProductionStorage();
  const { storage, api } = layer(initial);
  api.initialize();

  Object.entries(initial).forEach(([key, raw]) => assert.equal(storage.getItem(key), raw));
  assertLegacyReaders(api);
  assert.deepEqual(api.readers.fullCheckInHistory().value, records.checkIns);
  assert.deepEqual(api.readers.feelingCheckIns().value.map(entry => entry.id), records.checkIns.map(entry => entry.id));
  assert.deepEqual(api.campfire.all().items, records.campfireLibrary);

  const backup = JSON.parse(storage.getItem(V2_KEYS.legacyBackup));
  Object.entries(initial).forEach(([key, raw]) => {
    assert.equal(backup.entries[key].present, true);
    assert.equal(backup.entries[key].raw, raw);
  });
});

test('C: JOHN EXISTING DATA UPGRADE GATE preserves V1 data through V2 writes and reload', () => {
  const initial = createV1ProductionStorage();
  const { storage, options, api } = layer(initial);
  api.initialize();

  assert.equal(api.gratitude.add('A safe in-place upgrade', {
    id: 'v2-gratitude-1', date: '2026-08-24', timestamp: fixedNow()
  }).ok, true);
  assert.equal(api.feelingCheckIns.add([{ word: 'Steady', group: 'CALM / GROUNDED', groupId: 'calm', icon: '🌲' }], {
    id: 'v2-feeling-1', date: '2026-08-24', timestamp: fixedNow()
  }).ok, true);
  assert.equal(api.sideQuestEvents.add({ id: 'quest-v2', title: 'Take the scenic route' }, {
    id: 'v2-quest-event-1', date: '2026-08-24', timestamp: fixedNow(), resultingCount: 13
  }).ok, true);
  assert.equal(api.campfire.add({
    id: 'v2-campfire-1', kind: 'stream', title: 'A new V2 episode', url: 'https://example.com/new-episode'
  }).ok, true);
  assert.equal(api.reflectionCards.pull({ id: 'owl', title: 'Owl', file: 'Owl.png' }, {
    date: '2026-08-24', timestamp: fixedNow()
  }).ok, true);

  const star = api.goldStars.add('Call a friend', { id: 'v2-star-1' }).definition;
  api.goldStarDays.get('2026-08-24', { syncActiveDefinitions: true });
  assert.equal(api.goldStarDays.toggle('2026-08-24', star.id, true).ok, true);

  const reloaded = createStorageLayer(storage, options);
  reloaded.initialize();

  Object.entries(initial).forEach(([key, raw]) => assert.equal(storage.getItem(key), raw));
  assertLegacyReaders(reloaded);
  assert.equal(reloaded.readers.fullCheckInHistory().value.some(entry => entry.id === 'v1-check-in-older'), true);
  assert.equal(reloaded.readers.fullCheckInHistory().value.some(entry => entry.id === 'v2-feeling-1'), true);
  assert.equal(reloaded.gratitude.all().entries.some(entry => entry.id === 'v2-gratitude-1'), true);
  assert.equal(reloaded.feelingCheckIns.all().entries.some(entry => entry.id === 'v2-feeling-1'), true);
  assert.equal(reloaded.sideQuestEvents.all().events.some(entry => entry.id === 'v2-quest-event-1'), true);
  assert.equal(reloaded.campfire.all().items.some(entry => entry.id === 'v1-campfire-stream'), true);
  assert.equal(reloaded.campfire.all().items.some(entry => entry.id === 'v2-campfire-1'), true);
  assert.equal(reloaded.reflectionCards.forDate('2026-08-24').pull.cardId, 'owl');
  assert.deepEqual(reloaded.goldStarDays.get('2026-08-24').day.completedStarIds, ['v2-star-1']);
});

test('D: repeated initialization is idempotent and does not duplicate or rewrite data', () => {
  const { storage, api } = layer(createV1ProductionStorage());
  api.initialize();
  const afterFirstRun = snapshot(storage);
  api.initialize();
  api.initialize();
  assert.deepEqual(snapshot(storage), afterFirstRun);
  assert.equal(api.readers.fullCheckInHistory().value.length, records.checkIns.length);
  assert.equal(api.campfire.all().items.length, records.campfireLibrary.length);
});

test('E: partial V1 storage initializes without replacing present records or adding absent legacy keys', () => {
  const initial = {
    [LEGACY_KEYS.places]: JSON.stringify(records.places),
    [LEGACY_KEYS.questCount]: '4',
    [LEGACY_KEYS.installDismissed]: 'true'
  };
  const { storage, api } = layer(initial);
  api.initialize();
  assert.equal(storage.getItem(LEGACY_KEYS.places), initial[LEGACY_KEYS.places]);
  assert.equal(api.readers.questCount().value, 4);
  assert.equal(api.readers.installState().dismissed.value, true);
  assert.equal(storage.getItem(LEGACY_KEYS.listeningLog), null);
  assert.equal(api.gratitude.add('Partial data still works').ok, true);
});

test('F: one malformed V1 key is isolated while unrelated production data and future writes survive', () => {
  const initial = createV1ProductionStorage();
  initial[LEGACY_KEYS.checkIns] = '[{"id":"broken"';
  const { storage, api } = layer(initial);
  const result = api.initialize();
  assert.equal(result.fullHistory.recoveryStart, true);
  assert.equal(storage.getItem(LEGACY_KEYS.checkIns), initial[LEGACY_KEYS.checkIns]);
  assert.deepEqual(api.readers.places().value, records.places);
  assert.deepEqual(api.readers.listeningLog().value, records.listeningLog);
  assert.deepEqual(api.campfire.all().items, records.campfireLibrary);
  assert.equal(api.feelingCheckIns.add('Hopeful', { id: 'after-corruption', date: '2026-08-24' }).ok, true);
  assert.equal(api.readers.fullCheckInHistory().value.some(entry => entry.id === 'after-corruption'), true);
  const backup = JSON.parse(storage.getItem(V2_KEYS.legacyBackup));
  assert.equal(backup.entries[LEGACY_KEYS.checkIns].raw, initial[LEGACY_KEYS.checkIns]);
});

test('G: unexpected legacy structures stay untouched while imperfect arrays retain every record', () => {
  const imperfectCheckIns = [{ feeling: 'Fine', unknown: 1 }, null, 'old marker'];
  const unexpectedPlaces = JSON.stringify({ places: records.places });
  const unexpectedCampfire = 'null';
  const initial = {
    [LEGACY_KEYS.checkIns]: JSON.stringify(imperfectCheckIns),
    [LEGACY_KEYS.places]: unexpectedPlaces,
    [LEGACY_KEYS.campfireLibrary]: unexpectedCampfire
  };
  const { storage, api } = layer(initial);
  api.initialize();
  assert.deepEqual(api.readers.fullCheckInHistory().value, imperfectCheckIns);
  assert.equal(api.readers.places().status, 'unexpected');
  assert.equal(storage.getItem(LEGACY_KEYS.places), unexpectedPlaces);
  assert.equal(storage.getItem(LEGACY_KEYS.campfireLibrary), unexpectedCampfire);
  assert.deepEqual(api.campfire.all().items, []);
});

test('H: existing V2 records and protected backup are not overwritten during initialization', () => {
  const initial = createV1ProductionStorage();
  const existingV2 = {
    [V2_KEYS.legacyBackup]: '{"protected":"original preview backup"}',
    [V2_KEYS.checkInsFullHistory]: JSON.stringify([{ id: 'preview-check-in', date: '2026-08-20', feeling: 'Curious', group: 'BRIGHT' }]),
    [V2_KEYS.feelingCheckIns]: JSON.stringify([{ id: 'preview-feeling', date: '2026-08-20', timestamp: '2026-08-20T12:00:00.000Z', feelings: [{ word: 'Curious' }] }]),
    [V2_KEYS.campfireItems]: JSON.stringify([{ id: 'preview-item', kind: 'stream', title: 'Preview save', url: 'https://example.com/preview' }]),
    [V2_KEYS.gratitudeEntries]: JSON.stringify([{ id: 'preview-gratitude', date: '2026-08-20', timestamp: '2026-08-20T12:00:00.000Z', text: 'Still here' }])
  };
  Object.assign(initial, existingV2);
  const { storage, api } = layer(initial);
  api.initialize();
  Object.entries(existingV2).forEach(([key, raw]) => assert.equal(storage.getItem(key), raw));
  assertLegacyReaders(api);
});

test('I: explicit local dates remain distinct across UTC boundaries and reload', () => {
  const { storage, options, api } = layer();
  api.initialize();
  const beforeMidnight = new Date(2026, 7, 24, 23, 59, 0);
  const afterMidnight = new Date(2026, 7, 25, 0, 1, 0);
  const firstDate = localDateKey(beforeMidnight);
  const secondDate = localDateKey(afterMidnight);
  assert.notEqual(firstDate, secondDate);
  api.gratitude.add('Before midnight', { id: 'date-one', date: firstDate, timestamp: beforeMidnight.toISOString() });
  api.gratitude.add('After midnight', { id: 'date-two', date: secondDate, timestamp: afterMidnight.toISOString() });
  const reloaded = createStorageLayer(storage, options);
  assert.deepEqual(reloaded.gratitude.forDate(firstDate).entries.map(entry => entry.id), ['date-one']);
  assert.deepEqual(reloaded.gratitude.forDate(secondDate).entries.map(entry => entry.id), ['date-two']);
});
