# Evolve — Graphics Library

16 hand-authored, self-contained **SVG** graphics in the Evolve visual language
(signal hues: aqua `#38E4C9`, amber `#FFC46B`, violet `#8B7BFF`). Every file is:

- **Standalone** — no external fonts, images, scripts, or network requests (CSP-safe).
- **Transparent background** — drops onto any surface; tuned to read on **dark and light**.
- **Scalable** — pure vector with a `viewBox`; size it with CSS (`width`/`height`), it stays crisp.
- **Accessible** — each has a `role="img"` + `aria-label`.

Optimized for dark surfaces (a few small accents use white highlights that pop on
dark and simply fade on light — the primary shapes always read on both).

## How to use

```html
<!-- as an image -->
<img src="/graphics/neural-core.svg" alt="" width="380" />
```
```jsx
// Next.js — from /public, reference by absolute path
<img src="/graphics/encrypted-vault.svg" alt="" className="w-full max-w-md" />
```
To recolor or animate individual parts, inline the SVG markup instead of using `<img>`.

## The set

| File | Good for |
|---|---|
| `hero-orbital-field.svg` | Hero background / big statement (wide) |
| `flow-waves.svg` | Section divider / ambient background accent (wide) |
| `voice-waveform.svg` | Voice AI agent (wide banner) |
| `neural-core.svg` | AI intelligence / "the brain" |
| `autonomy-loop.svg` | Self-healing core (heal · optimize · patch · audit) |
| `one-platform.svg` | Three apps, one platform |
| `encrypted-vault.svg` | Mail — encryption at rest |
| `orbital-scheduler.svg` | Calendar — scheduling |
| `broadcast-consent.svg` | Meet — consent-first recording |
| `secure-shield.svg` | Security / trust |
| `data-mesh.svg` | Integrations / connected network |
| `cloud-upload.svg` | Large-file / attachment upload |
| `crm-funnel.svg` | CRM pipeline / lead stages |
| `analytics-pulse.svg` | KPIs / metrics / results |
| `profit-floor.svg` | Profit guarantee / margin floor |
| `global-signal.svg` | Timezones / global reach |

Palette and style match the `/suite` landing page, so these compose cleanly with it.
