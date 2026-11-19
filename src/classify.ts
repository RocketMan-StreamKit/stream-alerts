/**
 * Turns `dashboard.onRecord` payloads into normalized alert events. Platform specifics (tiers,
 * bits, rewards, …) come from the trigger catalog of the source addon, not from this code.
 */
import {
  findOption,
  getEntry,
  hasNumericOption,
  selectLabel,
  valueText,
} from './catalog';
import { catalogKindId, localize } from './shared/defaults';
import type { AlertEvent } from './shared/types';
import { db } from './store';

/**
 * Currency code union accepted by the sandbox `currency` API.
 * @example const code = 'UAH' as SandboxCurrency;
 */
type SandboxCurrency = Parameters<typeof currency.convert>[1];

/** App currency cache. */
let appCurrency = 'USD';

/**
 * Reloads the primary app currency.
 * @returns Promise resolved after the update.
 * @example await refreshAppCurrency();
 */
export const refreshAppCurrency = async () => {
  try {
    const res = await currency.getCurrent();
    if (res.success) appCurrency = res.currency;
  } catch {
    // keep the previous value
  }
};

/**
 * Current primary app currency.
 * @returns Currency code.
 * @example getAppCurrency(); // 'UAH'
 */
export const getAppCurrency = () => appCurrency;

/**
 * Formats a money amount with a currency sign.
 * @param amount Amount.
 * @param code Currency code.
 * @returns Display text.
 * @example formatMoney(150, 'UAH'); // '150 ₴'
 */
export const formatMoney = (amount: number, code: string) => {
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(1);
    const sign = parts.find(p => p.type === 'currency')?.value;
    if (sign && sign !== code) return `${text} ${sign}`;
  } catch {
    // unknown ISO code (CHEER, …) — fall through
  }
  return `${text} ${code}`;
};

/**
 * Picks the UI-language text from a dashboard message.
 * @param message String or `{ en, ru?, uk? }`.
 * @returns Plain text.
 * @example localized({ en: 'Hi', ru: 'Привет' }); // 'Привет' when LANG.current === 'ru'
 */
const localized = (message: unknown): string => {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && !Array.isArray(message)) {
    const m = message as Record<string, string | undefined>;
    return m[LANG.current] ?? m.en ?? '';
  }
  return '';
};

/**
 * Platform id → display name.
 * @param id Platform id.
 * @returns Name.
 * @example platformName('donationalerts'); // 'Donationalerts'
 */
const platformName = (id: string) =>
  id ? id.charAt(0).toUpperCase() + id.slice(1) : '';

/**
 * Reads a string attach value by type (best-effort enrichment; attach types are owned by
 * source addons, so a missing value is normal).
 * @param record Dashboard record.
 * @param type Attach type.
 * @returns Value or `undefined`.
 * @example attachValue(record, 'months'); // '6'
 */
const attachValue = (record: DashboardRecordValue, type: string) => {
  const entry = (record.attach ?? []).find(a => a.type === type);
  if (!entry) return undefined;
  return typeof entry.value === 'string' ? entry.value : entry.value.en;
};

/**
 * Trigger entry sent with a dashboard record.
 * @example const trig: RecordTrigger = { type: 'custom', key: 'bits', value: 100 };
 */
type RecordTrigger = NonNullable<
  DashboardRecordIncomingPayload['triggers']
>[number];

/**
 * Text form of a trigger value.
 * @param value Raw value.
 * @returns String (empty for missing values).
 * @example valueString(100); // '100'
 */
const valueString = (value: RecordTrigger['value']) =>
  value === undefined || value === null ? '' : String(value);

/**
 * Builds an event for a platform trigger from the catalog (bits, rewards, …).
 * @param trigger Matching record trigger.
 * @param kind Catalog kind id.
 * @param ctx Shared fields.
 * @returns Event.
 * @example await catalogEvent({ type: 'custom', key: 'bits', value: 500 }, 't|twitch|bits', ctx);
 */
const catalogEvent = async (
  trigger: RecordTrigger,
  kind: string,
  ctx: {
    platform: string;
    base: { name: string; platform: string };
    text: string;
  }
): Promise<AlertEvent> => {
  const entry = getEntry(kind)!;
  const raw = valueString(trigger.value);
  const numeric = Number(trigger.value);
  return {
    kind,
    platform: ctx.platform,
    value: Number.isFinite(numeric) ? numeric : 0,
    valueId: raw || undefined,
    vars: {
      ...ctx.base,
      event: localize(entry.label, LANG.current) || entry.key,
      value: await valueText(entry, raw),
      message: ctx.text,
    },
  };
};

