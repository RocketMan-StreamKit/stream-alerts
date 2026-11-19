/**
 * Form controls bound directly to settings objects. Each control writes into `target[key]`
 * and calls `onChange` so the panel can refresh the preview and autosave.
 */
import { h } from './dom';

/** Called after any bound value changes. */
export type OnChange = () => void;

/**
 * Labeled form row.
 * @param label Label text.
 * @param control Control element(s).
 * @param hint Optional hint under the control.
 * @returns Row element.
 * @example row('Size', numberInput(style, 'size', change));
 */
export const row = (label: string, control: Node | Node[], hint?: string) =>
  h('div', { class: 'sa-row' }, [
    h('span', { class: 'sa-row__label', text: label }),
    h(
      'span',
      { class: 'sa-row__control' },
      Array.isArray(control) ? control : [control]
    ),
    hint ? h('span', { class: 'sa-row__hint', text: hint }) : null,
  ]);

/**
 * Slider with a number box.
 * @param target Object to edit.
 * @param key Numeric key.
 * @param opts Range, step, unit.
 * @param onChange Change callback.
 * @returns Control.
 * @example slider(v.box, 'width', { min: 120, max: 1920, unit: 'px' }, change);
 */
export const slider = <T extends Record<K, number>, K extends keyof T>(
  target: T,
  key: K,
  opts: {
    min: number;
    max: number;
    step?: number;
    unit?: string;
    scale?: number;
  },
  onChange: OnChange
) => {
  const scale = opts.scale ?? 1;
  const range = h('input', {
    class: 'sa-range',
    attrs: {
      type: 'range',
      min: opts.min,
      max: opts.max,
      step: opts.step ?? 1,
    },
  });
  const box = h('input', {
    class: 'sa-num',
    attrs: {
      type: 'number',
      min: opts.min,
      max: opts.max,
      step: opts.step ?? 1,
    },
  });
  const sync = () => {
    const v = String(
      Math.round(((target[key] as number) / scale) * 1000) / 1000
    );
    range.value = v;
    if (document.activeElement !== box) box.value = v;
  };
  const set = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    target[key] = (Math.min(opts.max, Math.max(opts.min, n)) * scale) as T[K];
    sync();
    onChange();
  };
  range.addEventListener('input', () => set(range.value));
  box.addEventListener('change', () => set(box.value));
  sync();
  return h('span', { class: 'sa-slider' }, [
    range,
    box,
    opts.unit ? h('span', { class: 'sa-unit', text: opts.unit }) : null,
  ]);
};

/**
 * Number input.
 * @param target Object to edit.
 * @param key Numeric key.
 * @param opts Bounds and step.
 * @param onChange Change callback.
 * @returns Input.
 * @example numberInput(cond, 'min', { min: 0 }, change);
 */
export const numberInput = <T extends Record<K, number>, K extends keyof T>(
  target: T,
  key: K,
  opts: { min?: number; max?: number; step?: number },
  onChange: OnChange
) => {
  const input = h('input', {
    class: 'sa-input sa-input--num',
    attrs: {
      type: 'number',
      min: opts.min,
      max: opts.max,
      step: opts.step ?? 'any',
    },
  });
  input.value = String(target[key]);
  input.addEventListener('input', () => {
    const n = Number(input.value);
    if (input.value === '' || !Number.isFinite(n)) return;
    target[key] = n as T[K];
    onChange();
  });
  return input;
};

/**
 * Color picker with hex text.
 * @param target Object to edit.
 * @param key Color key.
 * @param onChange Change callback.
 * @returns Control.
 * @example colorInput(style, 'color', change);
 */
export const colorInput = <T extends Record<K, string>, K extends keyof T>(
  target: T,
  key: K,
  onChange: OnChange
) => {
  const picker = h('input', { class: 'sa-color', attrs: { type: 'color' } });
  const text = h('input', {
    class: 'sa-input sa-input--hex',
    attrs: { type: 'text', maxlength: 7, spellcheck: 'false' },
  });
  picker.value = target[key];
  text.value = target[key];
  picker.addEventListener('input', () => {
    target[key] = picker.value as T[K];
    text.value = picker.value;
    onChange();
  });
  text.addEventListener('change', () => {
    const v = text.value.trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(v)) {
      text.value = target[key];
      return;
    }
    target[key] = v as T[K];
    picker.value = v;
    onChange();
  });
  return h('span', { class: 'sa-colorbox' }, [picker, text]);
};

/**
 * Toggle switch.
 * @param target Object to edit.
 * @param key Boolean key.
 * @param label Text next to the switch.
 * @param onChange Change callback.
 * @returns Control.
 * @example toggle(style, 'shadow', 'Shadow', change);
 */
export const toggle = <T extends Record<K, boolean>, K extends keyof T>(
  target: T,
  key: K,
  label: string,
  onChange: OnChange
) => {
  const input = h('input', { attrs: { type: 'checkbox' } });
  input.checked = target[key];
  input.addEventListener('change', () => {
    target[key] = input.checked as T[K];
    onChange();
  });
  return h('label', { class: 'sa-toggle' }, [
    input,
    h('span', { class: 'sa-toggle__track' }),
    h('span', { text: label }),
  ]);
};

