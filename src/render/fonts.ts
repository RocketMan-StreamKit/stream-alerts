/**
 * Google Fonts loader for the widget and the editor preview.
 */
import { FONTS } from '../shared/defaults';

/** Fonts whose stylesheet was already added. */
const loaded = new Set<string>();

/**
 * Adds the Google Fonts stylesheet for a font (no-op for system fonts or repeats).
 * @param name Font family.
 * @example ensureFont('Montserrat');
 */
export const ensureFont = (name: string) => {
  const font = FONTS.find(f => f.name === name);
  if (!font?.axis || loaded.has(name)) return;
  loaded.add(name);
  const family = name.replace(/ /g, '+');
  const axis = font.axis === '400' ? '' : `:wght@${font.axis}`;
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
