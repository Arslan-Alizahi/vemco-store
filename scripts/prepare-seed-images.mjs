/**
 * Turns the source photographs in "Demo Pics/" into web-ready product images.
 *
 * The originals are 0.6-5 MB each at up to 7360px wide. Shipping those would
 * make the catalogue unusable on a Pakistani mobile connection, which is most
 * of the audience. This crops each to the 4:5 portrait the product cards use,
 * emits AVIF + WebP + a JPEG fallback at two widths, and writes an index the
 * seeder reads.
 *
 * Run: npm run seed:images
 *
 * Attribution lives in public/seed/products/CREDITS.md -- these are Unsplash
 * and Pexels photographs, not VEMCO's own product shots, and the demo data
 * says so.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'Demo Pics')
const OUT = join(ROOT, 'public', 'seed', 'products')

/**
 * slug -> source file, plus the crop anchor.
 *
 * `position` decides which part of the frame survives the 4:5 crop. Most
 * furniture sits in the lower half, so the default centre crop would cut the
 * subject; these are set per photograph.
 */
const MAP = [
  { slug: 'emerald-velvet-sofa', file: 'phillip-goldsberry-fZuleEfeA1Q-unsplash.jpg', position: 'centre' },
  { slug: 'terracotta-linen-sofa', file: 'inside-weather-dbH_vy7vICE-unsplash.jpg', position: 'centre' },
  { slug: 'mustard-accent-chair', file: 'kam-idris-_HqHX3LBN18-unsplash.jpg', position: 'centre' },
  { slug: 'amber-swivel-chair', file: 'spacejoy-IH7wPsjwomc-unsplash.jpg', position: 'bottom' },
  { slug: 'suede-two-seater', file: 'pexels-kylaroserockola-776984.jpg', position: 'bottom' },
  { slug: 'classic-sofa-set', file: 'pexels-curtis-adams-1694007-3773584.jpg', position: 'centre' },
  { slug: 'modular-lounge-sofa', file: 'toa-heftiba-FV3GConVSss-unsplash.jpg', position: 'centre' },
  { slug: 'round-walnut-coffee-table', file: 'minh-pham-OtXADkUh3-I-unsplash.jpg', position: 'bottom' },
  { slug: 'walnut-round-dining-table', file: 'ryan-riggins-9v7UJS92HYc-unsplash.jpg', position: 'centre' },
  { slug: 'grand-dining-table', file: 'pexels-artbovich-8082211.jpg', position: 'centre' },
  { slug: 'cafe-pedestal-table', file: 'pexels-brcunel-10108747.jpg', position: 'centre' },
  { slug: 'moulded-dining-chair', file: 'suchit-poojari-ljRiZl00n18-unsplash.jpg', position: 'centre' },
  { slug: 'curved-upholstered-bed', file: 'ali-moradi-vz9IbCAXHKQ-unsplash.jpg', position: 'centre' },
  { slug: 'tufted-wingback-bed', file: 'quilia-iAftdIcgpFc-unsplash.jpg', position: 'centre' },
  { slug: 'linen-platform-bed', file: 'trend-Uh-Qv2P9-sg-unsplash.jpg', position: 'centre' },
  { slug: 'low-walnut-platform-bed', file: 'laura-adai-J60bPeDiR8A-unsplash.jpg', position: 'centre' },
  { slug: 'oak-bedside-table', file: 'christopher-jolly-GqbU78bdJFM-unsplash.jpg', position: 'centre' },
  { slug: 'sliding-door-wardrobe', file: 'albero-furniture-bratislava-u88zDvr5V6g-unsplash.jpg', position: 'right' },
  { slug: 'oak-console-sideboard', file: 'minh-pham-7pCFUybP_P8-unsplash.jpg', position: 'bottom' },
  { slug: 'gloss-media-console', file: 'pexels-artbovich-7546231.jpg', position: 'bottom' },
]

// 4:5 portrait, matching the product card aspect token.
const SIZES = [
  { name: 'lg', width: 1200, height: 1500 },
  { name: 'sm', width: 600, height: 750 },
]

mkdirSync(OUT, { recursive: true })

const index = []
let bytesIn = 0
let bytesOut = 0

for (const { slug, file, position } of MAP) {
  const src = join(SRC, file)
  bytesIn += readFileSync(src).length

  for (const size of SIZES) {
    const base = sharp(src).rotate().resize(size.width, size.height, {
      fit: 'cover',
      position,
    })

    const targets = [
      { ext: 'avif', pipe: base.clone().avif({ quality: 55, effort: 6 }) },
      { ext: 'webp', pipe: base.clone().webp({ quality: 76 }) },
      { ext: 'jpg', pipe: base.clone().jpeg({ quality: 80, mozjpeg: true }) },
    ]

    for (const { ext, pipe } of targets) {
      const out = join(OUT, `${slug}-${size.name}.${ext}`)
      const info = await pipe.toFile(out)
      bytesOut += info.size
    }
  }

  index.push({ slug, source: file })
  console.log(`  ${slug}`)
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8')

writeFileSync(
  join(OUT, 'CREDITS.md'),
  `# Demo photography credits

These are the images used by the demo catalogue. They are stock photographs
from Unsplash and Pexels, used to make the seeded store look real -- they are
**not** VEMCO's own product shots. Replace them with real photography before
launch.

| Product slug | Source file |
| --- | --- |
${index.map(i => `| \`${i.slug}\` | ${i.source} |`).join('\n')}

Unsplash License: https://unsplash.com/license
Pexels License: https://www.pexels.com/license/
`,
  'utf8'
)

const mb = n => (n / 1024 / 1024).toFixed(1)
console.log(`\n${MAP.length} products - ${SIZES.length} sizes x 3 formats each`)
console.log(`Source ${mb(bytesIn)} MB -> output ${mb(bytesOut)} MB`)
