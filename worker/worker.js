const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

let cachedRemoteConfig = null;
let cachedRemoteConfigAt = 0;

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra
  };
}

function jsonResponse(data, status = 200, maxAgeSec = 180) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAgeSec}`
    })
  });
}

async function getSourceConfig(env) {
  const defaults = {
    sokujaBaseUrl: (env.DEFAULT_SOKUJA_BASE_URL || 'https://x6.sokuja.uk').replace(/\/+$/, ''),
    kaerunimeBaseUrl: (env.DEFAULT_KAERUNIME_BASE_URL || 'https://kaerunime.vercel.app').replace(/\/+$/, ''),
    kuronimeBaseUrl: (env.DEFAULT_KURONIME_BASE_URL || 'https://kuronime.sbs').replace(/\/+$/, '')
  };
  const cdnBase = (env.CDN_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!cdnBase) return defaults;

  const now = Date.now();
  if (cachedRemoteConfig && now - cachedRemoteConfigAt < 5 * 60 * 1000) {
    return cachedRemoteConfig;
  }

  try {
    const res = await fetch(`${cdnBase}/api/config.json`, {
      cf: { cacheTtl: 180, cacheEverything: true }
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.sources) {
        cachedRemoteConfig = {
          sokujaBaseUrl: (json.sources.sokujaBaseUrl || defaults.sokujaBaseUrl).replace(/\/+$/, ''),
          kaerunimeBaseUrl: (json.sources.kaerunimeBaseUrl || defaults.kaerunimeBaseUrl).replace(/\/+$/, ''),
          kuronimeBaseUrl: (json.sources.kuronimeBaseUrl || defaults.kuronimeBaseUrl).replace(/\/+$/, '')
        };
        cachedRemoteConfigAt = now;
        return cachedRemoteConfig;
      }
    }
  } catch {
    // keep defaults
  }
  return defaults;
}

function normalizeQualityLabel(rawLabel = '', rawUrl = '') {
  const combined = `${rawLabel} ${rawUrl}`.toLowerCase();
  if (combined.includes('1080')) return '1080p';
  if (combined.includes('720')) return '720p';
  if (combined.includes('480') || combined.includes('360')) return '480p';
  return null;
}

function normalizeMp4StreamUrl(rawUrl = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  return trimmed
    .replace('storages.sokuja.uk', 'storages.sokuja.id')
    .replace('ww.opqrstuvwxyz.uk', 'storages.sokuja.id')
    .replace('youtube.jantan.net', 'storages.sokuja.id')
    .replace(/^http:\/\//i, 'https://');
}

function qualityDescriptionFor(label) {
  if (label === '480p') return 'Kualitas rendah, hemat data dan tidak terlalu membutuhkan kecepatan internet yang cepat';
  if (label === '1080p') return 'Kualitas sempurna, membutuhkan internet yang cepat dan stabil.';
  return 'Kualitas sedang, lumayan menghemat penggunaan data';
}

function extractBalancedJsonObject(text, startIdx) {
  if (startIdx < 0 || startIdx >= text.length || text[startIdx] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

function parseKaerunimeWatchHtml(html, epSlug, episodeNumber, fallbackTitle) {
  const qualityMap = new Map();
  const episodes = [];
  let animeTitle = fallbackTitle || '';

  const prefix = 'self.__next_f.push([1,"';
  const suffix = '"])</script>';
  let idx = 0;
  while (idx < html.length) {
    const s = html.indexOf(prefix, idx);
    if (s < 0) break;
    const e = html.indexOf(suffix, s + prefix.length);
    if (e < 0) break;
    const raw = html.slice(s + prefix.length, e);
    idx = e + suffix.length;
    if (!raw.includes('mirrors') && !raw.includes('downloads')) continue;

    let unescaped = raw;
    try {
      unescaped = JSON.parse(`"${raw}"`);
    } catch {
      unescaped = raw.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }

    const start = unescaped.indexOf('{"data":{');
    if (start < 0) continue;
    const jsonText = extractBalancedJsonObject(unescaped, start);
    if (!jsonText) continue;

    try {
      const dataObj = JSON.parse(jsonText)?.data;
      if (!dataObj) continue;
      if (dataObj.animeTitle) animeTitle = String(dataObj.animeTitle);
      if (Array.isArray(dataObj.mirrors)) {
        for (const m of dataObj.mirrors) {
          const q = normalizeQualityLabel(m.quality || m.serverName || '', m.streamUrl || m.originalUrl || '');
          const url = normalizeMp4StreamUrl(m.streamUrl || m.originalUrl || '');
          if (q && url) qualityMap.set(q, { qualityLabel: q, description: qualityDescriptionFor(q), streamUrl: url });
        }
      }
      if (Array.isArray(dataObj.downloads)) {
        for (const d of dataObj.downloads) {
          const q = normalizeQualityLabel(d.quality || '', d.url || '');
          const url = normalizeMp4StreamUrl(d.url || '');
          if (q && url && !qualityMap.has(q)) {
            qualityMap.set(q, { qualityLabel: q, description: qualityDescriptionFor(q), streamUrl: url });
          }
        }
      }
      if (Array.isArray(dataObj.episodes)) {
        for (let i = 0; i < dataObj.episodes.length; i++) {
          const ep = dataObj.episodes[i];
          if (ep?.slug) {
            episodes.push({
              slug: String(ep.slug),
              title: String(ep.title || `Episode ${ep.number || i + 1}`),
              number: Number(ep.number || i + 1)
            });
          }
        }
      }
    } catch {
      // continue scanning
    }
  }

  const ordered = ['480p', '720p', '1080p'].map((k) => qualityMap.get(k)).filter(Boolean);
  return {
    episodeSlug: epSlug,
    animeTitle: animeTitle || fallbackTitle,
    episodeTitle: `Episode ${episodeNumber}`,
    episodeNumber,
    qualities: ordered,
    allEpisodes: episodes
  };
}

function parseDirectSokujaMirrors(html) {
  const qualityMap = new Map();
  const optRegex = /<option\s+value=["']([A-Za-z0-9+/=]+)["'][^>]*>([^<]*)<\/option>/gi;
  let m;
  while ((m = optRegex.exec(html)) !== null) {
    try {
      const decoded = atob(m[1]);
      const src = decoded.match(/src=["']([^"']+\.mp4[^"']*)["']/i)?.[1] || '';
      const q = normalizeQualityLabel(m[2] || '', src);
      const url = normalizeMp4StreamUrl(src);
      if (q && url) qualityMap.set(q, { qualityLabel: q, description: qualityDescriptionFor(q), streamUrl: url });
    } catch {
      // skip bad base64
    }
  }
  return ['480p', '720p', '1080p'].map((k) => qualityMap.get(k)).filter(Boolean);
}

function isKuronimeSlug(slug = '') {
  const clean = String(slug || '').trim().toLowerCase();
  if (!clean) return false;
  if (clean.endsWith('-subtitle-indonesia') || clean.endsWith('-subtilte-indonesia')) {
    return false;
  }
  return clean.startsWith('kuro-') || clean.startsWith('kuro-ep-') || clean.includes('kuronime.sbs');
}

async function handleStreams(url, sources) {
  const epSlug = (url.searchParams.get('epSlug') || '').trim().replace(/^\/+|\/+$/g, '');
  const animeSlug = (url.searchParams.get('animeSlug') || '').trim().replace(/^\/+|\/+$/g, '');
  const epNum = Number.parseInt(url.searchParams.get('episodeNumber') || '1', 10) || 1;
  if (!epSlug) return jsonResponse({ error: 'epSlug required' }, 400, 10);

  // If Kuronime episode, let app use its full native CryptoJS/Pixeldrain/MP4Upload pipeline on-device unless direct MP4 found
  if (isKuronimeSlug(epSlug) || isKuronimeSlug(animeSlug)) {
    return jsonResponse({
      episodeSlug: epSlug,
      episodeNumber: epNum,
      qualities: [],
      allEpisodes: [],
      fallbackRequired: true
    }, 200, 60);
  }

  // 1. Primary: Kaerunime SSR watch page
  try {
    const watchRes = await fetch(`${sources.kaerunimeBaseUrl}/watch/${encodeURIComponent(epSlug)}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }
    });
    if (watchRes.ok) {
      const html = await watchRes.text();
      const parsed = parseKaerunimeWatchHtml(html, epSlug, epNum, animeSlug);
      if (parsed.qualities.length > 0) {
        return jsonResponse(parsed, 200, 180);
      }
    }
  } catch {
    // fall through to direct Sokuja
  }

  // 2. Fallback: Direct Sokuja episode HTML mirrors
  try {
    const sokujaRes = await fetch(`${sources.sokujaBaseUrl}/${encodeURIComponent(epSlug)}/`, {
      headers: { 'User-Agent': USER_AGENT, Referer: `${sources.sokujaBaseUrl}/` }
    });
    if (sokujaRes.ok) {
      const html = await sokujaRes.text();
      const qualities = parseDirectSokujaMirrors(html);
      return jsonResponse({
        episodeSlug: epSlug,
        animeTitle: animeSlug,
        episodeTitle: `Episode ${epNum}`,
        episodeNumber: epNum,
        qualities,
        allEpisodes: []
      }, 200, 180);
    }
  } catch {
    // ignore
  }

  return jsonResponse({
    episodeSlug: epSlug,
    episodeNumber: epNum,
    qualities: [],
    allEpisodes: []
  }, 200, 30);
}

