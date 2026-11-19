/**
 * Tiny DOM helpers for the control panel.
 */

/** Child accepted by {@link h}. */
export type Child = Node | string | number | null | undefined | false;

/** Element options for {@link h}. */
export type HProps = {
  /** CSS classes (falsy entries skipped). */
  class?: string | (string | false | null | undefined)[];
  /** Text content. */
  text?: string;
  /** Attributes (`false` / `undefined` skipped, `true` → empty attribute). */
  attrs?: Record<string, string | number | boolean | undefined>;
  /** Event listeners. */
  on?: Partial<Record<keyof HTMLElementEventMap, (event: any) => void>>;
  /** Inline styles. */
  style?: Partial<CSSStyleDeclaration>;
};

/**
 * Creates an element.
 * @param tag Tag name.
 * @param props Classes, text, attributes, listeners.
 * @param children Children.
 * @returns Element.
 * @example h('button', { class: 'sa-btn', text: 'Save', on: { click: save } });
 */
export const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: HProps = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  const cls = Array.isArray(props.class)
    ? props.class.filter(Boolean).join(' ')
    : props.class;
  if (cls) el.className = cls;
  if (props.text !== undefined) el.textContent = props.text;
  for (const [name, value] of Object.entries(props.attrs ?? {})) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, value === true ? '' : String(value));
  }
  for (const [name, fn] of Object.entries(props.on ?? {}))
    if (fn) el.addEventListener(name, fn);
  if (props.style) Object.assign(el.style, props.style);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'number' ? String(child) : child);
  }
  return el;
};

/**
 * Replaces an element's children, skipping empty values.
 * @param el Parent.
 * @param children New children.
 * @example fill(status, [dot, label, paused ? badge : null]);
 */
export const fill = (el: HTMLElement, children: Child[]) => {
  el.replaceChildren(
    ...children
      .filter(
        (c): c is Node | string | number =>
          c !== null && c !== undefined && c !== false
      )
      .map(c => (typeof c === 'number' ? String(c) : c))
  );
};

/**
 * Sets text only when it changed.
 * @param el Element.
 * @param text New text.
 * @example setText(counter, '3');
 */
export const setText = (el: HTMLElement, text: string) => {
  if (el.textContent !== text) el.textContent = text;
};

/**
 * Formats a byte count.
 * @param bytes Bytes.
 * @returns Human text.
 * @example formatBytes(2048); // '2 KB'
 */
export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * Deep-copies a JSON value.
 * @param value Value.
 * @returns Copy.
 * @example const draft = clone(settings);
 */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
