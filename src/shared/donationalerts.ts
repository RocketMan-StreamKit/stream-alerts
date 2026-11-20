/**
 * DonationAlerts alert widget import (pure functions — no DOM, no sandbox globals).
 *
 * The public widget page (`https://www.donationalerts.com/widget/alerts?group_id=…&token=…`)
 * embeds the streamer's alert variations as JSON (`a_settings = $.parseJSON('…')`) and the
 * general widget settings (`handleGeneralWidgetSettings('…')`, incl. the main currency).
 * Only variations that are switched on in DonationAlerts are present on the page.
 * Only donation variations (`alert_type` 1) are imported; platform alerts (Twitch, YouTube, …)
 * are ignored because they come from the platform addons' own events in StreamKit+.
 */
import { createVariant } from './defaults';
import type { AlertLayout, AlertVariant, TextEffect, TextStyle } from './types';

/** DonationAlerts `alert_type` of donations. */
export const DA_ALERT_TYPE_DONATION = 1;

/** Host serving uploaded DonationAlerts media. */
export const DA_FILES_BASE = 'https://files.donationalerts.com/uploads/';

/**
 * Widget reference parsed from a link: the secret widget token and the variation group.
 * @example const ref: DaWidgetRef = { token: 'abc123…', groupId: 1 };
 */
export type DaWidgetRef = {
  /** Widget token (secret — never stored or logged). */
  token: string;
  /** Variation group the OBS source shows (`group_id`). */
  groupId: number;
};

/**
 * One variation condition as stored by DonationAlerts.
 * @example const c: DaCondition = { mode: 'amount_equal_to', value: 151 };
 */
export type DaCondition = {
  /** `alert_type`, `amount_equal_or_greater_than`, `amount_equal_to`, `random`, `months_in_a_row`, … */
  mode: string;
  /** Mode value (number or numeric string). */
  value: unknown;
};

/**
 * Raw variation fields used by the import (DonationAlerts sends many more).
 * @example const v: DaVariation = { entity_id: 1, group_id: 1, variation_conditions: '[]' };
 */
export type DaVariation = Record<string, unknown> & {
  /** Variation id. */
  entity_id?: unknown;
  /** Group id. */
  group_id?: unknown;
  /** JSON string or array of {@link DaCondition}. */
  variation_conditions?: unknown;
};

/**
 * Data extracted from the widget page.
 * @example const page: DaWidgetPage = { variations: [], currency: 'RUB' };
 */
export type DaWidgetPage = {
  /** All active variations of every group. */
  variations: DaVariation[];
  /** Main DonationAlerts currency (amount conditions use it). */
  currency: string;
};

/**
 * Why a variation is not selected for import by default.
 * - `silent`: zero display time, no image and no sound — DonationAlerts shows nothing (often used to
 *   reserve an amount for a game effect);
 * - `condition`: an amount condition this addon cannot express.
 * @example const note: DaImportNote = 'silent';
 */
export type DaImportNote = 'silent' | 'condition';

/**
 * One importable donation variation.
 * @example const item: DaImportItem = importDonationVariations(page, 1, 'ru')[0];
 */
export type DaImportItem = {
  /** DonationAlerts variation id. */
  sourceId: string;
  /** Variation name (`''` for the unnamed default variation). */
  name: string;
  /** Default variation (no amount condition) — becomes the base variant. */
  isDefault: boolean;
  /** Amount condition as shown to the user. */
  condition: { mode: 'gte' | 'eq' | 'none'; amount: number; currency: string };
  /** Has an image / video. */
  hasImage: boolean;
  /** Has a sound. */
  hasSound: boolean;
  /** Reasons to leave it unchecked by default. */
  notes: DaImportNote[];
  /** Ready-to-use variant (new id on every parse). */
  variant: AlertVariant;
};

/**
 * Result of a successful parse.
 * @example const res: DaImportResult = { groupId: 1, currency: 'RUB', groups: [{ id: 1, donations: 14 }], items: [] };
 */
