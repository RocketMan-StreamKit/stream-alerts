/**
 * Alert queue: plays one alert at a time on every connected widget, waits for the widget
 * ack (or a timeout), keeps a gap, then moves on. Also reports activity via `alerts.*`
 * so other addons (music players, …) can duck while an alert is on screen.
 */
import { ACK_GRACE_MS, HISTORY_LIMIT, SOCKET_PATH } from './constants';
import { resolveVariantMedia } from './media';
import { createVariant, newId } from './shared/defaults';
import { pickVariant, renderText } from './shared/template';
import type {
  AlertEvent,
  AlertPayload,
  AlertVariant,
  HistoryEntry,
  HistoryStatus,
} from './shared/types';
import { db, markDirty } from './store';

/**
 * Waiting alert.
 * @example queue.push({ entry, payload, enqueued: Date.now() });
 */
type QueueItem = {
  /** Journal row (status is updated in place). */
  entry: HistoryEntry;
  /** Payload for the widget. */
  payload: AlertPayload;
  /** Enqueue time, ms epoch. */
  enqueued: number;
};

/** Waiting alerts. */
const queue: QueueItem[] = [];
/** Alert on screen. */
let current: { item: QueueItem; timer: number; started: number } | null = null;
/** Gap timer between alerts. */
let gapTimer: number | null = null;
/** Connected widget socket ids. */
const clients = new Set<string>();

/**
 * Snapshot of the queue for the panel.
 * @returns Queue state.
 * @example queueState().waiting; // 2
 */
export const queueState = () => ({
  waiting: queue.length,
  current: current
    ? {
        id: current.item.entry.id,
        kind: current.item.entry.event.kind,
        name: current.item.entry.event.vars.name,
        started: current.started,
      }
    : null,
  paused: db.settings.queue.paused,
  clients: clients.size,
});

/**
 * Adds a row to the journal.
 * @param entry Journal row.
 * @example addHistory(entry);
 */
export const addHistory = (entry: HistoryEntry) => {
  db.history.push(entry);
  if (db.history.length > HISTORY_LIMIT * 1.2)
    db.history = db.history.slice(-HISTORY_LIMIT);
  markDirty();
};

/**
 * Updates a journal row status.
 * @param entry Journal row.
 * @param status New status.
 * @example setStatus(entry, 'shown');
 */
const setStatus = (entry: HistoryEntry, status: HistoryStatus) => {
  entry.status = status;
  markDirty();
};

/**
 * Builds the widget payload for an event.
 * @param event Event.
 * @param options `test` flag and optional forced variant (panel "test this variant").
 * @returns Payload.
 * @example const payload = buildPayload(event, { test: true });
 */
export const buildPayload = (
  event: AlertEvent,
  options: { test?: boolean; variant?: AlertVariant } = {}
): AlertPayload => {
  const config = db.settings.kinds[event.kind];
  const variant =
    options.variant ??
    (config ? pickVariant(config, event) : createVariant(event.kind));
  const vars = { ...event.vars };
  if (vars.message) {
    vars.message = censor(vars.message);
    const max = variant.message.maxLength;
    if (vars.message.length > max)
      vars.message = `${vars.message.slice(0, max - 1)}…`;
  }
  return {
    id: newId(),
    kind: event.kind,
    variant: resolveVariantMedia(variant),
    vars,
    stage: db.settings.stage,
    volume: db.settings.volume,
    test: options.test || undefined,
  };
};

/**
 * Replaces banned words with asterisks.
 * @param text Message.
 * @returns Censored message.
 * @example censor('bad word'); // '*** word' when 'bad' is banned
 */
const censor = (text: string) => {
  let out = text;
  for (const word of db.settings.filters.bannedWords) {
    if (!word) continue;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'gi'), '***');
  }
  return out;
};

/**
 * Total on-screen time of a payload, ms.
 * @param payload Payload.
 * @returns Milliseconds.
 * @example alertLength(payload); // 9100
 */
const alertLength = (payload: AlertPayload) => {
  const v = payload.variant;
  return v.animation.enterMs + v.durationMs + v.animation.exitMs;
};

/**
 * Puts an alert in the queue.
 * @param entry Journal row (already in history).
 * @param payload Widget payload.
 * @param front Put before other waiting alerts (tests, replays).
 * @example enqueue(entry, payload);
 */
