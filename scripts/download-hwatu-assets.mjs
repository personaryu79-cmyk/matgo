import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Wikimedia Commons' traditional Korean-style hwatu set (CC BY-SA 4.0).
// Kind order mirrors MONTH_SEEDS in src/game/cards.ts.
const months = [
  ['January', [['gwang', 'Hikari'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['February', [['yeol', 'Tane'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['March', [['gwang', 'Hikari'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['April', [['yeol', 'Tane'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['May', [['yeol', 'Tane'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['June', [['yeol', 'Tane'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['July', [['yeol', 'Tane'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['August', [['gwang', 'Hikari'], ['yeol', 'Tane'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['September', [['yeol', 'Tane'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['October', [['yeol', 'Tane'], ['tti', 'Tanzaku'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2']]],
  ['November', [['gwang', 'Hikari'], ['pi', 'Kasu 1'], ['pi', 'Kasu 2'], ['pi', 'Kasu 3']]],
  ['December', [['gwang', 'Hikari'], ['yeol', 'Tane'], ['tti', 'Tanzaku'], ['pi', 'Kasu']]],
];

const outputDirectory = join(import.meta.dirname, '..', 'public', 'cards');
await mkdir(outputDirectory, { recursive: true });

for (let index = 0; index < months.length; index += 1) {
  const [monthName, cards] = months[index];
  const counts = new Map();
  for (const [kind, artwork] of cards) {
    const cardIndex = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, cardIndex);
    const fileName = `Hwatu_${monthName}_${artwork.replaceAll(' ', '_')}.png`;
    const url = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${fileName}?width=500`;
    const response = await fetch(url, { headers: { 'User-Agent': 'MatgoPWA/1.0 asset sync' } });
    if (!response.ok || !response.headers.get('content-type')?.includes('image/png')) {
      throw new Error(`Could not download ${fileName}: ${response.status} ${response.headers.get('content-type')}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const cardId = `m${String(index + 1).padStart(2, '0')}-${kind}-${cardIndex}`;
    await writeFile(join(outputDirectory, `${cardId}.png`), bytes);
    console.log(`${cardId}.png ← ${fileName} (${bytes.length} bytes)`);
  }
}

for (const directory of [outputDirectory, join(import.meta.dirname, '..', 'src', 'assets', 'cards')]) {
  try {
    for (const fileName of await readdir(directory)) {
      if (fileName.endsWith('.svg')) await unlink(join(directory, fileName));
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
