'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createStorageLayer, LEGACY_KEYS, V2_KEYS, EXPORT_FORMAT, localDateKey } = require('../storage-v2.js');

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class ThrowingStorage extends MemoryStorage {
  constructor(initial, failKey) {
    super(initial);
    this.failKey = failKey;
    this.hasFailed = false;
  }
  setItem(key, value) {
    if (key === this.failKey && !this.hasFailed) {
      this.hasFailed = true;
      throw new Error('Simulated quota failure');
    }
    super.setItem(key, value);
  }
}

const fixedNow = () => '2026-08-23T12:00:00.000Z';
const layer = initial => {
  const storage = new MemoryStorage(initial);
  return { storage, api: createStorageLayer(storage, { now: fixedNow }) };
};

function todayLayer(initial = {}) {
  const storage = new MemoryStorage(initial);
  let id = 0;
  const api = createStorageLayer(storage, { now: fixedNow, idFactory: () => `id-${++id}` });
  return { storage, api };
}

test('validates every existing legacy record shape without rewriting it', () => {
  const initial = {
    [LEGACY_KEYS.checkIns]: JSON.stringify([{ id: '1', date: '2026-08-23', feeling: 'Steady', group: 'CALM', icon: '🌲', skill: null }]),
    [LEGACY_KEYS.places]: JSON.stringify([{ id: 'p1', name: 'Zion', state: 'UT', status: 'visited', memory: 'Great trail', addedAt: '2026-01-01' }]),
    [LEGACY_KEYS.questCount]: '12',
    [LEGACY_KEYS.listeningLog]: JSON.stringify([{ id: 'l1', podcast: 'Ologies', thought: 'Birds', date: '2026-01-01' }]),
    [LEGACY_KEYS.campfireLibrary]: JSON.stringify([
      { id: 'c1', kind: 'stream', title: 'Episode', url: 'https://example.com', category: "John's Picks", image: '', source: 'Link', addedAt: '2026-01-01' },
      { id: 'c2', kind: 'reflection', title: 'Reflection', body: 'Full text', source: 'Book', sourceUrl: '', category: 'Recovery', addedAt: '2026-01-02' }
    ]),
    [LEGACY_KEYS.listenShelf]: JSON.stringify([{ id: 'old1', title: 'Old', url: 'https://example.com', category: 'Recovery' }]),
    [LEGACY_KEYS.parkBadges]: JSON.stringify(['zion', 'acadia']),
    [LEGACY_KEYS.weatherEnabled]: 'true',
    [LEGACY_KEYS.installComplete]: 'true',
    [LEGACY_KEYS.installDismissed]: 'false'
  };
  const { storage, api } = layer(initial);
  assert.equal(api.readers.checkIns().status, 'valid');
  assert.equal(api.readers.places().status, 'valid');
  assert.equal(api.readers.questCount().status, 'valid');
  assert.equal(api.readers.listeningLog().status, 'valid');
  assert.equal(api.readers.campfireLibrary().status, 'valid');
  assert.equal(api.readers.listenShelf().status, 'valid');
  assert.equal(api.readers.parkBadges().status, 'valid');
  assert.equal(api.readers.weatherPreference().value, true);
  assert.equal(api.readers.installState().complete.status, 'valid');
  Object.entries(initial).forEach(([key, raw]) => assert.equal(storage.getItem(key), raw));
});

test('reports malformed and unexpected data while preserving exact raw values', () => {
  const malformed = '{ definitely not json';
  const unexpected = JSON.stringify({ should: 'be an array' });
  const { storage, api } = layer({
    [LEGACY_KEYS.checkIns]: malformed,
    [LEGACY_KEYS.places]: unexpected,
    [LEGACY_KEYS.weatherEnabled]: 'yes'
  });
  assert.equal(api.readers.checkIns().status, 'malformed');
  assert.equal(api.readers.checkIns().raw, malformed);
  assert.equal(api.readers.places().status, 'unexpected');
  assert.equal(api.readers.weatherPreference().status, 'unexpected');
  api.initialize();
  assert.equal(storage.getItem(LEGACY_KEYS.checkIns), malformed);
  assert.equal(storage.getItem(LEGACY_KEYS.places), unexpected);
  assert.deepEqual(JSON.parse(storage.getItem(V2_KEYS.checkInsFullHistory)), []);
});

