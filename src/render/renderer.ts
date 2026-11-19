/**
 * Alert renderer shared by the OBS widget and the editor preview, so the preview is exactly
 * what OBS shows. Renders inside a shadow root to stay isolated from page styles.
 */
import { BUILTIN_IMAGES } from '../shared/defaults';
import { renderSegments } from '../shared/template';
import type {
  AlertPayload,
  AlertsSettings,
  AlertVariant,
  EnterAnimation,
  TextStyle,
} from '../shared/types';
import { ensureFont, waitFonts } from './fonts';
import { playSound } from './sounds';

/** Stage placement settings. */
type Stage = AlertsSettings['stage'];

/** Styles inside the shadow root. */
const CSS = `
:host { all: initial; }
.stage { position: absolute; inset: 0; display: flex; overflow: hidden; pointer-events: none; }
.anchor { display: flex; }
.alert { position: relative; display: flex; align-items: center; box-sizing: border-box; will-change: transform, opacity; }
.alert.l-image-above { flex-direction: column; }
.alert.l-image-below { flex-direction: column-reverse; }
.alert.l-image-left { flex-direction: row; }
.alert.l-image-right { flex-direction: row-reverse; }
.alert.l-image-behind, .alert.l-text-only, .alert.l-image-only { flex-direction: column; }
.alert.l-image-behind .media { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 0; }
.alert.l-image-behind .text { position: relative; z-index: 1; }
.media { flex: none; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.media img, .media video { display: block; width: 100%; height: auto; }
.emoji { line-height: 1; animation: bob 2.4s ease-in-out infinite; }
.text { flex: 1 1 auto; min-width: 0; width: 100%; }
.title, .msg { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.2; }
.msg { margin-top: 6px; }
.acc { display: inline-block; white-space: pre-wrap; }
.ch { display: inline-block; white-space: pre; }
.fx-wave .ch { animation: wave 1.4s ease-in-out infinite; }
.fx-jelly .ch { animation: jelly 1.2s ease-in-out infinite; }
.fx-pulse .acc { animation: pulse 1.2s ease-in-out infinite; }
.fx-shake .acc { animation: shake 0.5s linear infinite; }
.fx-glow .acc { animation: glow 1.6s ease-in-out infinite; }
.fx-rainbow .acc { animation: rainbow 3s linear infinite; }
@keyframes bob { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-6%) rotate(3deg); } }
@keyframes wave { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-0.25em); } }
@keyframes jelly { 0%,100% { transform: scale(1,1); } 25% { transform: scale(1.25,0.8); } 50% { transform: scale(0.85,1.15); } 75% { transform: scale(1.05,0.95); } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes shake { 0%,100% { transform: translate(0,0) rotate(0); } 25% { transform: translate(-2px,1px) rotate(-2deg); } 75% { transform: translate(2px,-1px) rotate(2deg); } }
@keyframes glow { 0%,100% { filter: drop-shadow(0 0 2px currentColor); } 50% { filter: drop-shadow(0 0 14px currentColor); } }
@keyframes rainbow { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
`;

/**
 * Flex alignment for each stage anchor.
 * @example ANCHOR.center; // ['center', 'center']
 */
const ANCHOR: Record<Stage['position'], [string, string]> = {
  'top-left': ['flex-start', 'flex-start'],
  top: ['flex-start', 'center'],
  'top-right': ['flex-start', 'flex-end'],
  left: ['center', 'flex-start'],
  center: ['center', 'center'],
  right: ['center', 'flex-end'],
  'bottom-left': ['flex-end', 'flex-start'],
  bottom: ['flex-end', 'center'],
  'bottom-right': ['flex-end', 'flex-end'],
};

/**
 * Converts a hex color and opacity into `rgba()`.
 * @param hex `#rrggbb`.
 * @param opacity 0–100.
 * @returns CSS color.
 * @example rgba('#ff0000', 50); // 'rgba(255,0,0,0.5)'
 */
