/**
 * Alerts tab: kind list, variant tabs, design groups and a live preview that uses the same
 * renderer as the OBS widget.
 */
import { AlertRenderer } from '../../render/renderer';
import {
  ANIMATIONS,
  FONTS,
  MAX_VARIANTS,
  STANDARD_KINDS,
  TEXT_EFFECTS,
  createCatalogVariant,
  createVariant,
  isStandardKind,
  newId,
  sampleEvent,
} from '../../shared/defaults';
import type {
  AlertKind,
  AlertLayout,
  AlertPayload,
  AlertVariant,
  AlertVars,
  ValueOption,
} from '../../shared/types';
import { fetchValues, sendTest } from '../api';
import { openDaImport } from '../da-import';
import { clone, fill, h } from '../dom';
import {
  colorInput,
  group,
  numberInput,
  row,
  segmented,
  select,
  slider,
  templateInput,
  textInput,
  toggle,
} from '../fields';
import { getLang, t } from '../i18n';
import {
  conditionMode,
  kindEntry,
  kindIcon,
  kindLabel,
  kindSource,
  kindTokens,
  valueLabel,
} from '../kinds';
import { describeRef, openMediaPicker, resolveRef } from '../media-picker';
import { onSettings, settingsChanged, store } from '../state';
import { confirmDialog, toast } from '../ui';
import { playSound } from '../../render/sounds';

/** Layout options in editor order. */
const LAYOUTS: AlertLayout[] = [
  'image-above',
  'image-below',
  'image-left',
  'image-right',
  'image-behind',
  'text-only',
  'image-only',
];

/** Preview backgrounds. */
const BACKGROUNDS = ['game', 'dark', 'light', 'checker'] as const;

/**
 * Builds the editor tab.
 * @returns Root element.
 * @example panels.append(editorTab());
 */