export type DaImportResult = {
  /** Group from the link. */
  groupId: number;
  /** Currency of amount conditions. */
  currency: string;
  /** Donation variation count per group found on the page. */
  groups: { id: number; donations: number }[];
  /** Donation variations of the linked group. */
  items: DaImportItem[];
};

/**
 * Parses a widget link the user pasted.
 * Accepts `donationalerts.com` / `www.donationalerts.com` `/widget/alerts` links with a `token`.
 * @param input Pasted text.
 * @returns Widget reference or `null` when it is not an alert widget link.
 * @example parseWidgetUrl('https://www.donationalerts.com/widget/alerts?group_id=4&token=AbC123xyz'); // { token: 'AbC123xyz', groupId: 4 }
 * @example parseWidgetUrl('https://example.com/?token=1'); // null
 */
export const parseWidgetUrl = (input: string): DaWidgetRef | null => {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!/^(www\.)?donationalerts\.com$/i.test(url.hostname)) return null;
  if (!/^\/widget\/alerts\/?$/i.test(url.pathname)) return null;
  const token = url.searchParams.get('token') ?? '';
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(token)) return null;
  const group = Number(url.searchParams.get('group_id') ?? '1');
  const groupId =
    Number.isInteger(group) && group > 0 && group < 1000 ? group : 1;
  return { token, groupId };
};

/**
 * Canonical page URL for a widget reference (rebuilt from validated parts — the pasted text is
 * never requested as is).
 * @param ref Widget reference.
 * @returns HTTPS URL.
 * @example widgetPageUrl({ token: 'abc123', groupId: 1 }); // 'https://www.donationalerts.com/widget/alerts?group_id=1&token=abc123'
 */
export const widgetPageUrl = (ref: DaWidgetRef) =>
  `https://www.donationalerts.com/widget/alerts?group_id=${ref.groupId}&token=${encodeURIComponent(ref.token)}`;

/**
 * Decodes the body of a single-quoted JS string literal that wraps JSON.
 * @param literal Text between the quotes.
 * @returns Parsed JSON or `null`.
 * @example decodeJsJson('{\\"a\\":1}'); // { a: 1 }
 */
const decodeJsJson = (literal: string): unknown => {
  try {
    const jsonString = literal.replace(/\\(.)/gs, (_, c: string) =>
      c === "'" ? "'" : `\\${c}`
    );
    return JSON.parse(JSON.parse(`"${jsonString}"`));
  } catch {
    return null;
  }
};

/**
 * Finds `{call}('…')` in the page and decodes its JSON argument.
 * @param html Page HTML.
 * @param call Call prefix as it appears in the page.
 * @returns Parsed JSON or `null`.
 * @example findJsonCall(html, 'a_settings = $.parseJSON');
 */
const findJsonCall = (html: string, call: string): unknown => {
  const start = html.indexOf(`${call}('`);
  if (start < 0) return null;
  const match = /^'((?:[^'\\]|\\.)*)'\)/s.exec(
    html.slice(start + call.length + 1)
  );
  return match ? decodeJsJson(match[1]) : null;
};

/**
 * Extracts variations and the main currency from the widget page HTML.
 * @param html Page HTML.
 * @returns Page data or `null` when the page has no alert settings (bad token, changed layout).
 * @example extractWidgetPage(html)?.variations.length; // 39
 */
export const extractWidgetPage = (html: string): DaWidgetPage | null => {
  const settings = findJsonCall(html, 'a_settings = $.parseJSON') as {
    variations?: unknown;
  } | null;
  if (!settings || !Array.isArray(settings.variations)) return null;
  const general = findJsonCall(html, 'handleGeneralWidgetSettings') as {
    main_currency?: unknown;
  } | null;
  const code =
    typeof general?.main_currency === 'string'
      ? general.main_currency.toUpperCase()
      : '';
  return {
    variations: settings.variations.filter(
      (v): v is DaVariation => !!v && typeof v === 'object'
    ),
    currency: /^[A-Z]{3}$/.test(code) ? code : 'RUB',
  };
};

