# GrizzlyJohn V2 storage foundation

`storage-v2.js` is the compatibility boundary for future V2 work. It is plain JavaScript, loads before the legacy application scripts, and is available in the browser as `window.GrizzlyJohnStorageV2`.

## Safety rules

- Existing keys are never renamed, deleted, cleared, or normalized by this layer.
- Readers return `valid`, `missing`, `malformed`, `unexpected`, or `unavailable`; they do not substitute an empty value for bad data.
- The one-time legacy backup stores each legacy key's exact raw string and is never overwritten.
- Recovery imports skip existing keys by default. Overwriting requires `{ conflict: 'overwrite' }`, and an existing legacy backup can never be overwritten.
- Imports never clear keys that are absent from an export.
- Recovery imports snapshot the exact previous state of every key they may change. If a later write fails, all earlier writes from that attempt are rolled back; rollback status and any rollback errors are returned to the caller.

## Browser API

```js
const storage = window.GrizzlyJohnStorageV2;

storage.readers.checkIns();
storage.readers.places();
storage.readers.questCount();
storage.readers.listeningLog();
storage.readers.campfireLibrary();
storage.readers.listenShelf();
storage.readers.parkBadges();
storage.readers.weatherPreference();
storage.readers.installState();
storage.readers.gratitudeEntries();
storage.readers.goldStarDefinitions();
storage.readers.goldStarDays();
storage.readers.dailyBadgeAwards();
storage.readers.feelingCheckIns();
storage.readers.reflectionCardPulls();
storage.readers.campfireItems();
storage.readers.sideQuestEvents();
storage.readers.guidedSkillSessions();

const recoveryJson = storage.exportData();
storage.importData(recoveryJson); // skips conflicts
storage.importData(recoveryJson, { dryRun: true });
storage.importData(recoveryJson, { conflict: 'overwrite' }); // explicit recovery only
```

Future V2 code should use these readers instead of parsing legacy keys directly. It should treat any status other than `valid` or `missing` as recoverable data that must remain untouched.

## Check-in transition

The legacy UI still writes `grizzlyjohn:checkIns` and keeps its newest 120 records for compatibility. Before that legacy slice occurs, it also calls `appendCheckIn`, which writes the same new record to the uncapped `grizzlyjohn:v2:checkInsFullHistory` stream.

Check-in bootstrap is recovery-safe:

- A valid legacy array is copied into full history.
- A parseable array with imperfect or unexpected records is copied in full without dropping those records. The protected backup still retains the exact legacy raw string.
- Completely unparseable legacy data remains untouched and exact in the protected backup. V2 starts an empty forward history so new valid check-ins continue recording.
- Recovery-start cases use the `full-check-in-history-recovery-started` journal event, including the legacy status and number of records carried forward. Clean initialization uses `full-check-in-history-created`.

The next implementation phase should change check-in reads and rendering to use `readers.fullCheckInHistory()`. Only after parity is verified should the legacy 120-record slice be retired. The legacy key should remain available for backward compatibility and recovery.

The Campfire save path no longer slices its array to 250 entries; existing entries and new entries are retained as written.

## Today V2 data

Today uses four independent V2 keys. None are capped, and none replace a legacy key.

- `grizzlyjohn:v2:gratitudeEntries`: `{ id, date, timestamp, text }[]`
- `grizzlyjohn:v2:goldStarDefinitions`: `{ id, label, active, createdAt, order }[]`
- `grizzlyjohn:v2:goldStarDays`: `{ date, activeStarIds, completedStarIds, updatedAt }[]`
- `grizzlyjohn:v2:dailyBadgeAwards`: `{ id, date, awardedAt, completedCount, activeCount }[]`

Use `storage.localDateKey(date)` for local-calendar grouping. It uses the device's local year, month, and day rather than slicing a UTC ISO timestamp.

```js
storage.gratitude.add('A good conversation');
storage.gratitude.forDate(storage.localDateKey(new Date()));
storage.gratitude.all();
storage.gratitude.remove(entryId);

storage.goldStars.add('Call somebody');
storage.goldStars.rename(starId, 'Call a friend');
storage.goldStars.reorder([starId, anotherStarId]);
storage.goldStars.setActive(starId, false); // archive; do not delete history
storage.goldStars.list({ includeInactive: true });

storage.goldStarDays.get(date, { syncActiveDefinitions: true });
storage.goldStarDays.toggle(date, starId, true);
storage.goldStarDays.evaluateBadge(date);
storage.goldStarDays.awards();
```