test('unparseable legacy check-ins start a journaled recovery history that accepts future records', () => {
  const malformed = '[{"id":"old"';
  const { storage, api } = layer({ [LEGACY_KEYS.checkIns]: malformed });
  const initialized = api.initialize();
  const backup = JSON.parse(storage.getItem(V2_KEYS.legacyBackup));
  assert.equal(backup.entries[LEGACY_KEYS.checkIns].raw, malformed);
  assert.equal(storage.getItem(LEGACY_KEYS.checkIns), malformed);
  assert.equal(initialized.fullHistory.recoveryStart, true);
  assert.equal(initialized.fullHistory.legacyStatus, 'malformed');
  assert.equal(api.appendCheckIn({ id: 'new', date: 'now', feeling: 'Safe', group: 'CALM' }).ok, true);
  assert.equal(JSON.parse(storage.getItem(V2_KEYS.checkInsFullHistory)).length, 1);
  const journal = JSON.parse(storage.getItem(V2_KEYS.migrationJournal));
  assert.ok(journal.some(entry => entry.event === 'full-check-in-history-recovery-started' && entry.details.legacyStatus === 'malformed'));
});

test('parseable imperfect legacy check-in arrays carry every record into V2 and continue recording', () => {
  const imperfect = [{ feeling: 'Fine' }, 'an old non-object value', { id: 'partial', custom: { preserved: true } }];
  const legacyRaw = JSON.stringify(imperfect);
  const { storage, api } = layer({ [LEGACY_KEYS.checkIns]: legacyRaw });
  const initialized = api.initialize();
  assert.equal(initialized.fullHistory.recoveryStart, true);
  assert.equal(initialized.fullHistory.legacyStatus, 'unexpected');
  assert.deepEqual(JSON.parse(storage.getItem(V2_KEYS.checkInsFullHistory)), imperfect);
  assert.equal(storage.getItem(LEGACY_KEYS.checkIns), legacyRaw);
  assert.equal(api.appendCheckIn({ id: 'new', date: 'now', feeling: 'Curious', group: 'BRIGHT' }).ok, true);
  assert.deepEqual(JSON.parse(storage.getItem(V2_KEYS.checkInsFullHistory)).slice(1), imperfect);
  const journal = JSON.parse(storage.getItem(V2_KEYS.migrationJournal));
  const recovery = journal.find(entry => entry.event === 'full-check-in-history-recovery-started');
  assert.equal(recovery.details.legacyRecordsCarriedForward, imperfect.length);
});

test('creates one exact legacy backup and never overwrites it', () => {
  const originalRaw = '[{"id":"1","date":"d","feeling":"Fine","group":"NEUTRAL"}]';
  const { storage, api } = layer({ [LEGACY_KEYS.checkIns]: originalRaw });
  const first = api.initialize();
  assert.equal(first.backup.created, true);
  const backupRaw = storage.getItem(V2_KEYS.legacyBackup);
  const backup = JSON.parse(backupRaw);
  assert.equal(backup.entries[LEGACY_KEYS.checkIns].raw, originalRaw);
  storage.setItem(LEGACY_KEYS.checkIns, '[]');
  const second = api.backupLegacyData();
  assert.equal(second.created, false);
  assert.equal(storage.getItem(V2_KEYS.legacyBackup), backupRaw);
});