/**
 * Number from a DonationAlerts field (numbers often arrive as strings like `"8.50"`).
 * @param value Raw value.
 * @param fallback Used when not numeric.
 * @returns Number.
 * @example num('8.50', 0); // 8.5
 */
const num = (value: unknown, fallback = 0) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Conditions of a variation.
 * @param variation Variation.
 * @returns Condition list.
 * @example conditionsOf({ variation_conditions: '[{"mode":"alert_type","value":"1"}]' }); // [{ mode: 'alert_type', value: '1' }]
 */
const conditionsOf = (variation: DaVariation): DaCondition[] => {
  let raw = variation.variation_conditions;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(raw)
    ? raw.filter(
        (c): c is DaCondition =>
          !!c &&
          typeof c === 'object' &&
          typeof (c as DaCondition).mode === 'string'
      )
    : [];
};

/**
 * Whether a variation is a donation alert.
 * @param variation Variation.
 * @returns True for `alert_type` 1.
 * @example isDonationVariation(v); // true
 */
export const isDonationVariation = (variation: DaVariation) =>
  conditionsOf(variation).some(
    c => c.mode === 'alert_type' && num(c.value) === DA_ALERT_TYPE_DONATION
  );

/**
 * Parses a CSS color (`#rgb`, `#rrggbb`, `rgb()`, `rgba()`).
 * @param value CSS color.
 * @returns Hex color and alpha 0–1, or `null`.
 * @example cssColor('rgba(0, 0, 0, 0.45)'); // { hex: '#000000', alpha: 0.45 }
 */
export const cssColor = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  const hex6 = /^#([0-9a-f]{6})$/.exec(v);
  if (hex6) return { hex: `#${hex6[1]}`, alpha: 1 };
  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (hex3)
    return {
      hex: `#${hex3[1]}${hex3[1]}${hex3[2]}${hex3[2]}${hex3[3]}${hex3[3]}`,
      alpha: 1,
    };
  const rgb =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
      v
    );
  if (!rgb) return null;
  const part = (n: string) =>
    Math.max(0, Math.min(255, Math.round(Number(n))))
      .toString(16)
      .padStart(2, '0');
  return {
    hex: `#${part(rgb[1])}${part(rgb[2])}${part(rgb[3])}`,
    alpha: rgb[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgb[4]))),
  };
};

/**
 * Parsed `header_text` / `message_text` JSON.
 * @example const style: DaTextJson = { font_style: { color: '#fff' }, font_animation: { 'text-animation': 'tada' } };
 */
type DaTextJson = {
  font_style?: Record<string, unknown>;
  font_animation?: Record<string, unknown>;
};

/**
 * Parses a text style JSON field.
 * @param value Raw field.
 * @returns Parsed object (empty when missing or invalid).
 * @example textJson('{"font_style":{}}'); // { font_style: {} }
 */
