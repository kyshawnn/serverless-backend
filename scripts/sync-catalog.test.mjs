import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDetailPayload,
  cleanMergedCatalog,
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
