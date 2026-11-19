/**
 * Media picker modal: built-in images / sounds, the uploaded library and external links.
 */
import { playSound } from '../render/sounds';
import { BUILTIN_IMAGES, BUILTIN_SOUNDS } from '../shared/defaults';
import type { MediaItem } from '../shared/types';
import { mediaUrl, uploadFile } from './api';
import { formatBytes, h } from './dom';
import { t } from './i18n';
import { deleteMedia, store } from './state';
import { confirmDialog, modal, toast } from './ui';

/** What the picker selects. */
export type MediaSlot = 'image' | 'sound';

/**
 * Resolves a media reference to something the renderer / audio can load.
 * @param ref Reference.
 * @returns Resolved reference.
 * @example resolveRef('media:abc');
 */
export const resolveRef = (ref: string) => {
  if (!ref.startsWith('media:')) return ref;
  const item = store.media.find(m => m.id === ref.slice(6));
  return item ? mediaUrl(item) : '';
};

/**
 * Short label for a media reference.
 * @param ref Reference.
 * @returns Label.
 * @example describeRef('builtin:coin'); // 'Coin'
 */
export const describeRef = (ref: string) => {
  if (!ref) return t('none');
  if (ref.startsWith('builtin:')) {
    const id = ref.slice(8);
    return BUILTIN_IMAGES[id]
      ? `${BUILTIN_IMAGES[id]} ${id}`
      : `🔊 ${t(`snd_${id}`)}`;
  }
  if (ref.startsWith('media:'))
    return `📁 ${store.media.find(m => m.id === ref.slice(6))?.name ?? '—'}`;
  try {
    return `🔗 ${new URL(ref).pathname.split('/').pop() || new URL(ref).host}`;
  } catch {
    return ref;
  }
};

/**
 * Whether a library file fits a slot.
 * @param item Media item.
 * @param slot Slot.
 * @returns True when usable.
 * @example fits(item, 'sound');
 */
const fits = (item: MediaItem, slot: MediaSlot) =>
  slot === 'sound'
    ? item.mime.startsWith('audio/')
    : !item.mime.startsWith('audio/');

/**
 * Opens the picker.
 * @param slot Image or sound.
 * @param current Current reference.
 * @param volume Sound volume 0..1 for previews.
 * @param onPick Called with the chosen reference.
 * @example openMediaPicker('image', v.image.src, 1, ref => { v.image.src = ref; changed(); });
 */
