(() => {
  'use strict';

  const LEGACY_KEYS = Object.freeze({
    checkIns: 'grizzlyjohn:checkIns',
    places: 'grizzlyjohn:places',
    questCount: 'grizzlyjohn:questCount',
    listeningLog: 'grizzlyjohn:listeningLog',
    campfireLibrary: 'grizzlyjohn:campfireLibrary',
    listenShelf: 'grizzlyjohn:listenShelf',
    parkBadges: 'grizzlyjohn:parkBadges',
    weatherEnabled: 'grizzlyjohn:weatherEnabled',
    installComplete: 'grizzlyjohn:installComplete',
    installDismissed: 'grizzlyjohn:installDismissed'
  });

  const V2_KEYS = Object.freeze({
    schemaVersion: 'grizzlyjohn:v2:schemaVersion',
    migrationJournal: 'grizzlyjohn:v2:migrationJournal',
    legacyBackup: 'grizzlyjohn:v2:legacyBackup',
    checkInsFullHistory: 'grizzlyjohn:v2:checkInsFullHistory'
  });

  const SCHEMA_VERSION = 2;
  const EXPORT_FORMAT = 'grizzlyjohn-localstorage-export-v1';

  function createStorageLayer(storage, options = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('A localStorage-compatible adapter is required.');
    }

    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();

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

    function inspectRecords(records, requiredFields) {
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

    function validateBooleanPreference(key) {
      const result = raw(key);
      if (!result.ok) return { key, status: 'unavailable', raw: null, errors: [result.error] };
      if (!result.present) return { key, status: 'missing', raw: null, errors: [] };
      const valid = result.raw === 'true' || result.raw === 'false';
      return {
        key,
        status: valid ? 'valid' : 'unexpected',
        raw: result.raw,
        value: valid ? result.raw === 'true' : undefined,
        errors: valid ? [] : ['Expected the raw string "true" or "false".']
      };
    }

    const readers = Object.freeze({
      checkIns: () => validateJson(LEGACY_KEYS.checkIns, Array.isArray, value => inspectRecords(value, ['id', 'date', 'feeling', 'group'])),
      places: () => validateJson(LEGACY_KEYS.places, Array.isArray, value => inspectRecords(value, ['id', 'name', 'status'])),
      questCount: () => validateJson(LEGACY_KEYS.questCount, value => typeof value === 'number' && Number.isFinite(value)),
      listeningLog: () => validateJson(LEGACY_KEYS.listeningLog, Array.isArray, value => inspectRecords(value, ['id', 'podcast', 'date'])),
      campfireLibrary: () => validateJson(LEGACY_KEYS.campfireLibrary, Array.isArray, value => inspectRecords(value, ['id', 'kind', 'title'])),
      listenShelf: () => validateJson(LEGACY_KEYS.listenShelf, Array.isArray, value => inspectRecords(value, ['id'])),
      parkBadges: () => validateJson(LEGACY_KEYS.parkBadges, Array.isArray, value => value.reduce((errors, badge, index) => {
        if (typeof badge !== 'string') errors.push(`Badge ${index} is not a string.`);
        return errors;
      }, [])),
      weatherPreference: () => validateBooleanPreference(LEGACY_KEYS.weatherEnabled),
      installState: () => ({
        complete: validateBooleanPreference(LEGACY_KEYS.installComplete),
        dismissed: validateBooleanPreference(LEGACY_KEYS.installDismissed)
      }),
      fullCheckInHistory: () => validateJson(V2_KEYS.checkInsFullHistory, Array.isArray, value => inspectRecords(value, ['id', 'date', 'feeling', 'group']))
    });

    function setJson(key, value) {
      storage.setItem(key, JSON.stringify(value));
    }

    function appendJournal(event, details = {}) {
      const current = parse(V2_KEYS.migrationJournal);
      let journal = [];
      if (current.status === 'parsed' && Array.isArray(current.value)) journal = current.value;
      else if (current.status !== 'missing') {
        return { ok: false, reason: 'The migration journal is malformed or unavailable and was preserved.' };
      }
      journal.push({ at: now(), event, details });
      try {
        setJson(V2_KEYS.migrationJournal, journal);
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
    }

    function backupLegacyData() {
      const existing = raw(V2_KEYS.legacyBackup);
      if (!existing.ok) return { ok: false, created: false, reason: existing.error };
      if (existing.present) return { ok: true, created: false, reason: 'Existing backup preserved.' };

      const entries = {};
      Object.values(LEGACY_KEYS).forEach(key => {
        const value = raw(key);
        entries[key] = { present: value.ok && value.present, raw: value.ok ? value.raw : null };
      });
      const backup = { format: 'grizzlyjohn-legacy-backup-v1', createdAt: now(), entries };
      try {
        setJson(V2_KEYS.legacyBackup, backup);
        appendJournal('legacy-backup-created', { keyCount: Object.keys(entries).length });
        return { ok: true, created: true, backup };
      } catch (error) {
        return { ok: false, created: false, reason: String(error?.message || error) };
      }
    }

    function bootstrapFullCheckInHistory() {
      const existing = raw(V2_KEYS.checkInsFullHistory);
      if (!existing.ok) return { ok: false, created: false, reason: existing.error };
      if (existing.present) return { ok: true, created: false };
      const legacy = readers.checkIns();
      if (legacy.status === 'unavailable') return { ok: false, created: false, reason: legacy.errors[0] };

      const canCarryForward = (legacy.status === 'valid' || legacy.status === 'unexpected') && Array.isArray(legacy.value);
      const history = canCarryForward ? legacy.value : [];
      const recoveryStart = !['valid', 'missing'].includes(legacy.status);
      const event = recoveryStart ? 'full-check-in-history-recovery-started' : 'full-check-in-history-created';
      const details = {
        recordCount: history.length,
        legacyStatus: legacy.status,
        legacyRecordsCarriedForward: canCarryForward ? history.length : 0
      };
      if (recoveryStart) details.reason = canCarryForward
        ? 'Legacy JSON was an array with imperfect records; every parsed record was carried forward unchanged.'
        : 'Legacy JSON could not provide an array; its exact raw value remains in the protected backup and V2 started an empty forward history.';
      try {
        setJson(V2_KEYS.checkInsFullHistory, history);
        appendJournal(event, details);
        return { ok: true, created: true, recoveryStart, recordCount: history.length, legacyStatus: legacy.status };
      } catch (error) {
        return { ok: false, created: false, reason: String(error?.message || error) };
      }
    }

    function appendCheckIn(record) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return { ok: false, reason: 'Check-in must be an object.' };
      }
      const history = parse(V2_KEYS.checkInsFullHistory);
      if (history.status !== 'parsed' || !Array.isArray(history.value)) {
        return { ok: false, reason: `Full check-in history is ${history.status}; it was preserved without modification.` };
      }
      const next = [record, ...history.value];
      try {
        setJson(V2_KEYS.checkInsFullHistory, next);
        return { ok: true, recordCount: next.length };
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
    }

    function exportData() {
      const entries = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (typeof key === 'string' && key.startsWith('grizzlyjohn:')) {
          entries.push({ key, raw: storage.getItem(key) });
        }
      }
      entries.sort((a, b) => a.key.localeCompare(b.key));
      return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: now(), entries }, null, 2);
    }

    function importData(payload, options = {}) {
      let parsedPayload;
      try {
        parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      } catch (error) {
        return { ok: false, errors: [`Invalid JSON: ${String(error?.message || error)}`], imported: [], skipped: [] };
      }
      const errors = [];
      if (!parsedPayload || parsedPayload.format !== EXPORT_FORMAT || !Array.isArray(parsedPayload.entries)) {
        errors.push('Unsupported GrizzlyJohn export format.');
      }
      const entries = Array.isArray(parsedPayload?.entries) ? parsedPayload.entries : [];
      const seenKeys = new Set();
      entries.forEach((entry, index) => {
        if (!entry || typeof entry.key !== 'string' || !entry.key.startsWith('grizzlyjohn:')) errors.push(`Entry ${index} has an invalid key.`);
        if (!entry || typeof entry.raw !== 'string') errors.push(`Entry ${index} does not contain an exact raw string value.`);
        if (entry && typeof entry.key === 'string') {
          if (seenKeys.has(entry.key)) errors.push(`Entry ${index} duplicates ${entry.key}.`);
          seenKeys.add(entry.key);
        }
      });
      if (errors.length) return { ok: false, errors, imported: [], skipped: [] };

      const overwrite = options.conflict === 'overwrite';
      const dryRun = options.dryRun === true;
      const skipped = [];
      const planned = [];
      for (const entry of entries) {
        const exists = storage.getItem(entry.key) !== null;
        const protectedBackup = entry.key === V2_KEYS.legacyBackup && exists;
        if ((exists && !overwrite) || protectedBackup) {
          skipped.push({ key: entry.key, reason: protectedBackup ? 'Existing legacy backup is never overwritten.' : 'Key already exists.' });
          continue;
        }
        planned.push({ entry, previous: { present: exists, raw: exists ? storage.getItem(entry.key) : null } });
      }

      const imported = planned.map(item => item.entry.key);
      if (dryRun) return { ok: true, errors: [], imported, skipped, dryRun: true };

      const changed = [];
      try {
        for (const item of planned) {
          storage.setItem(item.entry.key, item.entry.raw);
          changed.push(item);
        }
      } catch (error) {
        const rollbackErrors = [];
        for (const item of [...changed].reverse()) {
          try {
            if (item.previous.present) storage.setItem(item.entry.key, item.previous.raw);
            else if (typeof storage.removeItem === 'function') storage.removeItem(item.entry.key);
            else throw new Error('Storage adapter cannot remove a newly created key.');
          } catch (rollbackError) {
            rollbackErrors.push({ key: item.entry.key, error: String(rollbackError?.message || rollbackError) });
          }
        }
        return {
          ok: false,
          errors: [`Recovery import failed while writing ${planned[changed.length]?.entry.key || 'a storage key'}: ${String(error?.message || error)}`],
          imported: [],
          skipped,
          rolledBack: rollbackErrors.length === 0,
          rollbackErrors
        };
      }
      if (!dryRun) appendJournal('recovery-import', { imported: imported.length, skipped: skipped.length, conflict: overwrite ? 'overwrite' : 'skip' });
      return { ok: true, errors: [], imported, skipped, dryRun: false };
    }

    function initialize() {
      const backup = backupLegacyData();
      const schema = raw(V2_KEYS.schemaVersion);
      if (schema.ok && !schema.present) {
        try {
          setJson(V2_KEYS.schemaVersion, { version: SCHEMA_VERSION, initializedAt: now() });
          appendJournal('schema-initialized', { version: SCHEMA_VERSION });
        } catch {}
      }
      const fullHistory = bootstrapFullCheckInHistory();
      return { backup, fullHistory, schemaVersion: SCHEMA_VERSION };
    }

    return Object.freeze({
      LEGACY_KEYS,
      V2_KEYS,
      SCHEMA_VERSION,
      readers,
      raw,
      parse,
      backupLegacyData,
      appendJournal,
      appendCheckIn,
      exportData,
      importData,
      initialize
    });
  }

  const api = { createStorageLayer, LEGACY_KEYS, V2_KEYS, SCHEMA_VERSION, EXPORT_FORMAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.GrizzlyJohnStorageV2 = createStorageLayer(window.localStorage);
    window.GrizzlyJohnStorageV2.initialize();
  }
})();
