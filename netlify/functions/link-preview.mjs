const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 7000;

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '::1' || host.endsWith('.local') || host.endsWith('.internal')) return true;

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }
  return false;
}

function normalizeUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only web links are supported.');
  if (url.username || url.password) throw new Error('Links with embedded credentials are not supported.');
  if (isPrivateHost(url.hostname)) throw new Error('Private network links are not supported.');
  return url;
}

async function safeFetch(startUrl) {
  let current = normalizeUrl(startUrl);
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; GrizzlyJohnLinkPreview/1.0)',
          accept: 'text/html,application/xhtml+xml'
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || i === MAX_REDIRECTS) throw new Error('Too many redirects.');
      current = normalizeUrl(new URL(location, current).href);
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error('Unable to open link.');
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match?.[1]?.trim() || '';
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function metaMap(html) {
  const map = new Map();
  const tags = html.match(/<meta\s+[^>]*>/gi) || [];
  tags.forEach(tag => {
    const key = attr(tag, 'property') || attr(tag, 'name');
    const content = attr(tag, 'content');
    if (key && content && !map.has(key.toLowerCase())) map.set(key.toLowerCase(), decodeEntities(content));
  });
  return map;
}

function pageTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : '';
}

function classify(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const path = url.pathname.toLowerCase();
  if (host.includes('audible.')) return { siteName: 'Audible', kind: 'audiobook' };
  if (host.includes('spotify.')) return { siteName: 'Spotify', kind: path.includes('/episode/') ? 'episode' : 'podcast' };
  if (host === 'podcasts.apple.com') return { siteName: 'Apple Podcasts', kind: 'podcast' };
  if (host.includes('music.amazon.')) return { siteName: 'Amazon Music', kind: 'podcast' };
  if (host.includes('youtube.') || host === 'youtu.be') return { siteName: 'YouTube', kind: 'video' };
  return { siteName: host, kind: 'link' };
}

export default async (request) => {
  const requested = new URL(request.url).searchParams.get('url');
  if (!requested) return Response.json({ error: 'Missing url' }, { status: 400 });

  try {
    const { response, finalUrl } = await safeFetch(requested);
    const fallback = classify(finalUrl);
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok || !contentType.toLowerCase().includes('text/html')) {
      return Response.json({
        url: finalUrl.href,
        title: '',
        image: '',
        siteName: fallback.siteName,
        kind: fallback.kind
      }, { headers: { 'cache-control': 'public, max-age=300' } });
    }

    const html = (await response.text()).slice(0, 900000);
    const meta = metaMap(html);
    const title = meta.get('og:title') || meta.get('twitter:title') || pageTitle(html) || '';
    const rawImage = meta.get('og:image') || meta.get('twitter:image') || '';
    const siteName = meta.get('og:site_name') || fallback.siteName;
    let image = '';
    if (rawImage) {
      try { image = new URL(rawImage, finalUrl).href; } catch {}
    }

    return Response.json({
      url: finalUrl.href,
      title: title.slice(0, 220),
      image,
      siteName: siteName.slice(0, 80),
      kind: fallback.kind
    }, { headers: { 'cache-control': 'public, max-age=300' } });
  } catch (error) {
    return Response.json({ error: error?.message || 'Preview unavailable' }, { status: 422 });
  }
};

export const config = {
  path: '/api/link-preview'
};
