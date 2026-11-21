import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

// Grizzly Footprints: explicit opt-in, aggregate usage only.
// No identifiers, entries, notes, IP addresses, location or health values are stored.
const allowedTypes = new Set(['open', 'session', 'view', 'action']);
const allowedFeatures = new Set([
  'app', 'today', 'wisdom', 'quest', 'roam', 'campfire',
  'sleep', 'gold-stars', 'gratitude', 'toolbox', 'health',
  'oracle', 'feelings', 'weather'
]);
const baseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: baseHeaders });
function equalSecret(input, expected) {
  if (!input || !expected || input.length !== expected.length) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function authToken(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const at = Date.parse(value + 'T12:00:00Z');
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === value &&
    Math.abs(Date.now() - at) < 60 * 60 * 1000 * 72;
}
function storage(context) {
  const production = context?.deploy?.context === 'production' || process.env.CONTEXT === 'production';
  return getStore({ name: production ? 'grizzly-footprints-production' : 'grizzly-footprints-preview',
    consistency: 'strong', region: 'us-east-2' });
}
export default async function handler(request, context) {
  const token = authToken(request);
  if (request.method === 'POST') {
    if (!equalSecret(token, process.env.GRIZZLY_USAGE_COLLECT_TOKEN)) return reply({ error: 'Not authorized.' }, 401);
    if (Number(request.headers.get('content-length') || 0) > 1024) return reply({ error: 'Too large.' }, 413);
    let input;
    try {
      const raw = await request.text();
      if (raw.length > 1024) return reply({ error: 'Too large.' }, 413);
      input = JSON.parse(raw);
    } catch { return reply({ error: 'Invalid event.' }, 400); }
    const { type, feature, date, hour } = input || {};
    if (!allowedTypes.has(type) || !allowedFeatures.has(feature) ||
        !isValidDate(date) || !Number.isInteger(hour) || hour < 0 || hour > 23 ||
        ((type === 'open' || type === 'session') && feature !== 'app') ||
        ((type === 'view' || type === 'action') && feature === 'app')) {
      return reply({ error: 'Invalid event.' }, 400);
    }
    try {
      // One immutable blob per anonymous event avoids counter write races.
      // The key contains only date, hour, broad feature and event type.
      const key = 'events/' + date + '/' + String(hour).padStart(2, '0') +
        '/' + type + '/' + feature + '/' + randomUUID();
      const saved = await storage(context).set(key, '1', { onlyIfNew: true });
      return saved.modified ? reply({ ok: true }, 201) : reply({ error: 'Write failed.' }, 503);
    } catch (error) {
      console.error('Grizzly usage write error:', error?.name || 'unknown');
      return reply({ error: 'Usage service temporarily unavailable.' }, 503);
    }
  }
  if (request.method === 'GET') {
    if (!equalSecret(token, process.env.GRIZZLY_USAGE_VIEW_TOKEN)) return reply({ error: 'Not authorized.' }, 401);
    const url = new URL(request.url);
    const days = Number(url.searchParams.get('days') || '30');
    if (![7, 30, 90].includes(days)) return reply({ error: 'Invalid range.' }, 400);
    try {
      const first = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
      const byDay = {};
      const byHour = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i).padStart(2, '0'), 0]));
      const features = {};
      const totals = { opens: 0, sessions: 0, views: 0, actions: 0 };
      const listing = await storage(context).list({ prefix: 'events/' });
      if (listing.blobs.length > 50000) return reply({ error: 'Too many events to summarize.' }, 503);
      for (const { key } of listing.blobs) {
        const parts = key.split('/');
        if (parts.length !== 6) continue;
        const [, date, hour, type, feature] = parts;
        if (date < first || !allowedTypes.has(type) || !allowedFeatures.has(feature)) continue;
        const row = byDay[date] || (byDay[date] = { date, opens: 0, sessions: 0, views: 0, actions: 0 });
        const counter = type === 'open' ? 'opens' : type === 'session' ? 'sessions' : type === 'view' ? 'views' : 'actions';
        row[counter] += 1;
        totals[counter] += 1;
        if (type === 'open') byHour[hour] = (byHour[hour] || 0) + 1;
        if (type === 'view' || type === 'action') {
          if (!features[feature]) features[feature] = { views: 0, actions: 0 };
          features[feature][type === 'view' ? 'views' : 'actions'] += 1;
        }
      }
      return reply({
        ok: true, days, totals,
        activeDays: Object.values(byDay).filter(day => day.opens > 0).length,
        daily: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
        hours: byHour,
        features
      });
    } catch (error) {
      console.error('Grizzly usage dashboard error:', error?.name || 'unknown');
      return reply({ error: 'Usage dashboard temporarily unavailable.' }, 503);
    }
  }
  return reply({ error: 'Method not allowed.' }, 405);
}
export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 120 }
};