test('retains check-ins beyond the legacy 120-record limit', () => {
  const records = Array.from({ length: 120 }, (_, index) => ({ id: String(index), date: 'd', feeling: 'Fine', group: 'NEUTRAL' }));
  const { storage, api } = layer({ [LEGACY_KEYS.checkIns]: JSON.stringify(records) });
  api.initialize();
  const result = api.appendCheckIn({ id: 'new', date: 'now', feeling: 'Great', group: 'BRIGHT' });
  assert.equal(result.ok, true);
  assert.equal(JSON.parse(storage.getItem(V2_KEYS.checkInsFullHistory)).length, 121);
  assert.equal(JSON.parse(storage.getItem(LEGACY_KEYS.checkIns)).length, 120);
});

test('starts an uncapped history for a new user without a legacy check-in key', () => {
  const { storage, api } = layer();
  api.initialize();
  const result = api.appendCheckIn({ id: 'first', date: 'now', feeling: 'Curious', group: 'BRIGHT' });
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(storage.getItem(V2_KEYS.checkInsFullHistory)), [
    { id: 'first', date: 'now', feeling: 'Curious', group: 'BRIGHT' }
  ]);
  assert.equal(storage.getItem(LEGACY_KEYS.checkIns), null);
});

test('exports exact raw values and imports non-destructively by default', () => {
  const { api } = layer({ [LEGACY_KEYS.questCount]: '7', [LEGACY_KEYS.weatherEnabled]: 'true' });
  const exported = api.exportData();
  const parsed = JSON.parse(exported);
  assert.equal(parsed.format, EXPORT_FORMAT);

  const target = layer({ [LEGACY_KEYS.questCount]: '99', [V2_KEYS.legacyBackup]: '{"keep":true}' });
  const result = target.api.importData(exported);
  assert.equal(result.ok, true);
  assert.equal(target.storage.getItem(LEGACY_KEYS.questCount), '99');
  assert.equal(target.storage.getItem(LEGACY_KEYS.weatherEnabled), 'true');
  assert.equal(target.storage.getItem(V2_KEYS.legacyBackup), '{"keep":true}');
});

test('recovery overwrite is explicit and can never replace an existing legacy backup', () => {
  const payload = JSON.stringify({
    format: EXPORT_FORMAT,
    exportedAt: fixedNow(),
    entries: [
      { key: LEGACY_KEYS.questCount, raw: '42' },
      { key: V2_KEYS.legacyBackup, raw: '{"replacement":true}' }
    ]
  });
  const { storage, api } = layer({ [LEGACY_KEYS.questCount]: '1', [V2_KEYS.legacyBackup]: '{"original":true}' });
  const result = api.importData(payload, { conflict: 'overwrite' });
  assert.equal(result.ok, true);
  assert.equal(storage.getItem(LEGACY_KEYS.questCount), '42');
  assert.equal(storage.getItem(V2_KEYS.legacyBackup), '{"original":true}');
});

test('rejects invalid imports without making partial changes', () => {
  const { storage, api } = layer({ [LEGACY_KEYS.questCount]: '3' });
  const result = api.importData(JSON.stringify({ format: EXPORT_FORMAT, entries: [{ key: 'other:key', raw: 'x' }] }));
  assert.equal(result.ok, false);
  assert.equal(storage.getItem(LEGACY_KEYS.questCount), '3');
  assert.equal(storage.getItem('other:key'), null);
});

