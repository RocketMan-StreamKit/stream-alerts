/**
 * Google Fonts loader for the widget and the editor preview.
 */
import { FONTS, SYSTEM_FONTS } from '../shared/defaults';

/** Fonts whose stylesheet was already added. */
const loaded = new Set<string>();

/**
 * Adds the Google Fonts stylesheet for a font (no-op for system fonts or repeats).
 * Fonts outside {@link FONTS} (imported designs) are requested by name in the regular weight;
 * an unknown name simply fails to load and the text falls back to the default font.
 * @param name Font family.
 * @example ensureFont('Montserrat');
 * @example ensureFont('Exo 2'); // not in FONTS — loaded by name
 */
export const ensureFont = (name: string) => {
  if (!name || loaded.has(name)) return;
  const font = FONTS.find(f => f.name === name);
  if (font ? !font.axis : SYSTEM_FONTS.includes(name.toLowerCase())) return;
  loaded.add(name);
  const family = encodeURIComponent(name).replace(/%20/g, '+');
  const axis = !font || font.axis === '400' ? '' : `:wght@${font.axis}`;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family}${axis}&display=swap`;
  document.head.append(link);
};

/**
 * Waits until fonts are usable (bounded so a missing network never blocks an alert).
 * @param specs CSS font shorthands, e.g. `800 38px "Montserrat"`.
 * @param timeoutMs Maximum wait.
 * @returns Promise resolved when loaded or timed out.
 * @example await waitFonts(['800 38px "Montserrat"'], 1500);
 */
export const waitFonts = async (specs: string[], timeoutMs = 1500) => {
  if (!document.fonts) return;
  const loads = Promise.all(
    specs.map(spec => document.fonts.load(spec).catch(() => undefined))
  );
  await Promise.race([
    loads,
    new Promise(resolve => window.setTimeout(resolve, timeoutMs)),
  ]);
};
