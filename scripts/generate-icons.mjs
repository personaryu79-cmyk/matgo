import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '../public');

const FELT = [11, 21, 18, 255];
const FELT_LIGHT = [22, 52, 42, 255];
const SHADOW = [5, 10, 8, 255];
const CREAM = [246, 240, 226, 255];
const RED = [198, 58, 58, 255];
const GOLD = [216, 168, 78, 255];
const INK = [28, 36, 31, 255];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    a[3],
  ];
}

function makeIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const setPixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = color[3] ?? 255;
  };

  const center = (size - 1) / 2;
  const maxDistance = Math.hypot(center, center);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - center, y - center) / maxDistance;
      setPixel(x, y, mix(FELT, FELT_LIGHT, Math.max(0, 1 - distance) * 0.7));
    }
  }

  const cardWidth = Math.round(size * 0.22);
  const cardHeight = Math.round(size * 0.56);
  const radius = Math.round(size * 0.035);
  const bandHeight = Math.round(size * 0.1);
  const shadowOffset = Math.round(size * 0.018);
  const cards = [
    {
      x: Math.round(size * 0.13),
      y: Math.round(size * 0.27),
      band: RED,
      pip: GOLD,
    },
    {
      x: Math.round(size * 0.39),
      y: Math.round(size * 0.15),
      band: GOLD,
      pip: RED,
    },
    {
      x: Math.round(size * 0.65),
      y: Math.round(size * 0.27),
      band: RED,
      pip: INK,
    },
  ];

  const insideRoundedRect = (px, py, x0, y0, x1, y1, r) => {
    const cx = Math.min(Math.max(px, x0 + r), x1 - r);
    const cy = Math.min(Math.max(py, y0 + r), y1 - r);
    return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
  };

  const fillRoundedRect = (x0, y0, x1, y1, r, color) => {
    for (let py = Math.floor(y0); py <= Math.ceil(y1); py++) {
      for (let px = Math.floor(x0); px <= Math.ceil(x1); px++) {
        if (insideRoundedRect(px + 0.5, py + 0.5, x0, y0, x1, y1, r)) {
          setPixel(px, py, color);
        }
      }
    }
  };

  const fillCircle = (cx, cy, r, color) => {
    for (let py = Math.floor(cy - r); py <= Math.ceil(cy + r); py++) {
      for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px++) {
        if ((px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2 <= r ** 2) {
          setPixel(px, py, color);
        }
      }
    }
  };

  for (const card of cards) {
    const x0 = card.x;
    const y0 = card.y;
    const x1 = card.x + cardWidth;
    const y1 = card.y + cardHeight;

    fillRoundedRect(
      x0 + shadowOffset,
      y0 + shadowOffset,
      x1 + shadowOffset,
      y1 + shadowOffset,
      radius,
      SHADOW,
    );
    fillRoundedRect(x0, y0, x1, y1, radius, CREAM);

    const bandBottom = y0 + bandHeight;
    for (let py = Math.floor(y0); py <= Math.ceil(bandBottom); py++) {
      for (let px = Math.floor(x0); px <= Math.ceil(x1); px++) {
        if (
          py + 0.5 <= bandBottom &&
          insideRoundedRect(px + 0.5, py + 0.5, x0, y0, x1, y1, radius)
        ) {
          setPixel(px, py, card.band);
        }
      }
    }

    fillCircle(
      x0 + cardWidth * 0.5,
      y0 + cardHeight * 0.68,
      size * 0.025,
      card.pip,
    );
    fillCircle(
      x0 + cardWidth * 0.5,
      y0 + cardHeight * 0.83,
      size * 0.014,
      card.band,
    );
  }

  return encodePng(size, size, pixels);
}

function makeFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="felt" cx="45%" cy="35%" r="75%">
      <stop offset="0" stop-color="#16342a"/>
      <stop offset="1" stop-color="#0b1512"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#felt)"/>
  <g>
    <rect x="14.8" y="28.8" width="22" height="56" rx="3.5" fill="#050a08" opacity=".55"/>
    <rect x="13" y="27" width="22" height="56" rx="3.5" fill="#f6f0e2"/>
    <path d="M13 30.5A3.5 3.5 0 0 1 16.5 27h15A3.5 3.5 0 0 1 35 30.5V37H13Z" fill="#c63a3a"/>
    <circle cx="24" cy="65" r="2.5" fill="#d8a84e"/>
    <circle cx="24" cy="73" r="1.4" fill="#c63a3a"/>
  </g>
  <g>
    <rect x="40.8" y="16.8" width="22" height="64" rx="3.5" fill="#050a08" opacity=".55"/>
    <rect x="39" y="15" width="22" height="64" rx="3.5" fill="#f6f0e2"/>
    <path d="M39 18.5A3.5 3.5 0 0 1 42.5 15h15a3.5 3.5 0 0 1 3.5 3.5V25H39Z" fill="#d8a84e"/>
    <circle cx="50" cy="55" r="2.5" fill="#c63a3a"/>
    <circle cx="50" cy="64" r="1.4" fill="#d8a84e"/>
  </g>
  <g>
    <rect x="66.8" y="28.8" width="22" height="56" rx="3.5" fill="#050a08" opacity=".55"/>
    <rect x="65" y="27" width="22" height="56" rx="3.5" fill="#f6f0e2"/>
    <path d="M65 30.5A3.5 3.5 0 0 1 68.5 27h15a3.5 3.5 0 0 1 3.5 3.5V37H65Z" fill="#c63a3a"/>
    <circle cx="76" cy="65" r="2.5" fill="#1c241f"/>
    <circle cx="76" cy="73" r="1.4" fill="#c63a3a"/>
  </g>
</svg>
`;
}

mkdirSync(PUBLIC, { recursive: true });
writeFileSync(resolve(PUBLIC, 'pwa-192x192.png'), makeIcon(192));
writeFileSync(resolve(PUBLIC, 'pwa-512x512.png'), makeIcon(512));
writeFileSync(resolve(PUBLIC, 'apple-touch-icon.png'), makeIcon(180));
writeFileSync(resolve(PUBLIC, 'favicon.svg'), makeFaviconSvg());
console.log('Generated PWA icons in public/');