/**
 * Select box.
 * @param target Object to edit.
 * @param key String key.
 * @param options `[value, label]` pairs.
 * @param onChange Change callback.
 * @returns Select.
 * @example select(anim, 'enter', ANIMATIONS.map(a => [a, t(`anim_${a}`)]), change);
 */
export const select = <T extends Record<K, string | number>, K extends keyof T>(
  target: T,
  key: K,
  options: [string, string][],
  onChange: OnChange
) => {
  const el = h(
    'select',
    { class: 'sa-input sa-select' },
    options.map(([value, label]) =>
      h('option', { text: label, attrs: { value } })
    )
  );
  el.value = String(target[key]);
  el.addEventListener('change', () => {
    const numeric = typeof target[key] === 'number';
    target[key] = (numeric ? Number(el.value) : el.value) as T[K];
    onChange();
  });
  return el;
};

/**
 * Segmented button group.
 * @param target Object to edit.
 * @param key String key.
 * @param options `[value, label]` pairs.
 * @param onChange Change callback.
 * @returns Control.
 * @example segmented(style, 'align', [['left', '⇤'], ['center', '↔'], ['right', '⇥']], change);
 */
export const segmented = <T extends Record<K, string>, K extends keyof T>(
  target: T,
  key: K,
  options: [string, string][],
  onChange: OnChange
) => {
  const buttons = options.map(([value, label]) =>
    h('button', {
      class: ['sa-seg__btn', target[key] === value && 'is-active'],
      text: label,
      attrs: { type: 'button' },
      on: {
        click: () => {
          target[key] = value as T[K];
          buttons.forEach((b, i) =>
            b.classList.toggle('is-active', options[i][0] === value)
          );
          onChange();
        },
      },
    })
  );
  return h('span', { class: 'sa-seg' }, buttons);
};

/**
 * Single-line text input.
 * @param target Object to edit.
 * @param key String key.
 * @param onChange Change callback.
 * @param placeholder Placeholder.
 * @returns Input.
 * @example textInput(variant, 'name', change);
 */
export const textInput = <T extends Record<K, string>, K extends keyof T>(
  target: T,
  key: K,
  onChange: OnChange,
  placeholder = ''
) => {
  const input = h('input', {
    class: 'sa-input',
    attrs: { type: 'text', placeholder },
  });
  input.value = target[key];
  input.addEventListener('input', () => {
    target[key] = input.value as T[K];
    onChange();
  });
  return input;
};

/**
 * Template input with clickable `{token}` chips.
 * @param target Object to edit.
 * @param key String key.
 * @param tokens Tokens offered as chips.
 * @param onChange Change callback.
 * @returns Control.
 * @example templateInput(v.title, 'template', ['name', 'amount'], change);
 */
export const templateInput = <T extends Record<K, string>, K extends keyof T>(
  target: T,
  key: K,
  tokens: string[],
  onChange: OnChange
) => {
  const input = textInput(target, key, onChange);
  const chips = tokens.map(token =>
    h('button', {
      class: 'sa-chip',
      text: `{${token}}`,
      attrs: { type: 'button' },
      on: {
        click: () => {
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? start;
          input.value = `${input.value.slice(0, start)}{${token}}${input.value.slice(end)}`;
          target[key] = input.value as T[K];
          input.focus();
          const pos = start + token.length + 2;
          input.setSelectionRange(pos, pos);
          onChange();
        },
      },
    })
  );
  return h('span', { class: 'sa-template' }, [
    input,
    h('span', { class: 'sa-chips' }, chips),
  ]);
};

/**
 * Multi-line list editor (one item per line).
 * @param target Object to edit.
 * @param key String-array key.
 * @param onChange Change callback.
 * @param placeholder Placeholder.
 * @returns Textarea.
 * @example listInput(filters, 'blockedUsers', change);
 */
export const listInput = <T extends Record<K, string[]>, K extends keyof T>(
  target: T,
  key: K,
  onChange: OnChange,
  placeholder = ''
) => {
  const area = h('textarea', {
    class: 'sa-input sa-textarea',
    attrs: { rows: 4, placeholder },
  });
  area.value = target[key].join('\n');
  area.addEventListener('input', () => {
    target[key] = area.value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean) as T[K];
    onChange();
  });
  return area;
};

/**
 * Collapsible group card.
 * @param title Title.
 * @param body Content.
 * @param open Initially open.
 * @param icon Leading emoji.
 * @returns `<details>` element.
 * @example group('Text', [rows], true, '🔤');
 */
export const group = (title: string, body: Node[], open = false, icon = '') =>
  h('details', { class: 'sa-group', attrs: { open } }, [
    h('summary', { class: 'sa-group__head' }, [
      icon ? h('span', { class: 'sa-group__icon', text: icon }) : null,
      h('span', { text: title }),
    ]),
    h('div', { class: 'sa-group__body' }, body),
  ]);