Each daily Gold Star record snapshots that date's active IDs. Completed IDs remain in the daily record if a definition is later archived. A badge is stored once per local date when completed active Stars are strictly greater than half of active Stars; an existing award is never revoked or duplicated by later toggles.

Roam reads these existing awards through `storage.goldStarDays.awards()` for its Trail Badges section. It does not copy awards into another key. Side Quest milestone badges continue to derive from the preserved legacy `grizzlyjohn:questCount`; National Park backpack badges continue to use `grizzlyjohn:parkBadges` independently.

## Wisdom V2 data

Wisdom uses two uncapped V2 keys. The legacy check-in key and full-history compatibility stream remain unchanged.

- `grizzlyjohn:v2:feelingCheckIns`: `{ id, date, timestamp, feelings: [{ word, group, groupId, icon }] }[]`
- `grizzlyjohn:v2:reflectionCardPulls`: `{ date, cardId, title, file, pulledAt }[]`

On initialization, convertible records from the uncapped full check-in history are copied into the new multi-feeling history without changing the source. Single legacy feelings become a one-item `feelings` array; records that already contain multiple feelings retain them. New Wisdom check-ins are stored as separate timestamped records, may contain several feelings, and are also appended to the uncapped compatibility history. They do not write to or truncate the legacy 120-record UI key.

```js
storage.feelingCheckIns.add([
  { word: 'Grateful', group: 'BRIGHT / GOOD', groupId: 'bright', icon: '☀️' },
  { word: 'Tired', group: 'NEUTRAL / LOW ENERGY', groupId: 'neutral', icon: '🌥️' }
], { date: storage.localDateKey(new Date()) });
storage.feelingCheckIns.forDate(date);
storage.feelingCheckIns.all();
```

A reflection is not selected until the user explicitly pulls it. `reflectionCards.pull()` writes at most one record per local date and returns the existing record on repeat calls, so reloads and repeated taps keep the same card.

```js
storage.reflectionCards.forDate(date);
storage.reflectionCards.pull({ id: filename, file: filename, title }, { date });
storage.reflectionCards.all();
```

## Campfire V2 data

Campfire uses `grizzlyjohn:v2:campfireItems` as its uncapped working library. The original `grizzlyjohn:campfireLibrary`, `grizzlyjohn:listenShelf`, and `grizzlyjohn:listeningLog` keys remain unchanged and independently recoverable.

On first initialization:

- A parseable Campfire library is copied record-for-record into the V2 working library.
- If the Campfire library is missing, a parseable legacy Listen shelf is copied instead.
- A malformed or unexpected source remains untouched and protected by the legacy backup. V2 starts a clean forward library and records `campfire-items-recovery-started` in the migration journal.
- An existing V2 Campfire library is never re-bootstrapped or overwritten.

New URL items require an `http` or `https` URL. Reflection items require a title and supplied reflection text. Removing a V2 item changes only that selected V2 record; it does not delete its legacy source record or listening history.

```js
storage.campfire.all();
storage.campfire.add({ kind: 'stream', title: 'An episode', url: 'https://example.com', category: 'Recovery' });
storage.campfire.add({ kind: 'reflection', title: 'A thought', body: 'Text supplied for John', category: "John's Picks" });
storage.campfire.remove(itemId);
```

## Dated Side Quest events

Future Side Quest completions are recorded in the supplemental append-only key `grizzlyjohn:v2:sideQuestEvents`. The preserved legacy `grizzlyjohn:questCount` remains authoritative for cumulative progress and existing Trail Badge thresholds; it is not migrated, recalculated, or backfilled.

Use `storage.sideQuestEvents.add(quest, { id, resultingCount })` only after the existing completion pathway successfully increments the cumulative count. Each event contains `id`, the user's local `date`, `timestamp`, the best available `questId`, `title`, and `resultingCount`. Reusing the same completion-action ID is idempotent and does not append a duplicate. Read with `storage.sideQuestEvents.all()` or `storage.sideQuestEvents.forDate(date)`.

Historical cumulative totals do not generate dated events. My Days therefore shows only Side Quests completed after this forward-looking log became available.

## Guided skill sessions

Wisdom stores completed guided exercises in `grizzlyjohn:v2:guidedSkillSessions`. Records contain `id`, local `date`, `timestamp`, `feeling`, `skill`, and the supplied `{ prompt, response }[]`. A session may later receive `checkInId` when John saves the overall multi-feeling check-in; the feeling history itself is never overwritten.

```js
const result = storage.guidedSkillSessions.add({ feeling, skill, responses });
storage.guidedSkillSessions.associate([result.session.id], checkInId);
storage.guidedSkillSessions.all();
```
