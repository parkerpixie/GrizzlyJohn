import { createHash, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

// GrizzlyJohn V5: opaque, client-side AES-GCM encrypted backups.
// Possession of the 256-bit derived access token permits upload and retrieval.
// The server NEVER receives John's encryption key or his plaintext records.
// No endpoint can delete or overwrite a stored snapshot.
const LIMIT_BYTES = 1024 * 1024;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

export default async function handler(request, context) {
  if (request.method !== 'GET' && request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!TOKEN_PATTERN.test(token)) return respond({ error: 'Unauthorized.' }, 401);

  // Derive a non-enumerable storage namespace from the bearer token.
  const id = createHash('sha256').update('grizzlyjohn:v5:backup:' + token).digest('hex');
  const deployContext = context?.deploy?.context;
  const storeName = deployContext === 'production' ? 'grizzlyjohn-backup-production' : 'grizzlyjohn-backup-preview';
  // A site-wide store survives new deploys. Never share the preview store with production.
  const store = getStore({ name: storeName, consistency: 'strong', region: 'us-east-2' });
  const prefix = id + '/snapshots/';

  try {
    if (request.method === 'POST') {
      if (Number(request.headers.get('content-length') || '0') > LIMIT_BYTES) return respond({ error: 'Backup is too large.' }, 413);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > LIMIT_BYTES) return respond({ error: 'Backup is too large.' }, 413);
      let payload;
      try { payload = JSON.parse(raw); } catch { return respond({ error: 'Invalid backup envelope.' }, 400); }
      if (payload?.version !== 1 || !/^[A-Za-z0-9_-]{16}$/.test(payload.iv || '') ||
          typeof payload.ciphertext !== 'string' || !/^[A-Za-z0-9_-]{20,}$/.test(payload.ciphertext)) {
        return respond({ error: 'Invalid encrypted backup.' }, 400);
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = prefix + stamp + '-' + randomUUID();
      const result = await store.set(key, raw, { onlyIfNew: true });
      if (!result.modified) return respond({ error: 'Backup write was not accepted.' }, 503);
      const readBack = await store.get(key, { consistency: 'strong' });
      if (readBack !== raw) return respond({ error: 'Backup verification failed.' }, 503);
      return respond({ ok: true, verified: true, storedAt: stamp, snapshotId: key.slice(prefix.length) }, 201);
    }

    const listing = await store.list({ prefix });
    const snapshots = (listing.blobs || []).map(item => item.key).filter(key => key.startsWith(prefix)).sort().reverse();
    if (!snapshots.length) return respond({ error: 'No backup found.' }, 404);
    const latestKey = snapshots[0];
    const raw = await store.get(latestKey, { consistency: 'strong' });
    if (typeof raw !== 'string') return respond({ error: 'Stored backup unavailable.' }, 503);
    return respond({ ok: true, envelope: JSON.parse(raw), snapshotId: latestKey.slice(prefix.length), count: snapshots.length });
  } catch (error) {
    // Do not log request bodies, tokens, encrypted payloads, or personal data.
    console.error('GrizzlyJohn backup service error:', error?.name || 'unknown');
    return respond({ error: 'Backup service is temporarily unavailable.' }, 503);
  }
}

export const config = {
  path: '/.netlify/functions/grizzly-backup',
  method: ['GET', 'POST'],
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 30 }
};
