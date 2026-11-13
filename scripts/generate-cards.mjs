import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const months = [
  '송학', '매조', '벚꽃', '흑싸리', '난초', '모란',
  '홍싸리', '공산', '국화', '단풍', '오동', '비',
];
const monthColors = [
  '#a93232', '#ad3d52', '#df7185', '#62844a', '#73934b', '#bd5572',
  '#8d3345', '#547b9c', '#d39a35', '#b75c36', '#74528b', '#527d9b',
];
const ribbonColors = {
  1: '#bf3b3b', 2: '#bf3b3b', 3: '#bf3b3b',
  4: '#658447', 5: '#658447', 6: '#426eaa',
  7: '#658447', 9: '#426eaa', 10: '#426eaa', 12: '#79559b',
};
const monthCards = [
  ['gwang', 'tti', 'pi', 'pi'],
  ['yeol', 'tti', 'pi', 'pi'],
  ['gwang', 'tti', 'pi', 'pi'],
  ['yeol', 'tti', 'pi', 'pi'],
  ['yeol', 'tti', 'pi', 'pi'],
  ['yeol', 'tti', 'pi', 'pi'],
  ['yeol', 'tti', 'pi', 'pi'],
  ['gwang', 'yeol', 'pi', 'pi'],
  ['yeol', 'tti', 'pi', 'pi'],
  ['yeol', 'tti', 'pi', 'pi'],
  ['gwang', 'pi', 'pi', 'pi'],
  ['gwang', 'yeol', 'tti', 'pi'],
];
const specialName = {
  '01-gwang-1': '광', '02-yeol-1': '새', '03-gwang-1': '광',
  '04-yeol-1': '새', '05-yeol-1': '난', '06-yeol-1': '나비',
  '07-yeol-1': '멧돼지', '08-gwang-1': '광', '08-yeol-1': '기러기',
  '09-yeol-1': '국진', '10-yeol-1': '사슴', '11-gwang-1': '광',
  '12-gwang-1': '비광', '12-yeol-1': '제비',
};

function flower(x, y, color, radius = 7) {
  return `<g transform="translate(${x} ${y})" fill="${color}" stroke="#8d493d" stroke-width=".8">
    <ellipse cy="-${radius * 0.58}" rx="${radius * 0.34}" ry="${radius * 0.65}"/>
    <ellipse cy="-${radius * 0.58}" rx="${radius * 0.34}" ry="${radius * 0.65}" transform="rotate(72)"/>
    <ellipse cy="-${radius * 0.58}" rx="${radius * 0.34}" ry="${radius * 0.65}" transform="rotate(144)"/>
    <ellipse cy="-${radius * 0.58}" rx="${radius * 0.34}" ry="${radius * 0.65}" transform="rotate(216)"/>
    <ellipse cy="-${radius * 0.58}" rx="${radius * 0.34}" ry="${radius * 0.65}" transform="rotate(288)"/>
    <circle r="${radius * 0.22}" fill="#e7bd55" stroke="none"/>
  </g>`;
}

