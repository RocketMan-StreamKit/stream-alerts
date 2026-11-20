/**
 * Default settings, built-in media catalogs and sample events.
 */
import type {
  AlertEvent,
  AlertKind,
  AlertsSettings,
  AlertVariant,
  CatalogEntry,
  EnterAnimation,
  KindConfig,
  LocalizedText,
  StagePosition,
  StandardKind,
  TextEffect,
  TriggerSystem,
} from './types';

/**
 * Standard alert kinds in panel order (platform events come from the trigger catalog).
 * @example STANDARD_KINDS.forEach(kind => console.log(kind));
 */
export const STANDARD_KINDS: StandardKind[] = [
  'donation',
  'subscribe',
  'subgift',
  'follow',
  'custom',
];

/**
 * Systems listed in the "hide triggered" filter, in panel order.
 * @example TRIGGER_SYSTEMS.includes('overlay'); // true
 */
export const TRIGGER_SYSTEMS: TriggerSystem[] = [
  'overlay',
  'sounds',
  'hotkeys',
  'game',
  'coop',
  'timer',
  'addon',
];

/**
 * Entrance / exit animations in panel order.
 * @example ANIMATIONS[0]; // 'none'
 */
export const ANIMATIONS: EnterAnimation[] = [
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom',
  'pop',
  'bounce',
  'flip',
  'spin',
  'blur',
];

/**
 * Text effects in panel order.
 * @example TEXT_EFFECTS.includes('wave'); // true
 */
export const TEXT_EFFECTS: TextEffect[] = [
  'none',
  'wave',
  'pulse',
  'shake',
  'glow',
  'rainbow',
  'jelly',
];

/**
 * Stage anchors in 3×3 grid order.
 * @example STAGE_POSITIONS[4]; // 'center'
 */
export const STAGE_POSITIONS: StagePosition[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
];

/**
 * Fonts offered in the editor. Fonts with `axis` are loaded from Google Fonts (all support Cyrillic);
 * `axis` is the weight range of the variable font, `'400'` for single-weight fonts.
 * @example FONTS.find(f => f.name === 'Montserrat')?.axis; // '100..900'
 */
export const FONTS: { name: string; axis?: string }[] = [
  { name: 'Montserrat', axis: '100..900' },
  { name: 'Inter', axis: '100..900' },
  { name: 'Rubik', axis: '300..900' },
  { name: 'Unbounded', axis: '200..900' },
  { name: 'Russo One', axis: '400' },
  { name: 'Oswald', axis: '200..700' },
  { name: 'Comfortaa', axis: '300..700' },
  { name: 'Nunito', axis: '200..1000' },
  { name: 'Lobster', axis: '400' },
  { name: 'Pacifico', axis: '400' },
  { name: 'Press Start 2P', axis: '400' },
  { name: 'Arial' },
  { name: 'Georgia' },
  { name: 'Impact' },
];

/**
 * Locally installed fonts that are never requested from Google Fonts. Any other font name that
 * is not in {@link FONTS} (e.g. `Exo 2` from an imported DonationAlerts alert) is loaded from
 * Google Fonts by name.
 * @example SYSTEM_FONTS.includes('arial'); // true
 */
export const SYSTEM_FONTS = [
  'arial',
  'georgia',
  'impact',
  'verdana',
  'tahoma',
  'times new roman',
  'trebuchet ms',
  'courier new',
  'comic sans ms',
  'segoe ui',
  'helvetica',
  'sans-serif',
  'serif',
  'monospace',
];

/**
 * Maximum variants per alert kind (base included).
 * @example if (cfg.variants.length < MAX_VARIANTS) addVariant();
 */
export const MAX_VARIANTS = 60;

/**
 * Built-in sounds (synthesized in the widget with Web Audio — no files needed).
 * @example BUILTIN_SOUNDS.map(s => `builtin:${s}`);
 */
export const BUILTIN_SOUNDS = [
  'chime',
  'coin',
  'fanfare',
  'levelup',
  'bell',
  'pop',
  'sparkle',
  'whoosh',
  'drumroll',
] as const;

/**
 * Built-in images (large animated emoji — no files needed).
 * @example BUILTIN_IMAGES.party; // '🎉'
 */
