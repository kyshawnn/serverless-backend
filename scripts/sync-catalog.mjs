import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const API_DIR = path.join(PUBLIC_DIR, 'api');
const GENRES_DIR = path.join(API_DIR, 'genres');
const DETAILS_DIR = path.join(API_DIR, 'details');
const COVERS_DIR = path.join(PUBLIC_DIR, 'covers');

export const SOURCES = {
  sokujaBaseUrl: (process.env.SOKUJA_BASE_URL || 'https://x6.sokuja.uk').replace(/\/+$/, ''),
  kaerunimeBaseUrl: (process.env.KAERUNIME_BASE_URL || 'https://kaerunime.vercel.app').replace(/\/+$/, ''),
  kuronimeBaseUrl: (process.env.KURONIME_BASE_URL || 'https://kuronime.sbs').replace(/\/+$/, '')
};

const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

export const ALL_GENRE_SLUGS = [
  'action', 'adventure', 'comedy', 'drama', 'fantasy', 'romance', 'sci-fi',
  'slice-of-life', 'sports', 'supernatural', 'mystery', 'psychological',
  'thriller', 'horror', 'isekai', 'mecha', 'music', 'school', 'shounen',
  'shoujo', 'seinen', 'martial-arts', 'historical', 'military', 'magic',
  'demons', 'movie'
];

const KURONIME_CANONICAL_ALIASES = {
  'naruto': 'naruto-kecil',
  'naruto-sub-indo': 'naruto-kecil',
  'naruto-kecil-sub-indo': 'naruto-kecil',
  'naruto-shippuden-sub-indo': 'naruto-shippuden',
  'naruto-shippuuden': 'naruto-shippuden',
  'naruto-shippuuden-sub-indo': 'naruto-shippuden',
  'boruto-naruto-next-generations-sub-indo': 'boruto-naruto-next-generations',
  'bleach-sub-indo': 'bleach',
  'hunter-x-hunter-2011': 'hunter-x-hunter',
  'hunter-x-hunter-sub-indo': 'hunter-x-hunter',
  'black-clover': 'black-clover-tv',
  'black-clover-sub-indo': 'black-clover-tv',
  'fairy-tail-sub-indo': 'fairy-tail',
  'dragon-ball-super-sub-indo': 'dragon-ball-super',
  'haikyuu-sub-indo': 'haikyuu',
  'blue-lock-sub-indo': 'blue-lock',
  'kuroko-no-basket-sub-indo': 'kuroko-no-basket',
  'death-note-sub-indo': 'death-note',
  'steins-gate-sub-indo': 'steins-gate',
  'steinsgate': 'steins-gate',
  'sword-art-online-sub-indo': 'sword-art-online',
  'gintama-sub-indo': 'gintama',
  'tokyo-revengers-sub-indo': 'tokyo-revengers',
  'dr-stone': 'dr-stone-sub-indo',
  'ansatsu-kyoushitsu': 'ansatsu-kyoushitsu-tv',
  'code-geass': 'code-geass-leluoch-of-rebellion',
  'code-geass-hangyaku-no-lelouch': 'code-geass-leluoch-of-rebellion',
  '86': '86-eighty-six',
  'fruits-basket': 'fruits-basket-2019',
  'kaguya-sama-love-is-war': 'kaguya-sama-wa-kokurasetai-tensai-tachi-no-renai-zunousen',
  'kaguya-sama-wa-kokurasetai': 'kaguya-sama-wa-kokurasetai-tensai-tachi-no-renai-zunousen'
};