test('rolls back every earlier import write when a later storage write fails', () => {
  const initial = {
    [LEGACY_KEYS.questCount]: '3',
    [LEGACY_KEYS.weatherEnabled]: 'false',
    [V2_KEYS.legacyBackup]: '{"protected":true}'
  };
  const storage = new ThrowingStorage(initial, LEGACY_KEYS.weatherEnabled);
  const api = createStorageLayer(storage, { now: fixedNow });
  const payload = JSON.stringify({
    format: EXPORT_FORMAT,
    exportedAt: fixedNow(),
    entries: [
      { key: LEGACY_KEYS.listenShelf, raw: '[{"id":"new-key"}]' },
      { key: LEGACY_KEYS.questCount, raw: '99' },
      { key: LEGACY_KEYS.weatherEnabled, raw: 'true' },
      { key: V2_KEYS.legacyBackup, raw: '{"replacement":true}' }
    ]
  });
  const result = api.importData(payload, { conflict: 'overwrite' });
  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.match(result.errors[0], /Simulated quota failure/);
  assert.equal(storage.getItem(LEGACY_KEYS.listenShelf), null);
  assert.equal(storage.getItem(LEGACY_KEYS.questCount), '3');
  assert.equal(storage.getItem(LEGACY_KEYS.weatherEnabled), 'false');
  assert.equal(storage.getItem(V2_KEYS.legacyBackup), '{"protected":true}');
});

test('stores multiple gratitude entries on one local calendar day without a cap', () => {
  const { api } = todayLayer();
  const first = api.gratitude.add('Blue being Blue', { date: '2026-08-23', timestamp: '2026-08-24T03:55:00.000Z' });
  const second = api.gratitude.add('A good meeting', { date: '2026-08-23', timestamp: '2026-08-24T04:05:00.000Z' });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.entry.id, second.entry.id);
  assert.deepEqual(api.gratitude.forDate('2026-08-23').entries.map(entry => entry.text), ['A good meeting', 'Blue being Blue']);
  assert.equal(api.gratitude.all().entries.length, 2);
});

test('uses local calendar boundaries rather than UTC date slices', () => {
  const lateNight = new Date(2026, 7, 23, 23, 59, 0);
  const afterMidnight = new Date(2026, 7, 24, 0, 1, 0);
  assert.equal(localDateKey(lateNight), '2026-08-23');
  assert.equal(localDateKey(afterMidnight), '2026-08-24');

  const { api } = todayLayer();
  api.gratitude.add('Late', { timestamp: lateNight.toISOString() });
  api.gratitude.add('Tomorrow', { timestamp: afterMidnight.toISOString() });
  assert.equal(api.gratitude.forDate('2026-08-23').entries.length, 1);
  assert.equal(api.gratitude.forDate('2026-08-24').entries.length, 1);
});

test('records forward-looking Side Quest events without changing the cumulative legacy total', () => {
  const { storage, api } = todayLayer({ [LEGACY_KEYS.questCount]: '7' });
  const result = api.sideQuestEvents.add({ title: 'Explore a new trail' }, {
    id: 'quest-action-1', timestamp: '2026-08-24T03:30:00.000Z', date: '2026-08-23', resultingCount: 8
  });
  assert.equal(result.ok, true);
  assert.equal(result.added, true);
  assert.equal(storage.getItem(LEGACY_KEYS.questCount), '7');
  assert.deepEqual(api.sideQuestEvents.forDate('2026-08-23').events[0], {
    id: 'quest-action-1', date: '2026-08-23', timestamp: '2026-08-24T03:30:00.000Z',
    questId: 'Explore a new trail', title: 'Explore a new trail', resultingCount: 8
  });
});

test('Side Quest event IDs make one completion idempotent and events survive reload', () => {
  const { storage, api } = todayLayer();
  const options = { id: 'one-action', date: '2026-08-24', resultingCount: 1 };
  assert.equal(api.sideQuestEvents.add({ id: 'trail', title: 'Explore a new trail' }, options).added, true);
  assert.equal(api.sideQuestEvents.add({ id: 'trail', title: 'Explore a new trail' }, options).duplicate, true);
  const reloaded = createStorageLayer(storage, { now: fixedNow });
  assert.equal(reloaded.sideQuestEvents.all().events.length, 1);
});