export const BUILTIN_IMAGES: Record<string, string> = {
  party: '🎉',
  money: '💸',
  gem: '💎',
  heart: '💜',
  star: '⭐',
  fire: '🔥',
  rocket: '🚀',
  crown: '👑',
  gift: '🎁',
  trophy: '🏆',
  sparkles: '✨',
  wave: '👋',
};

/**
 * Generates a short random id.
 * @returns 10-character id.
 * @example newId(); // 'k3j9x0a1bq'
 */
export const newId = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

/**
 * Design preset of one kind (differences from the generic variant).
 * @example const preset: KindPreset = KIND_PRESETS.follow;
 */
type KindPreset = {
  /** Title template. */
  template: string;
  /** TTS template. */
  tts: string;
  /** Image reference. */
  image: string;
  /** Sound reference. */
  sound: string;
  /** Accent color. */
  accent: string;
  /** Show the viewer message line. */
  message: boolean;
  /** On-screen time, ms. */
  duration: number;
};

/**
 * Per-kind defaults for the standard kinds.
 * @example KIND_PRESETS.follow.title;
 */
const KIND_PRESETS: Record<StandardKind, KindPreset> = {
  donation: {
    template: '{name} donated {amount}!',
    tts: '{name} donated {amount}. {message}',
    image: 'builtin:money',
    sound: 'builtin:coin',
    accent: '#ffd23f',
    message: true,
    duration: 8000,
  },
  subscribe: {
    template: '{name} subscribed!',
    tts: '{name} subscribed',
    image: 'builtin:star',
    sound: 'builtin:fanfare',
    accent: '#7cf29c',
    message: false,
    duration: 6000,
  },
  subgift: {
    template: '{name} gifted {count} subs!',
    tts: '{name} gifted {count} subs',
    image: 'builtin:gift',
    sound: 'builtin:levelup',
    accent: '#ff7ab8',
    message: false,
    duration: 7000,
  },
  follow: {
    template: '{name} is now following!',
    tts: '{name} followed',
    image: 'builtin:heart',
    sound: 'builtin:chime',
    accent: '#58c4ff',
    message: false,
    duration: 5000,
  },
  custom: {
    template: '{name}',
    tts: '{name}. {message}',
    image: 'builtin:rocket',
    sound: 'builtin:bell',
    accent: '#ffd23f',
    message: true,
    duration: 6000,
  },
};

/**
 * Preset for platform events from the trigger catalog (any source addon, any trigger).
 * @example CATALOG_PRESET.template; // '{name} — {event}'
 */
const CATALOG_PRESET: KindPreset = {
  template: '{name} — {event}',
  tts: '{name}. {event}. {message}',
  image: 'builtin:sparkles',
  sound: 'builtin:sparkle',
  accent: '#b38bff',
  message: true,
  duration: 6000,
};

/**
 * Localized default title templates (applied on first run for the app language).
 * @example LOCALIZED_TEMPLATES.ru.donation; // '{name} задонатил {amount}!'
 */
export const LOCALIZED_TEMPLATES: Record<
  'ru' | 'uk',
  Record<StandardKind, { title: string; tts: string }>
> = {
  ru: {
    donation: {
      title: '{name} задонатил {amount}!',
      tts: '{name} задонатил {amount}. {message}',
    },
    subscribe: { title: '{name} подписался!', tts: '{name} подписался' },
    subgift: {
      title: '{name} подарил {count} подписок!',
      tts: '{name} подарил {count} подписок',
    },
    follow: { title: '{name} теперь с нами!', tts: '{name} отслеживает канал' },
    custom: { title: '{name}', tts: '{name}. {message}' },
  },
  uk: {
    donation: {
      title: '{name} задонатив {amount}!',
      tts: '{name} задонатив {amount}. {message}',
    },
    subscribe: { title: '{name} підписався!', tts: '{name} підписався' },
    subgift: {
      title: '{name} подарував {count} підписок!',
      tts: '{name} подарував {count} підписок',
    },
    follow: { title: '{name} тепер з нами!', tts: '{name} відстежує канал' },
    custom: { title: '{name}', tts: '{name}. {message}' },
  },
};

/** Prefix of catalog kind ids. */
const CATALOG_PREFIX = 't|';

/**
 * Builds the alert kind id of a catalog trigger.
 * @param addonId Source addon id.
 * @param key Trigger key.
 * @returns Kind id.
 * @example catalogKindId('twitch', 'bits'); // 't|twitch|bits'
 */
