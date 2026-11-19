/**
 * Stream Alerts — on-screen alerts for OBS.
 * Standard kinds (donations, subscriptions, gift subs, follows) plus every platform event that
 * source addons register in the StreamKit+ trigger catalog (`triggers.getRegistered()`).
 * Events come from the StreamKit+ dashboard feed of every installed platform addon.
 * Events that already triggered an overlay / sound / hotkey / game effect are hidden by default.
 * @see https://rocketman-streamkit.github.io/types/
 */
import { refreshCatalog } from './catalog';
import { refreshAppCurrency } from './classify';
import { SOCKET_PATH } from './constants';
import { registerEndpoints } from './endpoints';
import { handleRecord } from './pipeline';
import { finish, onClient, shutdown } from './queue';
import { db, flush } from './store';
import { refreshAppliedRules } from './triggered';

/**
 * Reads the first argument of a socket event payload (field name differs between hosts).
 * @param payload Socket handler payload.
 * @returns First argument or `undefined`.
 * @example socketArg(payload)?.id;
 */
const socketArg = (
  payload: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const value =
    payload.data ?? (Array.isArray(payload.args) ? payload.args[0] : undefined);
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
};

/**
 * Registers the widget Socket.IO namespace.
 * @returns Promise resolved after registration.
 * @example await registerWidgetSocket();
 */
const registerWidgetSocket = async () => {
  await network.socketEndpoints.create(SOCKET_PATH, 'onWidgetSocket');
  events.On('onWidgetSocket', (payload: Record<string, unknown>) => {
    const socketId =
      typeof payload?.socketId === 'string' ? payload.socketId : '';
    if (!socketId) return undefined;
    if (payload.type === 'connect') {
      void network.socketEndpoints.emit(
        SOCKET_PATH,
        'stage',
        { stage: db.settings.stage, volume: db.settings.volume },
        socketId
      );
      onClient(socketId, true);
      return undefined;
    }
    if (payload.type === 'disconnect') {
      onClient(socketId, false);
      return undefined;
    }
    if (payload.type === 'event' && payload.event === 'done') {
      const id = socketArg(payload)?.id;
      if (typeof id === 'string') finish(id);
      return { success: true };
    }
    return undefined;
  });
};

/**
 * Worker startup.
 * @returns Promise resolved when ready.
 * @example void start();
 */
const start = async () => {
  await refreshAppCurrency();
  await refreshAppliedRules();
  await refreshCatalog();
  await registerEndpoints();
  await registerWidgetSocket();
  await dashboard.onRecord(payload => handleRecord(payload));
  events.On('triggers:applied-changed', () => void refreshAppliedRules());
  setInterval(() => void refreshAppliedRules(), 60_000);
  setInterval(() => void refreshCatalog(), 60_000);
  setInterval(() => void refreshAppCurrency(), 5 * 60_000);
  status.Update({ current: 'online' });
  console.log(`[${data.id}] ready`);
};

events.On('addon:prepare-stop', () => {
  shutdown();
  flush();
});

void start().catch(error => {
  console.error(`[${data.id}] startup failed`, error);
  status.Update({ current: 'error' });
});