test('multiple Side Quest completions can coexist on the same local day', () => {
  const { api } = todayLayer();
  const localMorning = new Date(2026, 7, 24, 8, 0, 0);
  const first = api.sideQuestEvents.add({ title: 'First quest' }, { id: 'first', timestamp: localMorning.toISOString(), resultingCount: 4 });
  api.sideQuestEvents.add({ title: 'Second quest' }, { id: 'second', timestamp: '2026-08-24T20:00:00-04:00', resultingCount: 5 });
  assert.equal(first.event.date, localDateKey(localMorning));
  assert.deepEqual(api.sideQuestEvents.forDate('2026-08-24').events.map(event => event.title), ['Second quest', 'First quest']);
});

test('guided skill responses are preserved and can be associated with a later check-in', () => {
  const { storage, api } = todayLayer();
  const saved = api.guidedSkillSessions.add({
    feeling: 'Conflicted', skill: 'WISE MIND', responses: [
      { prompt: 'What is Emotion Mind saying?', response: 'Leave now.' },
      { prompt: 'What is Reasonable Mind saying?', response: 'Wait for more facts.' }
    ]
  }, { id: 'guided-1', date: '2026-08-24' });
  assert.equal(saved.ok, true);
  assert.equal(api.guidedSkillSessions.associate(['guided-1'], 'check-in-1').associated, 1);
  const reloaded = createStorageLayer(storage, { now: fixedNow });
  assert.equal(reloaded.guidedSkillSessions.all().sessions[0].checkInId, 'check-in-1');
  assert.equal(reloaded.guidedSkillSessions.all().sessions[0].responses[0].response, 'Leave now.');
});

test('removes one gratitude entry without changing other history', () => {
  const { api } = todayLayer();
  const keep = api.gratitude.add('Keep', { date: '2026-08-22' }).entry;
  const remove = api.gratitude.add('Remove', { date: '2026-08-23' }).entry;
  assert.equal(api.gratitude.remove(remove.id).ok, true);
  assert.deepEqual(api.gratitude.all().entries.map(entry => entry.id), [keep.id]);
});

test('archives and reactivates Gold Stars while retaining historical completions', () => {
  const { api } = todayLayer();
  const star = api.goldStars.add('Call somebody').definition;
  api.goldStarDays.get('2026-08-22', { syncActiveDefinitions: true });
  api.goldStarDays.toggle('2026-08-22', star.id, true);
  assert.equal(api.goldStars.setActive(star.id, false).definition.active, false);
  assert.equal(api.goldStars.list().definitions.length, 0);
  assert.equal(api.goldStars.list({ includeInactive: true }).definitions.length, 1);
  assert.deepEqual(api.goldStarDays.get('2026-08-22').day.completedStarIds, [star.id]);
  assert.equal(api.goldStars.setActive(star.id, true).definition.active, true);
  assert.equal(api.goldStars.rename(star.id, 'Call a friend').definition.label, 'Call a friend');
});

test('reorders Gold Stars without deleting inactive definitions', () => {
  const { api } = todayLayer();
  const first = api.goldStars.add('First').definition;
  const second = api.goldStars.add('Second').definition;
  const third = api.goldStars.add('Third').definition;
  api.goldStars.setActive(second.id, false);
  const reordered = api.goldStars.reorder([third.id, first.id]);
  assert.equal(reordered.ok, true);
  assert.deepEqual(api.goldStars.list({ includeInactive: true }).definitions.map(item => item.id), [third.id, first.id, second.id]);
});

test('Gold Star completion toggles are isolated by local date', () => {
  const { api } = todayLayer();
  const star = api.goldStars.add('Easy win').definition;
  api.goldStarDays.get('2026-08-23', { syncActiveDefinitions: true });
  api.goldStarDays.get('2026-08-24', { syncActiveDefinitions: true });
  api.goldStarDays.toggle('2026-08-23', star.id, true);
  assert.deepEqual(api.goldStarDays.get('2026-08-23').day.completedStarIds, [star.id]);
  assert.deepEqual(api.goldStarDays.get('2026-08-24').day.completedStarIds, []);
  api.goldStarDays.toggle('2026-08-23', star.id, false);
  assert.deepEqual(api.goldStarDays.get('2026-08-23').day.completedStarIds, []);
});

