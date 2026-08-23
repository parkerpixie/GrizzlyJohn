'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createStorageLayer, LEGACY_KEYS, V2_KEYS, EXPORT_FORMAT } = require('../storage-v2.js');

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
