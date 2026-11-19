/**
 * Worker HTTP client for the control panel.
 */
import type {
  AlertsSettings,
  AlertVariant,
  CatalogEntry,
  HistoryEntry,
  MediaItem,
  ValueOption,
} from '../shared/types';
import { has, t } from './i18n';
import { toast } from './ui';

/** Addon id from `/addon_static/{id}/index.html`. */
const addonId = decodeURIComponent(
  window.location.pathname.split('/').filter(Boolean)[1] || 'stream-alerts'
);
/** Access token from the window URL. */
const token = new URLSearchParams(window.location.search).get('token') ?? '';
/** Worker endpoint base URL. */
const apiBase = `${window.location.origin}/addon/${encodeURIComponent(addonId)}`;

/**
 * State returned by `GET panel`.
 * @example const s: ServerState = await fetchState(true);
 */
export type ServerState = {
  /** Request succeeded. */
  success: boolean;
  /** Error key. */
  error?: string;
  /** App UI language. */
  lang: string;
  /** App currency code. */
  appCurrency: string;
  /** Queue status. */
  queue: {
    waiting: number;
    current: { id: string; kind: string; name: string; started: number } | null;
    paused: boolean;
    clients: number;
  };
  /** Journal, newest first. */
  history: HistoryEntry[];
  /** Settings (full responses only). */
  settings?: AlertsSettings;
  /** Platform events from the StreamKit+ trigger catalog (full responses only). */
  catalog?: CatalogEntry[];
  /** Media library (full responses only). */
  media?: MediaItem[];
  /** Media limits, bytes (full responses only). */
  mediaLimits?: { file: number; total: number };
  /** OBS widget URL (full responses only). */
  widgetUrl?: string;
};

/**
 * Localized text for a worker error key.
 * @param key Error key.
 * @returns Message.
 * @example errorText('tooLarge');
 */
export const errorText = (key?: string) =>
  key && has(`err_${key}`) ? t(`err_${key}`) : t('err_unknown');

/**
 * Loads the panel state.
 * @param full Include settings, media and widget URL.
 * @returns State, or `null` when the worker is unreachable.
 * @example const state = await fetchState(true);
 */
export const fetchState = async (
  full: boolean
): Promise<ServerState | null> => {
  try {
    const res = await fetch(
      `${apiBase}/panel?token=${encodeURIComponent(token)}${full ? '&full=1' : ''}`
    );
    return (await res.json()) as ServerState;
  } catch {
    return null;
  }
};

/**
 * Sends an action.
 * @param type Action type.
 * @param payload Extra fields.
 * @param quiet Do not toast errors.
 * @returns Worker result (with `state` for most actions).
 * @example await act('skip');
 */
export const act = async <R = Record<string, unknown>>(
  type: string,
  payload: Record<string, unknown> = {},
  quiet = false
): Promise<{ success: boolean; error?: string; state?: ServerState } & R> => {
  try {
    const res = await fetch(
      `${apiBase}/action?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      }
    );
    const result = (await res.json()) as {
      success: boolean;
      error?: string;
      state?: ServerState;
    } & R;
    if (!result.success && !quiet) toast(errorText(result.error), 'error');
    return result;
  } catch {
    if (!quiet) toast(t('err_network'), 'error');
    return { success: false, error: 'network' } as {
      success: boolean;
      error?: string;
    } & R;
  }
};

/**
 * Sends a test alert to OBS.
 * @param kind Alert kind.
 * @param variant Variant draft to show.
 * @param vars Sample values.
 * @param value Sample numeric value.
 * @param valueId Sample raw trigger value (select option / dynamic item id).
 * @returns Worker result.
 * @example await sendTest('donation', variant, { name: 'Bob' }, 100);
 */
export const sendTest = (
  kind: string,
  variant: AlertVariant,
  vars: Record<string, string>,
  value: number,
  valueId?: string
) => act('test', { kind, variant, vars, value, valueId });

/**
 * Lists the current values of a dynamic catalog trigger (e.g. channel-point rewards).
 * @param kind Catalog kind id.
 * @param force Bypass the worker cache.
 * @returns Result with items.
 * @example const res = await fetchValues('t|twitch|redeems');
 */
export const fetchValues = (kind: string, force = false) =>
  act<{ items?: ValueOption[]; message?: string }>(
    'values',
    { kind, force },
    true
  );

/**
 * URL of an uploaded media file.
 * @param item Media item.
 * @returns URL (video files get `&kind=video` for the renderer).
 * @example mediaUrl(item);
 */
export const mediaUrl = (item: MediaItem) =>
  `${apiBase}/media?id=${encodeURIComponent(item.id)}&token=${encodeURIComponent(token)}${item.mime.startsWith('video/') ? '&kind=video' : ''}`;

/** Raw bytes per upload chunk (multiple of 3 so base64 chunks concatenate cleanly). */
const CHUNK_BYTES = 48 * 1024;

/**
 * Encodes bytes as base64.
 * @param bytes Bytes.
 * @returns Base64 text.
 * @example toBase64(new Uint8Array([1, 2, 3])); // 'AQID'
 */
const toBase64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

/**
 * Uploads a file to the media library in chunks.
 * @param file File from an `<input type="file">`.
 * @param onProgress Progress callback (0–100).
 * @returns New media item or `null` on failure (errors are toasted).
 * @example const item = await uploadFile(file, p => bar.value = p);
 */
export const uploadFile = async (
  file: File,
  onProgress: (percent: number) => void
): Promise<MediaItem | null> => {
  const mime = file.type || (/\.mp3$/i.test(file.name) ? 'audio/mpeg' : '');
  const begin = await act<{ id?: string }>('mediaBegin', {
    name: file.name,
    mime,
    size: file.size,
  });
  if (!begin.success || !begin.id) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  for (
    let index = 0, offset = 0;
    offset < bytes.length;
    index++, offset += CHUNK_BYTES
  ) {
    const res = await act('mediaChunk', {
      id: begin.id,
      index,
      data: toBase64(bytes.subarray(offset, offset + CHUNK_BYTES)),
    });
    if (!res.success) return null;
    onProgress(Math.round(((offset + CHUNK_BYTES) / bytes.length) * 100));
  }
  const end = await act<{ item?: MediaItem }>('mediaEnd', { id: begin.id });
  return end.success && end.item ? end.item : null;
};

/**
 * Opens a URL in the system browser via the worker.
 * @param url http(s) URL.
 * @example openExternal('https://obsproject.com');
 */
export const openExternal = (url: string) => void act('openUrl', { url }, true);