test('daily badge requires strictly more than half and is awarded only once per date', () => {
  const { api } = todayLayer();
  const stars = ['One', 'Two', 'Three', 'Four'].map(label => api.goldStars.add(label).definition);
  api.goldStarDays.get('2026-08-23', { syncActiveDefinitions: true });
  api.goldStarDays.toggle('2026-08-23', stars[0].id, true);
  const half = api.goldStarDays.toggle('2026-08-23', stars[1].id, true);
  assert.equal(half.badge.earned, false);
  assert.equal(api.goldStarDays.awards().awards.length, 0);
  const overHalf = api.goldStarDays.toggle('2026-08-23', stars[2].id, true);
  assert.equal(overHalf.badge.earned, true);
  assert.equal(overHalf.badge.awarded, true);
  assert.equal(api.goldStarDays.awards().awards.length, 1);
  const repeat = api.goldStarDays.evaluateBadge('2026-08-23');
  assert.equal(repeat.awarded, false);
  assert.equal(api.goldStarDays.awards().awards.length, 1);
});

test('migrates legacy single-feeling records into timestamped multi-feeling history without changing the source', () => {
  const legacy = [
    { id: 'old-1', date: '2026-08-23T12:12:00.000Z', feeling: 'Anxious', group: 'FEAR / ANXIETY', icon: '🌫️' },
    { id: 'old-2', date: '2026-08-23T18:45:00.000Z', feelings: [{ word: 'Hopeful', group: 'BRIGHT / GOOD' }, { word: 'Tired', group: 'NEUTRAL / LOW ENERGY' }] }
  ];
  const sourceRaw = JSON.stringify(legacy);
  const { storage, api } = todayLayer({ [V2_KEYS.checkInsFullHistory]: sourceRaw });
  const result = api.initialize();
  assert.equal(result.feelings.migratedCount, 2);
  assert.equal(storage.getItem(V2_KEYS.checkInsFullHistory), sourceRaw);
  const migrated = api.feelingCheckIns.all().entries;
  assert.deepEqual(migrated.map(entry => entry.feelings.map(feeling => feeling.word)), [['Anxious'], ['Hopeful', 'Tired']]);
});

test('stores multiple feelings per check-in and multiple separate check-ins on one date', () => {
  const { api } = todayLayer();
  api.initialize();
  const morning = api.feelingCheckIns.add([{ word: 'Anxious', groupId: 'fear' }, { word: 'Hopeful', groupId: 'bright' }], { date: '2026-08-23', timestamp: '2026-08-23T12:12:00.000Z' });
  const evening = api.feelingCheckIns.add([{ word: 'Peaceful', groupId: 'calm' }, { word: 'Tired', groupId: 'neutral' }], { date: '2026-08-23', timestamp: '2026-08-24T00:30:00.000Z' });
  assert.equal(morning.ok, true);
  assert.equal(evening.ok, true);
  const entries = api.feelingCheckIns.forDate('2026-08-23').entries;
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].feelings.map(feeling => feeling.word), ['Peaceful', 'Tired']);
  assert.deepEqual(entries[1].feelings.map(feeling => feeling.word), ['Anxious', 'Hopeful']);
});

test('feeling check-ins remain isolated across local calendar dates', () => {
  const { api } = todayLayer();
  api.initialize();
  api.feelingCheckIns.add('Calm', { date: '2026-08-23', timestamp: '2026-08-24T03:59:00.000Z' });
  api.feelingCheckIns.add('Tired', { date: '2026-08-24', timestamp: '2026-08-24T04:01:00.000Z' });
  assert.equal(api.feelingCheckIns.forDate('2026-08-23').entries.length, 1);
  assert.equal(api.feelingCheckIns.forDate('2026-08-24').entries.length, 1);
});

