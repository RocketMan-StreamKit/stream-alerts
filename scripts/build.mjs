import { copyFileSync, existsSync, mkdirSync, readFileSync, watch } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const isWatch = process.argv.includes('--watch');

const { build } = await import('esbuild');

/**
 * Copies sources into `dist/` and bundles TypeScript when needed.
 * @returns {Promise<void>}
 */
async function runBuild() {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const icon = manifest.icon;
  if (!icon) {
    throw new Error('manifest.json must define an "icon" field');
  }

  mkdirSync(dist, { recursive: true });
  copyFileSync(join(root, 'manifest.json'), join(dist, 'manifest.json'));
  copyFileSync(join(src, icon), join(dist, icon));

  await build({
    entryPoints: [join(src, 'index.ts')],
    outfile: join(dist, 'index.js'),
    bundle: true,
    platform: 'neutral',
    format: 'iife',
  });
  copyFileSync(join(src, 'index.html'), join(dist, 'index.html'));
  copyFileSync(join(src, 'style.css'), join(dist, 'style.css'));
  copyFileSync(join(src, 'widget.html'), join(dist, 'widget.html'));


  for (const entry of ['app', 'widget']) {
    await build({
      entryPoints: [join(src, `${entry}.ts`)],
      outfile: join(dist, `${entry}.js`),
      bundle: true,
      platform: 'browser',
      format: 'iife',
      target: 'es2019',
    });
  }

  const missing = (manifest.web_contents ?? []).filter(file => !existsSync(join(dist, file)));
  if (missing.length) {
    throw new Error(`web_contents entries missing from dist/: ${missing.join(', ')}`);
  }

  console.log(`[build] ${new Date().toLocaleTimeString()} — done`);
}

/** @type {ReturnType<typeof setTimeout> | undefined} */
let rebuildTimer;
/** @type {boolean} */
let building = false;
/** @type {boolean} */
let rebuildQueued = false;

/**
 * Debounced rebuild used by watch mode.
 * @returns {void}
 */
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    void (async () => {
      if (building) {
        rebuildQueued = true;
        return;
      }
      building = true;
      try {
        await runBuild();
      } catch (error) {
        console.error('[build] failed:', error);
      } finally {
        building = false;
        if (rebuildQueued) {
          rebuildQueued = false;
          scheduleRebuild();
        }
      }
    })();
  }, 100);
}

await runBuild();

if (isWatch) {
  console.log('Watching src/ and manifest.json — Ctrl+C to stop');
  watch(src, { recursive: true }, scheduleRebuild);
  watch(join(root, 'manifest.json'), scheduleRebuild);
}

