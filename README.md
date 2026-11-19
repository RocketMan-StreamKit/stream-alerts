# Stream Alerts

StreamKit+ application addon: on-screen alerts for donations, subscriptions, gift subs, follows and every platform event your source addons provide (Twitch bits, channel rewards, …), shown in OBS through a browser source. Requires StreamKit+ **1.3.10+** (`triggers.getRegistered()` / `triggers.listValues()`).

## Features

- **Visual editor with live preview** — the preview uses the same renderer as the OBS widget, inside a 1920×1080 frame, with editable sample data.
- **Per event type**: the standard StreamKit+ event types (donations, subscriptions, gift subs, follows, other events) plus **platform events taken from the StreamKit+ trigger catalog** — whatever source addons register with `dashboard.registerTriggers()` (Twitch bits and channel-point rewards, other platforms, games, …). Nothing platform-specific is hardcoded: new events appear in the editor automatically when a source addon is enabled, grouped by that addon.
- **Variants** — alternate designs by amount (in the app currency), months, gift count or a numeric trigger value, by specific trigger values (a particular reward, tier or option — loaded live from the source addon) and/or platform. Value-bound variants win over amount-only ones; among equals the highest threshold wins.
- **Design**: text template with `{name}`, `{amount}`, `{message}`, `{count}`, `{months}`, `{tier}`, `{event}` (event name from the catalog), `{value}` (readable trigger value: number, reward title, option label), `{platform}`; fonts (Google Fonts with Cyrillic), size, weight, colors, highlight color, outline, shadow, alignment; image / GIF / video (transparent WebM works) with 7 layouts; card background, opacity, border, radius.
- **Animation**: 12 entrance / exit animations with their own durations, on-screen time and 7 effects for highlighted text.
- **Sound**: 9 built-in synthesized sounds, uploaded files or links, with volume and delay; optional StreamKit+ TTS.
- **No duplicates**: events that already triggered an overlay, sound effect, hotkey, game effect or co-op sync are **not shown by default** (each system can be turned back on). Hidden events stay in the feed with the reason and a «Show» button.
- **Queue**: pause / resume / skip / clear, gap between alerts, max size, expiry for alerts waiting while OBS is closed. Reports `alerts.started()` / `alerts.ended()` so other addons (music players) can duck.
- **Moderation**: blocked users, banned words in messages.

## Usage

1. Install the addon folder (`dist/` after build) in **StreamKit+ → Settings → Applications** and enable it.
2. Open it from the main window (**Applications**).
3. Tab **OBS & filters**: copy the widget link → in OBS add a **Browser** source, 1920×1080. Add `&muted=1` for a silent copy.
4. Tab **Alerts**: design each event type; **Send to OBS** shows a test alert on stream.

## Architecture

| Path | Role |
| --- | --- |
| `src/index.ts` | Worker entry: endpoints, widget socket, `dashboard.onRecord` subscription |
| `src/catalog.ts` | Trigger catalog (`triggers.getRegistered()`): `custom` triggers of every source addon become kinds `t\|{addonId}\|{key}`; tier / option labels and dynamic values (`triggers.listValues()`) |
| `src/classify.ts` | Dashboard record → alert event (kind via `sourceAddonId` + `payload.triggers`, values, app-currency amount) |
| `src/triggered.ts` | Detects events already handled by other systems: system `attach` entries (`overlay`, `sound`, `hotkey`, `timer`, `coop-sync`) and `triggers.getApplied()` rules for game effects / addon trigger fields |
| `src/pipeline.ts` | Filters, journal, replay, test alerts |
| `src/queue.ts` | Sequential playback with widget acks (`done`), timeout fallback, gap, pause, skip |
| `src/media.ts` | Chunked uploads; files kept as base64 in storage and served from `ADDON_TMP_DIR` via `GET media` |
| `src/endpoints.ts` | Panel HTTP API (`GET panel`, `POST action`, `GET media`) — token-protected |
| `src/render/` | Shared renderer, synthesized sounds, font loader (widget + panel preview) |
| `src/widget.ts` | OBS page: Socket.IO namespace `/addon/{id}/live`, events `play`, `skip`, `stage`; emits `done` |
| `src/panel/` | Control panel (editor, feed, settings, media picker) |
| `src/shared/` | Types, defaults, sanitizing, templates (no DOM / sandbox globals) |

## Development

```bash
npm install
npm run build      # → dist/
npm run watch
npm run typecheck
```

Matching rules for game effects / addon trigger fields treat numeric rule values as thresholds (event ≥ rule), the same way numeric (`valueMatch: 'minimum'`) triggers are usually configured.

New catalog kinds start enabled, except text-valued triggers (chat-message matchers), which start disabled. Designs of kinds whose source addon is turned off are kept and listed under «Source is off».
