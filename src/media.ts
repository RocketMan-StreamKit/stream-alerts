/**
 * Media library: chunked uploads from the panel, files served to the widget from `ADDON_TMP_DIR`.
 * Bytes are kept in storage as base64 (the temp folder may be wiped) and restored lazily on first request.
 */
import {
  MEDIA_MAX_FILE,
  MEDIA_MAX_TOTAL,
  MEDIA_MIME,
  UPLOAD_TTL_MS,
} from './constants';
import { newId } from './shared/defaults';
import type { AlertVariant, MediaItem } from './shared/types';
import { db, markDirty } from './store';

/**
 * In-progress upload.
 * @example uploads.set(id, { name, mime, size, chunks: [], started: Date.now() });
 */
type UploadSession = {
  /** File name. */
  name: string;
  /** MIME type. */
  mime: string;
  /** Declared size in bytes. */
  size: number;
  /** Base64 chunks in order. */
  chunks: string[];
  /** Start time, ms epoch. */
  started: number;
};

/** Active uploads by id. */
const uploads = new Map<string, UploadSession>();
/** Media ids already written to the temp folder in this worker run. */
const restored = new Set<string>();

/**
 * Result of a media operation.
 * @example const res: MediaResult = { success: false, error: 'tooLarge' };
 */
export type MediaResult = {
  success: boolean;
  error?: string;
  id?: string;
  item?: MediaItem;
};

/**
 * Absolute temp path of a media file.
 * @param item Media item.
 * @returns File path.
 * @example tmpPath(item); // '/tmp/StreamKitPlusAddons/stream-alerts/media-abc.gif'
 */
const tmpPath = (item: MediaItem) => {
  const sep = ADDON_TMP_DIR.includes('\\') ? '\\' : '/';
  return `${ADDON_TMP_DIR}${sep}media-${item.id}.${MEDIA_MIME[item.mime] ?? 'bin'}`;
};

/**
 * Total library size, bytes.
 * @returns Byte count.
 * @example librarySize(); // 1048576
 */
const librarySize = () => db.media.reduce((acc, m) => acc + m.size, 0);

/**
 * Approximate decoded size of a base64 string.
 * @param b64 Base64 text.
 * @returns Bytes.
 * @example base64Bytes('AAAA'); // 3
 */
const base64Bytes = (b64: string) =>
  Math.floor((b64.length * 3) / 4) -
  (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);

/**
 * Writes one media file into the temp folder.
 * @param item Media item.
 * @returns True when the file is available.
 * @example await ensureOnDisk(item);
 */
const ensureOnDisk = async (item: MediaItem) => {
  if (restored.has(item.id)) return true;
  const data = db.mediaData[item.id];
  if (!data) return false;
  try {
    const res = (await files.writeFile(tmpPath(item), data, 'base64')) as
      | { success?: boolean }
      | undefined;
    if (res && res.success === false) return false;
    restored.add(item.id);
    return true;
  } catch (error) {
    console.error('[stream-alerts] media write failed', error);
    return false;
  }
};

/**
 * Drops stale upload sessions.
 * @example pruneUploads();
 */
const pruneUploads = () => {
  const now = Date.now();
  for (const [id, session] of uploads)
    if (now - session.started > UPLOAD_TTL_MS) uploads.delete(id);
};

/**
 * Starts an upload.
 * @param name File name.
 * @param mime MIME type.
 * @param size Size in bytes.
 * @returns Upload id or an error.
 * @example uploadBegin('cat.gif', 'image/gif', 2048);
 */
export const uploadBegin = (
  name: string,
  mime: string,
  size: number
): MediaResult => {
  pruneUploads();
  if (!MEDIA_MIME[mime]) return { success: false, error: 'badType' };
  if (!(size > 0) || size > MEDIA_MAX_FILE)
    return { success: false, error: 'tooLarge' };
  if (librarySize() + size > MEDIA_MAX_TOTAL)
    return { success: false, error: 'libraryFull' };
  const id = newId();
  uploads.set(id, {
    name: name.slice(0, 120) || 'file',
    mime,
    size,
    chunks: [],
    started: Date.now(),
  });
  return { success: true, id };
};

/**
 * Appends a chunk.
 * @param id Upload id.
 * @param index Chunk index (must be sequential).
 * @param data Base64 chunk.
 * @returns Result.
 * @example uploadChunk(id, 0, 'R0lGOD…');
 */
