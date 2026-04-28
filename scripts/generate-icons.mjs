// Regenerate PWA / favicon PNGs from brand SVGs.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "public/icons";
const BLUE = "#1656E0";
const CORAL = "#FF7A6B";
const WHITE = "#FFFFFF";

// Symbol path (96-viewBox), white horizontal bubble + coral vertical bubble
const SYMBOL = (h, v) => `
  <path d="M14 38 a8 8 0 0 1 8 -8 h52 a8 8 0 0 1 8 8 v20 a8 8 0 0 1 -8 8 h-12 l-8 8 a1.6 1.6 0 0 1 -2.7 -1.3 v-6.7 h-29.3 a8 8 0 0 1 -8 -8 z" fill="${h}"/>
  <path d="M38 14 a8 8 0 0 1 8 -8 h20 a8 8 0 0 1 8 8 v52 a8 8 0 0 1 -8 8 h-6.7 v6.7 a1.6 1.6 0 0 1 -2.7 1.3 l-8 -8 h-2.6 a8 8 0 0 1 -8 -8 z" fill="${v}"/>
`;

// Rounded blue square + white/coral symbol, with margin
function roundedIcon(size, contentScale = 0.78) {
  const radius = Math.round(size * 0.22);
  const inner = Math.round(size * contentScale);
  const offset = Math.round((size - inner) / 2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BLUE}"/>
  <g transform="translate(${offset} ${offset}) scale(${inner / 96})">
    ${SYMBOL(WHITE, CORAL)}
  </g>
</svg>`;
}

// Full square (maskable safe area), smaller content
function maskableIcon(size, contentScale = 0.6) {
  const inner = Math.round(size * contentScale);
  const offset = Math.round((size - inner) / 2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BLUE}"/>
  <g transform="translate(${offset} ${offset}) scale(${inner / 96})">
    ${SYMBOL(WHITE, CORAL)}
  </g>
</svg>`;
}

async function render(svg, outPath) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log("wrote", outPath);
}

await Promise.all([
  render(roundedIcon(192), join(OUT, "icon-192.png")),
  render(roundedIcon(512), join(OUT, "icon-512.png")),
  render(roundedIcon(180), join(OUT, "apple-touch-icon.png")),
  render(roundedIcon(32), join(OUT, "favicon-32.png")),
  render(roundedIcon(16), join(OUT, "favicon-16.png")),
  render(maskableIcon(192), join(OUT, "icon-maskable-192.png")),
  render(maskableIcon(512), join(OUT, "icon-maskable-512.png")),
]);

// Also write the SVG favicon (rounded blue + white/coral symbol)
writeFileSync(
  join(OUT, "icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="21" fill="${BLUE}"/>
  ${SYMBOL(WHITE, CORAL)}
</svg>
`,
);
console.log("wrote", join(OUT, "icon.svg"));