/**
 * Converts a payload into an alert event (or `null` for records that never get alerts).
 *
 * - `custom` triggers registered by the source addon → catalog kinds (`t|{addon}|{key}`);
 * - `donation` / `subscribe` / `follow` records and `subgift` triggers → standard kinds;
 * - anything else of type `custom` → the standard `custom` kind ("Other events").
 *
 * Per-recipient lines of a mass gift are skipped when the source addon also reports a gift
 * count (a numeric `subgift` option) — the gifter's combined line carries the alert.
 * @param payload `dashboard.onRecord` payload.
 * @returns Event or `null`.
 * @example const ev = await classify(payload);
 */
export const classify = async (
  payload: DashboardRecordIncomingPayload
): Promise<AlertEvent | null> => {
  const record = payload.record;
  if (!record || record.type === 'timer') return null;
  const triggers = payload.triggers ?? [];
  const source = payload.sourceAddonId || record.platform || '';
  const platform = record.platform || payload.user?.platform || source;
  const name = payload.user?.name || record.from || 'Anonymous';
  const text = localized(record.message).trim();
  const base = { name, platform: platformName(platform) };
  const ctx = { platform, base, text };

  // Platform events described by the source addon's trigger catalog.
  const catalogHits = triggers
    .filter(t => t.type === 'custom' && t.key)
    .map(t => ({ trigger: t, kind: catalogKindId(source, String(t.key)) }))
    .filter(hit => getEntry(hit.kind));
  if (catalogHits.length) {
    const hit =
      catalogHits.find(h => db.settings.kinds[h.kind]?.enabled) ??
      catalogHits[0];
    return catalogEvent(hit.trigger, hit.kind, ctx);
  }

  if (record.type === 'donation' && record.amount) {
    const [amount, code] = record.amount;
    if (!(amount > 0)) return null;
    let value = amount;
    if (code && code !== appCurrency) {
      try {
        const res = await currency.convert(
          amount,
          code as SandboxCurrency,
          appCurrency as SandboxCurrency
        );
        if (res.success && Number.isFinite(res.amount)) value = res.amount;
      } catch {
        // keep the original amount
      }
    }
    return {
      kind: 'donation',
      platform,
      value,
      vars: { ...base, amount: formatMoney(amount, code), message: text },
    };
  }

  const gifts = triggers.filter(t => t.type === 'subgift');
  if (gifts.length) {
    const countTrig = gifts.find(
      t =>
        findOption(source, 'subgift', t.key)?.valueType === 'number' ||
        (t.key && typeof t.value === 'number')
    );
    if (!countTrig && hasNumericOption(source, 'subgift')) return null;
    const tierTrig = gifts.find(t => t !== countTrig);
    const count = Math.max(1, Math.round(Number(countTrig?.value)) || 1);
    return {
      kind: 'subgift',
      platform,
      value: count,
      valueId: tierTrig ? valueString(tierTrig.value) || undefined : undefined,
      vars: {
        ...base,
        count: String(count),
        tier: tierTrig
          ? selectLabel(source, 'subgift', valueString(tierTrig.value))
          : '',
        message: text,
      },
    };
  }

  if (record.type === 'subscribe') {
    const subTrig = triggers.find(t => t.type === 'subscribe');
    const tierRaw = subTrig
      ? valueString(subTrig.value)
      : (attachValue(record, 'tier') ?? '');
    const months = Math.max(
      1,
      Math.round(Number(attachValue(record, 'months'))) || 1
    );
    return {
      kind: 'subscribe',
      platform,
      value: months,
      valueId: tierRaw || undefined,
      vars: {
        ...base,
        months: String(months),
        tier: selectLabel(source, 'subscribe', tierRaw),
        message: text,
      },
    };
  }

  if (record.type === 'follow')
    return { kind: 'follow', platform, value: 0, vars: base };

  if (record.type === 'custom' || record.type === 'donation') {
    const trig = triggers.find(t => t.type === 'custom');
    return {
      kind: 'custom',
      platform,
      value: 0,
      valueId: trig ? valueString(trig.value) || undefined : undefined,
      vars: { ...base, message: text },
    };
  }
  return null;
};