export function cleanHtmlText(raw = '') {
  return String(raw)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#8217;|&#8216;/g, "'")
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanAnimeTitle(raw = '') {
  return cleanHtmlText(raw)
    .replace(/^sinopsis\s+/i, '')
    .replace(/\s*(?:subtitle\s+indonesia|subtilte\s+indonesia|sub\s+indo)\s*$/i, '')
    .replace(/\s*\(TV\)\s*$/i, '')
    .trim();
}

export function genreNameToSlug(raw = '') {
  const lower = String(raw).trim().toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (lower === 'sci-fi' || lower === 'scifi') return 'sci-fi';
  if (lower === 'slice-of-life' || lower === 'sliceoflife') return 'slice-of-life';
  if (lower === 'martial-arts' || lower === 'martialarts') return 'martial-arts';
  if (lower === 'film' || lower === 'movies') return 'movie';
  return lower;
}

export function resolveKuronimeCanonicalSlug(rawSlug = '') {
  const cleaned = String(rawSlug)
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()
    .replace(/^kuro-ep-/, '')
    .replace(/^kuro-/, '');
  if (!cleaned) return '';
  if (KURONIME_CANONICAL_ALIASES[cleaned]) return KURONIME_CANONICAL_ALIASES[cleaned];
  if (cleaned.endsWith('-sub-indo') && cleaned !== 'dr-stone-sub-indo') {
    const trimmed = cleaned.slice(0, -'-sub-indo'.length);
    return KURONIME_CANONICAL_ALIASES[trimmed] || trimmed;
  }
  return cleaned;
}

export function normalizeCanonicalAnimeKey(title = '', slug = '') {
  const sourceText = String(title || '').trim() ||
    String(slug || '')
      .replace(/^kuro-ep-/, '')
      .replace(/^kuro-/, '')
      .replace(/-/g, ' ');

  let normalized = sourceText
    .toLowerCase()
    .replace(/&amp;/g, ' ')
    .replace(/&#039;|&#8217;|&#8216;/g, '')
    .replace(/&#8211;/g, ' ')
    .replace(/°/g, ' ')
    .replace(/^sinopsis\s+/i, ' ')
    .replace(/[:\-–—,._/()[\]!?'"]+/g, ' ')
    .replace(/\b(nonton|streaming|anime|subtitle\s+indonesia|subtilte\s+indonesia|sub\s+indo|subtitle|indonesia|bd|batch|uncensored|bluray|blu\s+ray|tv|cam|hdts|raw)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const replacements = [
    ['attack on titan', 'shingeki no kyojin'],
    ['demon slayer kimetsu no yaiba', 'kimetsu no yaiba'],
    ['demon slayer', 'kimetsu no yaiba'],
    ['my hero academia', 'boku no hero academia'],
    ['frieren beyond journeys end', 'sousou no frieren'],
    ['frieren beyond journey s end', 'sousou no frieren'],
    ['a silent voice', 'koe no katachi'],
    ['fullmetal alchemist brotherhood', 'fullmetal alchemist'],
    ['naruto kecil', 'naruto'],
    ['naruto shippuuden', 'naruto shippuden'],
    ['fire force', 'enen no shouboutai'],
    ['assassination classroom', 'ansatsu kyoushitsu'],
    ['code geass leluoch of rebellion', 'code geass hangyaku no lelouch'],
    ['code geass lelouch of the rebellion', 'code geass hangyaku no lelouch'],
    ['kaguya sama love is war', 'kaguya sama wa kokurasetai'],
    ['kaguya sama wa kokurasetai tensai tachi no renai zunousen', 'kaguya sama wa kokurasetai'],
    ['solo leveling', 'ore dake level up na ken'],
    ['kaiju no 8', 'kaijuu 8 gou'],
    ['the eminence in shadow', 'kage no jitsuryokusha ni naritakute'],
    ['classroom of the elite', 'youkoso jitsuryoku shijou shugi no kyoushitsu e'],
    ['that time i got reincarnated as a slime', 'tensei shitara slime datta ken'],
    ['the rising of the shield hero', 'tate no yuusha no nariagari'],
    ['the seven deadly sins', 'nanatsu no taizai'],
    ['to your eternity', 'fumetsu no anata e'],
    ['the apothecary diaries', 'kusuriya no hitorigoto'],
    ['delicious in dungeon', 'dungeon meshi'],
    ['mashle magic and muscles', 'mashle'],
    ['blue exorcist', 'ao no exorcist'],
    ['the promised neverland', 'yakusoku no neverland'],
    ['erased', 'boku dake ga inai machi'],
    ['your lie in april', 'shigatsu wa kimi no uso'],
    ['parasyte the maxim', 'kiseijuu sei no kakuritsu'],
    ['parasyte', 'kiseijuu sei no kakuritsu'],
    ['rascal does not dream of bunny girl senpai', 'seishun buta yarou wa bunny girl senpai no yume wo minai'],
    ['rascal does not dream', 'seishun buta yarou'],
    ['food wars shokugeki no soma', 'shokugeki no souma'],
    ['food wars', 'shokugeki no souma'],
    ['shokugeki no soma', 'shokugeki no souma'],
    ['is it wrong to try to pick up girls in a dungeon', 'dungeon ni deai wo motomeru no wa machigatteiru darou ka'],
    ['danmachi', 'dungeon ni deai wo motomeru no wa machigatteiru darou ka'],
    ['kono subarashii sekai ni shukufuku wo', 'konosuba'],
    ['kono subarashii sekai ni shukufuku o', 'konosuba'],
    ['mushoku tensei jobless reincarnation', 'mushoku tensei'],
    ['re zero starting life in another world', 're zero kara hajimeru isekai seikatsu'],
    ['black butler', 'kuroshitsuji'],
    ['kuroko s basketball', 'kuroko no basket'],
    ['kurokos basketball', 'kuroko no basket'],
    ['86 eighty six', '86'],
    ['eighty six', '86']
  ];
  for (const [from, to] of replacements) {
    normalized = normalized.replaceAll(from, to);
  }

  return normalized
    .replace(/\b(?:the\s+movie|movie|film|gekijouban)\s+0*(\d+)\b/g, 'movie $1')
    .replace(/\b(?:the\s+movie|film|gekijouban)\b/g, 'movie')
    .replace(/\b(?:ova|oad)\s*0*(\d+)\b/g, 'ova $1')
    .replace(/\b(?:ona)\s*0*(\d+)\b/g, 'ona $1')
    .replace(/\b(?:special|sp)\s*0*(\d+)\b/g, 'special $1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeSlugFilename(slug = '') {
  return String(slug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140) || 'anime';
}

export function formatScore(raw = '8.0') {
  const num = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num <= 0 || num > 10) return '8.0';
  return num.toFixed(1);
}

export function isValidRawCoverUrl(rawUrl = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return (
    !lower.startsWith('data:image') &&
    !lower.startsWith('javascript:') &&
    !lower.startsWith('about:') &&
    !lower.includes('controls-play.svg') &&
    !lower.includes('blank.gif') &&
    !lower.includes('/placeholder') &&
    !lower.includes('lazy-load') &&
    !lower.includes('spinner') &&
    !lower.includes('1x1.') &&
    !lower.endsWith('.svg')
  );
}

export function normalizeCoverUrl(rawUrl = '', fallbackBase = SOURCES.kaerunimeBaseUrl) {
  const trimmed = String(rawUrl || '').trim().replace(/\s+/g, '%20');
  if (!isValidRawCoverUrl(trimmed)) return '';
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice(7)}`;
  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${fallbackBase}${trimmed}`;
  return trimmed;
}

export function extractBestImageUrl(htmlBlock = '', fallbackBase = SOURCES.sokujaBaseUrl) {
  const imgTags = htmlBlock.match(/<img\b[^>]*>/gi) || [];
  let fallback = '';
  for (const tag of imgTags) {
    const isPoster =
      /(?:wp-post-image|ts-post-image|itemprop=["']image["'])/i.test(tag) &&
      !/logo/i.test(tag);
    const attrRegex = /\b(?:data-lazy-src|data-src|data-original|data-cfsrc|src)\s*=\s*(?:["']([^"']+)["']|([^\s>"']+))/gi;
    let m;
    while ((m = attrRegex.exec(tag)) !== null) {
      const candidate = normalizeCoverUrl(m[1] || m[2] || '', fallbackBase);
      if (!candidate) continue;
      if (isPoster) return candidate;
      if (!fallback) fallback = candidate;
    }
    const srcsetMatch = tag.match(/\b(?:data-lazy-srcset|data-srcset|srcset)\s*=\s*["']([^"']+)["']/i);
    if (srcsetMatch && srcsetMatch[1]) {
      const firstUrl = srcsetMatch[1].split(',')[0]?.trim().split(/\s+/)[0] || '';
      const candidate = normalizeCoverUrl(firstUrl, fallbackBase);
      if (candidate) {
        if (isPoster) return candidate;
        if (!fallback) fallback = candidate;
      }
    }
  }
  return fallback;
}

export function parseSokujaHtmlArticles(html = '') {
  if (!html || !html.includes('<article')) return [];
  const results = [];
  const seen = new Set();
  const articleRegex = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const content = match[1];
    const hrefMatch = content.match(/<a\b[^>]*href=["']([^"']+)["']/i);
    const slug = (hrefMatch?.[1] || '').replace(/\/+$/, '').split('/').pop() || '';
    const ttMatch = content.match(/<div\s+class=["']tt["'][^>]*>(?:[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>|([^<]+))/i);
    const altTitle = content.match(/title=["']([^"']+)["']/i)?.[1] || '';
    const title = cleanAnimeTitle(ttMatch?.[1] || ttMatch?.[2] || altTitle);
    const coverUrl = extractBestImageUrl(content, SOURCES.sokujaBaseUrl);
    const score = content.match(/<div\s+class=["']numscore["'][^>]*>([^<]+)<\/div>/i)?.[1] || '8.0';
    const typeText = content.match(/<div\s+class=["']typez[^"']*["'][^>]*>([^<]+)<\/div>/i)?.[1]?.trim() || 'TV';

    if (slug && title && !/^sinopsis\b/i.test(title) && coverUrl && !seen.has(slug)) {
      seen.add(slug);
      results.push({
        slug,
        title,
        coverUrl,
        backdropUrl: coverUrl,
        rating: formatScore(score),
        type: /movie/i.test(typeText) ? 'Movie' : 'TV',
        studio: '-',
        status: 'Ongoing',
        genres: [],
        synopsis: ''
      });
    }
  }
  return results;
}

export function parseKuronimeHtmlCards(html = '', defaultGenres = []) {
  if (!html || !html.includes('<article')) return [];
  const results = [];
  const seen = new Set();
  const articleRegex = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];
    const href = block.match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1] || '';
    if (!href) continue;
    const rawSlug = href.includes('/anime/')
      ? href.split('/anime/')[1].split('/')[0]
      : href.replace(/\/+$/, '').split('/').pop();
    const canonicalRaw = resolveKuronimeCanonicalSlug(rawSlug);
    if (!canonicalRaw) continue;
    const slug = `kuro-${canonicalRaw}`;
    const h2Title = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || '';
    const linkTitle = block.match(/<a\b[^>]*title=["']([^"']+)["']/i)?.[1] || '';
    const title = cleanAnimeTitle(h2Title || linkTitle || canonicalRaw.replace(/-/g, ' '));
    const coverUrl = extractBestImageUrl(block, SOURCES.kuronimeBaseUrl);
    const rating = block.match(/class=["']rating["'][^>]*>[\s\S]*?<i[^>]*>([^<]+)<\/i>/i)?.[1] || '7.8';
    const typeText = block.match(/<span\s+class=["']type\s*([^"']*)["']/i)?.[1] || 'TV';
    if (!title || /^sinopsis\b/i.test(title) || !coverUrl || seen.has(slug)) continue;
    seen.add(slug);
    results.push({
      slug,
      title,
      coverUrl,
      backdropUrl: coverUrl,
      rating: formatScore(rating),
      type: /movie/i.test(typeText) ? 'Movie' : 'TV',
      studio: '-',
      status: 'Ongoing',
      genres: defaultGenres,
      synopsis: ''
    });
  }
  return results;
}

export function extractNextRscPayloads(html = '') {
  const results = [];
  const prefix = 'self.__next_f.push([1,"';
  const suffix = '"])</script>';
  let idx = 0;
  while (idx < html.length) {
    const start = html.indexOf(prefix, idx);
    if (start < 0) break;
    const contentStart = start + prefix.length;
    const end = html.indexOf(suffix, contentStart);
    if (end < 0) break;
    results.push(html.slice(contentStart, end));
    idx = end + suffix.length;
  }
  return results;
}

export function unescapeRscPayload(raw = '') {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\');
  }
}

export function extractBalancedJsonObject(text = '', startIdx = 0) {
  if (startIdx < 0 || startIdx >= text.length || text[startIdx] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

export function parseJsonAnimeArray(arr) {
  if (!Array.isArray(arr)) return [];
  const list = [];
  for (const obj of arr) {
    if (!obj || typeof obj !== 'object') continue;
    const slug = String(obj.slug || '').trim().replace(/^\/+|\/+$/g, '');
    const title = cleanAnimeTitle(obj.title || '');
    const rawCover = obj.poster || obj.cover || obj.coverUrl || '';
    const coverUrl = normalizeCoverUrl(rawCover, SOURCES.kaerunimeBaseUrl);
    if (!slug || !title || /^sinopsis\b/i.test(title) || !coverUrl) continue;
    const genres = Array.isArray(obj.genres)
      ? obj.genres.map((g) => String(g).trim()).filter((g) => g && !/^genre$/i.test(g))
      : [];
    const ep = obj.episode ? String(obj.episode).trim() : '';
    const views = obj.views ? String(obj.views).trim() : '';
    list.push({
      slug,
      title,
      coverUrl,
      backdropUrl: coverUrl,
      rating: formatScore(obj.score || obj.rating || '8.0'),
      type: String(obj.type || 'TV').trim() || 'TV',
      studio: String(obj.studio || '-').trim() || '-',
      episodeOrViews: ep ? (ep.toLowerCase().includes('eps') ? ep : `Eps ${ep}`) : views,
      views,
      status: String(obj.status || 'Ongoing').trim() || 'Ongoing',
      genres,
      synopsis: typeof obj.synopsis === 'string' ? cleanHtmlText(obj.synopsis) : ''
    });
  }
  return list;
}

export function parseKaerunimeRscHome(html = '') {
  const payloads = extractNextRscPayloads(html);
  for (const raw of payloads) {
    if (!raw.includes('featuredList')) continue;
    const unescaped = unescapeRscPayload(raw);
    const start = unescaped.indexOf('{"featuredList":');
    if (start < 0) continue;
    const jsonText = extractBalancedJsonObject(unescaped, start);
    if (!jsonText) continue;
    try {
      const root = JSON.parse(jsonText);
      const ongoing = parseJsonAnimeArray(root.latest || root.featuredList);
      const popular = cleanMergedCatalog([
        ...parseJsonAnimeArray(root.hotAnime),
        ...parseJsonAnimeArray(root.completedAnime),
        ...parseJsonAnimeArray(root.mappaAnime),
        ...parseJsonAnimeArray(root.bonesAnime),
        ...parseJsonAnimeArray(root.a1PicturesAnime),
        ...parseJsonAnimeArray(root.jcStaffAnime),
        ...ongoing
      ]).slice(0, 30);
      const movies = parseJsonAnimeArray(root.moviesAnime);

      const scheduleByDay = {};
      const dayKeys = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      dayKeys.forEach((dayKey, dayIndex) => {
        const arr = root.initialSchedule?.[dayKey];
        if (!Array.isArray(arr)) return;
        scheduleByDay[String(dayIndex)] = arr
          .map((item) => {
            const slug = String(item.slug || '').trim();
            const title = cleanAnimeTitle(item.title || '');
            const coverUrl = normalizeCoverUrl(item.cover || item.poster || '', SOURCES.kaerunimeBaseUrl);
            if (!slug || !title || !coverUrl) return null;
            const epRaw = String(item.episode || '1').trim();
            const episodeLabel = /^episode/i.test(epRaw) ? epRaw : `Episode ${epRaw.replace(/^eps\s*/i, '') || '1'}`;
            return {
              slug,
              title,
              coverUrl,
              releaseTime: String(item.time || '00:00').trim() || '00:00',
              rating: formatScore(item.score || item.rating || '7.5'),
              episodeLabel,
              views: String(item.views || '').trim(),
              statusText: '• Menunggu update'
            };
          })
          .filter(Boolean);
      });

      if (ongoing.length > 0) {
        return { ongoing, popular, movies, scheduleByDay };
      }
    } catch {
      // continue scanning other payloads
    }
  }
  return null;
}

export function cleanMergedCatalog(sokujaItems = [], kuronimeItems = []) {
  const seenSlugs = new Set();
  const seenTitles = new Set();
  const seenCanonical = new Set();
  const byCanonical = new Map();

  const absorb = (item, isSecondary) => {
    if (!item || !item.slug || !item.title || /^sinopsis\b/i.test(item.title) || !item.coverUrl) return;
    const slugKey = item.slug.trim().toLowerCase();
    const titleKey = item.title.trim().toLowerCase();
    const canonicalKey = normalizeCanonicalAnimeKey(item.title, item.slug);

    if (byCanonical.has(canonicalKey)) {
      const existing = byCanonical.get(canonicalKey);
      // Merge helpful genres onto existing primary entry without creating duplicates
      if (Array.isArray(item.genres) && item.genres.length > 0) {
        const mergedGenres = Array.from(new Set([...(existing.genres || []), ...item.genres]));
        existing.genres = mergedGenres;
      }
      if (!existing.synopsis && item.synopsis) {
        existing.synopsis = item.synopsis;
      }
      return;
    }

    if (isSecondary) {
      if (seenCanonical.has(canonicalKey) || seenSlugs.has(slugKey) || seenTitles.has(titleKey)) {
        return;
      }
    }
    if (!seenSlugs.add(slugKey) || !seenTitles.add(titleKey)) return;
    if (canonicalKey) seenCanonical.add(canonicalKey);

    const copy = {
      ...item,
      genres: Array.isArray(item.genres) ? Array.from(new Set(item.genres)) : []
    };
    byCanonical.set(canonicalKey || slugKey, copy);
  };

  for (const s of sokujaItems) absorb(s, false);
  for (const k of kuronimeItems) absorb(k, true);

  return Array.from(byCanonical.values()).sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase())
  );
}

async function fetchTextWithRetry(url, referer = '', retries = 2, timeoutMs = 10000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/json,*/*;q=0.8'
      };
      if (referer) headers.Referer = referer;
      const res = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
      clearTimeout(timer);
      if (res.ok) return await res.text();
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 700 * attempt));
        continue;
      }
      if (res.status >= 400 && res.status < 500) return '';
    } catch {
      clearTimeout(timer);
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  return '';
}

async function fetchJsonWithRetry(url, retries = 2) {
  const txt = await fetchTextWithRetry(url, '', retries, 10000);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

function buildCoverCandidateFetchUrls(rawUrl, animeTitle) {
  const clean = normalizeCoverUrl(rawUrl);
  if (!clean) return [];
  const encoded = encodeURIComponent(clean);
  const withoutResize = clean.replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))(?=\?|$)/i, '$1');
  const urls = [];
  if (clean.includes('sokuja')) {
    urls.push(`${SOURCES.kaerunimeBaseUrl}/api/image?url=${encoded}`);
    urls.push(`https://i0.wp.com/${clean.replace(/^https?:\/\//, '')}`);
    urls.push(`https://wsrv.nl/?url=${encoded}&w=380&output=webp&q=82`);
    urls.push(clean);
    if (withoutResize !== clean) urls.push(withoutResize);
  } else {
    urls.push(clean);
    urls.push(`https://wsrv.nl/?url=${encoded}&w=380&output=webp&q=82`);
  }
  return Array.from(new Set(urls));
}

async function lookupJikanCoverUrl(title) {
  const cleaned = cleanAnimeTitle(title)
    .replace(/\b(?:season\s*\d+|part\s*\d+|cour\s*\d+)\b.*$/i, '')
    .trim();
  if (cleaned.length < 2) return '';
  const data = await fetchJsonWithRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleaned)}&limit=1`, 1);
  const first = data?.data?.[0];
  return first?.images?.webp?.large_image_url || first?.images?.jpg?.large_image_url || '';
}

async function mirrorCoverToWebp(anime, sharpMod, forceRefresh) {
  const fileSlug = sanitizeSlugFilename(anime.slug);
  const relativeCoverPath = `/covers/${fileSlug}.webp`;
  const destPath = path.join(COVERS_DIR, `${fileSlug}.webp`);

  if (!forceRefresh) {
    try {
      const stat = await fs.stat(destPath);
      if (stat.size > 512) {
        return relativeCoverPath;
      }
    } catch {
      // file does not exist yet
    }
  }

  const candidates = buildCoverCandidateFetchUrls(anime.coverUrl, anime.title);
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': url.includes('kuronime') ? `${SOURCES.kuronimeBaseUrl}/` : `${SOURCES.sokujaBaseUrl}/`,
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(9000)
      });
      if (!res.ok) continue;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html') || ct.includes('json') || ct.includes('svg')) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 512) continue;

      if (sharpMod) {
        const webpBuf = await sharpMod(buf)
          .resize(360, 504, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        await fs.writeFile(destPath, webpBuf);
      } else {
        await fs.writeFile(destPath, buf);
      }
      return relativeCoverPath;
    } catch {
      // try next mirror
    }
  }

  // Last resort: Jikan official anime cover before giving up
  const jikanUrl = await lookupJikanCoverUrl(anime.title);
  if (jikanUrl) {
    try {
      const res = await fetch(jikanUrl, { signal: AbortSignal.timeout(9000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 512 && sharpMod) {
          const webpBuf = await sharpMod(buf)
            .resize(360, 504, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          await fs.writeFile(destPath, webpBuf);
          return relativeCoverPath;
        }
      }
    } catch {
      // ignore
    }
  }

  return anime.coverUrl;
}

export function buildDetailPayload(anime, scraped = {}) {
  const episodes = Array.isArray(scraped.episodes) && scraped.episodes.length > 0
    ? scraped.episodes
    : [{ slug: `${anime.slug}-episode-1-subtitle-indonesia`, title: 'Episode 1', number: 1 }];
  return {
    slug: anime.slug,
    title: scraped.title || anime.title,
    coverUrl: anime.coverUrl,
    backdropUrl: anime.backdropUrl || anime.coverUrl,
    rating: scraped.rating || anime.rating || '8.0',
    type: scraped.type || anime.type || 'TV',
    studio: scraped.studio || anime.studio || '-',
    genres: (scraped.genres && scraped.genres.length > 0 ? scraped.genres : anime.genres || []).slice(0, 3),
    synopsis: scraped.synopsis || anime.synopsis || `${anime.title} tayang lengkap dengan takarir Subtitle Indonesia.`,
    episodes
  };
}

async function scrapeAnimeDetail(anime) {
  if (anime.slug.startsWith('kuro-')) {
    const rawSlug = resolveKuronimeCanonicalSlug(anime.slug);
    const html = await fetchTextWithRetry(`${SOURCES.kuronimeBaseUrl}/anime/${rawSlug}/`, `${SOURCES.kuronimeBaseUrl}/`, 1, 9000);
    if (!html) return buildDetailPayload(anime);

    const epRegex = /<a\b[^>]*href=["'](https?:\/\/[^"']*kuronime[^"']*\/([^/"']+)\/?)["'][^>]*>[\s\S]*?(?:Episode|Eps?)\s*(\d+)/gi;
    const epMap = new Map();
    let m;
    while ((m = epRegex.exec(html)) !== null) {
      const epSlug = m[2];
      const num = Number.parseInt(m[3], 10);
      if (epSlug && Number.isFinite(num) && !epMap.has(num)) {
        epMap.set(num, { slug: `kuro-ep-${epSlug}`, title: `Episode ${num}`, number: num });
      }
    }
    const synMatch = html.match(/<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const synopsis = cleanHtmlText(synMatch?.[1] || '').slice(0, 900);
    const episodes = Array.from(epMap.values()).sort((a, b) => a.number - b.number);
    return buildDetailPayload(anime, { synopsis, episodes });
  }

  const html = await fetchTextWithRetry(`${SOURCES.kaerunimeBaseUrl}/detail/${anime.slug}`, '', 1, 9000);
  if (!html) return buildDetailPayload(anime);

  for (const rawPush of extractNextRscPayloads(html)) {
    const unescaped = unescapeRscPayload(rawPush);
    const idx = unescaped.indexOf('{"anime":{');
    if (idx < 0) continue;
    const jsonText = extractBalancedJsonObject(unescaped, idx);
    if (!jsonText) continue;
    try {
      const animeObj = JSON.parse(jsonText)?.anime;
      if (!animeObj) continue;
      const episodes = Array.isArray(animeObj.episodes)
        ? animeObj.episodes.map((ep, i) => ({
            slug: String(ep.slug || `${anime.slug}-episode-${ep.number || i + 1}-subtitle-indonesia`),
            title: String(ep.title || `Episode ${ep.number || i + 1}`),
            number: Number(ep.number || i + 1)
          })).filter((e) => e.slug)
        : [];
      const genres = Array.isArray(animeObj.genres)
        ? animeObj.genres.map((g) => String(g).trim()).filter((g) => g && !/^(?:genre|ecchi)$/i.test(g))
        : anime.genres;
      const rawSyn = typeof animeObj.synopsis === 'string' && !animeObj.synopsis.startsWith('$')
        ? cleanHtmlText(animeObj.synopsis)
        : '';
      return buildDetailPayload(anime, {
        title: cleanAnimeTitle(animeObj.title || anime.title),
        type: animeObj.type || anime.type,
        studio: animeObj.studio || anime.studio,
        rating: formatScore(animeObj.rating || animeObj.score || anime.rating),
        genres,
        synopsis: rawSyn,
        episodes
      });
    } catch {
      // ignore parse issue
    }
  }
  return buildDetailPayload(anime);
}

async function main() {
  const forceRefreshCovers = process.env.REFRESH_COVERS === 'true';
  await Promise.all([
    fs.mkdir(API_DIR, { recursive: true }),
    fs.mkdir(GENRES_DIR, { recursive: true }),
    fs.mkdir(DETAILS_DIR, { recursive: true }),
    fs.mkdir(COVERS_DIR, { recursive: true })
  ]);

  let sharpMod = null;
  try {
    sharpMod = (await import('sharp')).default;
  } catch {
    console.warn('[sync] sharp unavailable, storing raw downloaded image bytes');
  }

  console.log('[sync] Fetching home & genres...');
  const homeHtml = await fetchTextWithRetry(SOURCES.kaerunimeBaseUrl);
  const parsedHome = parseKaerunimeRscHome(homeHtml);

  const sokujaPool = [];
  const kuronimePool = [];

  if (parsedHome) {
    sokujaPool.push(...parsedHome.ongoing, ...parsedHome.popular, ...parsedHome.movies);
  }

  // Scrape Sokuja archive pages 1..75 (stops cleanly when a page returns empty)
  for (let start = 1; start <= 75; start += 8) {
    const batch = Array.from({ length: Math.min(8, 76 - start) }, (_, i) => start + i);
    const results = await runPool(batch, 4, async (page) => {
      const url = page === 1
        ? `${SOURCES.sokujaBaseUrl}/anime/`
        : `${SOURCES.sokujaBaseUrl}/anime/page/${page}/`;
      const html = await fetchTextWithRetry(url, SOURCES.sokujaBaseUrl);
      return parseSokujaHtmlArticles(html);
    });
    const flat = results.flat();
    if (flat.length === 0) break;
    sokujaPool.push(...flat);
    await new Promise((r) => setTimeout(r, 150));
  }

  // Fetch all 27 genres from Kaerunime API + Kuronime
  const genreCacheBySlug = {};
  await runPool(ALL_GENRE_SLUGS, 4, async (genreSlug) => {
    const kaeruItems = [];
    if (genreSlug === 'movie') {
      for (let p = 1; p <= 8; p++) {
        const html = await fetchTextWithRetry(`${SOURCES.sokujaBaseUrl}/anime/page/${p}/?type=movie&order=update`, SOURCES.sokujaBaseUrl);
        const parsed = parseSokujaHtmlArticles(html);
        if (parsed.length === 0) break;
        kaeruItems.push(...parsed.map((item) => ({ ...item, type: 'Movie', genres: ['Movie'] })));
      }
    }
    for (let p = 1; p <= 12; p++) {
      const json = await fetchJsonWithRetry(`${SOURCES.kaerunimeBaseUrl}/api/genre?slug=${encodeURIComponent(genreSlug)}&page=${p}&sort=popular`);
      const items = parseJsonAnimeArray(json?.items || json?.results || json?.data);
      if (items.length === 0) break;
      kaeruItems.push(...items.map((item) => ({
        ...item,
        genres: Array.from(new Set([...(item.genres || []), genreSlug]))
      })));
      if (json && json.hasNextPage === false && json.hasMore === false) break;
    }

    const kuroItems = [];
    for (let p = 1; p <= 2; p++) {
      const url = p === 1
        ? `${SOURCES.kuronimeBaseUrl}/genres/${genreSlug}/`
        : `${SOURCES.kuronimeBaseUrl}/genres/${genreSlug}/page/${p}/`;
      const html = await fetchTextWithRetry(url, SOURCES.kuronimeBaseUrl);
      const parsed = parseKuronimeHtmlCards(html, [genreSlug]);
      if (parsed.length === 0) break;
      kuroItems.push(...parsed);
    }

    sokujaPool.push(...kaeruItems);
    kuronimePool.push(...kuroItems);
    genreCacheBySlug[genreSlug] = cleanMergedCatalog(kaeruItems, kuroItems);
  });

  // Fetch Kuronime main popular archive pages 1..20
  for (let start = 1; start <= 20; start += 4) {
    const batch = Array.from({ length: Math.min(4, 21 - start) }, (_, i) => start + i);
    const results = await runPool(batch, 4, async (page) => {
      const url = page === 1
        ? `${SOURCES.kuronimeBaseUrl}/anime/?order=popular`
        : `${SOURCES.kuronimeBaseUrl}/anime/page/${page}/?order=popular`;
      const html = await fetchTextWithRetry(url, SOURCES.kuronimeBaseUrl);
      return parseKuronimeHtmlCards(html);
    });
    const flat = results.flat();
    if (flat.length === 0) break;
    kuronimePool.push(...flat);
  }

  const fullCatalog = cleanMergedCatalog(sokujaPool, kuronimePool);
  console.log(`[sync] Deduplicated catalog count: ${fullCatalog.length}`);

  // Mirror covers to compressed .webp in parallel waves
  const coverBySlug = new Map();
  await runPool(fullCatalog, 8, async (anime) => {
    const webpPath = await mirrorCoverToWebp(anime, sharpMod, forceRefreshCovers);
    coverBySlug.set(anime.slug, webpPath);
    anime.coverUrl = webpPath;
    anime.backdropUrl = webpPath;
  });

  const applyCdnCover = (list = []) => list.map((item) => {
    const mapped = coverBySlug.get(item.slug);
    return mapped ? { ...item, coverUrl: mapped, backdropUrl: mapped } : item;
  });

  // Enrich genre files with mirrored .webp covers and any extra catalog items
  for (const genreSlug of ALL_GENRE_SLUGS) {
    const existing = genreCacheBySlug[genreSlug] || [];
    const catalogExtras = fullCatalog.filter((a) =>
      genreSlug === 'movie'
        ? a.type === 'Movie' || a.genres.some((g) => genreNameToSlug(g) === 'movie')
        : a.genres.some((g) => genreNameToSlug(g) === genreSlug)
    );
    const mergedGenre = applyCdnCover(cleanMergedCatalog(existing, catalogExtras));
    await fs.writeFile(
      path.join(GENRES_DIR, `${genreSlug}.json`),
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        slug: genreSlug,
        totalCount: mergedGenre.length,
        items: mergedGenre
      })
    );
  }

  // Build / refresh detail payloads incrementally (always refresh ongoing + missing details)
  const ongoingSlugs = new Set((parsedHome?.ongoing || []).map((a) => a.slug));
  const detailBundle = {};
  await runPool(fullCatalog, 6, async (anime) => {
    const detailFile = path.join(DETAILS_DIR, `${sanitizeSlugFilename(anime.slug)}.json`);
    let detail = null;
    if (!ongoingSlugs.has(anime.slug)) {
      try {
        const cachedRaw = await fs.readFile(detailFile, 'utf8');
        const parsedCached = JSON.parse(cachedRaw);
        if (parsedCached?.episodes?.length > 0 && parsedCached?.title) {
          detail = { ...parsedCached, coverUrl: anime.coverUrl, backdropUrl: anime.coverUrl };
        }
      } catch {
        // fetch fresh below
      }
    }
    if (!detail) {
      detail = await scrapeAnimeDetail(anime);
      await fs.writeFile(detailFile, JSON.stringify(detail));
    }
    detailBundle[anime.slug] = detail;
  });

  const nowIso = new Date().toISOString();

  await Promise.all([
    fs.writeFile(
      path.join(API_DIR, 'config.json'),
      JSON.stringify({
        version: Date.now(),
        updatedAt: nowIso,
        sources: SOURCES,
        features: { cdnCoversEnabled: true, workerStreamsEnabled: true }
      }, null, 2)
    ),
    fs.writeFile(
      path.join(API_DIR, 'home.json'),
      JSON.stringify({
        updatedAt: nowIso,
        ongoing: applyCdnCover(parsedHome?.ongoing || fullCatalog.slice(0, 24)),
        popular: applyCdnCover(parsedHome?.popular || fullCatalog.slice(0, 30)),
        movies: applyCdnCover(parsedHome?.movies || fullCatalog.filter((a) => a.type === 'Movie').slice(0, 24)),
        scheduleByDay: Object.fromEntries(
          Object.entries(parsedHome?.scheduleByDay || {}).map(([day, list]) => [day, applyCdnCover(list)])
        )
      })
    ),
    fs.writeFile(
      path.join(API_DIR, 'catalog.json'),
      JSON.stringify({
        updatedAt: nowIso,
        totalCount: fullCatalog.length,
        items: fullCatalog
      })
    ),
    fs.writeFile(
      path.join(API_DIR, 'details_bundle.json'),
      JSON.stringify({
        updatedAt: nowIso,
        totalCount: Object.keys(detailBundle).length,
        details: detailBundle
      })
    )
  ]);

  console.log(`[sync] Completed at ${nowIso}: ${fullCatalog.length} anime, ${Object.keys(detailBundle).length} details.`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((err) => {
    console.error('[sync] Fatal error:', err);
    process.exit(1);
  });
}