const rgba = (hex: string, opacity: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity / 100})`;
};

/**
 * Text-shadow list for outline + drop shadow (works in every Chromium, incl. old OBS CEF).
 * @param style Text style.
 * @returns CSS `text-shadow` value.
 * @example textShadow({ ...style, stroke: 2 });
 */
const textShadow = (style: TextStyle) => {
  const parts: string[] = [];
  const w = style.stroke;
  if (w > 0) {
    const steps = Math.max(8, Math.round(w * 6));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      parts.push(
        `${(Math.cos(a) * w).toFixed(2)}px ${(Math.sin(a) * w).toFixed(2)}px 0 ${style.strokeColor}`
      );
    }
  }
  if (style.shadow) parts.push('0 3px 10px rgba(0,0,0,0.65)');
  return parts.length ? parts.join(',') : 'none';
};

/**
 * Applies a text style to an element.
 * @param el Element.
 * @param style Text style.
 * @example applyText(titleEl, variant.title);
 */
const applyText = (el: HTMLElement, style: TextStyle) => {
  ensureFont(style.font);
  Object.assign(el.style, {
    fontFamily: `"${style.font}", system-ui, sans-serif`,
    fontSize: `${style.size}px`,
    fontWeight: String(style.weight),
    color: style.color,
    textAlign: style.align,
    textTransform: style.uppercase ? 'uppercase' : 'none',
    textShadow: textShadow(style),
  });
};

/**
 * Builds template text with highlighted tokens (per-character spans for wave / jelly).
 * @param el Target element.
 * @param template Template.
 * @param payload Alert payload.
 * @param style Text style (accent color).
 * @example fillTemplate(title, v.title.template, payload, v.title);
 */
const fillTemplate = (
  el: HTMLElement,
  template: string,
  payload: AlertPayload,
  style: TextStyle
) => {
  const perChar =
    payload.variant.animation.text === 'wave' ||
    payload.variant.animation.text === 'jelly';
  let charIndex = 0;
  for (const seg of renderSegments(template, payload.vars)) {
    if (!seg.accent) {
      el.append(seg.text);
      continue;
    }
    const span = document.createElement('span');
    span.className = 'acc';
    span.style.color = style.accent;
    if (perChar) {
      for (const ch of Array.from(seg.text)) {
        const c = document.createElement('span');
        c.className = 'ch';
        c.textContent = ch;
        c.style.animationDelay = `${(charIndex++ * 0.06).toFixed(2)}s`;
        span.append(c);
      }
    } else {
      span.textContent = seg.text;
    }
    el.append(span);
  }
};

/**
 * Creates the media element for an image reference.
 * @param variant Variant.
 * @returns Element, or null when there is no image.
 * @example const media = buildMedia(variant);
 */
const buildMedia = (variant: AlertVariant): HTMLElement | null => {
  const src = variant.image.src;
  if (!src || variant.layout === 'text-only') return null;
  const box = document.createElement('div');
  box.className = 'media';
  box.style.width = `${variant.image.size}px`;
  box.style.borderRadius = `${variant.image.radius}px`;
  if (src.startsWith('builtin:')) {
    const emoji = document.createElement('div');
    emoji.className = 'emoji';
    emoji.textContent = BUILTIN_IMAGES[src.slice(8)] ?? '✨';
    emoji.style.fontSize = `${Math.round(variant.image.size * 0.8)}px`;
    box.append(emoji);
    return box;
  }
  const isVideo =
    /[?&]kind=video\b/.test(src) || /\.(webm|mp4)(\?|#|$)/i.test(src);
  if (isVideo) {
    const video = document.createElement('video');
    Object.assign(video, {
      src,
      autoplay: true,
      muted: true,
      loop: true,
      playsInline: true,
    });
    box.append(video);
  } else {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    box.append(img);
  }
  return box;
};

/**
 * Keyframes of an animation (entrance direction).
 * @param name Animation.
 * @returns Keyframes (from → to).
 * @example frames('zoom');
 */
const frames = (name: EnterAnimation): Keyframe[] => {
  switch (name) {
    case 'fade':
      return [{ opacity: 0 }, { opacity: 1 }];
    case 'slide-up':
      return [
        { opacity: 0, transform: 'translateY(120px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ];
    case 'slide-down':
      return [
        { opacity: 0, transform: 'translateY(-120px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ];
    case 'slide-left':
      return [
        { opacity: 0, transform: 'translateX(160px)' },
        { opacity: 1, transform: 'translateX(0)' },
      ];
    case 'slide-right':
      return [
        { opacity: 0, transform: 'translateX(-160px)' },
        { opacity: 1, transform: 'translateX(0)' },
      ];
    case 'zoom':
      return [
        { opacity: 0, transform: 'scale(0.3)' },
        { opacity: 1, transform: 'scale(1)' },
      ];
    case 'pop':
      return [
        { opacity: 0, transform: 'scale(0)' },
        { opacity: 1, transform: 'scale(1.12)', offset: 0.7 },
        { opacity: 1, transform: 'scale(1)' },
      ];
    case 'bounce':
      return [
        { opacity: 0, transform: 'translateY(-260px)' },
        { opacity: 1, transform: 'translateY(0)', offset: 0.45 },
        { transform: 'translateY(-40px)', offset: 0.65 },
        { transform: 'translateY(0)', offset: 0.8 },
        { transform: 'translateY(-10px)', offset: 0.9 },
        { opacity: 1, transform: 'translateY(0)' },
      ];
    case 'flip':
      return [
        { opacity: 0, transform: 'perspective(800px) rotateX(90deg)' },
        { opacity: 1, transform: 'perspective(800px) rotateX(0deg)' },
      ];
    case 'spin':
      return [
        { opacity: 0, transform: 'rotate(-200deg) scale(0)' },
        { opacity: 1, transform: 'rotate(0deg) scale(1)' },
      ];
    case 'blur':
      return [
        { opacity: 0, filter: 'blur(24px)', transform: 'scale(1.2)' },
        { opacity: 1, filter: 'blur(0)', transform: 'scale(1)' },
      ];
    default:
      return [{ opacity: 1 }, { opacity: 1 }];
  }
};

/**
 * Exit keyframes: entrance reversed, slides continue in their direction.
 * @param name Animation.
 * @returns Keyframes.
 * @example exitFrames('slide-up'); // moves up while fading out
 */
const exitFrames = (name: EnterAnimation): Keyframe[] => {
  const flipped: Partial<Record<EnterAnimation, EnterAnimation>> = {
    'slide-up': 'slide-down',
    'slide-down': 'slide-up',
    'slide-left': 'slide-right',
    'slide-right': 'slide-left',
  };
  return frames(flipped[name] ?? name)
    .slice()
    .reverse()
    .map(f => {
      const { offset, ...rest } = f;
      return offset === undefined || offset === null
        ? rest
        : { ...rest, offset: 1 - Number(offset) };
    });
};

/**
 * Waits for an image / video to be ready (bounded).
 * @param el Media box.
 * @param timeoutMs Maximum wait.
 * @returns Promise resolved when ready or timed out.
 * @example await waitMedia(box, 2000);
 */
const waitMedia = (el: HTMLElement | null, timeoutMs = 2500) =>
  new Promise<void>(resolve => {
    const target = el?.querySelector('img, video') as
      | HTMLImageElement
      | HTMLVideoElement
      | null;
    if (!target) return resolve();
    if (target instanceof HTMLImageElement && target.complete) return resolve();
    const done = () => resolve();
    target.addEventListener(
      target instanceof HTMLImageElement ? 'load' : 'loadeddata',
      done,
      { once: true }
    );
    target.addEventListener('error', done, { once: true });
    window.setTimeout(done, timeoutMs);
  });

/**
 * Renders alerts into a host element.
 * @example const r = new AlertRenderer(document.getElementById('stage')!); await r.play(payload);
 */
export class AlertRenderer {
  /** Shadow root. */
  private root: ShadowRoot;
  /** Full-size stage. */
  private stage: HTMLElement;
  /** Scaled / offset anchor. */
  private anchor: HTMLElement;
  /** Abort for the alert in progress. */
  private abort: (() => void) | null = null;
  /** Id of the alert in progress. */
  private currentId: string | null = null;

  /**
   * @param host Element that becomes the shadow host (should be positioned and sized).
   * @example new AlertRenderer(host);
   */
  constructor(host: HTMLElement) {
    this.root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    this.stage = document.createElement('div');
    this.stage.className = 'stage';
    this.anchor = document.createElement('div');
    this.anchor.className = 'anchor';
    this.stage.append(this.anchor);
    this.root.replaceChildren(style, this.stage);
  }

  /**
   * Applies stage placement.
   * @param stage Placement settings.
   * @example renderer.setStage(settings.stage);
   */
  setStage(stage: Stage) {
    const [vertical, horizontal] = ANCHOR[stage.position] ?? ANCHOR.center;
    this.stage.style.alignItems = vertical;
    this.stage.style.justifyContent = horizontal;
    const originY =
      vertical === 'flex-start'
        ? 'top'
        : vertical === 'flex-end'
          ? 'bottom'
          : 'center';
    const originX =
      horizontal === 'flex-start'
        ? 'left'
        : horizontal === 'flex-end'
          ? 'right'
          : 'center';
    this.anchor.style.transformOrigin = `${originX} ${originY}`;
    this.anchor.style.transform = `translate(${stage.offsetX}px, ${stage.offsetY}px) scale(${stage.scale / 100})`;
  }

  /**
   * Builds the alert element.
   * @param payload Alert.
   * @returns Element and the media box.
   * @example const { el } = this.build(payload);
   */
  private build(payload: AlertPayload) {
    const v = payload.variant;
    const el = document.createElement('div');
    el.className = `alert l-${v.layout} fx-${v.animation.text}`;
    Object.assign(el.style, {
      width: `${v.box.width}px`,
      padding: `${v.box.padding}px`,
      gap: `${v.box.gap}px`,
      borderRadius: `${v.box.radius}px`,
      background:
        v.box.backgroundOpacity > 0
          ? rgba(v.box.background, v.box.backgroundOpacity)
          : 'transparent',
      border:
        v.box.borderWidth > 0
          ? `${v.box.borderWidth}px solid ${v.box.borderColor}`
          : 'none',
      boxShadow: v.box.shadow ? '0 12px 40px rgba(0,0,0,0.55)' : 'none',
    });
    const media = buildMedia(v);
    if (media) el.append(media);
    if (v.layout !== 'image-only') {
      const text = document.createElement('div');
      text.className = 'text';
      const title = document.createElement('div');
      title.className = 'title';
      applyText(title, v.title);
      fillTemplate(title, v.title.template, payload, v.title);
      text.append(title);
      if (v.message.show && payload.vars.message) {
        const msg = document.createElement('div');
        msg.className = 'msg';
        applyText(msg, v.message);
        msg.textContent = payload.vars.message;
        text.append(msg);
      }
      el.append(text);
    }
    return { el, media };
  }

  /**
   * Shows an alert statically (editor live preview: no timing, no sound).
   * @param payload Alert.
   * @example renderer.showStatic(payload);
   */
  showStatic(payload: AlertPayload) {
    this.stop();
    this.setStage(payload.stage);
    const { el } = this.build(payload);
    this.anchor.replaceChildren(el);
  }

  /**
   * Clears the stage.
   * @example renderer.clear();
   */
  clear() {
    this.stop();
    this.anchor.replaceChildren();
  }

  /**
   * Plays an alert: entrance, sound, hold, exit.
   * @param payload Alert.
   * @param options `muted` disables sound.
   * @returns Promise resolved when the alert has left the screen (or was skipped).
   * @example await renderer.play(payload);
   */
  async play(
    payload: AlertPayload,
    options: { muted?: boolean } = {}
  ): Promise<void> {
    this.stop();
    const v = payload.variant;
    this.setStage(payload.stage);
    const { el, media } = this.build(payload);
    el.style.visibility = 'hidden';
    this.anchor.replaceChildren(el);
    this.currentId = payload.id;

    let aborted = false;
    const timers: number[] = [];
    let stopSound: () => void = () => undefined;
    let wake: () => void = () => undefined;
    this.abort = () => {
      aborted = true;
      timers.forEach(t => window.clearTimeout(t));
      stopSound();
      wake();
    };
    /**
     * Abortable sleep.
     * @param ms Duration.
     * @returns Promise.
     * @example await sleepMs(500);
     */
    const sleepMs = (ms: number) =>
      new Promise<void>(resolve => {
        wake = resolve;
        timers.push(window.setTimeout(resolve, ms));
      });

    const fontSpecs = [
      `${v.title.weight} ${v.title.size}px "${v.title.font}"`,
      `${v.message.weight} ${v.message.size}px "${v.message.font}"`,
    ];
    await Promise.all([waitFonts(fontSpecs), waitMedia(media)]);
    if (aborted) return this.finish(el, payload.id);

    el.style.visibility = 'visible';
    if (!options.muted) {
      const volume = (v.sound.volume / 100) * (payload.volume / 100);
      timers.push(
        window.setTimeout(
          () => (stopSound = playSound(v.sound.src, volume)),
          v.sound.delayMs
        )
      );
    }
    if (v.animation.enter !== 'none' && v.animation.enterMs > 0) {
      el.animate(frames(v.animation.enter), {
        duration: v.animation.enterMs,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'both',
      });
    }
    await sleepMs(v.animation.enterMs + v.durationMs);
    if (!aborted && v.animation.exit !== 'none' && v.animation.exitMs > 0) {
      el.animate(exitFrames(v.animation.exit), {
        duration: v.animation.exitMs,
        easing: 'cubic-bezier(.6,0,.8,.2)',
        fill: 'forwards',
      });
      await sleepMs(v.animation.exitMs);
    }
    return this.finish(el, payload.id);
  }

  /**
   * Removes a finished alert.
   * @param el Alert element.
   * @param id Alert id.
   * @example this.finish(el, id);
   */
  private finish(el: HTMLElement, id: string) {
    el.remove();
    if (this.currentId === id) {
      this.currentId = null;
      this.abort = null;
    }
  }

  /**
   * Stops the alert in progress.
   * @example renderer.stop();
   */
  stop() {
    const abort = this.abort;
    this.abort = null;
    this.currentId = null;
    abort?.();
  }

  /**
   * Skips the alert with this id if it is playing.
   * @param id Alert id.
   * @example renderer.skip(id);
   */
  skip(id: string) {
    if (this.currentId === id) this.stop();
  }
}
