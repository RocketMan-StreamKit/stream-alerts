/**
 * "Import from DonationAlerts" dialog: the user pastes an alert widget link, the worker parses the
 * page, the user picks variations and they are written into the donation alert draft.
 * The link is kept only in the dialog input — it is never saved.
 */
import { MAX_VARIANTS, newId } from '../shared/defaults';
import type { DaImportItem, DaImportResult } from '../shared/donationalerts';
import { act } from './api';
import { clone, h } from './dom';
import { t } from './i18n';
import { settingsChanged, store } from './state';
import { modal, toast } from './ui';

/**
 * How imported variations are combined with the current donation variants.
 * - `append`: keep current conditional variants, add the imported ones;
 * - `replace`: remove current conditional variants first.
 * @example const mode: ImportMode = 'append';
 */
type ImportMode = 'append' | 'replace';

/**
 * Human-readable condition of an import item.
 * @param item Import item.
 * @returns Text such as `≥ 500 RUB`.
 * @example conditionText(item); // '= 151 RUB'
 */
const conditionText = (item: DaImportItem) => {
  if (item.isDefault) return t('daDefaultToBase');
  const sign = item.condition.mode === 'eq' ? '=' : '≥';
  return `${sign} ${item.condition.amount} ${item.condition.currency}`;
};

/**
 * Display name of an import item.
 * @param item Import item.
 * @returns Name.
 * @example itemName(item); // '500 RUB'
 */
const itemName = (item: DaImportItem) =>
  item.name || (item.isDefault ? t('daDefaultName') : conditionText(item));

/**
 * Writes the selected items into the donation kind draft.
 * @param items Selected items.
 * @param mode Combine mode.
 * @returns Counts of imported and skipped (variant limit) items.
 * @example applyImport(selected, 'append'); // { imported: 14, skipped: 0 }
 */
const applyImport = (items: DaImportItem[], mode: ImportMode) => {
  const cfg = store.settings.kinds.donation;
  if (mode === 'replace') cfg.variants.splice(1);
  let imported = 0;
  let skipped = 0;
  for (const item of items) {
    const variant = clone(item.variant);
    variant.name = itemName(item).slice(0, 60);
    if (item.isDefault) {
      const base = cfg.variants[0];
      Object.assign(base, variant, {
        id: base.id,
        name: base.name,
        enabled: true,
        condition: { ...base.condition },
      });
      imported += 1;
      continue;
    }
    if (cfg.variants.length >= MAX_VARIANTS) {
      skipped += 1;
      continue;
    }
    variant.id = newId();
    variant.enabled = true;
    cfg.variants.push(variant);
    imported += 1;
  }
  settingsChanged();
  return { imported, skipped };
};

/**
 * Opens the import dialog.
 * @param onDone Called after variants were imported (re-render the editor).
 * @example openDaImport(() => renderAll());
 */
export const openDaImport = (onDone: () => void) => {
  const input = h('input', {
    class: 'sa-input',
    attrs: {
      type: 'text',
      placeholder:
        'https://www.donationalerts.com/widget/alerts?group_id=1&token=…',
      autocomplete: 'off',
      spellcheck: 'false',
    },
  }) as HTMLInputElement;
  const loadBtn = h('button', {
    class: 'sa-btn sa-btn--primary',
    text: t('daLoad'),
    attrs: { type: 'button' },
  }) as HTMLButtonElement;
  const result = h('div', { class: 'sa-da__result' });

  const close = modal(
    t('daTitle'),
    [
      h('p', { class: 'sa-muted sa-small', text: t('daIntro') }),
      h('div', { class: 'sa-da__link' }, [input, loadBtn]),
      h('p', { class: 'sa-muted sa-small', text: t('daSecretHint') }),
      result,
    ],
    true
  );

  /**
   * Renders the parsed variations with checkboxes and the import controls.
   * @param data Parse result.
   * @example renderResult(res);
   */
  const renderResult = (data: DaImportResult) => {
    result.replaceChildren();
    if (!data.items.length) {
      const other = data.groups.filter(g => g.id !== data.groupId);
      result.append(
        h('p', {
          class: 'sa-da__empty',
          text: other.length
            ? t('daEmptyOtherGroups', {
                groups: other.map(g => `${g.id} (${g.donations})`).join(', '),
              })
            : t('daEmpty'),
        })
      );
      return;
    }
    const selected = new Set(
      data.items.filter(i => !i.notes.length).map(i => i.sourceId)
    );
    let mode: ImportMode = 'append';
    const importBtn = h('button', {
      class: 'sa-btn sa-btn--primary',
      attrs: { type: 'button' },
    }) as HTMLButtonElement;
    const refreshButton = () => {
      importBtn.textContent = t('daImport', { n: selected.size });
      importBtn.disabled = selected.size === 0;
    };

    const rows = data.items.map(item => {
      const box = h('input', {
        attrs: { type: 'checkbox' },
      }) as HTMLInputElement;
      box.checked = selected.has(item.sourceId);
      box.addEventListener('change', () => {
        if (box.checked) selected.add(item.sourceId);
        else selected.delete(item.sourceId);
        refreshButton();
      });
      const notes = item.notes.map(note =>
        h('span', { class: 'sa-da__note', text: t(`daNote_${note}`) })
      );
      return h(
        'label',
        { class: ['sa-da__item', item.isDefault && 'is-base'] },
        [
          box,
          h('span', { class: 'sa-da__main' }, [
            h('span', { class: 'sa-da__name', text: itemName(item) }),
            h('span', {
              class: 'sa-muted sa-small',
              text: conditionText(item),
            }),
            ...notes,
          ]),
          h('span', {
            class: 'sa-da__media',
            text: `${item.hasImage ? '🖼' : ''}${item.hasSound ? '🔊' : ''}`,
            attrs: { title: t('daMediaHint') },
          }),
        ]
      );
    });

    const modeSelect = h('select', { class: 'sa-input sa-select' }, [
      h('option', { text: t('daModeAppend'), attrs: { value: 'append' } }),
      h('option', { text: t('daModeReplace'), attrs: { value: 'replace' } }),
    ]) as HTMLSelectElement;
    modeSelect.addEventListener('change', () => {
      mode = modeSelect.value === 'replace' ? 'replace' : 'append';
    });

    importBtn.addEventListener('click', () => {
      const chosen = data.items.filter(i => selected.has(i.sourceId));
      const { imported, skipped } = applyImport(chosen, mode);
      close();
      onDone();
      toast(
        skipped
          ? t('daImportedLimit', { n: imported, skipped, max: MAX_VARIANTS })
          : t('daImported', { n: imported })
      );
    });
    refreshButton();

    result.append(
      h('p', {
        class: 'sa-muted sa-small',
        text: t('daFound', {
          n: data.items.length,
          group: data.groupId,
          cur: data.currency,
        }),
      }),
      h('div', { class: 'sa-da__list' }, rows),
      h('p', {
        class: 'sa-muted sa-small',
        text: t('daCurrencyHint', { cur: data.currency }),
      }),
      h('div', { class: 'sa-actions sa-actions--end' }, [modeSelect, importBtn])
    );
  };

  const load = async () => {
    const url = input.value.trim();
    if (!url) return;
    loadBtn.disabled = true;
    loadBtn.textContent = t('daLoading');
    const res = await act<DaImportResult>('daParse', { url });
    loadBtn.disabled = false;
    loadBtn.textContent = t('daLoad');
    if (res.success) renderResult(res);
    else result.replaceChildren();
  };
  loadBtn.addEventListener('click', () => void load());
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') void load();
  });
  input.focus();
};