const textJson = (value: unknown): DaTextJson => {
  if (typeof value !== 'string' || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Converts a DonationAlerts text style into ours (keeps `base` for anything missing).
 * @param json Parsed style JSON.
 * @param base Default style.
 * @returns Style.
 * @example textStyle(textJson(v.header_text), variant.title);
 */
const textStyle = <T extends TextStyle>(json: DaTextJson, base: T): T => {
  const fs = json.font_style ?? {};
  const out = { ...base };
  if (typeof fs['font-family'] === 'string') {
    const font = fs['font-family']
      .split(',')[0]
      .replace(/["']/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim();
    if (font) out.font = font;
  }
  const size = parseFloat(String(fs['font-size'] ?? ''));
  if (size > 0) out.size = Math.round(size);
  const weight = String(fs['font-weight'] ?? '');
  if (weight === 'bold' || weight === 'bolder') out.weight = 700;
  else if (weight === 'normal') out.weight = 400;
  else if (/^\d{3}$/.test(weight)) out.weight = Number(weight);
  const fg = cssColor(fs.color);
  if (fg) {
    out.color = fg.hex;
    out.accent = fg.hex;
  }
  const shadow = parseFloat(String(fs['text-shadow'] ?? '0'));
  out.shadow = shadow > 0;
  out.stroke = 0;
  const align = fs['text-align'];
  if (align === 'left' || align === 'center' || align === 'right')
    out.align = align;
  out.uppercase = fs['text-transform'] === 'uppercase';
  return out;
};

/**
 * DonationAlerts text animations (animate.css names) → our looping text effects.
 * @example DA_TEXT_EFFECT.tada; // 'jelly'
 */
const DA_TEXT_EFFECT: Record<string, TextEffect> = {
  none: 'none',
  pulse: 'pulse',
  heartBeat: 'pulse',
  tada: 'jelly',
  jello: 'jelly',
  rubberBand: 'jelly',
  wobble: 'jelly',
  swing: 'wave',
  bounce: 'wave',
  wave: 'wave',
  shake: 'shake',
  headShake: 'shake',
  flash: 'glow',
};

/**
 * `display_pattern` → our layout.
 * @example DA_LAYOUT.image_back__text_front; // 'image-behind'
 */
const DA_LAYOUT: Record<string, AlertLayout> = {
  image_top__text_bottom: 'image-above',
  image_bottom__text_top: 'image-below',
  image_left__text_right: 'image-left',
  image_right__text_left: 'image-right',
  image_back__text_front: 'image-behind',
};

/**
 * Absolute URL of a DonationAlerts media path (`images/2/star.gif`, names may be Cyrillic).
 * @param value Raw `image` / `sound` field.
 * @returns HTTPS URL or `''`.
 * @example mediaUrl('sounds/15766/ТРУБЫ УПАЛИ.mp3'); // 'https://files.donationalerts.com/uploads/sounds/15766/%D0%A2…'
 */
export const mediaUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const v = value.trim();
  if (/^https:\/\/\S+$/i.test(v)) return v.length <= 1500 ? v : '';
  if (v.split('/').some(part => part === '..' || part === '.')) return '';
  const url =
    DA_FILES_BASE +
    v
      .replace(/^\/+/, '')
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/');
  return url.length <= 1500 ? url : '';
};

/**
 * Converts a DonationAlerts title template (`{username}`) to ours (`{name}`).
 * @param template DA template.
 * @param fallback Used when empty.
 * @returns Template.
 * @example convertTemplate('{username} - {amount}!', ''); // '{name} - {amount}!'
 */
export const convertTemplate = (template: unknown, fallback: string) => {
  if (typeof template !== 'string' || !template.trim()) return fallback;
  return template
    .replace(/\{username\}/gi, '{name}')
    .replace(/\{giver\}/gi, '{name}')
    .slice(0, 300);
};

/**
 * Builds our variant from one DonationAlerts donation variation.
 * @param v Variation.
 * @param base Defaults (a fresh donation variant).
 * @returns Variant (condition is set by the caller).
 * @example const variant = variantFromDa(v, createVariant('donation', 'ru'));
 */
const variantFromDa = (v: DaVariation, base: AlertVariant): AlertVariant => {
  const image = mediaUrl(v.image);
  const sound = mediaUrl(v.sound);
  const layout = DA_LAYOUT[String(v.display_pattern)] ?? 'image-above';
  const header = textJson(v.header_text);
  const message = textJson(v.message_text);
  const card = cssColor(v.message_background);
  const animation = String(header.font_animation?.['text-animation'] ?? 'none');
  const ttsMin = num(v.tts_amount_min);
  return {
    ...base,
    name:
      typeof v.name === 'string' && v.name.trim()
        ? v.name.trim().slice(0, 60)
        : base.name,
    enabled: num(v.is_active, 1) === 1 && num(v.is_temporary_disabled) !== 1,
    durationMs: Math.round(
      Math.max(1, num(v.display_duration, base.durationMs / 1000)) * 1000
    ),
    layout: image ? layout : 'text-only',
    image: {
      ...base.image,
      src: image,
      size: layout === 'image-behind' ? base.box.width : base.image.size,
    },
    sound: {
      ...base.sound,
      src: sound,
      volume: Math.round(
        Math.max(0, Math.min(100, num(v.volume, base.sound.volume)))
      ),
      delayMs: 0,
    },
    title: {
      ...textStyle(header, base.title),
      template: convertTemplate(v.header_template, '{name} - {amount}!'),
    },
    message: {
      ...textStyle(message, base.message),
      show: true,
    },
    box: {
      ...base.box,
      background: card?.hex ?? base.box.background,
      backgroundOpacity: Math.round((card?.alpha ?? 0) * 100),
      borderWidth: 0,
      shadow: false,
    },
    animation: {
      ...base.animation,
      text:
        DA_TEXT_EFFECT[animation] ?? (animation === 'none' ? 'none' : 'pulse'),
    },
    tts: {
      ...base.tts,
      enabled: num(v.tts_is_enabled) === 1,
      min: ttsMin > 1 ? ttsMin : 0,
      volume: Math.round(
        Math.max(0, Math.min(100, num(v.tts_volume, base.tts.volume)))
      ),
    },
  };
};

/**
 * Builds the import list for one group: donation variations only, default variation first,
 * then by amount.
 * @param page Extracted page.
 * @param groupId Group from the link.
 * @param lang UI language for defaults.
 * @returns Import result.
 * @example importDonationVariations(page, 1, 'ru').items.length; // 15
 */
export const importDonationVariations = (
  page: DaWidgetPage,
  groupId: number,
  lang: string
): DaImportResult => {
  const donations = page.variations.filter(isDonationVariation);
  const counts = new Map<number, number>();
  for (const v of donations) {
    const g = num(v.group_id, 1);
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const items: DaImportItem[] = donations
    .filter(v => num(v.group_id, 1) === groupId)
    .map(v => {
      const amountConds = conditionsOf(v).filter(c =>
        c.mode.startsWith('amount_')
      );
      const gte = amountConds.find(
        c => c.mode === 'amount_equal_or_greater_than'
      );
      const eq = amountConds.find(c => c.mode === 'amount_equal_to');
      const known = gte ?? eq;
      const unsupported = amountConds.some(
        c =>
          c.mode !== 'amount_equal_or_greater_than' &&
          c.mode !== 'amount_equal_to'
      );
      const amount = known ? Math.max(0, num(known.value)) : 0;
      const isDefault = !amountConds.length;
      const variant = variantFromDa(v, createVariant('donation', lang));
      variant.condition = {
        min: amount,
        max: eq ? amount : 0,
        platforms: [],
        values: [],
        currency: page.currency,
      };
      const notes: DaImportNote[] = [];
      if (
        num(v.display_duration) <= 0 &&
        !variant.image.src &&
        !variant.sound.src
      )
        notes.push('silent');
      if (unsupported) notes.push('condition');
      return {
        sourceId: String(v.entity_id ?? ''),
        name: typeof v.name === 'string' ? v.name.trim() : '',
        isDefault,
        condition: {
          mode: eq ? 'eq' : gte ? 'gte' : 'none',
          amount,
          currency: page.currency,
        },
        hasImage: !!variant.image.src,
        hasSound: !!variant.sound.src,
        notes,
        variant,
      } satisfies DaImportItem;
    })
    .sort(
      (a, b) =>
        Number(b.isDefault) - Number(a.isDefault) ||
        a.condition.amount - b.condition.amount ||
        Number(a.condition.mode === 'eq') - Number(b.condition.mode === 'eq')
    );
  return {
    groupId,
    currency: page.currency,
    groups: [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, donationsCount]) => ({ id, donations: donationsCount })),
    items,
  };
};
