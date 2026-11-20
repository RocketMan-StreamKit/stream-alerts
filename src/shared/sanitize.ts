/**
 * Validation helpers: every settings object coming from storage or the panel passes through
 * {@link sanitizeSettings}, so the worker and the widget never see malformed values.
 */
import {
  ANIMATIONS,
  MAX_VARIANTS,
  STAGE_POSITIONS,
  STANDARD_KINDS,
  TEXT_EFFECTS,
  TRIGGER_SYSTEMS,
  createDefaultSettings,
  createVariant,
  isCatalogKind,
  newId,
} from './defaults';
import type {
  AlertKind,
  AlertLayout,
  AlertsSettings,
  AlertVariant,
  KindConfig,
  TextStyle,
} from './types';

/** Maximum number of catalog kinds kept in settings. */
const MAX_CATALOG_KINDS = 300;

/** Loose object view of untrusted input. */
type Loose = Record<string, unknown>;

/** Allowed image layouts. */
const LAYOUTS: AlertLayout[] = [
  'image-above',
  'image-below',
  'image-left',
  'image-right',
  'image-behind',
  'text-only',
  'image-only',
];

/**
 * Returns `value` as a loose object (or an empty one).
 * @param value Raw value.
 * @returns Object.
 * @example obj(null); // {}
 */
export const obj = (value: unknown): Loose =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Loose)
    : {};

/**
 * Reads a finite number clamped to a range.
 * @param value Raw value.
 * @param fallback Used when parsing fails.
 * @param min Lower bound.
 * @param max Upper bound.
 * @returns Number.
 * @example num('12', 0, 0, 10); // 10
 */
export const num = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  const parsed =
    typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Math.min(
    max,
    Math.max(
      min,
      Number.isFinite(parsed) && value !== '' && value !== null
        ? parsed
        : fallback
    )
  );
};

/**
 * Reads a boolean.
 * @param value Raw value.
 * @param fallback Used when `value` is not boolean.
 * @returns Boolean.
 * @example bool(undefined, true); // true
 */
export const bool = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

/**
 * Reads a string trimmed to `max` characters.
 * @param value Raw value.
 * @param fallback Used when `value` is not a string.
 * @param max Maximum length.
 * @returns String.
 * @example str(5, 'x'); // 'x'
 */
export const str = (value: unknown, fallback: string, max = 300) =>
  typeof value === 'string' ? value.slice(0, max) : fallback;

/**
 * Reads one of the allowed string values.
 * @param value Raw value.
 * @param allowed Allowed values.
 * @param fallback Used when `value` is not allowed.
 * @returns Allowed value.
 * @example pick('zoom', ['fade', 'zoom'], 'fade'); // 'zoom'
 */
export const pick = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T => (allowed.includes(value as T) ? (value as T) : fallback);

/**
 * Reads a `#rrggbb` color.
 * @param value Raw value.
 * @param fallback Used when invalid.
 * @returns Hex color.
 * @example color('#FFF', '#000'); // '#ffffff'
 */
export const color = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v))
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return fallback;
};

/**
 * Reads a list of trimmed, non-empty strings.
 * @param value Raw value.
 * @param maxItems Maximum list size.
 * @returns String list.
 * @example strings([' a ', '', 3]); // ['a']
 */
export const strings = (value: unknown, maxItems = 500) =>
  (Array.isArray(value) ? value : [])
    .filter((v): v is string => typeof v === 'string')
    .map(v => v.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, maxItems);

/**
 * Validates a media reference (`''`, `builtin:x`, `media:x`, `http(s)://…`).
 * @param value Raw value.
 * @param fallback Used when invalid.
 * @returns Media reference.
 * @example mediaRef('javascript:alert(1)', ''); // ''
 */
export const mediaRef = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (
    v === '' ||
    /^(builtin|media):[\w-]{1,64}$/.test(v) ||
    /^https?:\/\/\S{3,1500}$/i.test(v)
  )
    return v;
  return fallback;
};

/**
 * Reads a currency code for variant conditions.
 * @param value Raw value.
 * @returns Upper-case code or `''` (app currency).
 * @example currencyCode('rub'); // 'RUB'
 * @example currencyCode('<b>'); // ''
 */
export const currencyCode = (value: unknown) => {
  const v = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3,6}$/.test(v) ? v : '';
};

/**
 * Sanitizes a text style block.
 * @param raw Raw style.
 * @param base Fallback style.
 * @returns Valid style.
 * @example textStyle({ size: 999 }, base.title).size; // 200
 */