export const catalogKindId = (addonId: string, key: string) =>
  `${CATALOG_PREFIX}${addonId}|${key}`;

/**
 * Checks whether a kind id is a valid catalog kind id.
 * @param kind Kind id.
 * @returns True for `t|{addonId}|{key}`.
 * @example isCatalogKind('t|twitch|bits'); // true
 */
export const isCatalogKind = (kind: string) =>
  /^t\|[\w./@-]{1,120}\|[\w.:-]{1,80}$/.test(kind);

/**
 * Checks whether a kind id is a standard kind.
 * @param kind Kind id.
 * @returns True for `donation`, `subscribe`, `subgift`, `follow`, `custom`.
 * @example isStandardKind('follow'); // true
 */
export const isStandardKind = (kind: string): kind is StandardKind =>
  (STANDARD_KINDS as string[]).includes(kind);

/**
 * Picks a language from localized text (falls back to English, then any value).
 * @param text Localized text.
 * @param lang Language.
 * @returns Plain text.
 * @example localize({ en: 'Cheer', ru: 'Чир' }, 'ru'); // 'Чир'
 */
export const localize = (text: LocalizedText | undefined, lang: string) =>
  (text?.[lang as 'en'] ||
    text?.en ||
    Object.values(text ?? {}).find(Boolean) ||
    '') as string;

/**
 * Builds a fresh variant with kind-specific defaults.
 * @param kind Alert kind.
 * @param lang UI language for the default templates.
 * @returns New variant.
 * @example const base = createVariant('donation', 'ru');
 */
export const createVariant = (
  kind: AlertKind,
  lang: string = 'en'
): AlertVariant => {
  const standard = isStandardKind(kind) ? kind : null;
  const preset = standard ? KIND_PRESETS[standard] : CATALOG_PRESET;
  const local =
    standard && (lang === 'ru' || lang === 'uk')
      ? LOCALIZED_TEMPLATES[lang][standard]
      : null;
  return {
    id: newId(),
    name: 'Base',
    enabled: true,
    condition: { min: 0, max: 0, platforms: [], values: [], currency: '' },
    durationMs: preset.duration,
    layout: 'image-above',
    image: { src: preset.image, size: 240, radius: 0 },
    sound: { src: preset.sound, volume: 70, delayMs: 0 },
    title: {
      template: local?.title ?? preset.template,
      font: 'Montserrat',
      size: 56,
      weight: 800,
      color: '#ffffff',
      accent: preset.accent,
      stroke: 0,
      strokeColor: '#000000',
      shadow: true,
      align: 'center',
      uppercase: false,
    },
    message: {
      show: preset.message,
      maxLength: 200,
      font: 'Montserrat',
      size: 32,
      weight: 600,
      color: '#ffffff',
      accent: preset.accent,
      stroke: 0,
      strokeColor: '#000000',
      shadow: true,
      align: 'center',
      uppercase: false,
    },
    box: {
      width: 900,
      padding: 24,
      radius: 18,
      background: '#14151c',
      backgroundOpacity: 0,
      borderColor: preset.accent,
      borderWidth: 0,
      shadow: false,
      gap: 12,
    },
    animation: {
      enter: 'pop',
      exit: 'fade',
      enterMs: 600,
      exitMs: 500,
      text: 'wave',
    },
    tts: {
      enabled: false,
      min: 0,
      template: local?.tts ?? preset.tts,
      volume: 100,
    },
  };
};

/**
 * Builds the default settings.
 * @param lang UI language for the default templates.
 * @returns Settings object.
 * @example const settings = createDefaultSettings('uk');
 */
export const createDefaultSettings = (lang: string = 'en'): AlertsSettings => {
  const kinds = {} as AlertsSettings['kinds'];
  for (const kind of STANDARD_KINDS) {
    kinds[kind] = {
      enabled: kind !== 'custom',
      variants: [createVariant(kind, lang)],
    };
  }
  return {
    kinds,
    queue: { gapMs: 1000, paused: false, maxSize: 50, expireSec: 300 },
    filters: {
      hideTriggered: {
        overlay: true,
        sounds: true,
        hotkeys: true,
        game: true,
        coop: true,
        timer: false,
        addon: false,
      },
      blockedUsers: [],
      bannedWords: [],
    },
    stage: { position: 'center', offsetX: 0, offsetY: 0, scale: 100 },
    volume: 80,
  };
};

