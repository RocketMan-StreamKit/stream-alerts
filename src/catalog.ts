/**
 * Platform event catalog: the triggers every enabled source addon registered with
 * `dashboard.registerTriggers()` (read through `triggers.getRegistered()`, app 1.3.10+).
 *
 * The addon hardcodes no platform concepts: Twitch bits, channel-point rewards, Kick KICKs,
 * game events, … all arrive here as `custom` trigger options and become alert kinds
 * (`t|{addonId}|{key}`). Select / tier labels and dynamic values (reward titles) are read from
 * the same catalog.
 */
import { catalogKindId, createCatalogKind, localize } from './shared/defaults';
import type { CatalogEntry, KindConfig, ValueOption } from './shared/types';
import { db, markDirty } from './store';

/**
 * Registered trigger option as returned by `triggers.getRegistered()`.
 * @example const option: RegisteredOption = { type: 'custom', key: 'bits', valueType: 'number' };
 */
type RegisteredOption = AddonRegisteredTriggerSource['options'][number];

/** Raw sources from the last refresh. */
let sources: AddonRegisteredTriggerSource[] = [];
/** Catalog entries by kind id. */
const entries = new Map<string, CatalogEntry>();
/** In-flight refresh. */
let pending: Promise<void> | null = null;
/** Last successful refresh, ms epoch. */
let refreshedAt = 0;
/** Minimum interval between on-demand refreshes for unknown triggers, ms. */
const ON_DEMAND_REFRESH_MS = 10_000;

/** Dynamic values cache lifetime, ms. */
const VALUES_TTL_MS = 60_000;
/** Minimum age before a forced re-list (protects the source addon's API), ms. */
const VALUES_FORCE_MIN_MS = 10_000;
/** Dynamic values cache: `{addonId}|{provider}` → items. */
const valuesCache = new Map<string, { at: number; items: ValueOption[] }>();

/**
 * Converts registered options of one source into catalog entries.
 * Only `custom` triggers become separate kinds — `donation` / `subscribe` / `subgift` / `follow`
 * are standard kinds shared by all platforms. Options with `keyOptions` yield one entry per key.
 * @param source Source addon catalog.
 * @returns Entries.
 * @example toEntries(twitchSource).map(e => e.key); // ['bits', 'message', …, 'redeems']
 */
const toEntries = (source: AddonRegisteredTriggerSource): CatalogEntry[] => {
  const out: CatalogEntry[] = [];
  for (const option of source.options ?? []) {
    if (!option || option.type !== 'custom') continue;
    const base = {
      addonId: source.addonId,
      addonName: source.addonName || source.addonId,
      valueType: option.valueType,
      valueOptions: option.valueOptions?.map(o => ({
        value: String(o.value),
        label: o.label ?? {},
      })),
      valueProvider: option.valueProvider,
      valueHint: option.valueHint,
    };
    const keys = option.keyOptions?.length
      ? option.keyOptions.map(k => ({
          key: String(k.value),
          label: Object.fromEntries(
            (['en', 'ru', 'uk'] as const).map(lang => [
              lang,
              `${localize(option.label, lang)}: ${localize(k.label, lang)}`,
            ])
          ),
        }))
      : option.key
        ? [{ key: option.key, label: option.label ?? {} }]
        : [];
    for (const { key, label } of keys) {
      out.push({
        ...base,
        id: catalogKindId(source.addonId, key),
        key,
        label,
      });
    }
  }
  return out;
};

/**
 * Adds settings for newly discovered catalog kinds and refreshes stored names.
 * @returns True when settings changed.
 * @example ensureCatalogKinds();
 */
const ensureCatalogKinds = () => {
  let changed = false;
  const lang = LANG.current;
  for (const entry of entries.values()) {
    const current = db.settings.kinds[entry.id];
    if (!current) {
      db.settings.kinds[entry.id] = createCatalogKind(entry, lang);
      changed = true;
      continue;
    }
    const label = localize(entry.label, lang) || entry.key;
    if (current.label !== label || current.source !== entry.addonName) {
      current.label = label;
      current.source = entry.addonName;
      changed = true;
    }
  }
  if (changed) markDirty();
  return changed;
};

/**
 * Reloads the trigger catalog from the app.
 * @returns Promise resolved after the update.
 * @example await refreshCatalog();
 */
export const refreshCatalog = async () => {
  if (pending) return pending;
  pending = (async () => {
    try {
      const res = await triggers.getRegistered();
      if (!res.success) return;
      sources = res.sources.filter(s => s.addonId !== data.id);
      entries.clear();
      for (const source of sources)
        for (const entry of toEntries(source)) entries.set(entry.id, entry);
      refreshedAt = Date.now();
      ensureCatalogKinds();
    } catch (error) {
      console.error('[stream-alerts] getRegistered failed', error);
    } finally {
      pending = null;
    }
  })();
  return pending;
};

/**
 * Refreshes the catalog when a record carries a `custom` trigger the cached catalog does not
 * know yet (a source addon was just enabled or re-registered its triggers). Throttled.
 * @param payload Dashboard payload.
 * @returns Promise resolved when the catalog is current enough.
 * @example await refreshForRecord(payload);
 */