async function handleSearch(url, sources) {
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return jsonResponse({ results: [] }, 200, 60);
  try {
    const res = await fetch(`${sources.kaerunimeBaseUrl}/api/search?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return jsonResponse(data, 200, 120);
    }
  } catch {
    // ignore
  }
  return jsonResponse({ results: [] }, 200, 30);
}

async function handleCoverProxy(url, sources) {
  const target = (url.searchParams.get('url') || '').trim();
  if (!target || !/^https?:\/\//i.test(target)) {
    return new Response('Bad cover url', { status: 400, headers: corsHeaders() });
  }
  const referer = target.includes('kuronime') ? `${sources.kuronimeBaseUrl}/` : `${sources.sokujaBaseUrl}/`;
  const res = await fetch(target, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: referer,
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    }
  });
  if (!res.ok) {
    return new Response('Cover fetch failed', { status: res.status, headers: corsHeaders() });
  }
  return new Response(res.body, {
    status: 200,
    headers: corsHeaders({
      'Content-Type': res.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400'
    })
  });
}

async function handleSourceHtmlProxy(url, sources) {
  const target = (url.searchParams.get('url') || '').trim();
  if (!target || !/^https?:\/\//i.test(target)) {
    return new Response('Bad target url', { status: 400, headers: corsHeaders() });
  }
  let parsedTarget;
  try {
    parsedTarget = new URL(target);
  } catch {
    return new Response('Invalid url', { status: 400, headers: corsHeaders() });
  }
  const host = parsedTarget.hostname.toLowerCase();
  const isAllowed =
    host.includes('kuronime') ||
    host.includes('sokuja') ||
    host.includes('kaerunime');
  if (!isAllowed) {
    return new Response('Forbidden target host', { status: 403, headers: corsHeaders() });
  }
  const referer = host.includes('kuronime')
    ? `${sources.kuronimeBaseUrl}/`
    : host.includes('kaerunime')
      ? `${sources.kaerunimeBaseUrl}/`
      : `${sources.sokujaBaseUrl}/`;
  const res = await fetch(target, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: referer,
      Accept: 'text/html,application/xhtml+xml,application/json,*/*;q=0.8'
    },
    redirect: 'follow'
  });
  return new Response(res.body, {
    status: res.status,
    headers: corsHeaders({
      'Content-Type': res.headers.get('content-type') || 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=180'
    })
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const sources = await getSourceConfig(env);

    switch (url.pathname) {
      case '/api/health':
        return jsonResponse({ status: 'ok', sources, timestamp: new Date().toISOString() }, 200, 30);
      case '/api/streams':
        return handleStreams(url, sources);
      case '/api/search':
        return handleSearch(url, sources);
      case '/api/cover':
        return handleCoverProxy(url, sources);
      case '/api/source-html':
        return handleSourceHtmlProxy(url, sources);
      default:
        return jsonResponse({ error: 'Not found', path: url.pathname }, 404, 15);
    }
  }
};
