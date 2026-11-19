/**
 * Feed tab: queue controls and the event journal (including hidden events with a «Show» button).
 */
import type { HistoryEntry } from '../../shared/types';
import { act } from '../api';
import { fill, h } from '../dom';
import { getLang, t } from '../i18n';
import { kindLabel } from '../kinds';
import { applyServer, onLive, store } from '../state';
import { confirmDialog } from '../ui';

/** Status → badge style. */
const STATUS_TONE: Record<string, string> = {
  queued: 'info',
  playing: 'accent',
  shown: 'ok',
  hidden: 'warn',
  disabled: 'muted',
  blocked: 'bad',
  skipped: 'muted',
  expired: 'muted',
  dropped: 'muted',
};

/**
 * Formats a time of day.
 * @param ms Epoch ms.
 * @returns `HH:MM:SS`.
 * @example clock(Date.now());
 */
const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString(getLang(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/**
 * One journal row.
 * @param entry Journal entry.
 * @returns Row element.
 * @example historyRow(entry);
 */
const historyRow = (entry: HistoryEntry) => {
  const ev = entry.event;
  const detail =
    ev.vars.amount ||
    (ev.vars.count ? `×${ev.vars.count}` : '') ||
    (ev.vars.months ? `${ev.vars.months} mo` : '') ||
    ev.vars.value ||
    '';
  const triggered = entry.triggered?.length
    ? t('triggeredBy', {
        list: entry.triggered.map(s => t(`sys_${s}`)).join(', '),
      })
    : '';
  return h('div', { class: ['sa-hrow', `is-${entry.status}`] }, [
    h('span', { class: 'sa-hrow__time', text: clock(entry.created) }),
    h('span', { class: 'sa-hrow__kind', text: kindLabel(ev.kind) }),
    h('span', { class: 'sa-hrow__main' }, [
      h('strong', { text: ev.vars.name }),
      detail
        ? h('span', { class: 'sa-hrow__amount', text: ` ${detail}` })
        : null,
      ev.vars.message
        ? h('span', { class: 'sa-hrow__msg', text: ev.vars.message })
        : null,
      triggered ? h('span', { class: 'sa-hrow__why', text: triggered }) : null,
    ]),
    h('span', { class: 'sa-hrow__badges' }, [
      entry.test
        ? h('span', { class: 'sa-badge sa-badge--muted', text: t('testTag') })
        : null,
      h('span', {
        class: `sa-badge sa-badge--${STATUS_TONE[entry.status] ?? 'muted'}`,
        text: t(`st_${entry.status}`),
      }),
    ]),
    h('button', {
      class: 'sa-btn sa-btn--sm',
      text: t('show'),
      attrs: {
        type: 'button',
        disabled: entry.status === 'queued' || entry.status === 'playing',
      },
      on: {
        click: async () =>
          applyServer((await act('replay', { id: entry.id })).state),
      },
    }),
  ]);
};

/**
 * Builds the feed tab.
 * @returns Root element.
 * @example panels.append(feedTab());
 */
export const feedTab = () => {
  const list = h('div', { class: 'sa-history' });
  const queueInfo = h('div', { class: 'sa-queue__info' });
  const pauseBtn = h('button', { class: 'sa-btn', attrs: { type: 'button' } });
  const skipBtn = h('button', {
    class: 'sa-btn',
    text: t('skip'),
    attrs: { type: 'button' },
  });
  const clearQueueBtn = h('button', {
    class: 'sa-btn',
    text: t('clearQueue'),
    attrs: { type: 'button' },
  });

  pauseBtn.addEventListener('click', async () =>
    applyServer(
      (await act(store.server.queue.paused ? 'resume' : 'pause')).state
    )
  );
  skipBtn.addEventListener('click', async () =>
    applyServer((await act('skip')).state)
  );
  clearQueueBtn.addEventListener('click', async () =>
    applyServer((await act('clearQueue')).state)
  );

  /** Last rendered journal signature (avoids rebuilding identical lists). */
  let signature = '';
  const update = () => {
    const q = store.server.queue;
    pauseBtn.textContent = q.paused ? t('resume') : t('pause');
    pauseBtn.classList.toggle('sa-btn--primary', q.paused);
    skipBtn.disabled = !q.current;
    clearQueueBtn.disabled = q.waiting === 0;
    fill(queueInfo, [
      h('span', { class: ['sa-dot', q.clients > 0 ? 'is-ok' : 'is-bad'] }),
      h('span', {
        text:
          q.clients > 0
            ? t('widgetConnected', { n: q.clients })
            : t('widgetOffline'),
      }),
      h('span', { class: 'sa-sep', text: '·' }),
      h('span', { text: t('queueWaiting', { n: q.waiting }) }),
      q.current ? h('span', { class: 'sa-sep', text: '·' }) : null,
      q.current
        ? h('span', { text: t('nowPlaying', { name: q.current.name }) })
        : null,
      q.paused
        ? h('span', { class: 'sa-badge sa-badge--warn', text: t('paused') })
        : null,
    ]);
    const nextSig =
      store.server.history.map(e => `${e.id}:${e.status}`).join('|') +
      getLang();
    if (nextSig === signature) return;
    signature = nextSig;
    list.replaceChildren(
      ...(store.server.history.length
        ? store.server.history.map(historyRow)
        : [h('p', { class: 'sa-muted sa-empty', text: t('emptyHistory') })])
    );
  };
  onLive(update);
  update();

  return h('div', { class: 'sa-stack' }, [
    h('section', { class: 'sa-card' }, [
      h('div', { class: 'sa-card__head' }, [
        h('h3', { text: t('queueTitle') }),
      ]),
      queueInfo,
      h('div', { class: 'sa-actions' }, [pauseBtn, skipBtn, clearQueueBtn]),
    ]),
    h('section', { class: 'sa-card' }, [
      h('div', { class: 'sa-card__head' }, [
        h('h3', { text: t('history') }),
        h('button', {
          class: 'sa-btn sa-btn--sm',
          text: t('clearHistory'),
          attrs: { type: 'button' },
          on: {
            click: async () => {
              if (await confirmDialog(t('confirmClearHistory')))
                applyServer((await act('clearHistory')).state);
            },
          },
        }),
      ]),
      h('p', { class: 'sa-muted sa-small', text: t('historyHint') }),
      list,
    ]),
  ]);
};
