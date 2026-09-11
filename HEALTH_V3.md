# GrizzlyJohn V3 Health foundation

This module implements the data-first portion of the approved V3 Health scope. It is intentionally separate from `storage-v2.js` so the V2 compatibility boundary and every existing V1/V2 key remain untouched.

## Storage rules

- Health uses new `grizzlyjohn:v3:health:*` keys only.
- Existing V1 and V2 keys are never renamed, migrated, normalized, deleted, or rewritten by Health initialization.
- Health collections are uncapped.
- Every timestamped entry also stores a local `YYYY-MM-DD` date for reliable daily grouping.
- Date-only input is treated as a local calendar date and is never UTC-parsed.
- If an existing Health key is malformed or has an unexpected shape, the raw value is preserved and writes to that collection are refused until recovery.
- `storage-v2.js` portable Backup already includes every key beginning with `grizzlyjohn:`, so these V3 Health keys are included automatically without modifying the V2 backup format.
- This layer stores observations only. It contains no diagnosis, blood-pressure interpretation, symptom analysis, treatment advice, medication advice, or emergency labeling.

## Keys and record shapes

### Schema metadata

`grizzlyjohn:v3:health:schemaVersion`

```js
{ appVersion: 3, healthSchemaVersion: 1, initializedAt }
```

Initialization creates only this metadata key. Empty data collections are not written until John actually logs something.

### Vitals

`grizzlyjohn:v3:health:vitals`

```js
{ id, date, timestamp, systolic, diastolic, pulse, note? }[]
```

Multiple readings per day are allowed. A note belongs to one reading.

### Weight

`grizzlyjohn:v3:health:weightEntries`

```js
{ id, date, timestamp, weight }[]
```

Weight is stored as the entered numeric value. Presentation/unit decisions remain a UI concern for the logging phase. `weights.latest({ throughDate })` returns the most recent available entry on or before a local date.

### Activity

`grizzlyjohn:v3:health:activityEntries`

```js
{ id, date, timestamp, activityType, durationMinutes, intensity?, estimatedCalories? }[]
```

Estimated calories are optional data. Calculation logic is deliberately not part of the storage layer.

### Medication windows

`grizzlyjohn:v3:health:medicationDays`

```js
{ date, morning, midday, evening, updatedAt }[]
```

There is one record per local date. The three booleans mean completion only; this is not a medication-name, dose, refill, or pharmacy database.

### Sleep

`grizzlyjohn:v3:health:sleepEntries`

```js
{ id, date, timestamp, hours, quality }[]
```

Allowed quality values are exactly `Poor`, `Okay`, `Good`, and `Great`. There is one sleep record per local date; saving again updates that date rather than duplicating it.

### Notes + symptoms

`grizzlyjohn:v3:health:notes`

```js
{ id, date, timestamp, text, tags: string[], severity? }[]
```

Multiple notes per day are allowed. Tags are lightweight strings so the UI can offer John the approved quick choices without locking the data model to a permanent tag list. Optional severity values are `Mild`, `Moderate`, or `Strong`.

### Optional body feel

`grizzlyjohn:v3:health:bodyFeels`

```js
{ id, date, timestamp, value }[]
```

Allowed values are exactly `Great`, `Good`, `Okay`, `Rough`, and `Bad`. There is one broad body signal per local date and it remains optional.

## Browser API

`health-v3.js` exposes `window.GrizzlyJohnHealthV3` in the browser and CommonJS exports for Node tests.

```js
const health = window.GrizzlyJohnHealthV3;

health.vitals.add({ systolic: 120, diastolic: 78, pulse: 68, note: 'After sitting' });
health.vitals.forDate('2026-09-10');

health.weights.add(188.5);
health.weights.latest();

health.activities.add({ activityType: 'Walking', durationMinutes: 30, intensity: 'Easy' });

health.medication.setWindow('2026-09-10', 'morning', true);
health.medication.get('2026-09-10');

health.sleep.set({ hours: 7, quality: 'Good' });

health.notes.add({ text: 'Dizzy after standing', tags: ['dizziness'], severity: 'Mild' });

health.bodyFeel.set('Good');

health.snapshot('2026-09-10');
```

`snapshot(date)` provides the data needed for the approved Today Body Snapshot without storing a score: latest vitals for that day, most recent weight through that day, total activity minutes, medication completion count, sleep, note count, and optional body feel.

## Release gate for this phase

Before Health UI work begins, the foundation should pass these checks:

1. The approved V2 branch is checkpointed before V3 changes.
2. Health initialization leaves every existing V1/V2 raw value unchanged.
3. Multiple same-day vitals survive a fresh storage-layer instance.
4. Medication windows update independently without duplicate daily records.
5. Sleep and body feel update one daily record instead of creating duplicates.
6. Notes support multiple same-day entries.
7. Malformed Health data is preserved instead of overwritten.
8. Local date-only values never shift to the previous/next day because of UTC parsing.
9. The existing full Node test suite still passes.