export const editorTab = () => {
  let kind: AlertKind = 'donation';
  let variantIndex = 0;
  /** Sample data per kind (preview + test). */
  const samples = new Map<
    AlertKind,
    { name: string; value: number; message: string; valueId: string }
  >();
  /** Trigger values per catalog kind (select options or dynamic provider items). */
  const valueCache = new Map<
    AlertKind,
    { items: ValueOption[]; loading: boolean; failed: boolean }
  >();
  let background: (typeof BACKGROUNDS)[number] = 'game';
  let playing = false;

  const sidebar = h('nav', { class: 'sa-kinds' });
  const editor = h('div', { class: 'sa-editor' });

  // ---------- Preview ----------
  const host = h('div', { class: 'sa-preview__host' });
  const frame = h('div', { class: ['sa-preview__frame', `bg-${background}`] }, [
    host,
  ]);
  const renderer = new AlertRenderer(host);
  const sampleBox = h('div', { class: 'sa-sample' });
  const playBtn = h('button', {
    class: 'sa-btn sa-btn--primary',
    text: t('play'),
    attrs: { type: 'button' },
  });
  const playMutedBtn = h('button', {
    class: 'sa-btn',
    text: t('playMuted'),
    attrs: { type: 'button', title: t('playMutedHint') },
  });
  const stopBtn = h('button', {
    class: 'sa-btn sa-btn--danger',
    text: t('stopPreview'),
    attrs: { type: 'button', hidden: '' },
  });
  const testBtn = h('button', {
    class: 'sa-btn',
    text: t('testObs'),
    attrs: { type: 'button' },
  });

  const fitPreview = () => {
    const width = frame.clientWidth || 1;
    host.style.transform = `scale(${width / 1920})`;
  };
  new ResizeObserver(fitPreview).observe(frame);

  const variant = () =>
    store.settings.kinds[kind].variants[variantIndex] ??
    store.settings.kinds[kind].variants[0];

  const sampleBase = () =>
    sampleEvent(kind, store.appCurrency, kindEntry(kind), getLang());

  const sample = () => {
    if (!samples.has(kind)) {
      const ev = sampleBase();
      samples.set(kind, {
        name: ev.vars.name,
        value: ev.value,
        message: ev.vars.message ?? '',
        valueId: ev.valueId ?? '',
      });
    }
    return samples.get(kind)!;
  };

  /**
   * Selectable trigger values of the current catalog kind; dynamic values are loaded once
   * from the source addon (through the worker) and re-rendered when they arrive.
   * @param force Reload from the source.
   * @returns Cached state.
   * @example valuesState().items;
   */
  const valuesState = (
    force = false
  ): { items: ValueOption[]; loading: boolean; failed: boolean } => {
    const k = kind;
    const entry = kindEntry(k);
    if (entry?.valueType === 'select') {
      return {
        items: (entry.valueOptions ?? []).map(o => ({
          id: o.value,
          label: o.label[getLang()] || o.label.en || o.value,
        })),
        loading: false,
        failed: false,
      };
    }
    let state = valueCache.get(k);
    if (entry?.valueType === 'dynamic' && (!state || force)) {
      state = { items: state?.items ?? [], loading: true, failed: false };
      valueCache.set(k, state);
      void fetchValues(k, force).then(res => {
        valueCache.set(k, {
          items: res.items ?? [],
          loading: false,
          failed: !res.success,
        });
        if (kind === k) renderAll();
      });
    }
    return state ?? { items: [], loading: false, failed: false };
  };

  /**
   * Readable label of a trigger value.
   * @param id Raw value.
   * @returns Label (or the raw value when unknown).
   * @example valueText('1000'); // 'Tier 1'
   */
  const valueText = (id: string) =>
    valuesState().items.find(i => i.id === id)?.label ?? id;

  /**
   * Template values for the current sample.
   * @returns Vars.
   * @example sampleVars().amount;
   */
  const sampleVars = (): AlertVars => {
    const s = sample();
    const base = sampleBase().vars;
    const n = String(s.value);
    const vars: AlertVars = {
      ...base,
      name: s.name || base.name,
      message: s.message,
    };
    if (kind === 'donation') vars.amount = `${n} ${store.appCurrency}`;
    if (kind === 'subscribe') vars.months = n;
    if (kind === 'subgift') vars.count = n;
    if (!isStandardKind(kind)) {
      const mode = conditionMode(kind);
      if (mode === 'amount') vars.value = n;
      if (mode === 'values')
        vars.value = s.valueId ? valueText(s.valueId) : base.value;
    }
    const max = variant().message.maxLength;
    if (vars.message && vars.message.length > max)
      vars.message = `${vars.message.slice(0, max - 1)}…`;
    return vars;
  };

  const previewPayload = (): AlertPayload => {
    const v = variant();
    return {
      id: `preview-${newId()}`,
      kind,
      variant: {
        ...v,
        image: { ...v.image, src: resolveRef(v.image.src) },
        sound: { ...v.sound, src: resolveRef(v.sound.src) },
      },
      vars: sampleVars(),
      stage: store.settings.stage,
      volume: store.settings.volume,
    };
  };

  let previewQueued = false;
  const refreshPreview = () => {
    if (playing || previewQueued) return;
    previewQueued = true;
    requestAnimationFrame(() => {
      previewQueued = false;
      if (!playing) renderer.showStatic(previewPayload());
    });
  };

  /** Id of the current preview run (a stopped run must not reset a newer one). */
  let playRun = 0;

  /**
   * Shows «Play» buttons when idle and «Stop» while the preview plays.
   * @param active Preview is playing.
   * @example setPlaying(true);
   */
  const setPlaying = (active: boolean) => {
    playing = active;
    playBtn.hidden = active;
    playMutedBtn.hidden = active;
    stopBtn.hidden = !active;
  };

  /**
   * Plays the current variant in the preview.
   * @param muted Play without the alert sound.
   * @returns Promise resolved when the alert ends or is stopped.
   * @example await playPreview(true);
   */
  const playPreview = async (muted: boolean) => {
    const run = ++playRun;
    setPlaying(true);
    try {
      await renderer.play(previewPayload(), { muted });
    } finally {
      if (run === playRun) {
        setPlaying(false);
        refreshPreview();
      }
    }
  };

  /**
   * Stops the preview at once (sound included) and shows the static design again.
   * @example stopPreview();
   */
  const stopPreview = () => {
    if (!playing) return;
    playRun += 1;
    renderer.stop();
    setPlaying(false);
    refreshPreview();
  };

  playBtn.addEventListener('click', () => void playPreview(false));
  playMutedBtn.addEventListener('click', () => void playPreview(true));
  stopBtn.addEventListener('click', stopPreview);
  testBtn.addEventListener('click', async () => {
    const s = sample();
    const res = await sendTest(
      kind,
      variant(),
      sampleVars() as Record<string, string>,
      s.value,
      s.valueId || undefined
    );
    if (res.success) toast(t('testSent'));
  });

  const renderSample = () => {
    const s = sample();
    const nameInput = h('input', {
      class: 'sa-input',
      attrs: { type: 'text' },
    });
    nameInput.value = s.name;
    nameInput.addEventListener('input', () => {
      s.name = nameInput.value;
      refreshPreview();
    });
    const valueInput = h('input', {
      class: 'sa-input sa-input--num',
      attrs: { type: 'number', min: 0 },
    });
    valueInput.value = String(s.value);
    valueInput.addEventListener('input', () => {
      s.value = Number(valueInput.value) || 0;
      refreshPreview();
    });
    const msgInput = h('input', { class: 'sa-input', attrs: { type: 'text' } });
    msgInput.value = s.message;
    msgInput.addEventListener('input', () => {
      s.message = msgInput.value;
      refreshPreview();
    });
    const mode = conditionMode(kind);
    let valueField: HTMLElement | null = null;
    if (mode === 'amount') valueField = valueInput;
    if (mode === 'values') {
      const { items } = valuesState();
      if (items.length) {
        const pickEl = h(
          'select',
          { class: 'sa-input sa-select' },
          items.map(item =>
            h('option', { text: item.label, attrs: { value: item.id } })
          )
        );
        if (!items.some(i => i.id === s.valueId)) s.valueId = items[0].id;
        pickEl.value = s.valueId;
        pickEl.addEventListener('change', () => {
          s.valueId = pickEl.value;
          s.value = Number(pickEl.value) || 0;
          refreshPreview();
        });
        valueField = pickEl;
      }
    }
    sampleBox.replaceChildren(
      h('div', { class: 'sa-sample__grid' }, [
        h('label', { class: 'sa-field' }, [
          h('span', { text: t('sampleName') }),
          nameInput,
        ]),
        valueField
          ? h('label', { class: 'sa-field' }, [
              h('span', { text: valueLabel(kind) }),
              valueField,
            ])
          : null,
        h('label', { class: ['sa-field', 'sa-field--wide'] }, [
          h('span', { text: t('sampleMessage') }),
          msgInput,
        ]),
      ])
    );
  };

  const bgButtons = BACKGROUNDS.map(bg =>
    h('button', {
      class: ['sa-seg__btn', bg === background && 'is-active'],
      text: t(`bg_${bg}`),
      attrs: { type: 'button' },
      on: {
        click: () => {
          background = bg;
          frame.className = `sa-preview__frame bg-${bg}`;
          bgButtons.forEach(b =>
            b.classList.toggle('is-active', b.textContent === t(`bg_${bg}`))
          );
        },
      },
    })
  );

  const preview = h('aside', { class: 'sa-preview' }, [
    h('div', { class: 'sa-card sa-preview__card' }, [
      h('div', { class: 'sa-card__head' }, [
        h('h3', { text: t('preview') }),
        h('span', { class: 'sa-seg sa-seg--sm' }, bgButtons),
      ]),
      frame,
      h('div', { class: 'sa-actions' }, [
        playBtn,
        playMutedBtn,
        stopBtn,
        testBtn,
      ]),
      h('h4', { class: 'sa-subhead', text: t('sample') }),
      sampleBox,
      h('p', { class: 'sa-muted sa-small', text: t('previewHint') }),
    ]),
  ]);

  // ---------- Sidebar ----------
  /**
   * One sidebar button.
   * @param k Kind id.
   * @param off Source addon is not available.
   * @returns Button.
   * @example kindButton('donation', false);
   */
  const kindButton = (k: AlertKind, off = false) => {
    const cfg = store.settings.kinds[k];
    return h(
      'button',
      {
        class: [
          'sa-kind',
          k === kind && 'is-active',
          (!cfg.enabled || off) && 'is-off',
        ],
        attrs: { type: 'button' },
        on: {
          click: () => {
            kind = k;
            variantIndex = 0;
            renderAll();
          },
        },
      },
      [
        h('span', { class: 'sa-kind__icon', text: kindIcon(k) }),
        h('span', { class: 'sa-kind__name', text: kindLabel(k) }),
        cfg.variants.length > 1
          ? h('span', {
              class: 'sa-kind__count',
              text: String(cfg.variants.length),
            })
          : null,
        !cfg.enabled
          ? h('span', { class: 'sa-kind__off', text: t('kindOff') })
          : null,
      ]
    );
  };

  /**
   * Sidebar group with a heading.
   * @param title Heading.
   * @param items Buttons.
   * @param hint Optional note under the heading.
   * @returns Group element.
   * @example kindGroup('Twitch', buttons);
   */
  const kindGroup = (title: string, items: Node[], hint?: string) =>
    h('div', { class: 'sa-kinds__group' }, [
      h('div', { class: 'sa-kinds__title', text: title }),
      hint ? h('p', { class: 'sa-kinds__hint', text: hint }) : null,
      ...items,
    ]);

  const renderSidebar = () => {
    const bySource = new Map<string, AlertKind[]>();
    for (const entry of store.catalog) {
      if (!store.settings.kinds[entry.id]) continue;
      const list = bySource.get(entry.addonName) ?? [];
      list.push(entry.id);
      bySource.set(entry.addonName, list);
    }
    const unavailable = Object.keys(store.settings.kinds).filter(
      k => !isStandardKind(k) && !kindEntry(k)
    );
    if (!store.settings.kinds[kind]) kind = 'donation';
    fill(sidebar, [
      kindGroup(
        t('kindsStandard'),
        STANDARD_KINDS.map(k => kindButton(k))
      ),
      ...[...bySource.entries()].map(([source, kinds]) =>
        kindGroup(
          source,
          kinds.map(k => kindButton(k))
        )
      ),
      bySource.size === 0
        ? h('p', { class: 'sa-kinds__hint', text: t('kindsCatalogEmpty') })
        : null,
      unavailable.length
        ? kindGroup(
            t('kindsUnavailable'),
            unavailable.map(k => kindButton(k, true)),
            t('kindsUnavailableHint')
          )
        : null,
    ]);
  };

  // ---------- Editor ----------
  /** Change handler for design fields. */
  const changed = () => {
    settingsChanged();
  };

  const mediaControl = (slot: 'image' | 'sound', v: AlertVariant) => {
    const target = slot === 'image' ? v.image : v.sound;
    const label = h('span', {
      class: 'sa-media__label',
      text: describeRef(target.src),
    });
    const pickBtn = h('button', {
      class: 'sa-btn',
      text: t('choose'),
      attrs: { type: 'button' },
      on: {
        click: () =>
          openMediaPicker(
            slot,
            target.src,
            (v.sound.volume / 100) * (store.settings.volume / 100),
            ref => {
              target.src = ref;
              label.textContent = describeRef(ref);
              changed();
            }
          ),
      },
    });
    const listen =
      slot === 'sound'
        ? h('button', {
            class: 'sa-icon-btn',
            text: '▶',
            attrs: { type: 'button', title: t('listen') },
            on: {
              click: () =>
                playSound(
                  resolveRef(v.sound.src),
                  (v.sound.volume / 100) * (store.settings.volume / 100)
                ),
            },
          })
        : null;
    return h('span', { class: 'sa-media' }, [label, pickBtn, listen]);
  };

  /**
   * Font picker; a font outside the list (imported design) stays selectable.
   * @param style Text style.
   * @returns Select element.
   * @example fontSelect(v.title);
   */
  const fontSelect = (style: AlertVariant['title']) =>
    select(
      style,
      'font',
      [
        ...(FONTS.some(f => f.name === style.font)
          ? []
          : [[style.font, style.font] as [string, string]]),
        ...FONTS.map(f => [f.name, f.name] as [string, string]),
      ],
      changed
    );

  const weightSelect = (style: AlertVariant['title']) =>
    select(
      style,
      'weight',
      [300, 400, 500, 600, 700, 800, 900].map(w => [String(w), String(w)]),
      changed
    );

  const alignSeg = (style: AlertVariant['title']) =>
    segmented(
      style,
      'align',
      [
        ['left', '⇤'],
        ['center', '↔'],
        ['right', '⇥'],
      ],
      changed
    );

  /**
   * Shared typography rows.
   * @param style Text style.
   * @returns Rows.
   * @example typographyRows(v.title);
   */
  const typographyRows = (
    style: AlertVariant['title'] | AlertVariant['message']
  ) => [
    row(t('font'), [
      fontSelect(style as AlertVariant['title']),
      weightSelect(style as AlertVariant['title']),
    ]),
    row(
      t('size'),
      slider(style, 'size', { min: 10, max: 120, unit: t('px') }, changed)
    ),
    row(t('color'), [
      colorInput(style, 'color', changed),
      h('span', { class: 'sa-row__sub', text: t('accent') }),
      colorInput(style, 'accent', changed),
    ]),
    row(t('stroke'), [
      slider(
        style,
        'stroke',
        { min: 0, max: 8, step: 0.5, unit: t('px') },
        changed
      ),
      colorInput(style, 'strokeColor', changed),
    ]),
    row(t('align'), [
      alignSeg(style as AlertVariant['title']),
      toggle(style, 'shadow', t('shadow'), changed),
      toggle(style, 'uppercase', t('uppercase'), changed),
    ]),
  ];

  /**
   * Currency choices for donation conditions: app currency first, then common codes and the
   * current value (imported variants use the DonationAlerts currency).
   * @param current Current code (`''` = app currency).
   * @returns Select options.
   * @example currencyOptions('RUB');
   */
  const currencyOptions = (current: string): [string, string][] => {
    const codes = new Set(
      [current, 'RUB', 'UAH', 'USD', 'EUR', 'KZT', 'BYN', 'PLN', 'GBP'].filter(
        c => c && c !== store.appCurrency
      )
    );
    return [
      ['', t('condCurrencyApp', { cur: store.appCurrency })],
      ...[...codes].map(c => [c, c] as [string, string]),
    ];
  };

  const renderEditor = () => {
    const cfg = store.settings.kinds[kind];
    if (variantIndex >= cfg.variants.length) variantIndex = 0;
    const v = variant();
    const isBase = variantIndex === 0;

    const tabs = h('div', { class: 'sa-vtabs' }, [
      ...cfg.variants.map((item, i) =>
        h('button', {
          class: [
            'sa-vtab',
            i === variantIndex && 'is-active',
            !item.enabled && 'is-off',
          ],
          text: i === 0 ? t('baseVariant') : item.name || `#${i}`,
          attrs: { type: 'button' },
          on: {
            click: () => {
              variantIndex = i;
              renderAll();
            },
          },
        })
      ),
      cfg.variants.length < MAX_VARIANTS
        ? h('button', {
            class: 'sa-vtab sa-vtab--add',
            text: t('addVariant'),
            attrs: { type: 'button' },
            on: {
              click: () => {
                const copy = clone(cfg.variants[0]);
                const top = Math.max(
                  0,
                  ...cfg.variants.slice(1).map(x => x.condition.min)
                );
                const byAmount = conditionMode(kind) === 'amount';
                const min = !byAmount
                  ? 0
                  : top > 0
                    ? top * 2
                    : kind === 'donation'
                      ? 500
                      : isStandardKind(kind)
                        ? 10
                        : 100;
                copy.id = newId();
                copy.condition = {
                  min,
                  max: 0,
                  platforms: [],
                  values: [],
                  currency: '',
                };
                copy.name = byAmount
                  ? t('newVariantName', { n: min })
                  : t('newVariantNumbered', { n: cfg.variants.length });
                copy.enabled = true;
                cfg.variants.push(copy);
                variantIndex = cfg.variants.length - 1;
                changed();
                renderAll();
              },
            },
          })
        : null,
    ]);

    const head = h('div', { class: 'sa-card sa-editor__head' }, [
      h('div', { class: 'sa-editor__title' }, [
        h('h2', {}, [
          h('span', { text: `${kindIcon(kind)} ` }),
          h('span', { text: kindLabel(kind) }),
        ]),
        toggle(cfg, 'enabled', t('kindEnabled'), () => {
          changed();
          renderSidebar();
        }),
      ]),
      h('div', { class: 'sa-editor__variants' }, [
        h('span', { class: 'sa-muted', text: t('variants') }),
        tabs,
      ]),
      kindSource(kind)
        ? h('p', {
            class: 'sa-muted sa-small',
            text: t('kindFromSource', { source: kindSource(kind) }),
          })
        : null,
      h('p', { class: 'sa-muted sa-small', text: t('variantHint') }),
      kind === 'donation'
        ? h('div', { class: 'sa-actions' }, [
            h('button', {
              class: 'sa-btn',
              text: t('daOpen'),
              attrs: { type: 'button' },
              on: {
                click: () =>
                  openDaImport(() => {
                    variantIndex = 0;
                    renderAll();
                  }),
              },
            }),
          ])
        : null,
    ]);

    const toolbar = h('div', { class: 'sa-actions' }, [
      !isBase
        ? h('button', {
            class: 'sa-btn',
            text: t('duplicate'),
            attrs: { type: 'button' },
            on: {
              click: () => {
                const copy = clone(v);
                copy.id = newId();
                copy.name = `${v.name} 2`;
                cfg.variants.splice(variantIndex + 1, 0, copy);
                variantIndex += 1;
                changed();
                renderAll();
              },
            },
          })
        : null,
      h('button', {
        class: 'sa-btn',
        text: t('resetDesign'),
        attrs: { type: 'button' },
        on: {
          click: async () => {
            if (!(await confirmDialog(t('confirmReset')))) return;
            const entry = kindEntry(kind);
            const fresh = entry
              ? createCatalogVariant(entry, getLang())
              : createVariant(kind, getLang());
            fresh.condition = v.condition;
            Object.assign(v, {
              ...fresh,
              id: v.id,
              name: v.name,
              enabled: v.enabled,
              condition: v.condition,
            });
            changed();
            renderAll();
          },
        },
      }),
      !isBase
        ? h('button', {
            class: 'sa-btn sa-btn--danger',
            text: t('delete'),
            attrs: { type: 'button' },
            on: {
              click: async () => {
                if (
                  !(await confirmDialog(
                    t('confirmDeleteVariant', { name: v.name })
                  ))
                )
                  return;
                cfg.variants.splice(variantIndex, 1);
                variantIndex = 0;
                changed();
                renderAll();
              },
            },
          })
        : null,
    ]);

    const platformsBox = { value: v.condition.platforms.join(', ') };
    const platformsInput = textInput(
      platformsBox,
      'value',
      () => {
        v.condition.platforms = platformsBox.value
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(Boolean);
        changed();
      },
      'twitch, donationalerts'
    );
    const mode = conditionMode(kind);
    const hasValue = mode === 'amount';
    const amountLabel =
      kind === 'donation' && v.condition.currency
        ? t('value_donation', { cur: v.condition.currency })
        : valueLabel(kind);

    /**
     * Checklist of trigger values for `values` conditions.
     * @returns Row content.
     * @example valuesPicker();
     */
    const valuesPicker = () => {
      const state = valuesState();
      const known = new Set(state.items.map(i => i.id));
      const chips = [
        ...state.items.map(item => ({ ...item, missing: false })),
        ...v.condition.values
          .filter(id => !known.has(id))
          .map(id => ({ id, label: id, meta: undefined, missing: true })),
      ].map(item => {
        const box = h('input', { attrs: { type: 'checkbox' } });
        box.checked = v.condition.values.includes(item.id);
        box.addEventListener('change', () => {
          v.condition.values = box.checked
            ? [...v.condition.values, item.id]
            : v.condition.values.filter(x => x !== item.id);
          changed();
        });
        return h(
          'label',
          { class: ['sa-check', item.missing && 'is-missing'] },
          [
            box,
            h('span', { text: item.label }),
            item.meta
              ? h('span', { class: 'sa-check__meta', text: item.meta })
              : null,
            item.missing
              ? h('span', {
                  class: 'sa-check__meta',
                  text: t('valuesMissing'),
                })
              : null,
          ]
        );
      });
      const reload =
        kindEntry(kind)?.valueType === 'dynamic'
          ? h('button', {
              class: 'sa-btn sa-btn--sm',
              text: t('valuesReload'),
              attrs: { type: 'button' },
              on: {
                click: () => {
                  valuesState(true);
                  renderAll();
                },
              },
            })
          : null;
      const note = state.loading
        ? t('valuesLoading')
        : state.failed
          ? t('err_valuesFailed')
          : !state.items.length
            ? t('valuesEmpty')
            : '';
      return h('div', { class: 'sa-checks' }, [
        ...chips,
        note ? h('span', { class: 'sa-muted sa-small', text: note }) : null,
        reload,
      ]);
    };

    const condition = isBase
      ? null
      : group(
          t('grpCondition'),
          [
            row(t('variantName'), [
              textInput(v, 'name', () => {
                changed();
                const tab = tabs.children[variantIndex] as
                  | HTMLElement
                  | undefined;
                if (tab) tab.textContent = v.name || `#${variantIndex}`;
              }),
              toggle(v, 'enabled', t('variantOn'), () => {
                changed();
                renderAll();
              }),
            ]),
            hasValue
              ? row(
                  `${t('condMin')} (${amountLabel})`,
                  numberInput(v.condition, 'min', { min: 0 }, changed)
                )
              : null,
            hasValue
              ? row(
                  `${t('condMax')} (${amountLabel})`,
                  numberInput(v.condition, 'max', { min: 0 }, changed),
                  t('condMaxHint')
                )
              : null,
            kind === 'donation'
              ? row(
                  t('condCurrency'),
                  select(
                    v.condition,
                    'currency',
                    currencyOptions(v.condition.currency),
                    () => {
                      changed();
                      renderAll();
                    }
                  ),
                  t('condCurrencyHint')
                )
              : null,
            mode === 'values'
              ? row(t('condValues'), valuesPicker(), t('condValuesHint'))
              : null,
            isStandardKind(kind)
              ? row(t('condPlatforms'), platformsInput, t('condPlatformsHint'))
              : null,
            toolbar,
          ].filter(Boolean) as Node[],
          true,
          '🎯'
        );

    const text = group(
      t('grpText'),
      [
        row(
          t('template'),
          templateInput(v.title, 'template', kindTokens(kind), changed),
          t('templateHint')
        ),
        ...typographyRows(v.title),
      ],
      true,
      '🔤'
    );

    const message = group(
      t('grpMessage'),
      [
        toggle(v.message, 'show', t('showMessage'), changed),
        row(
          t('maxLength'),
          slider(
            v.message,
            'maxLength',
            { min: 20, max: 500, unit: t('chars') },
            changed
          )
        ),
        ...typographyRows(v.message),
      ],
      false,
      '💬'
    );

    const media = group(
      t('grpMedia'),
      [
        row(t('image'), mediaControl('image', v)),
        row(
          t('imageSize'),
          slider(
            v.image,
            'size',
            { min: 32, max: 1200, unit: t('px') },
            changed
          )
        ),
        row(
          t('imageRadius'),
          slider(
            v.image,
            'radius',
            { min: 0, max: 300, unit: t('px') },
            changed
          )
        ),
        row(t('sound'), mediaControl('sound', v)),
        row(
          t('volume'),
          slider(
            v.sound,
            'volume',
            { min: 0, max: 100, unit: t('pct') },
            changed
          )
        ),
        row(
          t('soundDelay'),
          slider(
            v.sound,
            'delayMs',
            { min: 0, max: 5, step: 0.1, unit: t('sec'), scale: 1000 },
            changed
          )
        ),
      ],
      true,
      '🖼'
    );

    const layout = group(
      t('grpLayout'),
      [
        row(
          t('layout'),
          select(
            v,
            'layout',
            LAYOUTS.map(l => [l, t(`layout_${l}`)]),
            changed
          )
        ),
        row(
          t('boxWidth'),
          slider(
            v.box,
            'width',
            { min: 200, max: 1920, unit: t('px') },
            changed
          )
        ),
        row(
          t('gap'),
          slider(v.box, 'gap', { min: 0, max: 100, unit: t('px') }, changed)
        ),
        row(
          t('padding'),
          slider(v.box, 'padding', { min: 0, max: 100, unit: t('px') }, changed)
        ),
        row(t('background'), [
          colorInput(v.box, 'background', changed),
          toggle(v.box, 'shadow', t('cardShadow'), changed),
        ]),
        row(
          t('bgOpacity'),
          slider(
            v.box,
            'backgroundOpacity',
            { min: 0, max: 100, unit: t('pct') },
            changed
          ),
          t('bgOpacityHint')
        ),
        row(
          t('radius'),
          slider(v.box, 'radius', { min: 0, max: 100, unit: t('px') }, changed)
        ),
        row(t('border'), [
          slider(
            v.box,
            'borderWidth',
            { min: 0, max: 12, unit: t('px') },
            changed
          ),
          colorInput(v.box, 'borderColor', changed),
        ]),
      ],
      false,
      '📐'
    );

    const anim = group(
      t('grpAnim'),
      [
        row(
          t('duration'),
          slider(
            v,
            'durationMs',
            { min: 1, max: 60, step: 0.5, unit: t('sec'), scale: 1000 },
            changed
          )
        ),
        row(t('enter'), [
          select(
            v.animation,
            'enter',
            ANIMATIONS.map(a => [a, t(`anim_${a}`)]),
            changed
          ),
          slider(
            v.animation,
            'enterMs',
            { min: 0, max: 3, step: 0.1, unit: t('sec'), scale: 1000 },
            changed
          ),
        ]),
        row(t('exit'), [
          select(
            v.animation,
            'exit',
            ANIMATIONS.map(a => [a, t(`anim_${a}`)]),
            changed
          ),
          slider(
            v.animation,
            'exitMs',
            { min: 0, max: 3, step: 0.1, unit: t('sec'), scale: 1000 },
            changed
          ),
        ]),
        row(
          t('textFx'),
          select(
            v.animation,
            'text',
            TEXT_EFFECTS.map(fx => [fx, t(`fx_${fx}`)]),
            changed
          )
        ),
      ],
      true,
      '🎬'
    );

    const tts = group(
      t('grpTts'),
      [
        toggle(v.tts, 'enabled', t('ttsEnabled'), changed),
        h('p', { class: 'sa-muted sa-small', text: t('ttsHint') }),
        row(
          t('ttsTemplate'),
          templateInput(v.tts, 'template', kindTokens(kind), changed)
        ),
        hasValue
          ? row(
              `${t('ttsMin')} (${valueLabel(kind)})`,
              numberInput(v.tts, 'min', { min: 0 }, changed)
            )
          : null,
        row(
          t('volume'),
          slider(v.tts, 'volume', { min: 0, max: 100, unit: t('pct') }, changed)
        ),
      ].filter(Boolean) as Node[],
      false,
      '🗣'
    );

    const baseNote = isBase
      ? h('div', { class: 'sa-editor__note' }, [
          h('p', { class: 'sa-muted sa-small', text: t('baseConditionHint') }),
          toolbar,
        ])
      : null;
    fill(editor, [
      head,
      baseNote,
      condition,
      text,
      message,
      media,
      anim,
      layout,
      tts,
    ]);
  };

  const renderAll = () => {
    renderSidebar();
    renderEditor();
    renderSample();
    refreshPreview();
  };

  onSettings(refreshPreview);
  renderAll();
  window.setTimeout(fitPreview, 0);

  // Preview goes first in DOM order so narrow layouts (and any CSS fallback) keep it on top;
  // wide layouts move it to the right column via grid areas.
  return h('div', { class: 'sa-editor-layout' }, [preview, sidebar, editor]);
};
