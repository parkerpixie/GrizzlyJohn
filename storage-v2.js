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
    checkInsFullHistory: 'grizzlyjohn:v2:checkInsFullHistory',
    gratitudeEntries: 'grizzlyjohn:v2:gratitudeEntries',
    goldStarDefinitions: 'grizzlyjohn:v2:goldStarDefinitions',
    goldStarDays: 'grizzlyjohn:v2:goldStarDays',
    dailyBadgeAwards: 'grizzlyjohn:v2:dailyBadgeAwards',
    feelingCheckIns: 'grizzlyjohn:v2:feelingCheckIns',
    reflectionCardPulls: 'grizzlyjohn:v2:reflectionCardPulls',
    campfireItems: 'grizzlyjohn:v2:campfireItems',
    sideQuestEvents: 'grizzlyjohn:v2:sideQuestEvents',
    guidedSkillSessions: 'grizzlyjohn:v2:guidedSkillSessions',
    settings: 'grizzlyjohn:v2:settings'
  });

  const SCHEMA_VERSION = 2;
  const EXPORT_FORMAT = 'grizzlyjohn-localstorage-export-v1';
  const BACKUP_FORMAT = 'grizzlyjohn-portable-backup-v1';

  function localDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('A valid date is required.');
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function createStorageLayer(storage, options = {}) {
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
      fullCheckInHistory: () => validateJson(V2_KEYS.checkInsFullHistory, Array.isArray, value => inspectRecords(value, ['id', 'date', 'feeling', 'group'])),
      gratitudeEntries: () => validateJson(V2_KEYS.gratitudeEntries, Array.isArray, value => inspectRecords(value, ['id', 'date', 'timestamp', 'text'])),
      goldStarDefinitions: () => validateJson(V2_KEYS.goldStarDefinitions, Array.isArray, value => inspectRecords(value, ['id', 'label', 'active', 'createdAt', 'order'])),
      goldStarDays: () => validateJson(V2_KEYS.goldStarDays, Array.isArray, value => inspectRecords(value, ['date', 'activeStarIds', 'completedStarIds', 'updatedAt'])),
      dailyBadgeAwards: () => validateJson(V2_KEYS.dailyBadgeAwards, Array.isArray, value => inspectRecords(value, ['id', 'date', 'awardedAt', 'completedCount', 'activeCount'])),
      feelingCheckIns: () => validateJson(V2_KEYS.feelingCheckIns, Array.isArray, value => inspectRecords(value, ['id', 'date', 'timestamp', 'feelings'])),
      reflectionCardPulls: () => validateJson(V2_KEYS.reflectionCardPulls, Array.isArray, value => inspectRecords(value, ['date', 'cardId', 'pulledAt'])),
      campfireItems: () => validateJson(V2_KEYS.campfireItems, Array.isArray, value => inspectRecords(value, ['id', 'kind', 'title'])),
      sideQuestEvents: () => validateJson(V2_KEYS.sideQuestEvents, Array.isArray, value => inspectRecords(value, ['id', 'date', 'timestamp', 'questId', 'title', 'resultingCount'])),
      guidedSkillSessions: () => validateJson(V2_KEYS.guidedSkillSessions, Array.isArray, value => inspectRecords(value, ['id', 'date', 'timestamp', 'feeling', 'skill', 'responses'])),
      settings: () => validateJson(V2_KEYS.settings, value => Boolean(value) && typeof value === 'object' && !Array.isArray(value), value => {
        if ('homeLocation' in value && typeof value.homeLocation !== 'string') return ['homeLocation must be a string.'];
        return [];
      })
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

    function mutableArray(key) {
      const result = parse(key);
      if (result.status === 'missing') return { ok: true, value: [] };
      if (result.status === 'parsed' && Array.isArray(result.value)) return { ok: true, value: result.value };
      return { ok: false, reason: `${key} is ${result.status}; it was preserved without modification.`, result };
    }

    function writeArray(key, value) {
      try {
        setJson(key, value);
        return { ok: true, value };
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
    }

    function cleanText(value) {
      return typeof value === 'string' ? value.trim() : '';
    }

    const settings = Object.freeze({
      get() {
        const result = readers.settings();
        if (result.status === 'missing') return { ok: true, status: 'missing', value: { homeLocation: '' } };
        if (result.status !== 'valid') {
          return { ok: false, status: result.status, value: { homeLocation: '' }, reason: 'Saved settings could not be read and were preserved unchanged.' };
        }
        return { ok: true, status: 'valid', value: { ...result.value, homeLocation: cleanText(result.value.homeLocation) } };
      },
      saveHomeLocation(homeLocation) {
        const current = readers.settings();
        if (!['missing', 'valid'].includes(current.status)) {
          return { ok: false, reason: 'Saved settings are malformed or unexpected and were preserved unchanged.' };
        }
        const next = current.status === 'valid' ? { ...current.value } : {};
        next.homeLocation = cleanText(homeLocation).slice(0, 180);
        try {
          setJson(V2_KEYS.settings, next);
          return { ok: true, value: next };
        } catch (error) {
          return { ok: false, reason: String(error?.message || error) };
        }
      }
    });

    const gratitude = Object.freeze({
      all() {
        const entries = mutableArray(V2_KEYS.gratitudeEntries);
        return entries.ok ? { ok: true, entries: [...entries.value] } : entries;
      },
      forDate(date) {
        const day = typeof date === 'string' ? date : localDateKey(date);
        const entries = mutableArray(V2_KEYS.gratitudeEntries);
        return entries.ok ? { ok: true, date: day, entries: entries.value.filter(entry => entry?.date === day) } : entries;
      },
      add(text, options = {}) {
        const normalized = cleanText(text);
        if (!normalized) return { ok: false, reason: 'Gratitude text is required.' };
        const entries = mutableArray(V2_KEYS.gratitudeEntries);
        if (!entries.ok) return entries;
        const timestamp = options.timestamp || now();
        const entry = {
          id: options.id || makeId(),
          date: options.date || localDateKey(timestamp),
          timestamp,
          text: normalized
        };
        const written = writeArray(V2_KEYS.gratitudeEntries, [entry, ...entries.value]);
        return written.ok ? { ok: true, entry } : written;
      },
      remove(id) {
        const entries = mutableArray(V2_KEYS.gratitudeEntries);
        if (!entries.ok) return entries;
        const index = entries.value.findIndex(entry => entry?.id === id);
        if (index < 0) return { ok: false, reason: 'Gratitude entry was not found.' };
        const next = [...entries.value];
        const [removed] = next.splice(index, 1);
        const written = writeArray(V2_KEYS.gratitudeEntries, next);
        return written.ok ? { ok: true, removed } : written;
      }
    });

    const sideQuestEvents = Object.freeze({
      all() {
        const events = mutableArray(V2_KEYS.sideQuestEvents);
        return events.ok ? { ok: true, events: [...events.value] } : events;
      },
      forDate(date) {
        const day = typeof date === 'string' ? date : localDateKey(date);
        const events = mutableArray(V2_KEYS.sideQuestEvents);
        return events.ok ? { ok: true, date: day, events: events.value.filter(event => event?.date === day) } : events;
      },
      add(quest, options = {}) {
        const title = cleanText(quest?.title);
        if (!title) return { ok: false, reason: 'A Side Quest title is required.' };
        const resultingCount = Number(options.resultingCount);
        if (!Number.isFinite(resultingCount) || resultingCount < 1) return { ok: false, reason: 'A resulting Side Quest count is required.' };
        const events = mutableArray(V2_KEYS.sideQuestEvents);
        if (!events.ok) return events;
        const id = cleanText(options.id) || makeId();
        const existing = events.value.find(event => event?.id === id);
        if (existing) return { ok: true, added: false, duplicate: true, event: existing };
        const timestamp = options.timestamp || now();
        const event = {
          id,
          date: options.date || localDateKey(timestamp),
          timestamp,
          questId: cleanText(quest.id) || title,
          title,
          resultingCount
        };
        const written = writeArray(V2_KEYS.sideQuestEvents, [event, ...events.value]);
        return written.ok ? { ok: true, added: true, duplicate: false, event } : written;
      }
    });

    const guidedSkillSessions = Object.freeze({
      all() {
        const sessions = mutableArray(V2_KEYS.guidedSkillSessions);
        return sessions.ok ? { ok: true, sessions: [...sessions.value] } : sessions;
      },
      add(session, options = {}) {
        const feeling = cleanText(session?.feeling);
        const skill = cleanText(session?.skill);
        const responses = Array.isArray(session?.responses)
          ? session.responses.map(response => ({ prompt: cleanText(response?.prompt), response: cleanText(response?.response) })).filter(response => response.prompt)
          : [];
        if (!feeling || !skill || !responses.length) return { ok: false, reason: 'A feeling, skill, and guided responses are required.' };
        const sessions = mutableArray(V2_KEYS.guidedSkillSessions);
        if (!sessions.ok) return sessions;
        const timestamp = options.timestamp || now();
        const record = { id: options.id || makeId(), date: options.date || localDateKey(timestamp), timestamp, feeling, skill, responses };
        const written = writeArray(V2_KEYS.guidedSkillSessions, [record, ...sessions.value]);
        return written.ok ? { ok: true, session: record } : written;
      },
      associate(ids, checkInId) {
        const wanted = new Set(Array.isArray(ids) ? ids : [ids]);
        const normalizedCheckInId = cleanText(checkInId);
        if (!wanted.size || !normalizedCheckInId) return { ok: false, reason: 'Session IDs and a check-in ID are required.' };
        const sessions = mutableArray(V2_KEYS.guidedSkillSessions);
        if (!sessions.ok) return sessions;
        const next = sessions.value.map(session => wanted.has(session?.id) ? { ...session, checkInId: normalizedCheckInId } : session);
        const written = writeArray(V2_KEYS.guidedSkillSessions, next);
        return written.ok ? { ok: true, associated: next.filter(session => wanted.has(session?.id)).length } : written;
      }
    });

    function orderedDefinitions(definitions) {
      return [...definitions].sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
    }

    const goldStars = Object.freeze({
      list(options = {}) {
        const definitions = mutableArray(V2_KEYS.goldStarDefinitions);
        if (!definitions.ok) return definitions;
        const includeInactive = options.includeInactive === true;
        return { ok: true, definitions: orderedDefinitions(definitions.value).filter(item => includeInactive || item?.active === true) };
      },
      add(label, options = {}) {
        const normalized = cleanText(label);
        if (!normalized) return { ok: false, reason: 'Gold Star label is required.' };
        const definitions = mutableArray(V2_KEYS.goldStarDefinitions);
        if (!definitions.ok) return definitions;
        const maxOrder = definitions.value.reduce((maximum, item) => Math.max(maximum, Number(item?.order ?? -1)), -1);
        const definition = {
          id: options.id || makeId(),
          label: normalized,
          active: options.active !== false,
          createdAt: options.createdAt || now(),
          order: Number.isFinite(options.order) ? options.order : maxOrder + 1
        };
        const written = writeArray(V2_KEYS.goldStarDefinitions, [...definitions.value, definition]);
        return written.ok ? { ok: true, definition } : written;
      },
      ensureActive(label) {
        const normalized = cleanText(label);
        if (!normalized) return { ok: false, reason: 'Gold Star label is required.' };
        const definitions = mutableArray(V2_KEYS.goldStarDefinitions);
        if (!definitions.ok) return definitions;
        const comparable = normalized.toLocaleLowerCase();
        const existing = definitions.value.find(item => cleanText(item?.label).toLocaleLowerCase() === comparable);
        if (!existing) return goldStars.add(normalized);
        if (existing.active === true) return { ok: true, definition: existing, created: false, reactivated: false };
        const next = definitions.value.map(item => item?.id === existing.id ? { ...item, active: true } : item);
        const written = writeArray(V2_KEYS.goldStarDefinitions, next);
        return written.ok ? { ok: true, definition: next.find(item => item?.id === existing.id), created: false, reactivated: true } : written;
      },
      archiveExactLabel(label) {
        const definitions = mutableArray(V2_KEYS.goldStarDefinitions);
        if (!definitions.ok) return definitions;
        const targets = definitions.value.filter(item => item?.label === label && item?.active === true);
        if (!targets.length) return { ok: true, changed: false, definitions: orderedDefinitions(definitions.value) };
        const ids = new Set(targets.map(item => item.id));
        const next = definitions.value.map(item => ids.has(item?.id) ? { ...item, active: false } : item);
        const written = writeArray(V2_KEYS.goldStarDefinitions, next);
        return written.ok ? { ok: true, changed: true, definitions: orderedDefinitions(next) } : written;
      },
      rename(id, label) {
        const normalized = cleanText(label);
        if (!normalized) return { ok: false, reason: 'Gold Star label is required.' };
        const definitions = mutableArray(V2_KEYS.goldStarDefinitions);
        if (!definitions.ok) return definitions;
        const target = definitions.value.find(item => item?.id === id);
        if (!target) return { ok: false, reason: 'Gold Star was not found.' };
        const next = definitions.value.map(item => item?.id === id ? { ...item, label: normalized } : item);
        const written = writeArray(V2_KEYS.goldStarDefinitions, next);
        return written.ok ? { ok: true, definition: next.find(item => item?.id === id) } : written;
      },
      setActive(id, active) {
        const definitions = mutableArray(V2_KEYS.goldStarDefinitions);
        if (!definitions.ok) return definitions;
        const target = definitions.value.find(item => item?.id === id);
        if (!target) return { ok: false, reason: 'Gold Star was not found.' };
        const next = definitions.value.map(item => item?.id === id ? { ...item, active: Boolean(active) } : item);
        const written = writeArray(V2_KEYS.goldStarDefinitions, next);
        return written.ok ? { ok: true, definition: next.find(item => item?.id === id) } : written;
      },
      reorder(orderedIds) {
        if (!Array.isArray(orderedIds)) return { ok: false, reason: 'An ordered ID array is required.' };
        const definitions = mutableArray(V2_KEYS.goldStarDefinitions);
        if (!definitions.ok) return definitions;
        const known = new Set(definitions.value.map(item => item?.id));
        if (new Set(orderedIds).size !== orderedIds.length || orderedIds.some(id => !known.has(id))) {
          return { ok: false, reason: 'Order contains duplicate or unknown Gold Star IDs.' };
        }
        const remaining = orderedDefinitions(definitions.value).map(item => item.id).filter(id => !orderedIds.includes(id));
        const completeOrder = [...orderedIds, ...remaining];
        const positions = new Map(completeOrder.map((id, index) => [id, index]));
        const next = definitions.value.map(item => ({ ...item, order: positions.get(item.id) }));
        const written = writeArray(V2_KEYS.goldStarDefinitions, next);
        return written.ok ? { ok: true, definitions: orderedDefinitions(next) } : written;
      }
    });

    function currentActiveStarIds() {
      const definitions = goldStars.list();
      return definitions.ok ? { ok: true, ids: definitions.definitions.map(item => item.id) } : definitions;
    }

    function getGoldStarDay(date, options = {}) {
      const day = typeof date === 'string' ? date : localDateKey(date);
      const days = mutableArray(V2_KEYS.goldStarDays);
      if (!days.ok) return days;
      let record = days.value.find(item => item?.date === day);
      if (!record) {
        const active = currentActiveStarIds();
        if (!active.ok) return active;
        record = { date: day, activeStarIds: active.ids, completedStarIds: [], updatedAt: now() };
        const written = writeArray(V2_KEYS.goldStarDays, [record, ...days.value]);
        if (!written.ok) return written;
      } else if (options.syncActiveDefinitions === true) {
        const active = currentActiveStarIds();
        if (!active.ok) return active;
        record = { ...record, activeStarIds: active.ids, completedStarIds: Array.isArray(record.completedStarIds) ? record.completedStarIds : [], updatedAt: now() };
        const next = days.value.map(item => item?.date === day ? record : item);
        const written = writeArray(V2_KEYS.goldStarDays, next);
        if (!written.ok) return written;
      }
      return { ok: true, day: record };
    }

    function awardDailyBadge(date) {
      const dayResult = getGoldStarDay(date);
      if (!dayResult.ok) return dayResult;
      const day = dayResult.day;
      const activeIds = Array.isArray(day.activeStarIds) ? day.activeStarIds : [];
      const completedIds = new Set(Array.isArray(day.completedStarIds) ? day.completedStarIds : []);
      const completedCount = activeIds.filter(id => completedIds.has(id)).length;
      const earned = activeIds.length > 0 && completedCount > activeIds.length / 2;
      const awards = mutableArray(V2_KEYS.dailyBadgeAwards);
      if (!awards.ok) return awards;
      const existing = awards.value.find(item => item?.date === day.date);
      if (existing) return { ok: true, earned: true, awarded: false, award: existing, completedCount, activeCount: activeIds.length };
      if (!earned) return { ok: true, earned: false, awarded: false, completedCount, activeCount: activeIds.length };
      const award = { id: makeId(), date: day.date, awardedAt: now(), completedCount, activeCount: activeIds.length };
      const written = writeArray(V2_KEYS.dailyBadgeAwards, [award, ...awards.value]);
      return written.ok ? { ok: true, earned: true, awarded: true, award, completedCount, activeCount: activeIds.length } : written;
    }

    const goldStarDays = Object.freeze({
      get: getGoldStarDay,
      toggle(date, goldStarId, completed) {
        const dayResult = getGoldStarDay(date);
        if (!dayResult.ok) return dayResult;
        const days = mutableArray(V2_KEYS.goldStarDays);
        if (!days.ok) return days;
        const completedIds = new Set(Array.isArray(dayResult.day.completedStarIds) ? dayResult.day.completedStarIds : []);
        const shouldComplete = typeof completed === 'boolean' ? completed : !completedIds.has(goldStarId);
        if (shouldComplete) completedIds.add(goldStarId);
        else completedIds.delete(goldStarId);
        const updated = { ...dayResult.day, completedStarIds: [...completedIds], updatedAt: now() };
        const next = days.value.map(item => item?.date === updated.date ? updated : item);
        const written = writeArray(V2_KEYS.goldStarDays, next);
        if (!written.ok) return written;
        const badge = awardDailyBadge(updated.date);
        return { ok: true, completed: shouldComplete, day: updated, badge };
      },
      evaluateBadge: awardDailyBadge,
      awards() {
        const awards = mutableArray(V2_KEYS.dailyBadgeAwards);
        return awards.ok ? { ok: true, awards: [...awards.value] } : awards;
      }
    });

    function normalizeFeeling(value) {
      if (typeof value === 'string') return { word: value };
      if (!value || typeof value !== 'object' || Array.isArray(value) || !cleanText(value.word)) return null;
      return {
        word: cleanText(value.word),
        group: cleanText(value.group),
        groupId: cleanText(value.groupId),
        icon: cleanText(value.icon)
      };
    }

    function bootstrapFeelingCheckIns() {
      const existing = raw(V2_KEYS.feelingCheckIns);
      if (!existing.ok) return { ok: false, created: false, reason: existing.error };
      if (existing.present) return { ok: true, created: false };
      const source = parse(V2_KEYS.checkInsFullHistory);
      const legacy = source.status === 'parsed' && Array.isArray(source.value) ? source.value : [];
      const migrated = legacy.flatMap(entry => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const rawFeelings = Array.isArray(entry.feelings) ? entry.feelings : entry.feeling ? [{ word: entry.feeling, group: entry.group, icon: entry.icon }] : [];
        const feelings = rawFeelings.map(normalizeFeeling).filter(Boolean);
        if (!feelings.length) return [];
        const timestamp = entry.timestamp || entry.date || now();
        let date = entry.localDate;
        if (!date) {
          try { date = /^\d{4}-\d{2}-\d{2}$/.test(entry.date || '') ? entry.date : localDateKey(timestamp); }
          catch { date = localDateKey(); }
        }
        return [{ id: entry.id || makeId(), date, timestamp, feelings, legacySource: true }];
      });
      try {
        setJson(V2_KEYS.feelingCheckIns, migrated);
        appendJournal('feeling-check-ins-created', { migratedCount: migrated.length, sourceStatus: source.status, skippedCount: legacy.length - migrated.length });
        return { ok: true, created: true, migratedCount: migrated.length };
      } catch (error) {
        return { ok: false, created: false, reason: String(error?.message || error) };
      }
    }

    const feelingCheckIns = Object.freeze({
      all() {
        const entries = mutableArray(V2_KEYS.feelingCheckIns);
        return entries.ok ? { ok: true, entries: [...entries.value] } : entries;
      },
      forDate(date) {
        const day = typeof date === 'string' ? date : localDateKey(date);
        const entries = mutableArray(V2_KEYS.feelingCheckIns);
        return entries.ok ? { ok: true, date: day, entries: entries.value.filter(entry => entry?.date === day) } : entries;
      },
      add(feelings, options = {}) {
        const selected = (Array.isArray(feelings) ? feelings : [feelings]).map(normalizeFeeling).filter(Boolean);
        const unique = selected.filter((feeling, index) => selected.findIndex(item => item.word.toLowerCase() === feeling.word.toLowerCase()) === index);
        if (!unique.length) return { ok: false, reason: 'Choose at least one feeling.' };
        const entries = mutableArray(V2_KEYS.feelingCheckIns);
        if (!entries.ok) return entries;
        const timestamp = options.timestamp || now();
        const entry = { id: options.id || makeId(), date: options.date || localDateKey(timestamp), timestamp, feelings: unique };
        const written = writeArray(V2_KEYS.feelingCheckIns, [entry, ...entries.value]);
        if (!written.ok) return written;
        appendCheckIn({
          id: entry.id,
          date: entry.timestamp,
          localDate: entry.date,
          feeling: unique[0].word,
          group: unique[0].group,
          icon: unique[0].icon,
          feelings: unique
        });
        return { ok: true, entry };
      }
    });

    const reflectionCards = Object.freeze({
      all() {
        const pulls = mutableArray(V2_KEYS.reflectionCardPulls);
        return pulls.ok ? { ok: true, pulls: [...pulls.value] } : pulls;
      },
      forDate(date) {
        const day = typeof date === 'string' ? date : localDateKey(date);
        const pulls = mutableArray(V2_KEYS.reflectionCardPulls);
        if (!pulls.ok) return pulls;
        return { ok: true, date: day, pull: pulls.value.find(item => item?.date === day) || null };
      },
      pull(card, options = {}) {
        if (!card || typeof card !== 'object' || !cleanText(card.id || card.cardId)) return { ok: false, reason: 'A reflection card ID is required.' };
        const date = options.date || localDateKey(options.timestamp || now());
        const pulls = mutableArray(V2_KEYS.reflectionCardPulls);
        if (!pulls.ok) return pulls;
        const existing = pulls.value.find(item => item?.date === date);
        if (existing) return { ok: true, created: false, pull: existing };
        const pull = {
          date,
          cardId: cleanText(card.id || card.cardId),
          title: cleanText(card.title),
          file: cleanText(card.file),
          pulledAt: options.timestamp || now()
        };
        const written = writeArray(V2_KEYS.reflectionCardPulls, [pull, ...pulls.value]);
        return written.ok ? { ok: true, created: true, pull } : written;
      }
    });

    function bootstrapCampfireItems() {
      const existing = raw(V2_KEYS.campfireItems);
      if (!existing.ok) return { ok: false, created: false, reason: existing.error };
      if (existing.present) return { ok: true, created: false };
      const library = parse(LEGACY_KEYS.campfireLibrary);
      const shelf = parse(LEGACY_KEYS.listenShelf);
      let sourceKey = LEGACY_KEYS.campfireLibrary;
      let sourceStatus = library.status === 'parsed' && !Array.isArray(library.value) ? 'unexpected' : library.status;
      let migrated = [];
      if (library.status === 'parsed' && Array.isArray(library.value)) migrated = library.value;
      else if (library.status === 'missing' && shelf.status === 'parsed' && Array.isArray(shelf.value)) {
        sourceKey = LEGACY_KEYS.listenShelf;
        sourceStatus = shelf.status === 'parsed' && !Array.isArray(shelf.value) ? 'unexpected' : shelf.status;
        migrated = shelf.value;
      } else if (library.status === 'missing' && shelf.status === 'parsed' && !Array.isArray(shelf.value)) {
        sourceKey = LEGACY_KEYS.listenShelf;
        sourceStatus = 'unexpected';
      }
      try {
        setJson(V2_KEYS.campfireItems, migrated);
        appendJournal(sourceStatus === 'parsed' ? 'campfire-items-created' : 'campfire-items-recovery-started', {
          sourceKey,
          sourceStatus,
          migratedCount: migrated.length
        });
        return { ok: true, created: true, sourceKey, sourceStatus, migratedCount: migrated.length };
      } catch (error) {
        return { ok: false, created: false, reason: String(error?.message || error) };
      }
    }

    function validHttpUrl(value) {
      try { return /^https?:$/.test(new URL(value).protocol); }
      catch { return false; }
    }

    const campfire = Object.freeze({
      all() {
        const entries = mutableArray(V2_KEYS.campfireItems);
        return entries.ok ? { ok: true, items: [...entries.value] } : entries;
      },
      add(item, options = {}) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, reason: 'A Campfire item is required.' };
        const title = cleanText(item.title);
        const kind = item.kind === 'reflection' ? 'reflection' : item.kind === 'stream' ? 'stream' : '';
        if (!title || !kind) return { ok: false, reason: 'Add a title and choose a valid item type.' };
        if (kind === 'stream' && !validHttpUrl(item.url)) return { ok: false, reason: 'A complete http or https URL is required.' };
        if (kind === 'reflection' && !cleanText(item.body)) return { ok: false, reason: 'Reflection text is required.' };
        if (item.sourceUrl && !validHttpUrl(item.sourceUrl)) return { ok: false, reason: 'The optional source URL must be a complete http or https URL.' };
        const entries = mutableArray(V2_KEYS.campfireItems);
        if (!entries.ok) return entries;
        const entry = {
          id: options.id || item.id || makeId(),
          kind,
          title,
          category: cleanText(item.category) || "John's Picks",
          addedAt: options.addedAt || item.addedAt || now()
        };
        ['url', 'body', 'source', 'sourceUrl', 'image', 'description'].forEach(field => {
          if (cleanText(item[field])) entry[field] = cleanText(item[field]);
        });
        const written = writeArray(V2_KEYS.campfireItems, [entry, ...entries.value]);
        return written.ok ? { ok: true, item: entry } : written;
      },
      remove(id) {
        const entries = mutableArray(V2_KEYS.campfireItems);
        if (!entries.ok) return entries;
        const index = entries.value.findIndex(item => item?.id === id);
        if (index < 0) return { ok: false, reason: 'Campfire item was not found.' };
        const next = [...entries.value];
        const [removed] = next.splice(index, 1);
        const written = writeArray(V2_KEYS.campfireItems, next);
        return written.ok ? { ok: true, removed } : written;
      }
    });

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

    function createBackup() {
      const data = {};
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (typeof key === 'string' && key.startsWith('grizzlyjohn:')) data[key] = storage.getItem(key);
        }
      } catch (error) {
        return { ok: false, reason: String(error?.message || error) };
      }
      const createdAt = now();
      const backup = { app: 'GrizzlyJohn', backupVersion: 1, format: BACKUP_FORMAT, createdAt, data };
      let date;
      try { date = localDateKey(createdAt); } catch { date = localDateKey(); }
      return { ok: true, backup, json: JSON.stringify(backup, null, 2), filename: `grizzlyjohn-backup-${date}.json` };
    }

    function validateBackup(payload) {
      let backup;
      try {
        backup = typeof payload === 'string' ? JSON.parse(payload) : payload;
      } catch (error) {
        return { ok: false, errors: [`That file is not valid JSON: ${String(error?.message || error)}`] };
      }
      const errors = [];
      if (!backup || typeof backup !== 'object' || Array.isArray(backup)) errors.push('That file is not a GrizzlyJohn backup.');
      if (backup?.app !== 'GrizzlyJohn' || backup?.format !== BACKUP_FORMAT) errors.push('That file is not a supported GrizzlyJohn backup.');
      if (backup?.backupVersion !== 1) errors.push('That GrizzlyJohn backup version is not supported.');
      if (!backup?.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) errors.push('The backup does not contain a valid data section.');
      const data = backup?.data && typeof backup.data === 'object' && !Array.isArray(backup.data) ? backup.data : {};
      Object.entries(data).forEach(([key, value]) => {
        if (!key.startsWith('grizzlyjohn:')) errors.push(`The backup contains an unrelated key: ${key}.`);
        if (typeof value !== 'string') errors.push(`The backup value for ${key} is not an exact stored string.`);
      });
      return errors.length ? { ok: false, errors } : { ok: true, backup, entries: Object.entries(data).map(([key, raw]) => ({ key, raw })) };
    }

    function restoreBackup(payload, options = {}) {
      const validated = validateBackup(payload);
      if (!validated.ok) return { ...validated, imported: [], skipped: [] };
      const recoveryPayload = { format: EXPORT_FORMAT, exportedAt: validated.backup.createdAt || now(), entries: validated.entries };
      const restored = importData(recoveryPayload, { conflict: 'overwrite', dryRun: options.dryRun === true, journal: false });
      return { ...restored, backup: validated.backup };
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
      if (!dryRun && options.journal !== false) appendJournal('recovery-import', { imported: imported.length, skipped: skipped.length, conflict: overwrite ? 'overwrite' : 'skip' });
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
      const feelings = bootstrapFeelingCheckIns();
      const campfireItems = bootstrapCampfireItems();
      return { backup, fullHistory, feelings, campfireItems, schemaVersion: SCHEMA_VERSION };
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
      localDateKey,
      gratitude,
      sideQuestEvents,
      guidedSkillSessions,
      settings,
      goldStars,
      goldStarDays,
      feelingCheckIns,
      reflectionCards,
      campfire,
      exportData,
      importData,
      createBackup,
      validateBackup,
      restoreBackup,
      initialize
    });
  }

  const api = { createStorageLayer, LEGACY_KEYS, V2_KEYS, SCHEMA_VERSION, EXPORT_FORMAT, BACKUP_FORMAT, localDateKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.GrizzlyJohnStorageV2 = createStorageLayer(window.localStorage);
    window.GrizzlyJohnStorageV2.initialize();
  }
})();