export const uploadChunk = (
  id: string,
  index: number,
  data: string
): MediaResult => {
  const session = uploads.get(id);
  if (!session) return { success: false, error: 'noUpload' };
  if (
    index !== session.chunks.length ||
    typeof data !== 'string' ||
    !/^[A-Za-z0-9+/=]*$/.test(data)
  ) {
    uploads.delete(id);
    return { success: false, error: 'badChunk' };
  }
  session.chunks.push(data);
  if (base64Bytes(session.chunks.join('')) > MEDIA_MAX_FILE) {
    uploads.delete(id);
    return { success: false, error: 'tooLarge' };
  }
  return { success: true };
};

/**
 * Finishes an upload and adds the file to the library.
 * @param id Upload id.
 * @returns New media item.
 * @example const { item } = await uploadEnd(id);
 */
export const uploadEnd = async (id: string): Promise<MediaResult> => {
  const session = uploads.get(id);
  uploads.delete(id);
  if (!session) return { success: false, error: 'noUpload' };
  const data = session.chunks.join('');
  const size = base64Bytes(data);
  if (size <= 0 || size > MEDIA_MAX_FILE)
    return { success: false, error: 'tooLarge' };
  if (librarySize() + size > MEDIA_MAX_TOTAL)
    return { success: false, error: 'libraryFull' };
  const item: MediaItem = {
    id,
    name: session.name,
    mime: session.mime,
    size,
    created: Date.now(),
  };
  db.mediaData[id] = data;
  db.media.push(item);
  markDirty(500);
  await ensureOnDisk(item);
  return { success: true, item };
};

/**
 * Removes a media file (references in settings become empty).
 * @param id Media id.
 * @returns Result.
 * @example removeMedia('abc');
 */
export const removeMedia = (id: string): MediaResult => {
  const index = db.media.findIndex(m => m.id === id);
  if (index < 0) return { success: false, error: 'notFound' };
  db.media.splice(index, 1);
  delete db.mediaData[id];
  restored.delete(id);
  const ref = `media:${id}`;
  for (const kind of Object.values(db.settings.kinds)) {
    for (const variant of kind.variants) {
      if (variant.image.src === ref) variant.image.src = '';
      if (variant.sound.src === ref) variant.sound.src = '';
    }
  }
  markDirty(500);
  return { success: true };
};

/**
 * Serves a media file for `GET media?id=`.
 * @param id Media id.
 * @returns `{ file, contentType }` or an error body.
 * @example return await serveMedia(query.id);
 */
export const serveMedia = async (id: string) => {
  const item = db.media.find(m => m.id === id);
  if (!item || !(await ensureOnDisk(item)))
    return { success: false, error: 'notFound' };
  return { file: tmpPath(item), contentType: item.mime };
};

/**
 * Public URL of a media id for the widget / panel.
 * @param id Media id.
 * @returns Absolute URL with the access token.
 * @example mediaUrl('abc'); // 'http://localhost:3000/addon/stream-alerts/media?id=abc&token=…'
 */
export const mediaUrl = (id: string) =>
  `http://localhost:${WEB_SERVER_PORT}/addon/${encodeURIComponent(data.id)}/media?id=${encodeURIComponent(id)}&token=${encodeURIComponent(data.token)}`;

/**
 * Turns a `media:{id}` reference into a URL (other references pass through).
 * @param ref Media reference.
 * @returns Resolved reference.
 * @example resolveRef('media:abc'); // 'http://localhost:…'
 */
const resolveRef = (ref: string) => {
  if (!ref.startsWith('media:')) return ref;
  const id = ref.slice(6);
  const item = db.media.find(m => m.id === id);
  if (!item) return '';
  return item.mime.startsWith('video/')
    ? `${mediaUrl(id)}&kind=video`
    : mediaUrl(id);
};

/**
 * Copies a variant with media references resolved to URLs.
 * @param variant Variant.
 * @returns Variant for the widget.
 * @example resolveVariantMedia(variant).image.src;
 */
export const resolveVariantMedia = (variant: AlertVariant): AlertVariant => ({
  ...variant,
  image: { ...variant.image, src: resolveRef(variant.image.src) },
  sound: { ...variant.sound, src: resolveRef(variant.sound.src) },
});