const textStyle = (raw: Loose, base: TextStyle): TextStyle => ({
  font: str(raw.font, base.font, 60).replace(/[^\w\s-]/g, '') || base.font,
  size: Math.round(num(raw.size, base.size, 8, 200)),
  weight: Math.round(num(raw.weight, base.weight, 100, 900) / 100) * 100,
  color: color(raw.color, base.color),
  accent: color(raw.accent, base.accent),
  stroke: num(raw.stroke, base.stroke, 0, 12),
  strokeColor: color(raw.strokeColor, base.strokeColor),
  shadow: bool(raw.shadow, base.shadow),
  align: pick(raw.align, ['left', 'center', 'right'] as const, base.align),
  uppercase: bool(raw.uppercase, base.uppercase),
});

/**
 * Sanitizes one variant over a base.
 * @param rawValue Raw variant.
 * @param base Fallback variant (kind defaults).
 * @returns Valid variant.
 * @example sanitizeVariant({ durationMs: -5 }, createVariant('follow')).durationMs; // 1000
 */
export const sanitizeVariant = (
  rawValue: unknown,
  base: AlertVariant
): AlertVariant => {
  const raw = obj(rawValue);
  const cond = obj(raw.condition);
  const image = obj(raw.image);
  const sound = obj(raw.sound);
  const title = obj(raw.title);
  const message = obj(raw.message);
  const box = obj(raw.box);
  const anim = obj(raw.animation);
  const tts = obj(raw.tts);
  return {
    id:
      typeof raw.id === 'string' && /^[\w-]{1,40}$/.test(raw.id)
        ? raw.id
        : newId(),
    name: str(raw.name, base.name, 60),
    enabled: bool(raw.enabled, base.enabled),
    condition: {
      min: num(cond.min, base.condition.min, 0, 1e12),
      max: num(cond.max, base.condition.max, 0, 1e12),
      platforms: strings(cond.platforms, 20),
      values: strings(cond.values, 200),
      currency: currencyCode(cond.currency),
    },
    durationMs: Math.round(num(raw.durationMs, base.durationMs, 1000, 120000)),
    layout: pick(raw.layout, LAYOUTS, base.layout),
    image: {
      src: mediaRef(image.src, base.image.src),
      size: Math.round(num(image.size, base.image.size, 16, 1920)),
      radius: Math.round(num(image.radius, base.image.radius, 0, 999)),
    },
    sound: {
      src: mediaRef(sound.src, base.sound.src),
      volume: Math.round(num(sound.volume, base.sound.volume, 0, 100)),
      delayMs: Math.round(num(sound.delayMs, base.sound.delayMs, 0, 30000)),
    },
    title: {
      ...textStyle(title, base.title),
      template: str(title.template, base.title.template, 300),
    },
    message: {
      ...textStyle(message, base.message),
      show: bool(message.show, base.message.show),
      maxLength: Math.round(
        num(message.maxLength, base.message.maxLength, 10, 1000)
      ),
    },
    box: {
      width: Math.round(num(box.width, base.box.width, 120, 3840)),
      padding: Math.round(num(box.padding, base.box.padding, 0, 200)),
      radius: Math.round(num(box.radius, base.box.radius, 0, 200)),
      background: color(box.background, base.box.background),
      backgroundOpacity: Math.round(
        num(box.backgroundOpacity, base.box.backgroundOpacity, 0, 100)
      ),
      borderColor: color(box.borderColor, base.box.borderColor),
      borderWidth: Math.round(
        num(box.borderWidth, base.box.borderWidth, 0, 30)
      ),
      shadow: bool(box.shadow, base.box.shadow),
      gap: Math.round(num(box.gap, base.box.gap, 0, 200)),
    },
    animation: {
      enter: pick(anim.enter, ANIMATIONS, base.animation.enter),
      exit: pick(anim.exit, ANIMATIONS, base.animation.exit),
      enterMs: Math.round(num(anim.enterMs, base.animation.enterMs, 0, 5000)),
      exitMs: Math.round(num(anim.exitMs, base.animation.exitMs, 0, 5000)),
      text: pick(anim.text, TEXT_EFFECTS, base.animation.text),
    },
    tts: {
      enabled: bool(tts.enabled, base.tts.enabled),
      min: num(tts.min, base.tts.min, 0, 1e12),
      template: str(tts.template, base.tts.template, 300),
      volume: Math.round(num(tts.volume, base.tts.volume, 0, 100)),
    },
  };
};

