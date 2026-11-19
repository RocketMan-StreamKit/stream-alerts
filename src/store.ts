/**
 * Persistent addon data (`storage_data.json`): settings, journal, media library.
 */
import { DATA_VERSION, HISTORY_LIMIT, PROCESSED_LIMIT } from './constants';
import { createDefaultSettings } from './shared/defaults';
import { obj, sanitizeSettings } from './shared/sanitize';
import type { AlertsSettings, HistoryEntry, MediaItem } from './shared/types';

/**
 * Whole persisted blob.
 * @example storage.Write<PersistedData>(db);
 */
export type PersistedData = {
  /** Format version. */
  version: number;
  /** User settings. */
  settings: AlertsSettings;
  /** Journal, oldest first. */
  history: HistoryEntry[];
  /** Processed dashboard record ids (de-duplication). */
  processed: string[];
  /** Media library metadata. */
  media: MediaItem[];
  /** Media bytes as base64 keyed by media id (restored into `ADDON_TMP_DIR` on start). */
  mediaData: Record<string, string>;
};

/**
 * Loads persisted data and repairs invalid fields.
 * @returns Valid data.
 * @example const db = loadData();
 */
const loadData = (): PersistedData => {
  const raw = obj(storage.Read<unknown>());
  const lang = typeof LANG !== 'undefined' ? LANG.current : 'en';
  const defaults = createDefaultSettings(lang);
  const settings = raw.settings
    ? sanitizeSettings(raw.settings, defaults, lang)
    : defaults;
  const media = (Array.isArray(raw.media) ? raw.media : []).filter(
    (m): m is MediaItem =>
      !!m &&
      typeof m === 'object' &&
      typeof (m as MediaItem).id === 'string' &&
      typeof (m as MediaItem).mime === 'string'
  );
  const mediaData = obj(raw.mediaData) as Record<string, string>;
  return {
    version: DATA_VERSION,
    settings,
    history: (Array.isArray(raw.history) ? (raw.history as HistoryEntry[]) : [])
      .filter(h => h && typeof h.id === 'string' && h.event)
      .map(h =>
        h.status === 'queued' || h.status === 'playing'
          ? { ...h, status: 'dropped' as const }
          : h
      )
      .slice(-HISTORY_LIMIT),
    processed: (Array.isArray(raw.processed) ? raw.processed : [])
      .filter((v): v is string => typeof v === 'string')
      .slice(-PROCESSED_LIMIT),
    media: media.filter(m => typeof mediaData[m.id] === 'string'),
    mediaData,
  };
};

/**
 * Live data; mutate, then call {@link markDirty}.
 * @example db.settings.volume = 50; markDirty();
 */
export const db: PersistedData = loadData();

/** Pending write timer. */
let saveTimer: number | null = null;

/**
 * Writes the data now.
 * @example flush();
 */
export const flush = () => {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  db.history = db.history.slice(-HISTORY_LIMIT);
  db.processed = db.processed.slice(-PROCESSED_LIMIT);
  try {
    storage.Write<PersistedData>(db);
  } catch (error) {
    console.error('[stream-alerts] storage write failed', error);
  }
};

/**
 * Schedules a coalesced write.
 * @param delayMs Maximum delay.
 * @example markDirty();
 */
export const markDirty = (delayMs = 2000) => {
  if (saveTimer !== null) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flush();
  }, delayMs);
};
