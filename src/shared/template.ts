/**
 * Template helpers: `{token}` substitution with highlight segments and variant selection.
 */
import type { AlertEvent, AlertVariant, AlertVars, KindConfig } from './types';

/**
 * One piece of rendered template text.
 * @example const seg: TemplateSegment = { text: 'Bob', accent: true };
 */
export type TemplateSegment = {
  /** Text. */
  text: string;
  /** Rendered with the accent color / text effect. */
  accent: boolean;
};

/**
 * Tokens supported in templates.
 * @example TEMPLATE_TOKENS.includes('name'); // true
 */
export const TEMPLATE_TOKENS: (keyof AlertVars)[] = [
  'name',
  'amount',
  'count',
  'months',
  'tier',
  'event',
  'value',
  'platform',
  'message',
];

/**
 * Splits a template into plain and highlighted segments.
 * Unknown tokens stay as literal text; empty values collapse.
 * @param template Template string.
 * @param vars Values.
 * @returns Segments.
 * @example renderSegments('{name} donated {amount}', { name: 'Bob', amount: '5 $' });
 * // [{ text: 'Bob', accent: true }, { text: ' donated ', accent: false }, { text: '5 $', accent: true }]
 */
export const renderSegments = (
  template: string,
  vars: AlertVars
): TemplateSegment[] => {
  const out: TemplateSegment[] = [];
  const re = /\{(\w+)\}/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(template))) {
    if (match.index > last)
      out.push({ text: template.slice(last, match.index), accent: false });
    const key = match[1] as keyof AlertVars;
    if (TEMPLATE_TOKENS.includes(key)) {
      const value = vars[key];
      if (value) out.push({ text: String(value), accent: true });
    } else {
      out.push({ text: match[0], accent: false });
    }
    last = re.lastIndex;
  }
  if (last < template.length)
    out.push({ text: template.slice(last), accent: false });
  return out;
};

/**
 * Renders a template to plain text (used for TTS).
 * @param template Template string.
 * @param vars Values.
 * @returns Text with single spaces.
 * @example renderText('{name}: {message}', { name: 'Bob' }); // 'Bob:'
 */
export const renderText = (template: string, vars: AlertVars) =>
  renderSegments(template, vars)
    .map(s => s.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Checks whether a variant's condition matches an event.
 * @param variant Variant.
 * @param event Event.
 * @returns True on match.
 * @example variantMatches(bigDonation, { ...ev, value: 1000 }); // true
 */
export const variantMatches = (variant: AlertVariant, event: AlertEvent) => {
  const c = variant.condition;
  if (c.min > 0 && event.value < c.min) return false;
  if (c.max > 0 && event.value > c.max) return false;
  if (c.platforms.length && !c.platforms.includes(event.platform)) return false;
  if (c.values.length && !c.values.includes(event.valueId ?? '')) return false;
  return true;
};

/**
 * Priority of a matching variant: variants bound to specific trigger values (a particular
 * reward, tier, …) beat amount-only variants; among equals the higher `min` wins.
 * @param variant Variant.
 * @returns Score.
 * @example variantScore(v); // 1e15 + v.condition.min when v has values
 */
const variantScore = (variant: AlertVariant) =>
  (variant.condition.values.length ? 1e15 : 0) + variant.condition.min;

/**
 * Picks the variant for an event: the best-scoring enabled conditional variant that matches
 * (see {@link variantScore}), otherwise the base variant.
 * @param config Kind configuration.
 * @param event Event.
 * @returns Variant.
 * @example pickVariant(settings.kinds.donation, event).name;
 */
export const pickVariant = (
  config: KindConfig,
  event: AlertEvent
): AlertVariant => {
  let best: AlertVariant | null = null;
  for (const variant of config.variants.slice(1)) {
    if (!variant.enabled || !variantMatches(variant, event)) continue;
    if (!best || variantScore(variant) >= variantScore(best)) best = variant;
  }
  return best ?? config.variants[0];
};