export const refreshForRecord = async (
  payload: DashboardRecordIncomingPayload
) => {
  const source = payload.sourceAddonId || payload.record?.platform || '';
  const unknown = (payload.triggers ?? []).some(
    t =>
      t.type === 'custom' &&
      t.key &&
      !entries.has(catalogKindId(source, String(t.key)))
  );
  if (unknown && Date.now() - refreshedAt > ON_DEMAND_REFRESH_MS)
    await refreshCatalog();
};

/**
 * Current catalog entries (panel order: by source name, then registration order).
 * @returns Entries.
 * @example getCatalog().length;
 */
export const getCatalog = (): CatalogEntry[] =>
  [...entries.values()].sort((a, b) => a.addonName.localeCompare(b.addonName));

/**
 * Catalog entry by kind id.
 * @param kind Kind id.
 * @returns Entry or `undefined`.
 * @example getEntry('t|twitch|bits')?.valueType; // 'number'
 */
export const getEntry = (kind: string) => entries.get(kind);

/**
 * Returns the settings of a kind, creating them for a catalog kind seen for the first time.
 * @param kind Kind id.
 * @returns Config or `undefined` for unknown kinds.
 * @example ensureKind('t|twitch|bits')?.enabled;
 */
export const ensureKind = (kind: string): KindConfig | undefined => {
  const current = db.settings.kinds[kind];
  if (current) return current;
  const entry = entries.get(kind);
  if (!entry) return undefined;
  db.settings.kinds[kind] = createCatalogKind(entry, LANG.current);
  markDirty();
  return db.settings.kinds[kind];
};

/**
 * Finds a registered option of a source addon.
 * @param addonId Source addon id.
 * @param type Trigger type.
 * @param key Trigger key (`undefined` = keyless option).
 * @returns Option or `undefined`.
 * @example findOption('twitch', 'subscribe')?.valueOptions;
 */
export const findOption = (
  addonId: string,
  type: string,
  key?: string
): RegisteredOption | undefined =>
  sources
    .find(s => s.addonId === addonId)
    ?.options.find(o => o.type === type && (o.key ?? undefined) === key);

/**
 * Whether a source addon reports a numeric option for a trigger type
 * (e.g. a gift count next to the gift tier).
 * @param addonId Source addon id.
 * @param type Trigger type.
 * @returns True when such an option exists.
 * @example hasNumericOption('twitch', 'subgift'); // true
 */
export const hasNumericOption = (addonId: string, type: string) =>
  !!sources
    .find(s => s.addonId === addonId)
    ?.options.some(o => o.type === type && o.valueType === 'number');

/**
 * Readable label of a `select` trigger value registered by a source addon.
 * @param addonId Source addon id.
 * @param type Trigger type.
 * @param value Raw value.
 * @returns Option label or the raw value.
 * @example selectLabel('twitch', 'subscribe', '1000'); // 'Tier 1'
 */
export const selectLabel = (addonId: string, type: string, value: string) => {
  if (!value) return '';
  const lang = LANG.current;
  for (const option of sources.find(s => s.addonId === addonId)?.options ??
    []) {
    if (option.type !== type || !option.valueOptions) continue;
    const match = option.valueOptions.find(o => String(o.value) === value);
    if (match) return localize(match.label, lang) || value;
  }
  return value;
};

/**
 * Lists dynamic values (e.g. channel-point rewards) of a catalog entry.
 * @param addonId Source addon id.
 * @param provider Value provider id.
 * @param force Skip the cache.
 * @returns Result with items.
 * @example await listValues('twitch', 'rewards');
 */
export const listValues = async (
  addonId: string,
  provider: string,
  force = false
): Promise<{ success: boolean; items: ValueOption[]; message?: string }> => {
  const cacheKey = `${addonId}|${provider}`;
  const cached = valuesCache.get(cacheKey);
  const age = cached ? Date.now() - cached.at : Infinity;
  if (age < (force ? VALUES_FORCE_MIN_MS : VALUES_TTL_MS))
    return { success: true, items: cached!.items };
  try {
    const res = await triggers.listValues({ addonId, provider });
    if (res.success) {
      const items = (res.items ?? []).map(item => ({
        id: String(item.id),
        label: String(item.label ?? item.id),
        meta: item.meta,
        disabled: item.disabled,
      }));
      valuesCache.set(cacheKey, { at: Date.now(), items });
      return { success: true, items };
    }
    return { success: false, items: cached?.items ?? [], message: res.message };
  } catch (error) {
    console.error('[stream-alerts] listValues failed', error);
    return { success: false, items: cached?.items ?? [] };
  }
};

/**
 * Readable text of a trigger value for a catalog entry.
 * @param entry Catalog entry.
 * @param value Raw trigger value.
 * @returns Text (option label, dynamic item label, or the raw value).
 * @example await valueText(rewardsEntry, 'reward-id'); // 'Hydrate!'
 */
export const valueText = async (
  entry: CatalogEntry,
  value: string
): Promise<string> => {
  if (!value) return '';
  const lang = LANG.current;
  const option = entry.valueOptions?.find(o => o.value === value);
  if (option) return localize(option.label, lang) || value;
  if (entry.valueType === 'dynamic' && entry.valueProvider) {
    let res = await listValues(entry.addonId, entry.valueProvider);
    if (!res.items.some(i => i.id === value))
      res = await listValues(entry.addonId, entry.valueProvider, true);
    const item = res.items.find(i => i.id === value);
    if (item) return item.label;
  }
  return value;
};
