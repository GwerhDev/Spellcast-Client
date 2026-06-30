# Spellcast-Client Design System Reference

## Source files
- `src/styles/root.css` — all CSS custom properties (design tokens), light/dark theme
- `src/styles/base.css` — font imports, reset, native HTML element styles
- `src/styles/globals.css` — global utility and layout classes

---

## Color tokens

### Accent
| Variable | Value | Use |
|---|---|---|
| `--color-primary` | `#73a5cc` | Primary accent, active states, primary buttons |
| `--color-secondary` | `#8469bb` | Secondary accent, button hover |
| `--color-button-primary` | `#73a5cc` | Button primary background |
| `--color-button-primary-glass` | `color-mix(primary 72%, transparent)` | Glass/frosted button variant |
| `--color-button-primary-hover` | `#8469bb` | Primary button hover |
| `--color-highlight` | `#84b4d8` | Highlighted text, sentence hover |
| `--color-primary-accent` | `#84b4d8` | Accent variant of primary |
| `--color-secondary-accent` | `#9b85c8` | Accent variant of secondary |

### Text
| Variable | Value | Use |
|---|---|---|
| `--text-color` | `#cbcbcb` | Default body text |
| `--text-color-accent` | `#e4e4e4` | High-emphasis text |
| `--text-1` | `#e4e4e4` | Strongest text |
| `--text-2` | `#adadad` | Body text |
| `--text-3` | `#7b7b7b` | Muted / subtitles |
| `--color-light-100` | `#e4e4e4` | Bright text |
| `--color-light-200` | `#BEBEBE` | Primary text |
| `--color-light-300` | `#adadad` | Secondary text |
| `--color-light-400` | `#7b7b7b` | Muted text, placeholders, subtitles |

### Dark surface scale
| Variable | Value | Use |
|---|---|---|
| `--color-dark-100` | `#515151` | Hover on interactive elements |
| `--color-dark-200` | `#464646` | Card hover background |
| `--color-dark-300` | `#3c3c3c` | Card / item background |
| `--color-dark-400` | `#2f2f2f` | Borders, surface track |
| `--color-dark-500` | `#212121` | Inset surfaces |
| `--color-dark-600` | `#232323` | Deep surface |
| `--color-dark-700` | `#1b1b1b` | Deeper surface |
| `--color-dark-800` | `#1a1a1c` | Page background |
| `--color-dark-900` | `#262626` | Elevated surface |

### Surfaces
| Variable | Use |
|---|---|
| `--surface-base` | `#1a1a1c` — deepest background |
| `--surface-raised` | `#202026` — panels, cards |
| `--surface-overlay` | `#27272f` — modals, overlays |
| `--surface-inset` | Inset control backgrounds |
| `--surface-track` | Borders, dividers, input borders |

### Semantic backgrounds
| Variable | Use |
|---|---|
| `--component-background` | Default background for inputs, selects, cards |
| `--paper-bg` | `#252830` — PDF viewer page background |
| `--background-color-dark` | `#1a1a1c` — page base |
| `--background-color-light` | `#2f2f2f` — lighter surface |
| `--background-gradient-color` | Root gradient (radial + linear) |
| `--viewer-background` | PDF viewer area background (semi-transparent) |

### Borders
| Variable | Use |
|---|---|
| `--line` | `rgba(255,255,255,0.07)` — subtle dividers |
| `--line-soft` | `rgba(255,255,255,0.04)` — very subtle borders |

### Semantic status
| Variable | Use |
|---|---|
| `--color-danger` | `rgb(160,70,70)` — destructive actions, errors |
| `--color-danger-dark` | Darker danger |
| `--color-danger-100` – `500` | Danger scale (backgrounds to deep) |
| `--color-live` | `#e8914a` — live / recording indicator |
| `--color-ok` | `#52c99a` — success / connected |
| `--color-warning` | `#d4a017` — warnings |

**Rule:** Never use raw hex/rgb values in component CSS. Always reference a token.

---

## Spacing tokens

`--size-{1..12}` map to 4px multiples:

| Token | Value |
|---|---|
| `--size-1` | 4px |
| `--size-2` | 8px |
| `--size-3` | 12px |
| `--size-4` | 16px |
| `--size-5` | 20px |
| `--size-6` | 24px |
| `--size-7` | 28px |
| `--size-8` | 32px |
| `--size-9` | 36px |
| `--size-10` | 40px |
| `--size-11` | 44px |
| `--size-12` | 48px |

**Rule:** Prefer `--size-*` for gap, padding, margin. Raw `px` is acceptable only for `border-radius` or fine-grained values where no token fits.

---

## Typography

- **UI / Body:** `Geist, -apple-system, system-ui, sans-serif` (`--font-sans`)
- **Monospace / Code:** `JetBrains Mono, SF Mono, Menlo, monospace` (`--font-mono`)
- **Display:** `Game-Of-Squids` (`@font-face` in `base.css`) — decorative headlines only

`font-family` is set on `:root` — never override per-component unless intentional.

---

## Theme support

`:root` defines dark mode tokens. `html.light` overrides the same variables for light mode. Components never need to check the theme — CSS variables handle it automatically. Never hardcode dark-only or light-only values.

---

## Utility classes (globals.css)

| Class | Purpose |
|---|---|
| `.app-container` | Main flex column container (gap: 0.5rem) |
| `.dashboard-container` | Full-width layout wrapper |
| `.nav-container` | Sidebar navigation wrapper |
| `.audioplayer-container` | Audio player bar (collapsible in fullscreen) |
| `.outter-border` | Outer border frame |
| `.app-window` | App frame wrapper |
| `.loader` | Full-screen centered spinner wrapper |
| `.featured` | Gradient text color (primary → secondary) |
| `.featured-glow` | Animated shimmer on text (used on section titles) |
| `.d-flex` | `display: flex` |
