/**
 * Panel overlays: toasts, confirm dialog, modal.
 */
import { h } from './dom';
import { t } from './i18n';

/** Toast container. */
let toasts: HTMLElement | null = null;

/**
 * Shows a short notification.
 * @param text Message.
 * @param kind Style.
 * @example toast('Saved');
 */
export const toast = (text: string, kind: 'ok' | 'error' = 'ok') => {
  if (!toasts) {
    toasts = h('div', { class: 'sa-toasts', attrs: { 'aria-live': 'polite' } });
    document.body.append(toasts);
  }
  const item = h('div', { class: ['sa-toast', `sa-toast--${kind}`], text });
  toasts.append(item);
  window.setTimeout(() => item.classList.add('is-out'), 2600);
  window.setTimeout(() => item.remove(), 3000);
};

/**
 * Opens a modal dialog.
 * @param title Title.
 * @param body Content.
 * @param wide Wider dialog.
 * @returns Close function.
 * @example const close = modal('Media', [list]);
 */
export const modal = (title: string, body: Node[], wide = false) => {
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const dialog = h(
    'div',
    {
      class: ['sa-modal', wide && 'sa-modal--wide'],
      attrs: { role: 'dialog', 'aria-modal': 'true' },
    },
    [
      h('div', { class: 'sa-modal__head' }, [
        h('h3', { text: title }),
        h('button', {
          class: 'sa-icon-btn',
          text: '✕',
          attrs: { type: 'button', 'aria-label': t('close') },
          on: { click: close },
        }),
      ]),
      h('div', { class: 'sa-modal__body' }, body),
    ]
  );
  const backdrop = h(
    'div',
    {
      class: 'sa-backdrop',
      on: { mousedown: (e: MouseEvent) => e.target === backdrop && close() },
    },
    [dialog]
  );
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  return close;
};

/**
 * Asks for confirmation.
 * @param text Question.
 * @returns Promise resolved with the answer.
 * @example if (await confirmDialog('Delete?')) remove();
 */
export const confirmDialog = (text: string) =>
  new Promise<boolean>(resolve => {
    let answered = false;
    const answer = (value: boolean) => {
      if (answered) return;
      answered = true;
      close();
      resolve(value);
    };
    const close = modal(t('appTitle'), [
      h('p', { class: 'sa-confirm__text', text }),
      h('div', { class: 'sa-actions sa-actions--end' }, [
        h('button', {
          class: 'sa-btn',
          text: t('cancel'),
          attrs: { type: 'button' },
          on: { click: () => answer(false) },
        }),
        h('button', {
          class: 'sa-btn sa-btn--danger',
          text: t('yes'),
          attrs: { type: 'button' },
          on: { click: () => answer(true) },
        }),
      ]),
    ]);
  });
