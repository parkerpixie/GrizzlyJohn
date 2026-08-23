# GrizzlyJohn V2 storage foundation

`storage-v2.js` is the compatibility boundary for future V2 work. It is plain JavaScript, loads before the legacy application scripts, and is available in the browser as `window.GrizzlyJohnStorageV2`.

## Safety rules

- Existing keys are never renamed, deleted, cleared, or normalized by this layer.
- Readers return `valid`, `missing`, `malformed`, `unexpected`, or `unavailable`; they do not substitute an empty value for bad data.
- The one-time legacy backup stores each legacy key's exact raw string and is never overwritten.
- Recovery imports skip existing keys by default. Overwriting requires `{ conflict: 'overwrite' }`, and an existing legacy backup can never be overwritten.
- Imports never clear keys that are absent from an export.

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

const recoveryJson = storage.exportData();
storage.importData(recoveryJson); // skips conflicts
storage.importData(recoveryJson, { dryRun: true });
storage.importData(recoveryJson, { conflict: 'overwrite' }); // explicit recovery only
```

Future V2 code should use these readers instead of parsing legacy keys directly. It should treat any status other than `valid` or `missing` as recoverable data that must remain untouched.

## Check-in transition

The legacy UI still writes `grizzlyjohn:checkIns` and keeps its newest 120 records for compatibility. Before that legacy slice occurs, it also calls `appendCheckIn`, which writes the same new record to the uncapped `grizzlyjohn:v2:checkInsFullHistory` stream.

The next implementation phase should change check-in reads and rendering to use `readers.fullCheckInHistory()`. Only after parity is verified should the legacy 120-record slice be retired. The legacy key should remain available for backward compatibility and recovery.

The Campfire save path no longer slices its array to 250 entries; existing entries and new entries are retained as written.