/**
 * Builds a fresh variant for a catalog kind with templates suited to its value type:
 * numbers read as "{event}: {value}", options / dynamic items (rewards) as "{value}".
 * @param entry Catalog entry.
 * @param lang UI language.
 * @returns New variant.
 * @example createCatalogVariant(bitsEntry).title.template; // '{name} — {event}: {value}'
 */
export const createCatalogVariant = (
  entry: CatalogEntry,
  lang: string = 'en'
): AlertVariant => {
  const variant = createVariant(entry.id, lang);
  if (entry.valueType === 'number') {
    variant.title.template = '{name} — {event}: {value}';
    variant.tts.template = '{name}. {event}: {value}. {message}';
  } else if (entry.valueType === 'select' || entry.valueType === 'dynamic') {
    variant.title.template = '{name} — {value}';
    variant.tts.template = '{name}. {value}. {message}';
  }
  return variant;
};

/**
 * Default configuration of a catalog kind. Text-valued triggers (chat commands and the like)
 * start disabled; everything else (bits, rewards, platform-specific events) starts enabled.
 * @param entry Catalog entry.
 * @param lang UI language.
 * @returns Kind configuration.
 * @example db.settings.kinds[entry.id] = createCatalogKind(entry, 'ru');
 */
export const createCatalogKind = (
  entry: CatalogEntry,
  lang: string = 'en'
): KindConfig => ({
  enabled: entry.valueType !== 'text',
  variants: [createCatalogVariant(entry, lang)],
  label: localize(entry.label, lang) || entry.key,
  source: entry.addonName,
});

/**
 * Sample value of a catalog entry for previews.
 * @param entry Catalog entry.
 * @param lang UI language.
 * @returns Numeric value, raw id and readable text.
 * @example catalogSample(bitsEntry, 'en'); // { value: 100, valueId: '100', text: '100' }
 */
export const catalogSample = (entry: CatalogEntry, lang = 'en') => {
  if (entry.valueType === 'number')
    return { value: 100, valueId: '100', text: '100' };
  const option = entry.valueOptions?.[0];
  if (option) {
    const text = localize(option.label, lang) || option.value;
    return { value: Number(option.value) || 0, valueId: option.value, text };
  }
  if (entry.valueType === 'dynamic' || entry.valueType === 'text')
    return { value: 0, valueId: '', text: 'Hydrate!' };
  return { value: 0, valueId: '', text: '' };
};

/**
 * Sample event for previews and test alerts.
 * @param kind Alert kind.
 * @param currencyCode App currency code.
 * @param entry Catalog entry for catalog kinds.
 * @param lang UI language.
 * @returns Event with demo values.
 * @example sampleEvent('donation', 'UAH').vars.amount; // '150 UAH'
 */
export const sampleEvent = (
  kind: AlertKind,
  currencyCode = 'USD',
  entry?: CatalogEntry,
  lang = 'en'
): AlertEvent => {
  const base = {
    platform: entry?.addonId ?? 'twitch',
    vars: {
      name: 'RocketFan',
      platform: entry?.addonName ?? 'Twitch',
    },
  };
  if (isCatalogKind(kind)) {
    const sample = entry
      ? catalogSample(entry, lang)
      : { value: 0, valueId: '', text: '' };
    return {
      ...base,
      kind,
      value: sample.value,
      valueId: sample.valueId || undefined,
      vars: {
        ...base.vars,
        event: entry ? localize(entry.label, lang) : '',
        value: sample.text,
        message: 'Thanks for the stream!',
      },
    };
  }
  switch (kind) {
    case 'donation':
      return {
        ...base,
        kind,
        value: 150,
        vars: {
          ...base.vars,
          amount: `150 ${currencyCode}`,
          message: 'Great stream, keep it up! 🔥',
        },
      };
    case 'subscribe':
      return {
        ...base,
        kind,
        value: 6,
        vars: {
          ...base.vars,
          months: '6',
          tier: 'Tier 1',
          message: 'Half a year already!',
        },
      };
    case 'subgift':
      return {
        ...base,
        kind,
        value: 5,
        vars: { ...base.vars, count: '5', tier: 'Tier 1' },
      };
    case 'follow':
      return { ...base, kind, value: 0 };
    default:
      return {
        ...base,
        kind,
        value: 0,
        vars: { ...base.vars, message: 'Custom event' },
      };
  }
};
