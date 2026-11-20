/**
 * HTTP API for the control panel and the widget media route. Every call requires `?token=`.
 */
import { getAppCurrency, refreshAppCurrency } from './classify';
import { MEDIA_MAX_FILE, MEDIA_MAX_TOTAL } from './constants';
import {
  removeMedia,
  serveMedia,
  uploadBegin,
  uploadChunk,
  uploadEnd,
} from './media';
import { replay, sendTest } from './pipeline';
import {
  broadcastStage,
  clearQueue,
  pump,
  queueState,
  skipCurrent,
} from './queue';
import { getCatalog, getEntry, listValues, refreshCatalog } from './catalog';
import { parseDonationAlerts } from './import-da';
import { sanitizeSettings } from './shared/sanitize';
import { db, flush, markDirty } from './store';

/** Journal rows sent to the panel. */
const PANEL_HISTORY = 100;

/**
 * Absolute widget URL for the OBS browser source.
 * @returns URL with the access token.
 * @example widgetUrl(); // 'http://localhost:3000/addon_static/stream-alerts/widget.html?token=…'
 */
export const widgetUrl = () =>
  `http://localhost:${WEB_SERVER_PORT}/addon_static/${encodeURIComponent(data.id)}/widget.html?token=${encodeURIComponent(data.token)}`;

/**
 * Panel state.
 * @param full Include settings and media (first load / after settings changes).
 * @returns JSON for the panel.
 * @example panelState(true).settings;
 */
const panelState = (full = true) => ({
  success: true,
  lang: LANG.current,
  appCurrency: getAppCurrency(),
  queue: queueState(),
  history: db.history.slice(-PANEL_HISTORY).reverse(),
  ...(full
    ? {
        settings: db.settings,
        catalog: getCatalog(),
        media: db.media,
        mediaLimits: { file: MEDIA_MAX_FILE, total: MEDIA_MAX_TOTAL },
        widgetUrl: widgetUrl(),
      }
    : {}),
});

/**
 * Reads a string body field.
 * @param value Raw value.
 * @returns String or empty.
 * @example s(body.id);
 */
const s = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * Runs one panel action.
 * @param body Request body `{ type, … }`.
 * @returns Result object (merged with the new state by the caller).
 * @example await runAction({ type: 'skip' });
 */
const runAction = async (
  body: Record<string, unknown>
): Promise<{ success: boolean; error?: string; [key: string]: unknown }> => {
  switch (body.type) {
    case 'settings': {
      const before = JSON.stringify(db.settings.stage) + db.settings.volume;
      const paused = db.settings.queue.paused;
      db.settings = sanitizeSettings(body.settings, db.settings, LANG.current);
      // Pause is owned by the pause/resume actions, not by the (possibly stale) settings draft.
      db.settings.queue.paused = paused;
      markDirty(800);
      if (JSON.stringify(db.settings.stage) + db.settings.volume !== before)
        broadcastStage();
      pump();
      return { success: true };
    }
    case 'pause':
    case 'resume':
      db.settings.queue.paused = body.type === 'pause';
      markDirty(500);
      pump();
      return { success: true };
    case 'skip':
      return { success: skipCurrent(), error: 'nothingPlaying' };
    case 'clearQueue':
      return { success: true, dropped: clearQueue() };
    case 'clearHistory':
      db.history = [];
      markDirty(500);
      return { success: true };
    case 'test': {
      const kind = s(body.kind);
      if (!db.settings.kinds[kind] && !getEntry(kind))
        return { success: false, error: 'badKind' };
      await sendTest(
        kind,
        body.variant,
        body.vars as Record<string, string> | undefined,
        typeof body.value === 'number' ? body.value : undefined,
        typeof body.valueId === 'string' ? body.valueId : undefined
      );
      return { success: true };
    }
    case 'values': {
      const entry = getEntry(s(body.kind));
      if (!entry?.valueProvider) return { success: false, error: 'badKind' };
      const res = await listValues(
        entry.addonId,
        entry.valueProvider,
        body.force === true
      );
      return {
        success: res.success,
        items: res.items,
        error: res.success ? undefined : 'valuesFailed',
        message: res.message,
      };
    }
    case 'daParse':
      return parseDonationAlerts(s(body.url).slice(0, 2000), LANG.current);
    case 'replay':
      return replay(s(body.id))
        ? { success: true }
        : { success: false, error: 'notFound' };
    case 'mediaBegin':
      return uploadBegin(s(body.name), s(body.mime), Number(body.size));
    case 'mediaChunk':
      return uploadChunk(s(body.id), Number(body.index), s(body.data));
    case 'mediaEnd': {
      const res = await uploadEnd(s(body.id));
      if (res.success) flush();
      return res;
    }
    case 'mediaDelete':
      return removeMedia(s(body.id));
    case 'openUrl': {
      const url = s(body.url);
      if (!/^https?:\/\//i.test(url))
        return { success: false, error: 'invalidUrl' };
      api.openUrl(url);
      return { success: true };
    }
    default:
      return { success: false, error: 'unknownAction' };
  }
};

/**
 * Registers HTTP endpoints.
 * @returns Promise resolved after registration.
 * @example await registerEndpoints();
 */
export const registerEndpoints = async () => {
  await network.endpoints.create('panel', 'GET', 'onPanelState');
  await network.endpoints.create('action', 'POST', 'onPanelAction');
  await network.endpoints.create('media', 'GET', 'onMedia');

  events.On('onPanelState', async ({ query }) => {
    if (query?.token !== data.token)
      return { success: false, error: 'unauthorized' };
    if (query?.full === '1')
      await Promise.all([refreshAppCurrency(), refreshCatalog()]);
    return panelState(query?.full === '1');
  });

  events.On('onPanelAction', async ({ query, body }) => {
    if (query?.token !== data.token)
      return { success: false, error: 'unauthorized' };
    const payload = (body && typeof body === 'object' ? body : {}) as Record<
      string,
      unknown
    >;
    const result = await runAction(payload);
    const light =
      payload.type === 'mediaChunk' ||
      payload.type === 'mediaBegin' ||
      payload.type === 'values' ||
      payload.type === 'daParse';
    return light
      ? result
      : { ...result, state: panelState(payload.type !== 'settings') };
  });

  events.On('onMedia', async ({ query }) => {
    if (query?.token !== data.token)
      return { success: false, error: 'unauthorized' };
    return serveMedia(s(query?.id));
  });
};
