/**
 * «OBS & filters» tab: widget link, placement, volume, queue behaviour, hide-triggered filters, moderation.
 */
import { STAGE_POSITIONS, TRIGGER_SYSTEMS } from '../../shared/defaults';
import { h } from '../dom';
import { listInput, row, slider, toggle } from '../fields';
import { t } from '../i18n';
import { settingsChanged, store } from '../state';
import { toast } from '../ui';

/** Arrow glyph per stage anchor. */
const POSITION_GLYPH: Record<string, string> = {
  'top-left': '↖',
  top: '↑',
  'top-right': '↗',
  left: '←',
  center: '•',
  right: '→',
  'bottom-left': '↙',
  bottom: '↓',
  'bottom-right': '↘',
};

/**
 * Copies text to the clipboard (with a fallback for restricted contexts).
 * @param text Text.
 * @returns Promise resolved when copied.
 * @example await copyText(url);
 */
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
};

/**
 * Builds the settings tab.
 * @returns Root element.
 * @example panels.append(settingsTab());
 */
export const settingsTab = () => {
  const s = store.settings;
  const changed = () => settingsChanged();

  const urlInput = h('input', {
    class: 'sa-input sa-input--mono',
    attrs: { type: 'text', readonly: true },
  });
  urlInput.value = store.widgetUrl;
  const obs = h('section', { class: 'sa-card' }, [
    h('div', { class: 'sa-card__head' }, [
      h('h3', { text: `📺 ${t('obsTitle')}` }),
    ]),
    h('ol', { class: 'sa-steps' }, [
      h('li', { text: t('obsStep1') }),
      h('li', { text: t('obsStep2') }),
      h('li', { text: t('obsStep3') }),
    ]),
    h('div', { class: 'sa-inline' }, [
      urlInput,
      h('button', {
        class: 'sa-btn sa-btn--primary',
        text: t('copy'),
        attrs: { type: 'button' },
        on: {
          click: async () => {
            await copyText(store.widgetUrl);
            toast(t('copied'));
          },
        },
      }),
    ]),
    h('p', { class: 'sa-muted sa-small', text: `🔒 ${t('obsPrivate')}` }),
    h('p', { class: 'sa-muted sa-small', text: t('obsMuted') }),
  ]);

  const grid = h(
    'div',
    { class: 'sa-posgrid' },
    STAGE_POSITIONS.map(pos =>
      h('button', {
        class: ['sa-posgrid__cell', s.stage.position === pos && 'is-active'],
        text: POSITION_GLYPH[pos],
        attrs: { type: 'button', 'data-pos': pos },
        on: {
          click: () => {
            s.stage.position = pos;
            grid
              .querySelectorAll('button')
              .forEach(b =>
                b.classList.toggle(
                  'is-active',
                  b.getAttribute('data-pos') === pos
                )
              );
            changed();
          },
        },
      })
    )
  );
  const placement = h('section', { class: 'sa-card' }, [
    h('div', { class: 'sa-card__head' }, [
      h('h3', { text: `📍 ${t('stageTitle')}` }),
    ]),
    h('div', { class: 'sa-placement' }, [
      grid,
      h('div', { class: 'sa-stack sa-grow' }, [
        row(
          t('offsetX'),
          slider(
            s.stage,
            'offsetX',
            { min: -960, max: 960, unit: t('px') },
            changed
          )
        ),
        row(
          t('offsetY'),
          slider(
            s.stage,
            'offsetY',
            { min: -540, max: 540, unit: t('px') },
            changed
          )
        ),
        row(
          t('scale'),
          slider(
            s.stage,
            'scale',
            { min: 25, max: 300, unit: t('pct') },
            changed
          )
        ),
        row(
          t('masterVolume'),
          slider(s, 'volume', { min: 0, max: 100, unit: t('pct') }, changed)
        ),
      ]),
    ]),
  ]);

  const queue = h('section', { class: 'sa-card' }, [
    h('div', { class: 'sa-card__head' }, [
      h('h3', { text: `⏱ ${t('queueSettings')}` }),
    ]),
    row(
      t('gapMs'),
      slider(
        s.queue,
        'gapMs',
        { min: 0, max: 15, step: 0.5, unit: t('sec'), scale: 1000 },
        changed
      )
    ),
    row(
      t('maxSize'),
      slider(s.queue, 'maxSize', { min: 1, max: 200 }, changed)
    ),
    row(
      t('expireSec'),
      slider(
        s.queue,
        'expireSec',
        { min: 0, max: 60, unit: t('min'), scale: 60 },
        changed
      ),
      t('expireHint')
    ),
  ]);

  const filters = h('section', { class: 'sa-card' }, [
    h('div', { class: 'sa-card__head' }, [
      h('h3', { text: `🙈 ${t('filtersTitle')}` }),
    ]),
    h('p', { class: 'sa-muted sa-small', text: t('filtersHint') }),
    h(
      'div',
      { class: 'sa-toggles' },
      TRIGGER_SYSTEMS.map(sys =>
        toggle(s.filters.hideTriggered, sys, t(`hide_${sys}`), changed)
      )
    ),
  ]);

  const moderation = h('section', { class: 'sa-card' }, [
    h('div', { class: 'sa-card__head' }, [
      h('h3', { text: `🛡 ${t('moderation')}` }),
    ]),
    row(
      t('blockedUsers'),
      listInput(s.filters, 'blockedUsers', changed),
      t('blockedHint')
    ),
    row(
      t('bannedWords'),
      listInput(s.filters, 'bannedWords', changed),
      t('bannedHint')
    ),
  ]);

  return h('div', { class: 'sa-columns' }, [
    h('div', { class: 'sa-stack' }, [obs, placement, queue]),
    h('div', { class: 'sa-stack' }, [filters, moderation]),
  ]);
};
