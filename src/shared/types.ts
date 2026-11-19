/**
 * Shared data model for the worker, the control panel and the OBS widget.
 * Keep this file free of DOM and sandbox globals — it is bundled into all three.
 */

/**
 * Built-in alert kinds — the event types StreamKit+ itself defines for dashboard records
 * (`donation`, `subscribe`, `follow`) and triggers (`subgift`), plus `custom` for any
 * other event that no source addon describes.
 * @example const kind: StandardKind = 'donation';
 */
export type StandardKind =
  | 'donation'
  | 'subscribe'
  | 'subgift'
  | 'follow'
  | 'custom';

/**
 * Alert kind id: a {@link StandardKind} or a platform event from the trigger catalog,
 * encoded as `t|{sourceAddonId}|{triggerKey}` (see `catalogKindId`).
 * @example const kind: AlertKind = 't|twitch|bits';
 */
export type AlertKind = StandardKind | (string & {});

/**
 * Localized text as registered by source addons.
 * @example const label: LocalizedText = { en: 'Cheer (bits)', ru: 'Cheer (битсы)' };
 */
export type LocalizedText = Partial<Record<'en' | 'ru' | 'uk', string>>;

/**
 * One platform event taken from the StreamKit+ trigger catalog (`triggers.getRegistered()`):
 * a `custom` trigger some source addon (Twitch, a donation service, a game, …) registered.
 * @example const entry: CatalogEntry = { id: 't|twitch|bits', addonId: 'twitch', addonName: 'Twitch', key: 'bits', label: { en: 'Cheer (bits)' }, valueType: 'number' };
 */
export type CatalogEntry = {
  /** Alert kind id (`t|{addonId}|{key}`). */
  id: string;
  /** Source addon id. */
  addonId: string;
  /** Source addon display name. */
  addonName: string;
  /** Trigger key (`trigger.key` on matching records). */
  key: string;
  /** Event name registered by the source addon. */
  label: LocalizedText;
  /** How the trigger value looks (`undefined` = no value). */
  valueType?: 'text' | 'number' | 'select' | 'dynamic';
  /** Fixed options for `select` values. */
  valueOptions?: { value: string; label: LocalizedText }[];
  /** Provider id for `dynamic` values (listed through `triggers.listValues()`). */
  valueProvider?: string;
  /** Hint for the value (e.g. "Amount of bits"). */
  valueHint?: LocalizedText;
};

/**
 * One selectable trigger value (select option or dynamic provider item).
 * @example const option: ValueOption = { id: 'reward-1', label: 'Hydrate!', meta: '100' };
 */
export type ValueOption = {
  /** Value sent as `trigger.value`. */
  id: string;
  /** Display label. */
  label: string;
  /** Secondary text (cost, …). */
  meta?: string;
  /** Unavailable on the remote side. */
  disabled?: boolean;
};

/**
 * Systems whose matched rules mark an event as "already shown elsewhere".
 * @example const sys: TriggerSystem = 'overlay';
 */
export type TriggerSystem =
  | 'overlay'
  | 'sounds'
  | 'hotkeys'
  | 'game'
  | 'timer'
  | 'addon'
  | 'coop';

/**
 * Image placement relative to the text block.
 * @example const layout: AlertLayout = 'image-above';
 */
export type AlertLayout =
  | 'image-above'
  | 'image-below'
  | 'image-left'
  | 'image-right'
  | 'image-behind'
  | 'text-only'
  | 'image-only';

/**
 * Entrance animations.
 * @example const anim: EnterAnimation = 'slide-up';
 */
export type EnterAnimation =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom'
  | 'pop'
  | 'bounce'
  | 'flip'
  | 'spin'
  | 'blur';

/**
 * Exit animations (same set as entrance, played in reverse direction).
 * @example const anim: ExitAnimation = 'fade';
 */
export type ExitAnimation = EnterAnimation;

/**
 * Looping text effect while the alert is on screen.
 * @example const fx: TextEffect = 'wave';
 */
export type TextEffect =
  | 'none'
  | 'wave'
  | 'pulse'
  | 'shake'
  | 'glow'
  | 'rainbow'
  | 'jelly';

/**
 * Anchor of the alert inside the OBS browser source (3×3 grid).
 * @example const pos: StagePosition = 'center';
 */
export type StagePosition =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

/**
 * Typography shared by the title and the message.
 * @example const style: TextStyle = { font: 'Montserrat', size: 36, weight: 800, color: '#fff', accent: '#ffd400', stroke: 2, strokeColor: '#000', shadow: true, align: 'center', uppercase: false };
 */
