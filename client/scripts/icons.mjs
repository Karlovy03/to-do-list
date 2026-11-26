// Generates app icons from the official MVS sign (never recoloured or cropped; the sign takes
// 50% of the icon, leaving the required protective zone of half its height on every side).
// The notification badge is a plain monochrome glyph: Android uses only its alpha channel.
// Run: node scripts/icons.mjs   (needs Playwright, preinstalled in the dev environment)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pub = path.join(root, 'public');
const NAVY = '#0E2357';

const sign = fs.readFileSync(path.join(root, 'src/shared/ui/BrandMark/mvs-sign.svg'), 'utf8');
const inner = sign.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

// 512 canvas, sign 256 centred → 128 of space on each side = half the sign's height
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${NAVY}"/>
<g transform="translate(128 128) scale(1.28)">${inner}</g>
</svg>
`;
fs.writeFileSync(path.join(pub, 'icon.svg'), iconSvg);

const SHIELD_CHECK = 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9 12l2 2 4-4'; // same as Icon shieldCheck
const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${SHIELD_CHECK}"/></svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(svg, size, file, transparent = false) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`);
  await page.locator('img').screenshot({ path: path.join(pub, file), omitBackground: transparent });
}
await render(iconSvg, 192, 'icon-192.png');
await render(iconSvg, 512, 'icon-512.png');
await render(iconSvg, 180, 'apple-touch-icon.png');
await render(badgeSvg, 72, 'badge-72.png', true);
await browser.close();
console.log('icons written to public/');
