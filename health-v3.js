(() => {
  'use strict';

  const HEALTH_KEYS = Object.freeze({
    schemaVersion: 'grizzlyjohn:v3:health:schemaVersion',
    vitals: 'grizzlyjohn:v3:health:vitals',
    weightEntries: 'grizzlyjohn:v3:health:weightEntries',
    activityEntries: 'grizzlyjohn:v3:health:activityEntries',
    medicationDays: 'grizzlyjohn:v3:health:medicationDays',
    sleepEntries: 'grizzlyjohn:v3:health:sleepEntries',
    notes: 'grizzlyjohn:v3:health:notes',
    bodyFeels: 'grizzlyjohn:v3:health:bodyFeels'
  });

  const HEALTH_SCHEMA_VERSION = 1;
  const SLEEP_QUALITIES = Object.freeze(['Poor', 'Okay', 'Good', 'Great']);
  const BODY_FEELS = Object.freeze(['Great', 'Good', 'Okay', 'Rough', 'Bad']);
  const SEVERITIES = Object.freeze(['Mild', 'Moderate', 'Strong']);
  const MEDICATION_WINDOWS = Object.freeze(['morning', 'midday', 'evening']);
  const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

  function localDateKey(value = new Date()) {
    if (typeof value === 'string' && DATE_KEY.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const localNoon = new Date(year, month - 1, day, 12, 0, 0, 0);
      if (
        localNoon.getFullYear() !== year ||
        localNoon.getMonth() !== month - 1 ||
        localNoon.getDate() !== day
      ) throw new TypeError('A valid local calendar date is required.');
      return value;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('A valid date is required.');
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function nonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function createHealthStore(storage, options = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('A localStorage-compatible adapter is required.');
    }

    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    const makeId = typeof options.idFactory === 'function' ? options.idFactory : () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    };

    function raw(key) {
      try {
        const value = storage.getItem(key);
        return { ok: true, present: value !== null, raw: value };
      } catch (error) {
        return { ok: false, present: false, raw: null, error: String(error?.message || error) };
      }
    }

    function parse(key) {
      const source = raw(key);
      if (!source.ok) return { key, status: 'unavailable', raw: null, errors: [source.error] };
      if (!source.present) return { key, status: 'missing', raw: null, errors: [] };
      try {
        return { key, status: 'parsed', raw: source.raw, value: JSON.parse(source.raw), errors: [] };
      } catch (error) {
        return { key, status: 'malformed', raw: source.raw, errors: [String(error?.message || error)] };
      }
    }

    function validateJson(key, expected, inspect = () => []) {
      const result = parse(key);
      if (result.status !== 'parsed') return result;
      if (!expected(result.value)) {
        return { ...result, status: 'unexpected', errors: ['Unexpected top-level data type.'] };
      }
      const errors = inspect(result.value);
      return { ...result, status: errors.length ? 'unexpected' : 'valid', errors };
    }

    function inspectObjects(records, requiredFields) {
      const errors = [];
      records.forEach((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          errors.push(`Record ${index} is not an object.`);
          return;
        }
        requiredFields.forEach(field => {
          if (!(field in record)) errors.push(`Record ${index} is missing ${field}.`);
        });
      });
      return errors;
    }

    function inspectVitals(records) {
      const errors = inspectObjects(records, ['id', 'date', 'timestamp', 'systolic', 'diastolic', 'pulse']);
      records.forEach((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return;
        ['systolic', 'diastolic', 'pulse'].forEach(field => {
          if (positiveNumber(record[field]) === null) errors.push(`Record ${index} ${field} must be a positive number.`);
        });
      });
      return errors;
    }

    function inspectWeights(records) {
      const errors = inspectObjects(records, ['id', 'date', 'timestamp', 'weight']);
      records.forEach((record, index) => {
        if (record && typeof record === 'object' && !Array.isArray(record) && positiveNumber(record.weight) === null) {
          errors.push(`Record ${index} weight must be a positive number.`);
        }
      });
      return errors;
    }

    function inspectActivities(records) {
      const errors = inspectObjects(records, ['id', 'date', 'timestamp', 'activityType', 'durationMinutes']);
      records.forEach((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return;
        if (!cleanText(record.activityType)) errors.push(`Record ${index} activityType must contain text.`);
        if (positiveNumber(record.durationMinutes) === null) errors.push(`Record ${index} durationMinutes must be a positive number.`);
        if ('estimatedCalories' in record && record.estimatedCalories !== null && nonNegativeNumber(record.estimatedCalories) === null) {
          errors.push(`Record ${index} estimatedCalories must be zero or a positive number.`);
        }
      });
      return errors;
    }

    function inspectMedicationDays(records) {
      const errors = inspectObjects(records, ['date', 'morning', 'midday', 'evening', 'updatedAt']);
      const seenDates = new Set();
      records.forEach((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return;
        if (!DATE_KEY.test(record.date || '')) errors.push(`Record ${index} date must be a local YYYY-MM-DD date.`);
        if (seenDates.has(record.date)) errors.push(`Record ${index} duplicates medication date ${record.date}.`);
        seenDates.add(record.date);
        MEDICATION_WINDOWS.forEach(windowName => {
          if (typeof record[windowName] !== 'boolean') errors.push(`Record ${index} ${windowName} must be boolean.`);
        });
      });
      return errors;
    }

    function inspectSleep(records) {
      const errors = inspectObjects(records, ['id', 'date', 'timestamp', 'hours', 'quality']);
      const seenDates = new Set();
      records.forEach((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return;
        if (nonNegativeNumber(record.hours) === null) errors.push(`Record ${index} hours must be zero or a positive number.`);
        if (!SLEEP_QUALITIES.includes(record.quality)) errors.push(`Record ${index} has an unsupported sleep quality.`);
        if (seenDates.has(record.date)) errors.push(`Record ${index} duplicates sleep date ${record.date}.`);
        seenDates.add(record.date);
      });
      return errors;
    }

    function inspectNotes(records) {
      const errors = inspectObjects(records, ['id', 'date', 'timestamp', 'text', 'tags']);
      records.forEach((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return;
        if (!cleanText(record.text)) errors.push(`Record ${index} text must contain text.`);
        if (!Array.isArray(record.tags) || record.tags.some(tag => !cleanText(tag))) errors.push(`Record ${index} tags must be an array of non-empty strings.`);
        if ('severity' in record && record.severity !== null && !SEVERITIES.includes(record.severity)) errors.push(`Record ${index} has an unsupported severity.`);
      });
      return errors;
    }

    function inspectBodyFeels(records) {
      const errors = inspectObjects(records, ['id', 'date', 'timestamp', 'value']);
      const seenDates = new Set();
      records.forEach((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return;
        if (!BODY_FEELS.includes(record.value)) errors.push(`Record ${index} has an unsupported body feel.`);
        if (seenDates.has(record.date)) errors.push(`Record ${index} duplicates body-feel date ${record.date}.`);
        seenDates.add(record.date);
      });
      return errors;
    }

    const readers = Object.freeze({
      schemaVersion: () => validateJson(HEALTH_KEYS.schemaVersion, value => Boolean(value) && typeof value === 'object' && !Array.isArray(value)),
      vitals: () => validateJson(HEALTH_KEYS.vitals, Array.isArray, inspectVitals),
      weightEntries: () => validateJson(HEALTH_KEYS.weightEntries, Array.isArray, inspectWeights),
      activityEntries: () => validateJson(HEALTH_KEYS.activityEntries, Array.isArray, inspectActivities),
      medicationDays: () => validateJson(HEALTH_KEYS.medicationDays, Array.isArray, inspectMedicationDays),
      sleepEntries: () => validateJson(HEALTH_KEYS.sleepEntries, Array.isArray, inspectSleep),
      notes: () => validateJson(HEALTH_KEYS.notes, Array.isArray, inspectNotes),
      bodyFeels: () => validateJson(HEALTH_KEYS.bodyFeels, Array.isArray, inspectBodyFeels)
    });

    function writeJson(key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
    }

    function mutableArray(key, reader) {
      const result = reader();
      if (result.status === 'missing') return { ok: true, value: [] };
      if (result.status === 'valid') return { ok: true, value: [...result.value] };
      return {
        ok: false,
        reason: `Health data at ${key} is ${result.status} and was preserved for recovery.`,
        status: result.status,
        raw: result.raw,
        errors: result.errors || []
      };
    }

    function timestampAndDate(options = {}) {
      const timestamp = options.timestamp || now();
      const parsed = new Date(timestamp);
      if (Number.isNaN(parsed.getTime())) return { ok: false, reason: 'A valid timestamp is required.' };
      try {
        const date = options.date ? localDateKey(options.date) : localDateKey(parsed);
        return { ok: true, timestamp: parsed.toISOString(), date };
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
    }

    function allFrom(key, reader) {
      const entries = mutableArray(key, reader);
      if (!entries.ok) return entries;
      return { ok: true, entries: [...entries.value].sort((a, b) => String(b.timestamp || b.updatedAt).localeCompare(String(a.timestamp || a.updatedAt))) };
    }

    function forDateFrom(key, reader, date) {
      let dateKey;
      try { dateKey = localDateKey(date); }
      catch (error) { return { ok: false, reason: String(error?.message || error) }; }
      const result = allFrom(key, reader);
      if (!result.ok) return result;
      return { ok: true, date: dateKey, entries: result.entries.filter(entry => entry.date === dateKey) };
    }

    function addTo(key, reader, record) {
      const entries = mutableArray(key, reader);
      if (!entries.ok) return entries;
      const written = writeJson(key, [record, ...entries.value]);
      return written.ok ? { ok: true, entry: record } : written;
    }

    function replaceById(key, reader, id, updater) {
      const entries = mutableArray(key, reader);
      if (!entries.ok) return entries;
      const index = entries.value.findIndex(entry => entry?.id === id);
      if (index < 0) return { ok: false, reason: 'Health entry was not found.' };
      const next = [...entries.value];
      next[index] = updater({ ...next[index] });
      const written = writeJson(key, next);
      return written.ok ? { ok: true, entry: next[index] } : written;
    }

    const vitals = Object.freeze({
      all: () => allFrom(HEALTH_KEYS.vitals, readers.vitals),
      forDate: date => forDateFrom(HEALTH_KEYS.vitals, readers.vitals, date),
      add(input = {}, options = {}) {
        const systolic = positiveNumber(input.systolic);
        const diastolic = positiveNumber(input.diastolic);
        const pulse = positiveNumber(input.pulse);
        if ([systolic, diastolic, pulse].includes(null)) return { ok: false, reason: 'Systolic, diastolic, and pulse must be positive numbers.' };
        const when = timestampAndDate(options);
        if (!when.ok) return when;
        const entry = { id: options.id || makeId(), date: when.date, timestamp: when.timestamp, systolic, diastolic, pulse };
        const note = cleanText(input.note);
        if (note) entry.note = note;
        return addTo(HEALTH_KEYS.vitals, readers.vitals, entry);
      },
      updateNote(id, note) {
        return replaceById(HEALTH_KEYS.vitals, readers.vitals, id, entry => {
          const nextNote = cleanText(note);
          if (nextNote) entry.note = nextNote;
          else delete entry.note;
          return entry;
        });
      }
    });

    const weights = Object.freeze({
      all: () => allFrom(HEALTH_KEYS.weightEntries, readers.weightEntries),
      forDate: date => forDateFrom(HEALTH_KEYS.weightEntries, readers.weightEntries, date),
      add(value, options = {}) {
        const weight = positiveNumber(typeof value === 'object' ? value?.weight : value);
        if (weight === null) return { ok: false, reason: 'Weight must be a positive number.' };
        const when = timestampAndDate(options);
        if (!when.ok) return when;
        const entry = { id: options.id || makeId(), date: when.date, timestamp: when.timestamp, weight };
        return addTo(HEALTH_KEYS.weightEntries, readers.weightEntries, entry);
      },
      latest(options = {}) {
        const result = this.all();
        if (!result.ok) return result;
        let throughDate = null;
        if (options.throughDate) {
          try { throughDate = localDateKey(options.throughDate); }
          catch (error) { return { ok: false, reason: String(error?.message || error) }; }
        }
        const entry = result.entries.find(item => !throughDate || item.date <= throughDate) || null;
        return { ok: true, entry };
      }
    });

    const activities = Object.freeze({
      all: () => allFrom(HEALTH_KEYS.activityEntries, readers.activityEntries),
      forDate: date => forDateFrom(HEALTH_KEYS.activityEntries, readers.activityEntries, date),
      add(input = {}, options = {}) {
        const activityType = cleanText(input.activityType || input.type);
        const durationMinutes = positiveNumber(input.durationMinutes ?? input.duration);
        if (!activityType || durationMinutes === null) return { ok: false, reason: 'Activity type and positive duration minutes are required.' };
        const when = timestampAndDate(options);
        if (!when.ok) return when;
        const entry = { id: options.id || makeId(), date: when.date, timestamp: when.timestamp, activityType, durationMinutes };
        const intensity = cleanText(input.intensity);
        if (intensity) entry.intensity = intensity;
        if (input.estimatedCalories !== undefined && input.estimatedCalories !== null && input.estimatedCalories !== '') {
          const estimatedCalories = nonNegativeNumber(input.estimatedCalories);
          if (estimatedCalories === null) return { ok: false, reason: 'Estimated calories must be zero or a positive number.' };
          entry.estimatedCalories = estimatedCalories;
        }
        return addTo(HEALTH_KEYS.activityEntries, readers.activityEntries, entry);
      }
    });

    const medication = Object.freeze({
      all: () => allFrom(HEALTH_KEYS.medicationDays, readers.medicationDays),
      get(date = new Date()) {
        let dateKey;
        try { dateKey = localDateKey(date); }
        catch (error) { return { ok: false, reason: String(error?.message || error) }; }
        const entries = mutableArray(HEALTH_KEYS.medicationDays, readers.medicationDays);
        if (!entries.ok) return entries;
        return { ok: true, date: dateKey, entry: entries.value.find(item => item.date === dateKey) || null };
      },
      setWindow(date, windowName, taken = true, options = {}) {
        if (!MEDICATION_WINDOWS.includes(windowName)) return { ok: false, reason: 'Medication window must be morning, midday, or evening.' };
        let dateKey;
        try { dateKey = localDateKey(date); }
        catch (error) { return { ok: false, reason: String(error?.message || error) }; }
        const entries = mutableArray(HEALTH_KEYS.medicationDays, readers.medicationDays);
        if (!entries.ok) return entries;
        const timestamp = options.timestamp || now();
        if (Number.isNaN(new Date(timestamp).getTime())) return { ok: false, reason: 'A valid timestamp is required.' };
        const index = entries.value.findIndex(item => item.date === dateKey);
        const entry = index >= 0 ? { ...entries.value[index] } : { date: dateKey, morning: false, midday: false, evening: false, updatedAt: new Date(timestamp).toISOString() };
        entry[windowName] = Boolean(taken);
        entry.updatedAt = new Date(timestamp).toISOString();
        const next = [...entries.value];
        if (index >= 0) next[index] = entry;
        else next.unshift(entry);
        const written = writeJson(HEALTH_KEYS.medicationDays, next);
        return written.ok ? { ok: true, entry } : written;
      }
    });

    const sleep = Object.freeze({
      all: () => allFrom(HEALTH_KEYS.sleepEntries, readers.sleepEntries),
      forDate: date => forDateFrom(HEALTH_KEYS.sleepEntries, readers.sleepEntries, date),
      set(input = {}, options = {}) {
        const hours = nonNegativeNumber(input.hours);
        const quality = input.quality;
        if (hours === null) return { ok: false, reason: 'Sleep hours must be zero or a positive number.' };
        if (!SLEEP_QUALITIES.includes(quality)) return { ok: false, reason: 'Sleep quality must be Poor, Okay, Good, or Great.' };
        const when = timestampAndDate(options);
        if (!when.ok) return when;
        const entries = mutableArray(HEALTH_KEYS.sleepEntries, readers.sleepEntries);
        if (!entries.ok) return entries;
        const index = entries.value.findIndex(item => item.date === when.date);
        const entry = index >= 0
          ? { ...entries.value[index], hours, quality, timestamp: when.timestamp }
          : { id: options.id || makeId(), date: when.date, timestamp: when.timestamp, hours, quality };
        const next = [...entries.value];
        if (index >= 0) next[index] = entry;
        else next.unshift(entry);
        const written = writeJson(HEALTH_KEYS.sleepEntries, next);
        return written.ok ? { ok: true, entry } : written;
      }
    });

    const notes = Object.freeze({
      all: () => allFrom(HEALTH_KEYS.notes, readers.notes),
      forDate: date => forDateFrom(HEALTH_KEYS.notes, readers.notes, date),
      add(input = {}, options = {}) {
        const text = cleanText(typeof input === 'string' ? input : input.text);
        if (!text) return { ok: false, reason: 'A health note needs text.' };
        const when = timestampAndDate(options);
        if (!when.ok) return when;
        const suppliedTags = Array.isArray(input.tags) ? input.tags : [];
        const tags = [...new Set(suppliedTags.map(cleanText).filter(Boolean))];
        const entry = { id: options.id || makeId(), date: when.date, timestamp: when.timestamp, text, tags };
        if (input.severity !== undefined && input.severity !== null && input.severity !== '') {
          if (!SEVERITIES.includes(input.severity)) return { ok: false, reason: 'Severity must be Mild, Moderate, or Strong.' };
          entry.severity = input.severity;
        }
        return addTo(HEALTH_KEYS.notes, readers.notes, entry);
      }
    });

    const bodyFeel = Object.freeze({
      all: () => allFrom(HEALTH_KEYS.bodyFeels, readers.bodyFeels),
      forDate: date => forDateFrom(HEALTH_KEYS.bodyFeels, readers.bodyFeels, date),
      set(value, options = {}) {
        if (!BODY_FEELS.includes(value)) return { ok: false, reason: 'Body feel must be Great, Good, Okay, Rough, or Bad.' };
        const when = timestampAndDate(options);
        if (!when.ok) return when;
        const entries = mutableArray(HEALTH_KEYS.bodyFeels, readers.bodyFeels);
        if (!entries.ok) return entries;
        const index = entries.value.findIndex(item => item.date === when.date);
        const entry = index >= 0
          ? { ...entries.value[index], value, timestamp: when.timestamp }
          : { id: options.id || makeId(), date: when.date, timestamp: when.timestamp, value };
        const next = [...entries.value];
        if (index >= 0) next[index] = entry;
        else next.unshift(entry);
        const written = writeJson(HEALTH_KEYS.bodyFeels, next);
        return written.ok ? { ok: true, entry } : written;
      }
    });

    function snapshot(date = new Date()) {
      let dateKey;
      try { dateKey = localDateKey(date); }
      catch (error) { return { ok: false, reason: String(error?.message || error) }; }

      const dailyVitals = vitals.forDate(dateKey);
      const dailyActivities = activities.forDate(dateKey);
      const dailySleep = sleep.forDate(dateKey);
      const dailyNotes = notes.forDate(dateKey);
      const dailyBodyFeel = bodyFeel.forDate(dateKey);
      const medicationDay = medication.get(dateKey);
      const latestWeight = weights.latest({ throughDate: dateKey });
      const results = [dailyVitals, dailyActivities, dailySleep, dailyNotes, dailyBodyFeel, medicationDay, latestWeight];
      const failed = results.find(result => !result.ok);
      if (failed) return failed;

      const activityMinutes = dailyActivities.entries.reduce((total, entry) => total + Number(entry.durationMinutes || 0), 0);
      const medEntry = medicationDay.entry;
      const medicationCompleted = medEntry ? MEDICATION_WINDOWS.filter(windowName => medEntry[windowName]).length : 0;

      return {
        ok: true,
        date: dateKey,
        latestVitals: dailyVitals.entries[0] || null,
        latestWeight: latestWeight.entry,
        activityMinutes,
        activityCount: dailyActivities.entries.length,
        medication: medEntry,
        medicationCompleted,
        sleep: dailySleep.entries[0] || null,
        noteCount: dailyNotes.entries.length,
        bodyFeel: dailyBodyFeel.entries[0] || null
      };
    }

    function initialize() {
      const existing = readers.schemaVersion();
      if (existing.status === 'valid') return { ok: true, created: false, schema: existing.value };
      if (existing.status !== 'missing') {
        return { ok: false, created: false, reason: 'Existing Health schema metadata is invalid and was preserved for recovery.', status: existing.status };
      }
      const schema = { appVersion: 3, healthSchemaVersion: HEALTH_SCHEMA_VERSION, initializedAt: now() };
      const written = writeJson(HEALTH_KEYS.schemaVersion, schema);
      return written.ok ? { ok: true, created: true, schema } : written;
    }

    return Object.freeze({
      HEALTH_KEYS,
      HEALTH_SCHEMA_VERSION,
      SLEEP_QUALITIES,
      BODY_FEELS,
      SEVERITIES,
      MEDICATION_WINDOWS,
      localDateKey,
      readers,
      raw,
      parse,
      initialize,
      vitals,
      weights,
      activities,
      medication,
      sleep,
      notes,
      bodyFeel,
      snapshot
    });
  }

  const api = {
    createHealthStore,
    HEALTH_KEYS,
    HEALTH_SCHEMA_VERSION,
    SLEEP_QUALITIES,
    BODY_FEELS,
    SEVERITIES,
    MEDICATION_WINDOWS,
    localDateKey
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.GrizzlyJohnHealthV3 = createHealthStore(window.localStorage);
    window.GrizzlyJohnHealthV3.initialize();
  }
})();