export type TextStyle = {
  /** Font family (system font or a Google Font name from `FONTS`). */
  font: string;
  /** Font size in px (before stage scale). */
  size: number;
  /** CSS font weight (100–900). */
  weight: number;
  /** Main text color (hex). */
  color: string;
  /** Color of highlighted `{tokens}` in templates (hex). */
  accent: string;
  /** Outline width in px (0 = none). */
  stroke: number;
  /** Outline color (hex). */
  strokeColor: string;
  /** Soft drop shadow. */
  shadow: boolean;
  /** Horizontal alignment. */
  align: 'left' | 'center' | 'right';
  /** Render text in upper case. */
  uppercase: boolean;
};

/**
 * One visual variant of an alert kind. Variant 0 is the base; the others apply
 * when their condition matches (highest matching `min` wins).
 * @example const v: AlertVariant = createVariant('donation');
 */
export type AlertVariant = {
  /** Stable id. */
  id: string;
  /** Name shown in the editor. */
  name: string;
  /** Disabled variants are skipped. */
  enabled: boolean;
  /** When this variant is used (ignored for the base variant). */
  condition: {
    /** Minimum amount (donation in app currency, months, gift count, numeric trigger value; 0 = any). */
    min: number;
    /** Maximum amount (0 = no limit). */
    max: number;
    /** Only these platform ids (empty = all). */
    platforms: string[];
    /** Only these trigger values — select options / dynamic items such as a reward id (empty = any). */
    values: string[];
  };
  /** Time the alert stays fully visible, ms. */
  durationMs: number;
  /** Image placement. */
  layout: AlertLayout;
  /** Image / GIF / video. */
  image: {
    /** Media reference: `''`, `builtin:{id}`, `media:{id}` or an `https://` URL. */
    src: string;
    /** Width in px. */
    size: number;
    /** Corner radius in px. */
    radius: number;
  };
  /** Sound played on entrance. */
  sound: {
    /** Media reference (`builtin:{id}`, `media:{id}`, URL, or `''` for silence). */
    src: string;
    /** Volume 0–100 (multiplied by the master volume). */
    volume: number;
    /** Delay after the alert appears, ms. */
    delayMs: number;
  };
  /** Headline template and style. */
  title: TextStyle & {
    /** Template with `{name}`, `{amount}`, `{count}`, `{months}`, `{tier}`, `{event}`, `{value}`, `{platform}`, `{message}`. */
    template: string;
  };
  /** Viewer message (donation text, resub text, …). */
  message: TextStyle & {
    /** Show the message line. */
    show: boolean;
    /** Characters kept before an ellipsis. */
    maxLength: number;
  };
  /** Card around the text. */
  box: {
    /** Card width in px. */
    width: number;
    /** Inner padding in px. */
    padding: number;
    /** Corner radius in px. */
    radius: number;
    /** Background color (hex). */
    background: string;
    /** Background opacity 0–100 (0 = transparent card). */
    backgroundOpacity: number;
    /** Border color (hex). */
    borderColor: string;
    /** Border width in px (0 = none). */
    borderWidth: number;
    /** Card drop shadow. */
    shadow: boolean;
    /** Gap between image and text, px. */
    gap: number;
  };
  /** Motion. */
  animation: {
    /** Entrance. */
    enter: EnterAnimation;
    /** Exit. */
    exit: ExitAnimation;
    /** Entrance duration, ms. */
    enterMs: number;
    /** Exit duration, ms. */
    exitMs: number;
    /** Highlighted-token effect while on screen. */
    text: TextEffect;
  };
  /** Text-to-speech (played by StreamKit+, not by OBS). */
  tts: {
    /** Read the alert aloud. */
    enabled: boolean;
    /** Minimum amount to read (0 = always). */
    min: number;
    /** Spoken template (same tokens as the title). */
    template: string;
    /** Volume multiplier 0–100. */
    volume: number;
  };
};

/**
 * Per-kind configuration.
 * @example settings.kinds.follow.enabled = false;
 */
export type KindConfig = {
  /** Show alerts of this kind. */
  enabled: boolean;
  /** Variant 0 = base; others are conditional. */
  variants: AlertVariant[];
  /** Last known event name (catalog kinds only; shown while the source addon is off). */
  label?: string;
  /** Last known source addon name (catalog kinds only). */
  source?: string;
};

