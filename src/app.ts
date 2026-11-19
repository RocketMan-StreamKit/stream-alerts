/**
 * Stream Alerts control panel (in-app StreamKit+ window).
 * Settings are edited in a local draft and autosaved; live data is polled every 1.5 s.
 */
import { act } from './panel/api';
import { fill, h } from './panel/dom';
import { setLang, t } from './panel/i18n';
import { editorTab } from './panel/sections/editor';
import { feedTab } from './panel/sections/feed';
import { settingsTab } from './panel/sections/settings';
import {
  applyServer,
  loadInitial,
  onLive,
  onSave,
  poll,
  store,
} from './panel/state';

/** App root from `index.html`. */
const root = document.getElementById('app') as HTMLElement;
/** Language the UI was built for. */
let builtLang = '';
/** Tab ids. */
const TAB_IDS = ['editor', 'feed', 'settings'];
/** Active tab id (kept across rebuilds; `#feed` / `#settings` in the URL open a tab). */
let activeTab = TAB_IDS.includes(window.location.hash.slice(1))
  ? window.location.hash.slice(1)
  : 'editor';

/**
 * Header with connection status, queue summary and pause button.
 * @returns Header element.
 * @example root.append(header());
 */
const header = () => {
  const status = h('span', { class: 'sa-status' });
  const saveBadge = h('span', { class: 'sa-save', text: t('saved') });
  const pauseBtn = h('button', {
    class: 'sa-btn sa-btn--sm',
    attrs: { type: 'button' },
  });
  pauseBtn.addEventListener('click', async () =>
    applyServer(
      (await act(store.server.queue.paused ? 'resume' : 'pause')).state
    )
  );
  const update = () => {
    const q = store.server.queue;
    fill(status, [
      h('span', { class: ['sa-dot', q.clients > 0 ? 'is-ok' : 'is-bad'] }),
      h('span', {
        text:
          q.clients > 0
            ? t('widgetConnected', { n: q.clients })
            : t('widgetOffline'),
      }),
      q.waiting
        ? h('span', {
            class: 'sa-badge sa-badge--info',
            text: t('queueWaiting', { n: q.waiting }),
          })
        : null,
    ]);
    status.title = q.clients > 0 ? '' : t('widgetOfflineHint');
    pauseBtn.textContent = q.paused ? `▶ ${t('resume')}` : `⏸ ${t('pause')}`;
    pauseBtn.classList.toggle('sa-btn--warn', q.paused);
  };
  onLive(update);
  onSave(saving => {
    saveBadge.textContent = saving ? t('saving') : t('saved');
    saveBadge.classList.toggle('is-saving', saving);
  });
  update();
  return h('header', { class: 'sa-header' }, [
    h('div', { class: 'sa-header__title' }, [
      h('span', { class: 'sa-logo', text: '🔔' }),
      h('h1', { text: t('appTitle') }),
    ]),
    status,
    h('div', { class: 'sa-header__right' }, [saveBadge, pauseBtn]),
  ]);
};

/**
 * Builds the whole UI for the current language.
 * @example build();
 */
const build = () => {
  const tabs: {
    id: string;
    icon: string;
    label: string;
    content: () => HTMLElement;
  }[] = [
    { id: 'editor', icon: '🎨', label: t('tabEditor'), content: editorTab },
    { id: 'feed', icon: '📜', label: t('tabFeed'), content: feedTab },
    {
      id: 'settings',
      icon: '⚙️',
      label: t('tabSettings'),
      content: settingsTab,
    },
  ];
  const panels = tabs.map(tab =>
    h(
      'div',
      {
        class: 'sa-panel',
        attrs: { hidden: tab.id !== activeTab, 'data-tab': tab.id },
      },
      [tab.content()]
    )
  );
  const buttons = tabs.map(tab =>
    h(
      'button',
      {
        class: ['sa-tab', tab.id === activeTab && 'is-active'],
        attrs: { type: 'button', role: 'tab' },
        on: {
          click: () => {
            activeTab = tab.id;
            history.replaceState(null, '', `#${tab.id}`);
            buttons.forEach((b, i) =>
              b.classList.toggle('is-active', tabs[i].id === tab.id)
            );
            panels.forEach((p, i) => (p.hidden = tabs[i].id !== tab.id));
          },
        },
      },
      [h('span', { text: tab.icon }), h('span', { text: tab.label })]
    )
  );
  root.replaceChildren(
    h('div', { class: 'sa-sticky' }, [
      header(),
      h('nav', { class: 'sa-tabs', attrs: { role: 'tablist' } }, buttons),
    ]),
    h('main', { class: 'sa-main' }, panels)
  );
  document.title = t('appTitle');
};

/**
 * Starts the panel: loads state (retrying until the worker answers) and polls live data.
 * @example void start();
 */
const start = async () => {
  if (!(await loadInitial())) {
    root.replaceChildren(
      h('div', { class: 'sa-loading' }, [
        h('span', { class: 'sa-spinner' }),
        h('p', { class: 'sa-muted', text: t('err_network') }),
      ])
    );
    window.setTimeout(() => void start(), 2000);
    return;
  }
  onLive(() => {
    if (store.server.lang !== builtLang) {
      builtLang = store.server.lang;
      setLang(builtLang);
      build();
    }
  });
  builtLang = store.server.lang;
  setLang(builtLang);
  build();
  window.setInterval(() => void poll(), 1500);
};

void start();