function illustration(month, kind, index) {
  const color = monthColors[month - 1];
  const accent = monthColors[(month + 4) % 12];
  const name = specialName[`${String(month).padStart(2, '0')}-${kind}-1`];
  if (kind === 'gwang') {
    return `<g>
      <circle cx="120" cy="158" r="68" fill="#f6df9d" stroke="#b33a32" stroke-width="5"/>
      <circle cx="120" cy="158" r="57" fill="none" stroke="#c49a45" stroke-width="2" stroke-dasharray="3 5"/>
      ${flower(120, 108, color, 11)}${flower(78, 158, accent, 9)}${flower(162, 158, accent, 9)}
      <path d="M83 203 Q120 184 157 203" fill="none" stroke="#436c4d" stroke-width="5" stroke-linecap="round"/>
      <text x="120" y="178" text-anchor="middle" font-size="47" font-weight="700" fill="#8f302e">光</text>
      <text x="120" y="260" text-anchor="middle" font-size="17" font-weight="700" fill="#623e32">${name ?? months[month - 1]}</text>
    </g>`;
  }
  if (kind === 'tti') {
    const ribbon = ribbonColors[month] ?? color;
    return `<g>
      <path d="M48 105 Q120 85 192 105 L192 222 Q120 242 48 222Z" fill="#fffaf0" stroke="#d2c5a6" stroke-width="2"/>
      <path d="M52 126 Q120 109 188 126 L188 184 Q120 201 52 184Z" fill="${ribbon}"/>
      <path d="M52 134 Q120 117 188 134 M52 176 Q120 193 188 176" fill="none" stroke="#f7e7c8" stroke-width="3"/>
      <circle cx="72" cy="155" r="7" fill="#f6e8c9"/><circle cx="168" cy="155" r="7" fill="#f6e8c9"/>
      ${flower(120, 155, '#f2d982', 18)}
      <text x="120" y="255" text-anchor="middle" font-size="18" font-weight="700" fill="#49392e">${months[month - 1]} 띠</text>
    </g>`;
  }
  if (kind === 'yeol') {
    return `<g>
      <path d="M55 210 Q80 160 111 143 Q123 110 159 112 Q185 116 185 143 Q170 161 146 162 Q130 205 94 221Z" fill="${color}" stroke="#573c32" stroke-width="4" stroke-linejoin="round"/>
      <path d="M109 150 Q143 125 169 136 Q148 158 122 168 M91 202 Q119 184 146 180" fill="none" stroke="#f1d49a" stroke-width="5" stroke-linecap="round"/>
      <circle cx="164" cy="132" r="3" fill="#252522"/>
      ${flower(73, 112, accent, 10)}${flower(177, 208, accent, 8)}
      <path d="M55 236 Q120 220 185 236" fill="none" stroke="#66814d" stroke-width="4" stroke-linecap="round"/>
      <text x="120" y="270" text-anchor="middle" font-size="17" font-weight="700" fill="#49392e">${name ?? months[month - 1]}</text>
    </g>`;
  }
  const shift = index === 2 ? 12 : 0;
  return `<g>
    <path d="M72 226 Q95 198 111 165 Q127 132 161 105 M109 169 Q82 159 67 137 M126 142 Q153 153 176 145 M94 195 Q69 194 57 180" fill="none" stroke="#59784c" stroke-width="5" stroke-linecap="round"/>
    ${flower(161, 105, color, 15)}${flower(67, 137, accent, 10)}${flower(176, 145, color, 9)}${flower(57, 180, accent, 8)}${flower(120 + shift, 170, color, 10)}
    <path d="M53 238 Q120 221 187 238" fill="none" stroke="#bca878" stroke-width="2"/>
    <text x="120" y="270" text-anchor="middle" font-size="17" font-weight="700" fill="#49392e">${months[month - 1]} 피</text>
  </g>`;
}

function makeSvg(month, kind, index) {
  const id = `m${String(month).padStart(2, '0')}-${kind}-${index}`;
  const label = `${months[month - 1]} ${kind === 'gwang' ? '광' : kind === 'yeol' ? '열끗' : kind === 'tti' ? '띠' : '피'}`;
  const accent = monthColors[month - 1];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 336" role="img" aria-labelledby="title-${id}">
  <title id="title-${id}">${label}</title>
  <defs>
    <linearGradient id="paper-${id}" x2="0" y2="1"><stop stop-color="#fffdf5"/><stop offset="1" stop-color="#eee3c8"/></linearGradient>
    <filter id="shadow-${id}" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#332b20" flood-opacity=".22"/></filter>
  </defs>
  <rect x="5" y="5" width="230" height="326" rx="12" fill="url(#paper-${id})" stroke="#6f5038" stroke-width="3" filter="url(#shadow-${id})"/>
  <rect x="13" y="13" width="214" height="310" rx="8" fill="none" stroke="${accent}" stroke-width="2"/>
  <path d="M22 52 H218" stroke="#d9c9a5" stroke-width="2"/>
  <circle cx="30" cy="32" r="12" fill="${accent}"/><text x="30" y="37" text-anchor="middle" font-size="13" font-weight="700" fill="#fffaf0">${month}</text>
  <text x="48" y="38" font-size="15" font-weight="700" fill="#4c4031">${months[month - 1]}</text>
  <g>${illustration(month, kind, index)}</g>
  <path d="M22 293 H218" stroke="#d9c9a5" stroke-width="2"/>
  <text x="120" y="314" text-anchor="middle" font-size="12" letter-spacing="3" fill="#806b4a">MATGO · ${String(month).padStart(2, '0')}</text>
</svg>`;
}

for (const directory of ['public/cards', 'src/assets/cards']) {
  await mkdir(directory, { recursive: true });
  const expected = new Set();
  for (let month = 1; month <= 12; month += 1) {
    const counts = new Map();
    for (const kind of monthCards[month - 1]) {
      const index = (counts.get(kind) ?? 0) + 1;
      counts.set(kind, index);
      const filename = `m${String(month).padStart(2, '0')}-${kind}-${index}.svg`;
      expected.add(filename);
      await writeFile(join(directory, filename), makeSvg(month, kind, index));
    }
  }
  for (const filename of await readdir(directory)) {
    if (filename.endsWith('.svg') && !expected.has(filename)) {
      await unlink(join(directory, filename));
    }
  }
}
