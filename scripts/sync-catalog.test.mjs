import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {
  buildDetailPayload,
  cleanAnimeTitle,
  cleanMergedCatalog,
  isRealKuronimeSlug,
  normalizeCanonicalAnimeKey,
  parseKuronimeHtmlCards,
  parseSokujaHtmlArticles,
  sanitizeSlugFilename
} from './sync-catalog.mjs';

test('cleanMergedCatalog prioritizes Sokuja and strictly deduplicates bilingual synonyms', () => {
  const sokuja = [
    {
      slug: 'one-piece-subtitle-indonesia',
      title: 'One Piece',
      coverUrl: 'https://x6.sokuja.uk/op.jpg',
      backdropUrl: 'https://x6.sokuja.uk/op.jpg',
      rating: '8.9',
      genres: ['Action', 'Adventure']
    },
    {
      slug: 'shingeki-no-kyojin-sub-indo',
      title: 'Shingeki no Kyojin',
      coverUrl: 'https://x6.sokuja.uk/aot.jpg',
      backdropUrl: 'https://x6.sokuja.uk/aot.jpg',
      rating: '9.0',
      genres: ['Action']
    }
  ];

  const kuronime = [
    {
      slug: 'kuro-one-piece',
      title: 'One Piece Subtitle Indonesia',
      coverUrl: 'https://kuronime.sbs/op.jpg',
      backdropUrl: 'https://kuronime.sbs/op.jpg',
      rating: '8.8',
      genres: ['Fantasy']
    },
    {
      slug: 'kuro-attack-on-titan',
      title: 'Attack on Titan',
      coverUrl: 'https://kuronime.sbs/aot.jpg',
      backdropUrl: 'https://kuronime.sbs/aot.jpg',
      rating: '9.0',
      genres: ['Drama']
    },
    {
      slug: 'kuro-bleach',
      title: 'Bleach',
      coverUrl: 'https://kuronime.sbs/bleach.jpg',
      backdropUrl: 'https://kuronime.sbs/bleach.jpg',
      rating: '8.1',
      genres: ['Action']
    }
  ];

  const merged = cleanMergedCatalog(sokuja, kuronime);
  assert.equal(merged.length, 3);
  assert.equal(merged.some((a) => a.slug === 'one-piece-subtitle-indonesia'), true);
  assert.equal(merged.some((a) => a.slug === 'kuro-one-piece'), false);
  assert.equal(merged.some((a) => a.slug === 'kuro-attack-on-titan'), false);
  assert.equal(merged.some((a) => a.slug === 'kuro-bleach'), true);
});

test('HTML parsers ignore inline SVG placeholders and prefer real lazy poster images', () => {
  const sokujaHtml = `
    <article class="bs">
      <a href="https://x6.sokuja.uk/anime/ai-no-idenshi-sub-indo/" title="Ai no Idenshi Subtitle Indonesia">
        <img class="ts-post-image" src="data:image/svg+xml;base64,AAA" data-lazy-src="https://x6.sokuja.uk/wp-content/uploads/ai.jpg" />
        <div class="tt"><h2>Ai no Idenshi</h2></div>
        <div class="numscore">7.9</div>
      </a>
    </article>
  `;
  const parsedSokuja = parseSokujaHtmlArticles(sokujaHtml);
  assert.equal(parsedSokuja.length, 1);
  assert.equal(parsedSokuja[0].slug, 'ai-no-idenshi-sub-indo');
  assert.equal(parsedSokuja[0].coverUrl, 'https://x6.sokuja.uk/wp-content/uploads/ai.jpg');

  const kuroHtml = `
    <article class="bs">
      <a href="https://kuronime.sbs/anime/naruto-sub-indo/" title="Naruto">
        <img src="https://i0.wp.com/kuronime.sbs/wp-content/uploads/naruto.jpg" />
        <h2>Naruto</h2>
      </a>
    </article>
  `;
  const parsedKuro = parseKuronimeHtmlCards(kuroHtml, ['action']);
  assert.equal(parsedKuro.length, 1);
  assert.equal(parsedKuro[0].slug, 'kuro-naruto-kecil');
});

test('normalizeCanonicalAnimeKey, sanitizeSlugFilename, and buildDetailPayload produce valid CDN shapes', () => {
  assert.equal(normalizeCanonicalAnimeKey('Demon Slayer: Kimetsu no Yaiba'), 'kimetsu no yaiba');
  assert.equal(sanitizeSlugFilename('One Piece / Sub Indo!'), 'one-piece-sub-indo');
  const detail = buildDetailPayload({
    slug: 'solo-leveling',
    title: 'Solo Leveling',
    coverUrl: '/covers/solo-leveling.webp',
    backdropUrl: '/covers/solo-leveling.webp',
    genres: ['Action', 'Fantasy']
  });
  assert.equal(detail.episodes.length, 1);
  assert.equal(detail.coverUrl, '/covers/solo-leveling.webp');
});