export const openMediaPicker = (
  slot: MediaSlot,
  current: string,
  volume: number,
  onPick: (ref: string) => void
) => {
  let close = () => undefined as void;
  const pick = (ref: string) => {
    onPick(ref);
    close();
  };

  const tile = (
    ref: string,
    preview: Node,
    label: string,
    extra: Node[] = []
  ) =>
    h('div', { class: ['sa-tile', ref === current && 'is-active'] }, [
      h(
        'button',
        {
          class: 'sa-tile__pick',
          attrs: { type: 'button', title: label },
          on: { click: () => pick(ref) },
        },
        [
          h('span', { class: 'sa-tile__preview' }, [preview]),
          h('span', { class: 'sa-tile__label', text: label }),
        ]
      ),
      ...extra,
    ]);

  const listenBtn = (ref: string) =>
    h('button', {
      class: 'sa-icon-btn sa-tile__listen',
      text: '▶',
      attrs: { type: 'button', title: t('listen') },
      on: { click: () => playSound(resolveRef(ref), volume) },
    });

  const builtins =
    slot === 'image'
      ? Object.entries(BUILTIN_IMAGES).map(([id, emoji]) =>
          tile(
            `builtin:${id}`,
            h('span', { class: 'sa-emoji', text: emoji }),
            id
          )
        )
      : BUILTIN_SOUNDS.map(id =>
          tile(
            `builtin:${id}`,
            h('span', { class: 'sa-emoji', text: '🔊' }),
            t(`snd_${id}`),
            [listenBtn(`builtin:${id}`)]
          )
        );

  const libraryGrid = h('div', { class: 'sa-tiles' });
  const usage = h('span', { class: 'sa-muted' });
  const renderLibrary = () => {
    const items = store.media.filter(m => fits(m, slot));
    const used = store.media.reduce((acc, m) => acc + m.size, 0);
    usage.textContent = t('libraryUsage', {
      used: formatBytes(used),
      total: formatBytes(store.mediaLimits.total),
    });
    libraryGrid.replaceChildren(
      ...(items.length
        ? items.map(item => {
            const ref = `media:${item.id}`;
            const url = mediaUrl(item);
            const preview = item.mime.startsWith('audio/')
              ? h('span', { class: 'sa-emoji', text: '🎵' })
              : item.mime.startsWith('video/')
                ? h('video', {
                    attrs: {
                      src: url,
                      muted: true,
                      autoplay: true,
                      loop: true,
                      playsinline: true,
                    },
                  })
                : h('img', { attrs: { src: url, alt: '' } });
            const del = h('button', {
              class: 'sa-icon-btn sa-tile__delete',
              text: '🗑',
              attrs: { type: 'button', title: t('delete') },
              on: {
                click: async () => {
                  if (
                    !(await confirmDialog(
                      t('confirmDeleteFile', { name: item.name })
                    ))
                  )
                    return;
                  await deleteMedia(item.id);
                  if (current === ref) current = '';
                  renderLibrary();
                },
              },
            });
            return tile(
              ref,
              preview,
              item.name,
              [slot === 'sound' ? listenBtn(ref) : null, del].filter(
                Boolean
              ) as Node[]
            );
          })
        : [h('p', { class: 'sa-muted', text: t('libraryEmpty') })])
    );
  };

  const fileInput = h('input', {
    attrs: {
      type: 'file',
      accept: slot === 'sound' ? 'audio/*' : 'image/*,video/webm,video/mp4',
      hidden: true,
    },
  });
  const uploadBtn = h('button', {
    class: 'sa-btn sa-btn--primary',
    text: t('upload'),
    attrs: { type: 'button' },
    on: { click: () => fileInput.click() },
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    uploadBtn.disabled = true;
    const item = await uploadFile(
      file,
      p => (uploadBtn.textContent = t('uploading', { p: Math.min(100, p) }))
    );
    uploadBtn.disabled = false;
    uploadBtn.textContent = t('upload');
    if (!item) return;
    store.media.push(item);
    toast(t('saved'));
    pick(`media:${item.id}`);
  });

  const urlInput = h('input', {
    class: 'sa-input',
    attrs: { type: 'url', placeholder: t('urlPlaceholder') },
  });
  if (/^https?:/i.test(current)) urlInput.value = current;
  const useUrl = () => {
    const url = urlInput.value.trim();
    if (/^https?:\/\/\S+$/i.test(url)) pick(url);
  };

  renderLibrary();
  close = modal(
    t(slot === 'image' ? 'mediaTitleImage' : 'mediaTitleSound'),
    [
      h('div', { class: 'sa-actions' }, [
        h('button', {
          class: 'sa-btn',
          text: t('none'),
          attrs: { type: 'button' },
          on: { click: () => pick('') },
        }),
      ]),
      h('h4', { class: 'sa-subhead', text: t('builtin') }),
      h('div', { class: 'sa-tiles' }, builtins),
      h('h4', { class: 'sa-subhead' }, [
        h('span', { text: t('library') }),
        usage,
      ]),
      h('div', { class: 'sa-actions' }, [
        uploadBtn,
        fileInput,
        h('span', {
          class: 'sa-muted',
          text: t('uploadHint', { size: formatBytes(store.mediaLimits.file) }),
        }),
      ]),
      libraryGrid,
      h('h4', { class: 'sa-subhead', text: t('link') }),
      h('div', { class: 'sa-inline' }, [
        urlInput,
        h('button', {
          class: 'sa-btn',
          text: t('use'),
          attrs: { type: 'button' },
          on: { click: useUrl },
        }),
      ]),
    ],
    true
  );
};
