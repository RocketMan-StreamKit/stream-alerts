/**
 * OBS widget (`widget.html?token=…`): receives alerts over Socket.IO, plays them one by one and
 * acknowledges each with `done` so the worker can move the queue on.
 */
import { AlertRenderer } from './render/renderer';
import type { AlertPayload, AlertsSettings } from './shared/types';

/**
 * Minimal Socket.IO client surface used here.
 * @example socket.emit('done', { id });
 */
type IoSocket = {
  on: (event: string, fn: (data: any) => void) => void;
  emit: (event: string, data?: unknown) => void;
};

/** Socket.IO factory installed by the client script. */
type IoFactory = (url: string, options: Record<string, unknown>) => IoSocket;

/** Addon id from `/addon_static/{id}/widget.html`. */
const addonId = decodeURIComponent(
  window.location.pathname.split('/').filter(Boolean)[1] || 'stream-alerts'
);
/** Access token. */
const token = new URLSearchParams(window.location.search).get('token') ?? '';
/** `?muted=1` disables sounds (for a second, silent browser source). */
const muted = new URLSearchParams(window.location.search).get('muted') === '1';

/** Renderer. */
const renderer = new AlertRenderer(
  document.getElementById('stage') as HTMLElement
);
/** Alerts received but not played yet (normally 0–1). */
const pending: AlertPayload[] = [];
/** True while an alert is on screen. */
let busy = false;
/** Socket. */
let socket: IoSocket | null = null;

/**
 * Plays queued alerts sequentially.
 * @returns Promise resolved when the local queue is empty.
 * @example void drain();
 */
const drain = async () => {
  if (busy) return;
  busy = true;
  let next: AlertPayload | undefined;
  while ((next = pending.shift())) {
    try {
      await renderer.play(next, { muted });
    } catch (error) {
      console.error('[stream-alerts] play failed', error);
    }
    socket?.emit('done', { id: next.id });
  }
  busy = false;
};

/**
 * Loads a script tag.
 * @param src Script URL.
 * @returns Promise resolved on load, rejected on error.
 * @example await loadScript('/addon/socket.io/socket.io.js');
 */
const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(src));
    document.head.append(el);
  });

/**
 * Connects to the worker namespace (client script from the app server, CDN as fallback).
 * @returns Promise resolved after the socket is created.
 * @example await connect();
 */
const connect = async () => {
  const w = window as unknown as { io?: IoFactory };
  if (!w.io) {
    try {
      await loadScript(
        `${window.location.origin}/addon/socket.io/socket.io.js`
      );
    } catch {
      await loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js'
      );
    }
  }
  if (!w.io) throw new Error('socket.io client unavailable');
  const s = w.io(
    `${window.location.origin}/addon/${encodeURIComponent(addonId)}/live`,
    {
      path: '/addon/socket.io',
      transports: ['websocket', 'polling'],
      query: { token },
    }
  );
  socket = s;
  s.on('stage', (data: { stage?: AlertsSettings['stage'] }) => {
    if (data?.stage) renderer.setStage(data.stage);
  });
  s.on('play', (payload: AlertPayload) => {
    if (!payload?.id || !payload.variant) return;
    pending.push(payload);
    void drain();
  });
  s.on('skip', (data: { id?: string }) => {
    if (!data?.id) return;
    const idx = pending.findIndex(p => p.id === data.id);
    if (idx >= 0) pending.splice(idx, 1);
    renderer.skip(data.id);
  });
};

/**
 * Retries the connection until the socket script is available.
 * @param attempt Attempt number.
 * @example start();
 */
const start = (attempt = 0) => {
  connect().catch(error => {
    console.warn('[stream-alerts] connect failed, retrying', error);
    window.setTimeout(
      () => start(attempt + 1),
      Math.min(30000, 2000 * (attempt + 1))
    );
  });
};

start();