test('strict cross-source duplicate prevention handles quotes, Season 1, Roman numerals, and kuro- Sokuja slugs', () => {
  assert.equal(isRealKuronimeSlug('kuro-no-shoukanshi-subtitle-indonesia'), false);
  assert.equal(isRealKuronimeSlug('kuro-naruto-kecil'), true);
  assert.equal(isRealKuronimeSlug('kuro-ep-naruto-1'), true);

  assert.equal(cleanAnimeTitle('"Oshi no Ko"'), 'Oshi no Ko');

  const sokuja = [
    { slug: 'oshi-no-ko-subtitle-indonesia', title: '"Oshi no Ko"', coverUrl: 'https://sokuja/onk.jpg', genres: ['Drama'] },
    { slug: 'ao-no-exorcist-season-1-subtitle-indonesia', title: 'Ao no Exorcist Season 1', coverUrl: 'https://sokuja/ane1.jpg', genres: ['Action'] },
    { slug: 'tensei-shitara-ken-deshita-ii-subtitle-indonesia', title: 'Tensei shitara Ken deshita II', coverUrl: 'https://sokuja/ken2.jpg', genres: ['Action'] },
    { slug: 'bleach-tybw-2-subtitle-indonesia', title: 'Bleach: Sennen Kessen-hen: Ketsubetsu-tan part 2', coverUrl: 'https://sokuja/bl2.jpg', genres: ['Action'] },
    { slug: 'haikyuu-subtitle-indonesia', title: 'Haikyuu!!', coverUrl: 'https://sokuja/hq1.jpg', genres: ['Sports'] }
  ];

  const kuronime = [
    { slug: 'kuro-oshi-no-ko', title: 'Oshi no Ko', coverUrl: 'https://kuro/onk.jpg', genres: ['Drama'] },
    { slug: 'kuro-ao-no-exorcist', title: 'Ao no Exorcist', coverUrl: 'https://kuro/ane.jpg', genres: ['Action'] },
    { slug: 'kuro-tensei-shitara-ken-deshita-season-2', title: 'Tensei shitara Ken deshita Season 2', coverUrl: 'https://kuro/ken2.jpg', genres: ['Action'] },
    { slug: 'kuro-bleach-sennen-kessen-hen-part-2', title: 'Bleach: Sennen Kessen-hen Part 2', coverUrl: 'https://kuro/bl2.jpg', genres: ['Action'] },
    { slug: 'kuro-haikyuu-season-2', title: 'Haikyuu!! Season 2', coverUrl: 'https://kuro/hq2.jpg', genres: ['Sports'] },
    { slug: 'kuro-haikyuu-season-3', title: 'Haikyuu!! Season 3', coverUrl: 'https://kuro/hq3.jpg', genres: ['Sports'] }
  ];

  const merged = cleanMergedCatalog(sokuja, kuronime);
  // 5 Sokuja items + only 2 unique Kuronime items (Haikyuu S2 and Haikyuu S3) = 7 total
  assert.equal(merged.length, 7);
  assert.equal(merged.some((a) => a.slug === 'kuro-oshi-no-ko'), false);
  assert.equal(merged.some((a) => a.slug === 'kuro-ao-no-exorcist'), false);
  assert.equal(merged.some((a) => a.slug === 'kuro-tensei-shitara-ken-deshita-season-2'), false);
  assert.equal(merged.some((a) => a.slug === 'kuro-bleach-sennen-kessen-hen-part-2'), false);
  assert.equal(merged.some((a) => a.slug === 'kuro-haikyuu-season-2'), true);
  assert.equal(merged.some((a) => a.slug === 'kuro-haikyuu-season-3'), true);
});

test('kuronime-catalog.json verified seed contains 2000+ unique entries and 300+ Action titles', async () => {
  const raw = JSON.parse(await fs.readFile(new URL('./kuronime-catalog.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(raw));
  assert.ok(raw.length >= 2000, `Expected >= 2000 seed items, got ${raw.length}`);
  const actionCount = raw.filter((item) => Array.isArray(item.genres) && item.genres.some((g) => g.toLowerCase() === 'action')).length;
  assert.ok(actionCount >= 300, `Expected >= 300 Action items, got ${actionCount}`);
  const keys = new Set(raw.map((item) => normalizeCanonicalAnimeKey(item.title, item.slug)));
  assert.equal(keys.size, raw.length, 'Seed catalog must contain zero canonical duplicates');
});
