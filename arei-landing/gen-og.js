#!/usr/bin/env node
/**
 * Generate arei-og.png — Open Graph image matching the landing design.
 * 1200 × 630, brutalist green / monospace.
 *
 * Run: node gen-og.js (requires `sharp` installed as devDependency)
 */
const path = require('path');
const sharp = require('sharp');

const W = 1200;
const H = 630;

// System monospace stack — sharp/librsvg can't load the CDN IBM Plex Mono,
// so fall back to Menlo/Consolas which render close enough at this size.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#8ecf8e"/>

  <g font-family="Menlo, Monaco, Consolas, 'Courier New', monospace">
    <text x="72" y="82" font-size="18" font-weight="700" letter-spacing="4" fill="#0a0a0a">
      AFRICA REAL ESTATE INDEX
    </text>
    <g transform="translate(865, 74)">
      <circle cx="0" cy="0" r="6" fill="#22c55e"/>
      <text x="14" y="8" font-size="18" font-weight="600" letter-spacing="3" fill="#0a0a0a">
        ACTIVE · CAPE VERDE
      </text>
    </g>
  </g>

  <line x1="72" y1="120" x2="${W - 72}" y2="120" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>

  <g font-family="Menlo, Monaco, Consolas, 'Courier New', monospace" fill="#0a0a0a">
    <text x="72" y="280" font-size="72" font-weight="500" letter-spacing="-1">
      Africa's property data
    </text>
    <text x="72" y="362" font-size="72" font-weight="500" letter-spacing="-1">
      is everywhere.
    </text>
    <text x="72" y="444" font-size="72" font-weight="500" letter-spacing="-1">
      We bring it together.
    </text>
  </g>

  <line x1="72" y1="530" x2="${W - 72}" y2="530" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
  <g font-family="Menlo, Monaco, Consolas, 'Courier New', monospace" fill="#0a0a0a">
    <text x="72" y="575" font-size="18" font-weight="500">
      africarealestateindex.com
    </text>
    <text x="${W - 72}" y="575" font-size="18" font-weight="600" letter-spacing="3" text-anchor="end">
      V1 · EARLY ACCESS
    </text>
  </g>
</svg>`;

const outPath = path.join(__dirname, 'arei-og.png');
sharp(Buffer.from(svg))
  .png({ quality: 95 })
  .toFile(outPath)
  .then(info => {
    console.log(`Wrote ${outPath} (${info.width}×${info.height}, ${info.size} bytes)`);
  })
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
