/**
 * Worker constants.
 */

/** Socket.IO namespace suffix for widget pages (`/addon/{id}/live`). */
export const SOCKET_PATH = 'live';

/** Persisted data format version. */
export const DATA_VERSION = 1;

/** History rows kept in storage. */
export const HISTORY_LIMIT = 200;

/** Processed dashboard record ids kept for de-duplication. */
export const PROCESSED_LIMIT = 500;

/** Maximum size of one uploaded media file, bytes. */
export const MEDIA_MAX_FILE = 8 * 1024 * 1024;

/** Maximum total size of the media library, bytes. */
export const MEDIA_MAX_TOTAL = 40 * 1024 * 1024;

/** Upload sessions older than this are discarded, ms. */
export const UPLOAD_TTL_MS = 10 * 60 * 1000;

/** Extra time on top of the alert length before the queue moves on without a widget ack, ms. */
export const ACK_GRACE_MS = 8000;

/** Allowed upload MIME types. */
export const MEDIA_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'weba',
};
