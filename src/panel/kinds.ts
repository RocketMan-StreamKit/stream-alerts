/**
 * Panel helpers for alert kinds: standard kinds have fixed names and icons, platform events
 * take their name, value type and options from the StreamKit+ trigger catalog.
 */
import { isStandardKind, localize } from '../shared/defaults';
import type { AlertKind, AlertVars, CatalogEntry } from '../shared/types';
import { getLang, t } from './i18n';
import { store } from './state';

/**
 * Emoji per standard kind.
 * @example STANDARD_ICON.follow; // '💜'
 */
const STANDARD_ICON: Record<string, string> = {
  donation: '💸',
  subscribe: '⭐',
  subgift: '🎁',
  follow: '💜',
  custom: '🧩',
};

/**
 * Icon of a platform event by its value type.
 * @example CATALOG_ICON.number; // '💎'
 */
const CATALOG_ICON: Record<string, string> = {
  number: '💎',
  dynamic: '✨',
  select: '🏷',
  text: '💬',
  none: '⚡',
};

/**
 * Catalog entry of a kind.
 * @param kind Kind id.
 * @returns Entry or `undefined` (standard kinds, or the source addon is off).
 * @example kindEntry('t|twitch|bits')?.valueType; // 'number'
 */
export const kindEntry = (kind: AlertKind): CatalogEntry | undefined =>
  store.catalog.find(e => e.id === kind);

/**
 * Display name of a kind.
 * @param kind Kind id.
 * @returns Name.
 * @example kindLabel('t|twitch|bits'); // 'Cheer (битсы)'
 */
export const kindLabel = (kind: AlertKind) => {
  if (isStandardKind(kind)) return t(`kind_${kind}`);
  const entry = kindEntry(kind);
  if (entry) return localize(entry.label, getLang()) || entry.key;
  return store.settings.kinds[kind]?.label || kind.split('|').pop() || kind;
};

/**
 * Source addon name of a platform event.
 * @param kind Kind id.
 * @returns Name or empty for standard kinds.
 * @example kindSource('t|twitch|bits'); // 'Twitch'
 */
export const kindSource = (kind: AlertKind) =>
  isStandardKind(kind)
    ? ''
    : kindEntry(kind)?.addonName || store.settings.kinds[kind]?.source || '';

/**
 * Sidebar icon of a kind.
 * @param kind Kind id.
 * @returns Emoji.
 * @example kindIcon('donation'); // '💸'
 */
export const kindIcon = (kind: AlertKind) =>
  STANDARD_ICON[kind] ??
  CATALOG_ICON[kindEntry(kind)?.valueType ?? 'none'] ??
  CATALOG_ICON.none;

/**
 * How variant conditions work for a kind.
 * - `amount`: numeric min / max (donations, months, gift count, numeric trigger values);
 * - `values`: pick specific trigger values (tiers, rewards, select options);
 * - `none`: only the platform filter.
 * @param kind Kind id.
 * @returns Mode.
 * @example conditionMode('t|twitch|redeems'); // 'values'
 */
export const conditionMode = (
  kind: AlertKind
): 'amount' | 'values' | 'none' => {
  if (kind === 'donation' || kind === 'subscribe' || kind === 'subgift')
    return 'amount';
  if (isStandardKind(kind)) return 'none';
  const type = kindEntry(kind)?.valueType;
  if (type === 'number') return 'amount';
  if (type === 'select' || type === 'dynamic') return 'values';
  return 'none';
};

/**
 * Label of the numeric value of a kind (for conditions, TTS threshold and the sample).
 * @param kind Kind id.
 * @returns Text.
 * @example valueLabel('donation'); // 'Amount, UAH'
 */
export const valueLabel = (kind: AlertKind) => {
  if (isStandardKind(kind))
    return t(`value_${kind}`, { cur: store.appCurrency });
  const hint = localize(kindEntry(kind)?.valueHint, getLang());
  return hint || t('value_catalog');
};

/**
 * Template tokens offered for a kind.
 * @param kind Kind id.
 * @returns Token names.
 * @example kindTokens('subgift'); // ['name', 'count', 'tier', 'platform']
 */
export const kindTokens = (kind: AlertKind): (keyof AlertVars)[] => {
  switch (kind) {
    case 'donation':
      return ['name', 'amount', 'message', 'platform'];
    case 'subscribe':
      return ['name', 'months', 'tier', 'message', 'platform'];
    case 'subgift':
      return ['name', 'count', 'tier', 'platform'];
    case 'follow':
      return ['name', 'platform'];
    case 'custom':
      return ['name', 'message', 'platform'];
    default:
      return kindEntry(kind)?.valueType
        ? ['name', 'event', 'value', 'message', 'platform']
        : ['name', 'event', 'message', 'platform'];
  }
};
