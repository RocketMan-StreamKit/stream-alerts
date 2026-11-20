/**
 * Incoming event pipeline: dashboard record → classify → filters → queue.
 * Every event lands in the journal (also hidden ones) so the streamer can see why it was not shown
 * and replay it manually.
 */
import { ensureKind, getEntry, refreshForRecord } from './catalog';
import { classify, donationAmounts, getAppCurrency } from './classify';
import { addHistory, buildPayload, enqueue } from './queue';
import { createVariant, newId, sampleEvent } from './shared/defaults';
import { sanitizeVariant } from './shared/sanitize';
import type {
  AlertEvent,
  AlertKind,
  AlertVars,
  HistoryEntry,
} from './shared/types';
import { db, markDirty } from './store';
import { triggeredSystems } from './triggered';

/**
 * Handles one `dashboard.onRecord` payload.
 * @param payload Dashboard payload.
 * @returns Promise resolved after the event is journaled (and queued when allowed).
 * @example await handleRecord(payload);
 */
export const handleRecord = async (payload: DashboardRecordIncomingPayload) => {
  const recordId = String(payload.id || payload.record?.id || '');
  if (recordId) {
    if (db.processed.includes(recordId)) return;
    db.processed.push(recordId);
    markDirty();
  }
  await refreshForRecord(payload);
  const event = await classify(payload);
  if (!event) return;

  const entry: HistoryEntry = {
    id: recordId || newId(),
    created: Date.now(),
    event,
    status: 'queued',
  };
  const settings = db.settings;
  const blocked = settings.filters.blockedUsers.some(
    u => u.toLowerCase() === event.vars.name.toLowerCase()
  );
  if (blocked) {
    addHistory({ ...entry, status: 'blocked' });
    return;
  }
  if (!ensureKind(event.kind)?.enabled) {
    addHistory({ ...entry, status: 'disabled' });
    return;
  }
  const systems = await triggeredSystems(payload);
  const hidden = systems.filter(sys => settings.filters.hideTriggered[sys]);
  if (hidden.length) {
    addHistory({ ...entry, status: 'hidden', triggered: hidden });
    return;
  }
  addHistory({ ...entry, triggered: systems.length ? systems : undefined });
  enqueue(entry, buildPayload(event));
};

/**
 * Re-shows a journal entry (bypasses filters).
 * @param id Journal entry id.
 * @returns True when queued.
 * @example replay('twitch:redemption:123');
 */
export const replay = (id: string) => {
  const source = db.history.find(h => h.id === id);
  if (!source) return false;
  const entry: HistoryEntry = {
    id: newId(),
    created: Date.now(),
    event: source.event,
    status: 'queued',
    test: source.test,
  };
  addHistory(entry);
  enqueue(entry, buildPayload(source.event, { test: source.test }), true);
  return true;
};

/**
 * Sends a test alert to the widgets.
 * @param kind Alert kind.
 * @param draftVariant Optional variant from the editor (unsaved draft) to test exactly.
 * @param vars Optional template values overriding the sample.
 * @param value Optional numeric value for variant conditions.
 * @param valueId Optional raw trigger value (select option / dynamic item) for variant conditions.
 * @returns Promise resolved after the alert is queued.
 * @example await sendTest('donation');
 */
export const sendTest = async (
  kind: AlertKind,
  draftVariant?: unknown,
  vars?: Partial<AlertVars>,
  value?: number,
  valueId?: string
) => {
  const sample = sampleEvent(
    kind,
    getAppCurrency(),
    getEntry(kind),
    LANG.current
  );
  const event: AlertEvent = {
    ...sample,
    value:
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : sample.value,
    valueId:
      typeof valueId === 'string' ? valueId.slice(0, 200) : sample.valueId,
    vars: { ...sample.vars, ...cleanVars(vars) },
  };
  if (kind === 'donation')
    event.amounts = await donationAmounts(
      event.value,
      getAppCurrency(),
      event.value
    );
  const baseVariant =
    ensureKind(kind)?.variants[0] ?? createVariant(kind, LANG.current);
  const variant = draftVariant
    ? sanitizeVariant(draftVariant, baseVariant)
    : undefined;
  const entry: HistoryEntry = {
    id: newId(),
    created: Date.now(),
    event,
    status: 'queued',
    test: true,
  };
  addHistory(entry);
  enqueue(entry, buildPayload(event, { test: true, variant }), true);
};

/**
 * Keeps only short string template values.
 * @param vars Raw values.
 * @returns Clean values.
 * @example cleanVars({ name: 'Bob', x: 1 }); // { name: 'Bob' }
 */
const cleanVars = (vars: unknown): Partial<AlertVars> => {
  const out: Partial<AlertVars> = {};
  if (!vars || typeof vars !== 'object') return out;
  for (const key of [
    'name',
    'amount',
    'message',
    'count',
    'months',
    'tier',
    'event',
    'value',
    'platform',
  ] as (keyof AlertVars)[]) {
    const value = (vars as Record<string, unknown>)[key];
    if (typeof value === 'string') out[key] = value.slice(0, 500);
  }
  return out;
};
