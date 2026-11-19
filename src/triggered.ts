/**
 * Detects dashboard events that already triggered something else in StreamKit+
 * (overlay, sound effect, hotkey, game effect, co-op sync, timer, another addon).
 *
 * - Overlays / sounds / hotkeys / timers / co-op: the core adds system `attach` entries to the
 *   stored record, so they are read straight from `payload.record.attach`.
 * - Game effects and addon `triggers` fields leave no attach, so their saved rules
 *   (`triggers.getApplied()`) are matched against `payload.triggers`.
 */
import type { TriggerSystem } from './shared/types';

/** System attach type → filter system. Addon attaches (`bits`, `tier`, …) are ignored. */
const SYSTEM_ATTACH: Record<string, TriggerSystem> = {
  overlay: 'overlay',
  sound: 'sounds',
  hotkey: 'hotkeys',
  timer: 'timer',
  'coop-sync': 'coop',
};

/** Cache lifetime for applied rules, ms. */
const RULES_TTL_MS = 15000;

/** Cached `triggers.getApplied()` categories. */
let cache: TriggersAppliedCategoryMap | null = null;
/** Cache timestamp, ms epoch. */
let cachedAt = 0;
/** In-flight refresh. */
let pending: Promise<void> | null = null;

/**
 * Reloads applied trigger rules.
 * @returns Promise resolved after the cache is updated.
 * @example await refreshAppliedRules();
 */
export const refreshAppliedRules = async () => {
  if (pending) return pending;
  pending = (async () => {
    try {
      const res = await triggers.getApplied();
      if (res.success) {
        cache = res.categories;
        cachedAt = Date.now();
      }
    } catch (error) {
      console.error('[stream-alerts] getApplied failed', error);
    } finally {
      pending = null;
    }
  })();
  return pending;
};

/**
 * Checks whether one saved rule matches one event trigger.
 * Empty rule key / value match anything; numbers are thresholds (event ≥ rule).
 * @param rule Saved rule trigger.
 * @param event Trigger sent with the dashboard record.
 * @returns True on match.
 * @example ruleMatches({ type: 'custom', key: 'bits', value: 100 }, { type: 'custom', key: 'bits', value: 500 }); // true
 */
export const ruleMatches = (
  rule: AddonAppliedTriggerRule,
  event: OverlayEventTrigger
) => {
  if (rule.type !== event.type) return false;
  const ruleKey = rule.key ?? '';
  if (ruleKey && ruleKey !== (event.key ?? '')) return false;
  const rv = rule.value;
  if (rv === undefined || rv === null || rv === '') return true;
  const ev = event.value;
  if (ev === undefined || ev === null) return false;
  if (typeof rv === 'boolean' || typeof ev === 'boolean') return rv === ev;
  const rn = Number(rv);
  const en = Number(ev);
  if (
    String(rv).trim() !== '' &&
    String(ev).trim() !== '' &&
    Number.isFinite(rn) &&
    Number.isFinite(en)
  )
    return en >= rn;
  const rs = String(rv).toLowerCase();
  const es = String(ev).toLowerCase();
  if (ruleKey === 'message_contains') return es.includes(rs);
  if (ruleKey === 'message_starts_with') return es.startsWith(rs);
  return rs === es;
};

/**
 * Lists systems that already handled a dashboard record.
 * @param payload `dashboard.onRecord` payload.
 * @returns Unique systems (empty when the event is "clean").
 * @example const systems = await triggeredSystems(payload); // ['overlay', 'game']
 */
export const triggeredSystems = async (
  payload: DashboardRecordIncomingPayload
): Promise<TriggerSystem[]> => {
  const found = new Set<TriggerSystem>();
  for (const entry of payload.record.attach ?? []) {
    const sys = SYSTEM_ATTACH[entry.type];
    if (sys) found.add(sys);
  }

  const eventTriggers = payload.triggers ?? [];
  const source = payload.sourceAddonId;
  if (source && eventTriggers.length) {
    if (!cache || Date.now() - cachedAt > RULES_TTL_MS)
      await refreshAppliedRules();
    if (cache) {
      const hit = (
        rules:
          | { enabled?: boolean; trigger: AddonAppliedTriggerRule }[]
          | undefined
      ) =>
        (rules ?? []).some(
          rule =>
            rule.enabled !== false &&
            eventTriggers.some(t => ruleMatches(rule.trigger, t))
        );
      if (hit(cache.game[source])) found.add('game');
      if (
        hit(
          (cache.addon[source] ?? []).filter(
            rule => rule.targetAddonId !== data.id
          )
        )
      )
        found.add('addon');
    }
  }
  return [...found];
};
