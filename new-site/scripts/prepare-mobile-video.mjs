// Run after preparing the licensed source films:
// GFORCE_FFMPEG=/path/to/ffmpeg node scripts/prepare-mobile-video.mjs
// Mobile media uses hardware-friendly H.264, a front-loaded index and one decoder.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const root = new URL('../', import.meta.url);
const base = JSON.parse(await readFile(new URL('src/data/media.json', root), 'utf8'));
const air = JSON.parse(await readFile(new URL('src/data/media-air.json', root), 'utf8'));
const entries = new Map([...base, ...air].map((entry) => [entry.slot, entry]));
const result = [];
for (const entry of entries.values()) {
  if (entry.kind !== 'video' || !entry.sources?.mp4) continue;
  const output = entry.sources.mp4.replace(/-960\.mp4$/, '-mobile-640.mp4');
  if (entry.slot !== 'sky-daylight') {
    await run(process.env.GFORCE_FFMPEG || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', new URL(`public${entry.sources.mp4}`, root).pathname,
      '-an', '-vf', 'scale=640:-2,fps=24', '-c:v', 'libx264',
      '-preset', 'medium', '-crf', '27', '-profile:v', 'main', '-level', '3.1',
      '-pix_fmt', 'yuv420p', '-g', '48', '-movflags', '+faststart',
      new URL(`public${output}`, root).pathname,
    ]);
    const bytes = (await stat(new URL(`public${output}`, root))).size;
    console.log(`${entry.slot}: ${Math.round(bytes / 1024)} KiB`);
  }
  result.push({ ...entry, sources: { ...entry.sources, mp4Mobile: output } });
}
await writeFile(new URL('src/data/media-mobile.json', root), JSON.stringify(result, null, 2) + '\n');
