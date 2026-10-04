'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ACTIVE_KEY,
  SLEEP_ENTRIES_KEY,
  hoursBetween,
  aggregateQuality,
  totalSleepHours,
  createSleepTracker
} = require('../sleep-tracker.js');
const { createHealthStore } = require('../health-v3.js');

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function sequenceClock(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test('duration and aggregate helpers keep sleep math deterministic', () => {
  assert.equal(hoursBetween('2026-10-04T21:30:00-05:00', '2026-10-05T01:30:00-05:00'), 4);
  assert.equal(hoursBetween('2026-10-05T04:00:00-05:00', '2026-10-05T07:30:00-05:00'), 3.5);
  assert.equal(totalSleepHours([{ hours: 4 }, { hours: 3.5 }]), 7.5);
  assert.equal(aggregateQuality([{ hours: 4, quality: 'Good' }, { hours: 3.5, quality: 'Okay' }]), 'Good');
});

test('the pitched 9:30 to 7:30 night records two stretches, repeat medication actions, and 7.5 hours', () => {
  const storage = new MemoryStorage();
  let id = 0;
  const tracker = createSleepTracker(storage, { idFactory: () => 'sleep-id-' + (++id) });

  assert.equal(tracker.startNight({ timestamp: '2026-10-04T21:30:00-05:00' }).ok, true);
  assert.equal(tracker.wake({ timestamp: '2026-10-05T01:30:00-05:00' }).stretch.hours, 4);
  assert.equal(tracker.rateStretch('Good').ok, true);
  assert.equal(tracker.stayUpForNow().ok, true);

  assert.equal(tracker.logAwakeAction(
    { type: 'medication', detail: 'First sleep medication' },
    { timestamp: '2026-10-05T01:30:00-05:00' }
  ).ok, true);
  assert.equal(tracker.logAwakeAction(
    { type: 'medication', detail: 'Second sleep medication' },
    { timestamp: '2026-10-05T03:30:00-05:00' }
  ).ok, true);

  assert.equal(tracker.backToSleep({ timestamp: '2026-10-05T04:00:00-05:00' }).ok, true);
  assert.equal(tracker.wake({ timestamp: '2026-10-05T07:30:00-05:00' }).stretch.hours, 3.5);
  assert.equal(tracker.rateStretch('Okay').ok, true);

  const finished = tracker.finishNight({ timestamp: '2026-10-05T07:31:00-05:00' });
  assert.equal(finished.ok, true);
  assert.equal(finished.entry.date, '2026-10-05');
  assert.equal(finished.entry.hours, 7.5);
  assert.equal(finished.entry.stretches.length, 2);
  assert.equal(finished.entry.awakeEvents.length, 2);
  assert.equal(finished.entry.awakeEvents[0].detail, 'First sleep medication');
  assert.equal(finished.entry.awakeEvents[1].detail, 'Second sleep medication');
  assert.equal(storage.getItem(ACTIVE_KEY), null);
});

test('active sleep survives reload instead of depending on an open browser session', () => {
  const storage = new MemoryStorage();
  const first = createSleepTracker(storage, { idFactory: () => 'stable-id' });
  first.startNight({ timestamp: '2026-10-04T22:00:00-05:00' });

  const reloaded = createSleepTracker(storage, { idFactory: () => 'new-id' });
  const active = reloaded.active();
  assert.equal(active.ok, true);
  assert.equal(active.value.status, 'sleeping');
  assert.equal(active.value.currentStretch.startedAt, '2026-10-05T03:00:00.000Z');
});

test('completed rich sleep remains valid to the existing V3 Health reader and snapshot', () => {
  const storage = new MemoryStorage();
  let id = 0;
  const tracker = createSleepTracker(storage, { idFactory: () => 'rich-' + (++id) });

  tracker.startNight({ timestamp: '2026-10-04T22:00:00-05:00' });
  tracker.wake({ timestamp: '2026-10-05T06:00:00-05:00' });
  tracker.rateStretch('Great');
  const finished = tracker.finishNight({ timestamp: '2026-10-05T06:01:00-05:00' });

  assert.equal(finished.ok, true);
  const health = createHealthStore(storage, { now: () => '2026-10-05T12:00:00.000Z' });
  health.initialize();

  const sleep = health.sleep.forDate('2026-10-05');
  assert.equal(sleep.ok, true);
  assert.equal(sleep.entries.length, 1);
  assert.equal(sleep.entries[0].hours, 8);
  assert.equal(sleep.entries[0].quality, 'Great');
  assert.equal(sleep.entries[0].formatVersion, 2);
  assert.equal(health.snapshot('2026-10-05').sleep.hours, 8);
});

test('starting a new tracked night does not erase an older legacy sleep log', () => {
  const legacy = {
    id: 'legacy-sleep',
    date: '2026-10-04',
    timestamp: '2026-10-04T12:00:00.000Z',
    hours: 6.5,
    quality: 'Okay'
  };
  const storage = new MemoryStorage({ [SLEEP_ENTRIES_KEY]: JSON.stringify([legacy]) });
  const tracker = createSleepTracker(storage, { idFactory: () => 'new-night' });

  tracker.startNight({ timestamp: '2026-10-04T22:00:00-05:00' });
  tracker.wake({ timestamp: '2026-10-05T06:00:00-05:00' });
  tracker.rateStretch('Good');
  tracker.finishNight({ timestamp: '2026-10-05T06:01:00-05:00' });

  const entries = JSON.parse(storage.getItem(SLEEP_ENTRIES_KEY));
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.find(entry => entry.id === 'legacy-sleep'), legacy);
});

test('night cannot be finished until the last sleep stretch has been rated', () => {
  const storage = new MemoryStorage();
  const tracker = createSleepTracker(storage, { idFactory: () => 'rating-id' });

  tracker.startNight({ timestamp: '2026-10-04T22:00:00-05:00' });
  tracker.wake({ timestamp: '2026-10-05T02:00:00-05:00' });
  const result = tracker.finishNight({ timestamp: '2026-10-05T02:01:00-05:00' });

  assert.equal(result.ok, false);
  assert.match(result.reason, /rate/i);
  assert.notEqual(storage.getItem(ACTIVE_KEY), null);
});

test('medication and other awake actions require a useful description', () => {
  const storage = new MemoryStorage();
  const tracker = createSleepTracker(storage, { idFactory: () => 'action-id' });

  tracker.startNight({ timestamp: '2026-10-04T22:00:00-05:00' });
  tracker.wake({ timestamp: '2026-10-05T01:00:00-05:00' });
  tracker.rateStretch('Okay');
  tracker.stayUpForNow();

  assert.equal(tracker.logAwakeAction({ type: 'medication' }).ok, false);
  assert.equal(tracker.logAwakeAction({ type: 'other', detail: '  ' }).ok, false);
  assert.equal(tracker.logAwakeAction({ type: 'reading' }, { timestamp: '2026-10-05T01:05:00-05:00' }).ok, true);
});

test('app shell and offline cache include the sleep tracker assets', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

  assert.ok(html.includes('href="sleep-tracker.css"'));
  assert.ok(html.includes('src="sleep-tracker.js"'));
  assert.ok(html.indexOf('src="sleep-tracker.js"') > html.indexOf('src="health-v3-ui.js"'));
  assert.ok(worker.includes("'./sleep-tracker.css'"));
  assert.ok(worker.includes("'./sleep-tracker.js'"));
  assert.match(worker, /sleep-v35/);
});