/**
 * Sanitizes one kind configuration.
 * @param rawValue Raw kind config.
 * @param baseKind Current config (may be missing for newly discovered kinds).
 * @param kind Kind id.
 * @param lang UI language for defaults of newly created variants.
 * @returns Valid kind config.
 * @example sanitizeKind(raw.kinds.follow, base.kinds.follow, 'follow', 'en');
 */
const sanitizeKind = (
  rawValue: unknown,
  baseKind: KindConfig | undefined,
  kind: AlertKind,
  lang: string
): KindConfig => {
  const rk = obj(rawValue);
  const fallbackVariant = baseKind?.variants[0] ?? createVariant(kind, lang);
  const list = Array.isArray(rk.variants)
    ? rk.variants.slice(0, MAX_VARIANTS)
    : null;
  const variants = list
    ? list.map((v, i) =>
        sanitizeVariant(
          v,
          baseKind?.variants.find(b => b.id === obj(v).id) ??
            (i === 0 ? fallbackVariant : createVariant(kind, lang))
        )
      )
    : (baseKind?.variants ?? []);
  if (variants.length === 0) variants.push(createVariant(kind, lang));
  variants[0].enabled = true;
  const out: KindConfig = {
    enabled: bool(rk.enabled, baseKind?.enabled ?? false),
    variants,
  };
  if (isCatalogKind(kind)) {
    out.label = str(rk.label, baseKind?.label ?? '', 120) || undefined;
    out.source = str(rk.source, baseKind?.source ?? '', 120) || undefined;
  }
  return out;
};

/**
 * Sanitizes the whole settings object over a base.
 * @param rawValue Incoming settings (storage or panel).
 * @param base Settings used for missing / invalid fields.
 * @param lang UI language for defaults of newly created variants.
 * @returns Valid settings.
 * @example const next = sanitizeSettings(body.settings, db.settings);
 */
export const sanitizeSettings = (
  rawValue: unknown,
  base: AlertsSettings = createDefaultSettings(),
  lang = 'en'
): AlertsSettings => {
  const raw = obj(rawValue);
  const rawKinds = obj(raw.kinds);
  const kinds = {} as AlertsSettings['kinds'];
  const catalogKinds = [
    ...new Set([...Object.keys(base.kinds), ...Object.keys(rawKinds)]),
  ]
    .filter(isCatalogKind)
    .slice(0, MAX_CATALOG_KINDS);
  for (const kind of [...STANDARD_KINDS, ...catalogKinds]) {
    const hasRaw = kind in rawKinds;
    const baseKind: KindConfig | undefined = base.kinds[kind];
    if (!hasRaw && baseKind) {
      kinds[kind] = baseKind;
      continue;
    }
    kinds[kind] = sanitizeKind(rawKinds[kind], baseKind, kind, lang);
  }
  const queue = obj(raw.queue);
  const filters = obj(raw.filters);
  const hide = obj(filters.hideTriggered);
  const stage = obj(raw.stage);
  const hideTriggered = { ...base.filters.hideTriggered };
  for (const sys of TRIGGER_SYSTEMS)
    hideTriggered[sys] = bool(hide[sys], base.filters.hideTriggered[sys]);
  return {
    kinds,
    queue: {
      gapMs: Math.round(num(queue.gapMs, base.queue.gapMs, 0, 60000)),
      paused: bool(queue.paused, base.queue.paused),
      maxSize: Math.round(num(queue.maxSize, base.queue.maxSize, 1, 500)),
      expireSec: Math.round(
        num(queue.expireSec, base.queue.expireSec, 0, 86400)
      ),
    },
    filters: {
      hideTriggered,
      blockedUsers:
        'blockedUsers' in filters
          ? strings(filters.blockedUsers)
          : base.filters.blockedUsers,
      bannedWords:
        'bannedWords' in filters
          ? strings(filters.bannedWords)
          : base.filters.bannedWords,
    },
    stage: {
      position: pick(stage.position, STAGE_POSITIONS, base.stage.position),
      offsetX: Math.round(num(stage.offsetX, base.stage.offsetX, -4000, 4000)),
      offsetY: Math.round(num(stage.offsetY, base.stage.offsetY, -4000, 4000)),
      scale: Math.round(num(stage.scale, base.stage.scale, 10, 400)),
    },
    volume: Math.round(num(raw.volume, base.volume, 0, 100)),
  };
};