export const enqueue = (
  entry: HistoryEntry,
  payload: AlertPayload,
  front = false
) => {
  const item: QueueItem = { entry, payload, enqueued: Date.now() };
  if (front) queue.unshift(item);
  else queue.push(item);
  setStatus(entry, 'queued');
  while (queue.length > db.settings.queue.maxSize) {
    const dropped = queue.splice(front ? queue.length - 1 : 0, 1)[0];
    setStatus(dropped.entry, 'dropped');
  }
  pump();
};

/**
 * Speaks the alert through StreamKit+ TTS when the variant asks for it.
 * @param item Queue item.
 * @example speak(item);
 */
const speak = (item: QueueItem) => {
  const { variant, vars } = item.payload;
  if (!variant.tts.enabled) return;
  if (variant.tts.min > 0 && item.entry.event.value < variant.tts.min) return;
  const text = renderText(variant.tts.template, vars);
  if (!text) return;
  setTimeout(() => {
    void tts
      .speak(text, { volumeMultiplier: variant.tts.volume / 100 })
      .catch(() => undefined);
  }, variant.animation.enterMs);
};

/**
 * Starts the next alert when possible.
 * @example pump();
 */
export const pump = () => {
  if (
    current ||
    gapTimer !== null ||
    db.settings.queue.paused ||
    clients.size === 0
  )
    return;
  const expireMs = db.settings.queue.expireSec * 1000;
  let item: QueueItem | undefined;
  while ((item = queue.shift())) {
    if (
      expireMs > 0 &&
      !item.entry.test &&
      Date.now() - item.enqueued > expireMs
    ) {
      setStatus(item.entry, 'expired');
      continue;
    }
    break;
  }
  if (!item) return;
  const started = Date.now();
  const playing = item;
  const timer = setTimeout(
    () => finish(playing.payload.id),
    alertLength(playing.payload) + ACK_GRACE_MS
  );
  current = { item: playing, timer, started };
  setStatus(playing.entry, 'playing');
  alerts.started();
  void network.socketEndpoints.emit(SOCKET_PATH, 'play', playing.payload);
  speak(playing);
};

/**
 * Finishes the alert on screen (widget ack, timeout or skip).
 * @param alertId Payload id; ignored when it is not the current alert.
 * @param status Final journal status.
 * @example finish(payload.id);
 */
export const finish = (alertId: string, status: HistoryStatus = 'shown') => {
  if (!current || current.item.payload.id !== alertId) return;
  clearTimeout(current.timer);
  setStatus(current.item.entry, status);
  current = null;
  alerts.ended();
  gapTimer = setTimeout(() => {
    gapTimer = null;
    pump();
  }, db.settings.queue.gapMs);
};

/**
 * Skips the alert on screen.
 * @returns True when something was skipped.
 * @example skipCurrent();
 */
export const skipCurrent = () => {
  if (!current) return false;
  const id = current.item.payload.id;
  void network.socketEndpoints.emit(SOCKET_PATH, 'skip', { id });
  finish(id, 'skipped');
  return true;
};

/**
 * Drops every waiting alert.
 * @returns Number of dropped alerts.
 * @example clearQueue();
 */
export const clearQueue = () => {
  const dropped = queue.splice(0, queue.length);
  dropped.forEach(item => setStatus(item.entry, 'dropped'));
  return dropped.length;
};

/**
 * Tracks widget connections and restarts the queue when one appears.
 * @param socketId Socket id.
 * @param connected Connect or disconnect.
 * @example onClient(payload.socketId, true);
 */
export const onClient = (socketId: string, connected: boolean) => {
  if (connected) clients.add(socketId);
  else clients.delete(socketId);
  if (connected) pump();
};

/**
 * Pushes current stage settings to widgets (live position changes).
 * @example broadcastStage();
 */
export const broadcastStage = () => {
  void network.socketEndpoints.emit(SOCKET_PATH, 'stage', {
    stage: db.settings.stage,
    volume: db.settings.volume,
  });
};

/**
 * Stops everything (addon shutdown).
 * @example shutdown();
 */
export const shutdown = () => {
  if (current) {
    clearTimeout(current.timer);
    current = null;
    alerts.ended();
  }
  clearQueue();
};