test('reflection card pull is stable and unique for each local date', () => {
  const { api } = todayLayer();
  const first = api.reflectionCards.pull({ id: 'owl-card', title: 'Owl', file: 'Owl.png' }, { date: '2026-08-23', timestamp: '2026-08-23T12:00:00.000Z' });
  const repeated = api.reflectionCards.pull({ id: 'bear-card', title: 'Bear', file: 'Bear.png' }, { date: '2026-08-23', timestamp: '2026-08-23T13:00:00.000Z' });
  const nextDay = api.reflectionCards.pull({ id: 'bear-card', title: 'Bear', file: 'Bear.png' }, { date: '2026-08-24' });
  assert.equal(first.created, true);
  assert.equal(repeated.created, false);
  assert.equal(repeated.pull.cardId, 'owl-card');
  assert.equal(nextDay.created, true);
  assert.equal(api.reflectionCards.all().pulls.length, 2);
});

test('bootstraps the V2 Campfire library without changing the existing Campfire raw value', () => {
  const rawLibrary = '[ { "id":"saved-1", "kind":"stream", "title":"Old favorite", "url":"https://example.com" } ]';
  const { storage, api } = layer({ [LEGACY_KEYS.campfireLibrary]: rawLibrary });
  api.initialize();
  assert.equal(storage.getItem(LEGACY_KEYS.campfireLibrary), rawLibrary);
  const result = api.campfire.all();
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, 'Old favorite');
});

test('malformed legacy Campfire data is preserved while V2 accepts future items', () => {
  const malformed = '{definitely not json';
  const { storage, api } = layer({ [LEGACY_KEYS.campfireLibrary]: malformed });
  const initialized = api.initialize();
  assert.equal(initialized.campfireItems.sourceStatus, 'malformed');
  assert.equal(storage.getItem(LEGACY_KEYS.campfireLibrary), malformed);
  const added = api.campfire.add({ kind: 'stream', title: 'Future listen', url: 'https://example.com/listen', category: 'Listen' });
  assert.equal(added.ok, true);
  assert.equal(api.campfire.all().items.length, 1);
  const journal = JSON.parse(storage.getItem(V2_KEYS.migrationJournal));
  assert.equal(journal.some(entry => entry.event === 'campfire-items-recovery-started'), true);
});

test('unexpected non-array Campfire data starts a journaled forward library without changing the source', () => {
  const unexpected = '{"items":"not-an-array"}';
  const { storage, api } = layer({ [LEGACY_KEYS.campfireLibrary]: unexpected });
  const initialized = api.initialize();
  assert.equal(initialized.campfireItems.sourceStatus, 'unexpected');
  assert.equal(storage.getItem(LEGACY_KEYS.campfireLibrary), unexpected);
  assert.deepEqual(api.campfire.all().items, []);
  const journal = JSON.parse(storage.getItem(V2_KEYS.migrationJournal));
  assert.equal(journal.some(entry => entry.event === 'campfire-items-recovery-started' && entry.details.sourceStatus === 'unexpected'), true);
});

test('Campfire validates new items and removes only the intentional record', () => {
  const { api } = layer();
  api.initialize();
  assert.equal(api.campfire.add({ kind: 'stream', title: 'Bad link', url: 'javascript:alert(1)' }).ok, false);
  assert.equal(api.campfire.add({ kind: 'reflection', title: 'Missing text' }).ok, false);
  const first = api.campfire.add({ kind: 'stream', title: 'Episode', url: 'https://example.com/episode' }).item;
  const second = api.campfire.add({ kind: 'reflection', title: 'A thought', body: 'Something supplied for John.' }).item;
  assert.equal(api.campfire.remove(first.id).ok, true);
  assert.deepEqual(api.campfire.all().items.map(item => item.id), [second.id]);
});
