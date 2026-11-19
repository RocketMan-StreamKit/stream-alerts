/**
 * Panel state: an editable settings draft (autosaved) plus live server data (queue, journal).
 */
import type { AlertsSettings, CatalogEntry, MediaItem } from '../shared/types';
import { act, fetchState, type ServerState } from './api';

/**
 * Panel-wide state.
 * @example store.settings.volume = 50; settingsChanged();
 */
export const store = {
  /** Editable settings (bound to form controls by reference — never replaced after load). */
  settings: null as unknown as AlertsSettings,
  /** Latest live data. */
  server: null as unknown as ServerState,
  /** Media library. */
  media: [] as MediaItem[],
  /** Media limits, bytes. */
  mediaLimits: { file: 0, total: 0 },
  /** OBS widget URL. */
  widgetUrl: '',
  /** App currency. */
  appCurrency: 'USD',
  /** Platform events from the trigger catalog. */
  catalog: [] as CatalogEntry[],
};

/** Live-data listeners. */
const liveListeners = new Set<() => void>();
/** Settings-change listeners (preview etc.). */
const settingsListeners = new Set<() => void>();
/** Save status listeners. */
const saveListeners = new Set<(saving: boolean) => void>();

/**
 * Subscribes to live data updates.
 * @param fn Listener.
 * @example onLive(() => renderFeed());
 */
export const onLive = (fn: () => void) => void liveListeners.add(fn);

/**
 * Subscribes to settings edits.
 * @param fn Listener.
 * @example onSettings(() => preview.refresh());
 */
export const onSettings = (fn: () => void) => void settingsListeners.add(fn);

/**
 * Subscribes to save status.
 * @param fn Listener (`true` while saving).
 * @example onSave(saving => badge.hidden = !saving);
 */
export const onSave = (fn: (saving: boolean) => void) =>
  void saveListeners.add(fn);

/**
 * Applies server data (never replaces the settings draft).
 * @param next Server state.
 * @example applyServer(res.state);
 */
export const applyServer = (next: ServerState | undefined | null) => {
  if (!next || !next.success) return;
  store.server = next;
  store.appCurrency = next.appCurrency || store.appCurrency;
  if (next.media) store.media = next.media;
  if (next.mediaLimits) store.mediaLimits = next.mediaLimits;
  if (next.widgetUrl) store.widgetUrl = next.widgetUrl;
  if (next.catalog) store.catalog = next.catalog;
  if (next.settings && store.settings) {
    // Kinds discovered by the worker (a platform addon was enabled) join the draft.
    for (const [id, cfg] of Object.entries(next.settings.kinds))
      if (!store.settings.kinds[id]) store.settings.kinds[id] = cfg;
  }
  if (next.settings && store.settings)
    store.settings.queue.paused = next.settings.queue.paused;
  liveListeners.forEach(fn => fn());
};

/** Debounced save timer. */
let saveTimer: number | null = null;

/**
 * Sends the draft to the worker now.
 * @returns Promise resolved after the save.
 * @example await saveNow();
 */
export const saveNow = async () => {
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  const res = await act('settings', { settings: store.settings });
  applyServer(res.state);
  saveListeners.forEach(fn => fn(false));
};

/**
 * Marks the draft as edited: notifies the preview and schedules an autosave.
 * @example store.settings.stage.scale = 120; settingsChanged();
 */
export const settingsChanged = () => {
  settingsListeners.forEach(fn => fn());
  saveListeners.forEach(fn => fn(true));
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveNow(), 600);
};

/**
 * Loads the full state (first load).
 * @returns True when the worker answered.
 * @example if (await loadInitial()) build();
 */
export const loadInitial = async () => {
  const res = await fetchState(true);
  if (!res || !res.success || !res.settings) return false;
  store.settings = res.settings;
  applyServer(res);
  return true;
};

/**
 * Polls live data.
 * @example window.setInterval(() => void poll(), 1500);
 */
export const poll = async () => {
  const res = await fetchState(false);
  if (res) applyServer(res);
};

/**
 * Removes a media file and clears its references in the draft (mirrors the worker).
 * @param id Media id.
 * @returns Promise resolved after removal.
 * @example await deleteMedia('abc');
 */
export const deleteMedia = async (id: string) => {
  const res = await act('mediaDelete', { id });
  if (!res.success) return;
  const ref = `media:${id}`;
  for (const kind of Object.values(store.settings.kinds)) {
    for (const v of kind.variants) {
      if (v.image.src === ref) v.image.src = '';
      if (v.sound.src === ref) v.sound.src = '';
    }
  }
  applyServer(res.state);
  settingsListeners.forEach(fn => fn());
};