/**
 * Whole user configuration.
 * @example const s: AlertsSettings = createDefaultSettings();
 */
export type AlertsSettings = {
  /** Per-kind alert designs (standard kinds always present, catalog kinds added on discovery). */
  kinds: Record<AlertKind, KindConfig>;
  /** Queue behaviour. */
  queue: {
    /** Pause between alerts, ms. */
    gapMs: number;
    /** Queue is paused (new alerts wait). */
    paused: boolean;
    /** Maximum waiting alerts (older ones are dropped). */
    maxSize: number;
    /** Drop alerts that waited longer than this, seconds (0 = never). */
    expireSec: number;
  };
  /** What to skip. */
  filters: {
    /** Hide events that already triggered something in these systems. */
    hideTriggered: Record<TriggerSystem, boolean>;
    /** User names that never get alerts (case-insensitive). */
    blockedUsers: string[];
    /** Words that hide the message text (replaced with `***`). */
    bannedWords: string[];
  };
  /** Placement inside the OBS browser source. */
  stage: {
    /** Anchor. */
    position: StagePosition;
    /** Horizontal offset, px. */
    offsetX: number;
    /** Vertical offset, px. */
    offsetY: number;
    /** Global scale, percent. */
    scale: number;
  };
  /** Master volume 0–100. */
  volume: number;
};

/**
 * Template variables for one event.
 * @example const vars: AlertVars = { name: 'Bob', amount: '100 ₴', message: 'Hi!' };
 */
export type AlertVars = {
  /** Viewer display name. */
  name: string;
  /** Formatted amount (`100 ₴`, `500 bits`). */
  amount?: string;
  /** Viewer message. */
  message?: string;
  /** Gift count / bits count as text. */
  count?: string;
  /** Subscription months. */
  months?: string;
  /** Subscription tier label. */
  tier?: string;
  /** Event name from the trigger catalog (`Cheer (bits)`, `Channel point reward`, …). */
  event?: string;
  /** Readable trigger value (number, select label, reward title, …). */
  value?: string;
  /** Platform display name. */
  platform?: string;
};

/**
 * Fully resolved alert pushed to the widget.
 * @example socket.on('play', (alert: AlertPayload) => renderer.play(alert));
 */
export type AlertPayload = {
  /** Unique alert id (ack key). */
  id: string;
  /** Kind. */
  kind: AlertKind;
  /** Resolved variant (media references already turned into URLs). */
  variant: AlertVariant;
  /** Template values. */
  vars: AlertVars;
  /** Stage placement. */
  stage: AlertsSettings['stage'];
  /** Master volume 0–100. */
  volume: number;
  /** Test alert sent from the panel. */
  test?: boolean;
};

/**
 * Normalized incoming event (from a dashboard record or a test).
 * @example const ev: AlertEvent = { kind: 'follow', vars: { name: 'Bob' }, value: 0, platform: 'twitch' };
 */
export type AlertEvent = {
  /** Kind. */
  kind: AlertKind;
  /** Template values. */
  vars: AlertVars;
  /** Numeric value used by variant conditions (app currency for donations). */
  value: number;
  /** Raw trigger value as text (select option / dynamic item id) for `condition.values`. */
  valueId?: string;
  /** Platform id. */
  platform: string;
};

/**
 * History row status.
 * @example const st: HistoryStatus = 'hidden';
 */
export type HistoryStatus =
  | 'queued'
  | 'playing'
  | 'shown'
  | 'hidden'
  | 'disabled'
  | 'blocked'
  | 'skipped'
  | 'expired'
  | 'dropped';

/**
 * Journal entry shown in the panel feed.
 * @example db.history.push(entry);
 */
export type HistoryEntry = {
  /** Entry id (dashboard record id or generated). */
  id: string;
  /** Creation time, ms epoch. */
  created: number;
  /** Event. */
  event: AlertEvent;
  /** Current status. */
  status: HistoryStatus;
  /** Systems that already handled the event (for `hidden`). */
  triggered?: TriggerSystem[];
  /** Test alert. */
  test?: boolean;
};

/**
 * Uploaded media file metadata.
 * @example const m: MediaItem = { id: 'abc', name: 'cat.gif', mime: 'image/gif', size: 12345, created: Date.now() };
 */
export type MediaItem = {
  /** Id used in `media:{id}` references. */
  id: string;
  /** Original file name. */
  name: string;
  /** MIME type. */
  mime: string;
  /** Size in bytes. */
  size: number;
  /** Upload time, ms epoch. */
  created: number;
};
