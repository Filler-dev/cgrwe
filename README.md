# Contrast Grid

**English** · [Deutsch](README.de.md)

Checks any number of text and background color combinations at a glance against the contrast requirements of **WCAG 2.2**. Every color is paired with every other. Each tile shows the contrast ratio and the level it reaches, and on request the closest color that would do better.

The tool is meant for the desktop, runs entirely in the browser and has no runtime dependencies.

---

## Contents

- [Features](#features)
- [Contrast calculation](#contrast-calculation)
- [URL parameters](#url-parameters)
- [Development](#development)
- [Tests](#tests)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Browser support](#browser-support)
- [Acknowledgements](#acknowledgements)

---

## Features

### Entering colors

- **One color per line, in any CSS format:**

  | Format | Example |
  |---|---|
  | Hex | `#FF8000`, `#F80`, also without `#` |
  | Named colors | `orange`, `rebeccapurple` |
  | RGB | `rgb(255, 128, 0)`, `rgb(255 128 0)` |
  | HSL / HWB | `hsl(30 100% 50%)`, `hwb(30 0% 0%)` |
  | Lab / LCH / OKLab / OKLCH | `lab(67 43 74)`, `oklch(0.73 0.18 55)` |
  | `color()` | `color(srgb 1 0.5 0)`, `color(display-p3 1 0.5 0)` |
  | Color mixing | `color-mix(in srgb, red 75%, yellow)` |

  Colors outside sRGB (Display P3, for example) are clipped to sRGB, as the WCAG formula is only defined for it.

- **Rejected** are values that do not resolve to a fixed color: translucent colors, `currentcolor`, system colors such as `Canvas`, `light-dark()`, `var()` and CSS keywords such as `inherit`.

- **Labels** follow a semicolon: `#FF8000; Orange`. Labels may contain commas themselves.

- **Your notation is kept.** Enter `hsl(30 100% 50%)` and it still reads that way in the field after other colors are sorted or removed.

- **Hints below the field** after a short typing pause:
  - invalid lines, e.g. "Line 2 is not a valid color: `nope`."
  - for the most common mistake, a comma instead of a semicolon before the label, a suggested fix: "Separate the label with a semicolon: `rgb(255, 0, 0); Red`."
  - repeated colors, even in a different notation: "Line 3 repeats line 1."

  Invalid lines stay where they are, even when colors are removed, moved or added.

- **Shared or separate lists:** By default one list serves both rows and columns. "Use separate lists for text and backgrounds" lets you keep background colors (rows) and text colors (columns) apart, and "Swap text and backgrounds" exchanges the two lists.

- **Eyedropper:** "Pick a color from the screen" picks a color from anywhere on the screen. This works in Chrome and Edge only; other browsers hide the button.

### The grid

- **Each tile** shows the contrast ratio with at most two decimals (`21`, `15.7`, `4.49`) and the level it reaches:

  | Level | Ratio | Meaning |
  |---|---|---|
  | **AAA** | 7 or more | enhanced contrast for regular text (WCAG 1.4.6) |
  | **AA** | 4.5 or more | minimum contrast for regular text (WCAG 1.4.3) |
  | **Large** | 3 or more | large text only (from 24 px, or 18.66 px bold) as well as UI components and graphics (WCAG 1.4.11) |
  | **Fail** | below 3 | passes no level |

- **Filters** hide individual levels, all failing combinations for instance. They double as the legend, with each level's badge and ratio.
- **Tile size** from 45 to 300 px, by slider or as a number.
- **Sticky header row and column:** The color keys stay in view while scrolling.
- **Correct results under a Windows contrast theme:** Tiles and color keys keep showing the real colors, and the calculation always uses the colors as entered.

### Suggesting a better color

Below AAA, a magic wand appears at the top right of the tile. A click adds the text color that **reaches the next level with the smallest possible change**:

- Only the lightness changes, in the OKLCH color space. Hue and chroma stay the same, so orange stays orange.
- The new color goes right after the original, with the level it reaches in its label, e.g. `#E97400; Orange (Large)`.
- Another click on that color's tile takes it to the next level (Large → AA → AAA).
- If no lightness can reach the next level on that background, because even black and white fall short, the button is disabled and says so.

### Managing colors

Hovering or focusing a color key reveals:

| Button | Action |
|---|---|
| ⧉ | copy the hex value to the clipboard (briefly turns into ✓) |
| ✕ | remove the color |
| ‹ › or ˄ ˅ | move the column or row by one place |
| ⋮⋮ | drag to move; the grid scrolls at its edges |

With a shared list ("Your colors"), an action moves or removes the color in its row and its column alike.

### Sharing and coming back

- **The full state lives in the address:** colors, labels, separate lists, tile size and hidden levels. A copied address opens the grid exactly the same for anyone else.
- **Back leaves the page, Forward returns to the latest state.** Edits add no entries to the browser history.
- **Shortcuts** for frequently used palettes, e.g. `/rwe` (see [Adding shortcuts](#adding-shortcuts)).

### Feedback

"Feedback & bug reports" in the sidebar opens an email with a prefilled subject and the current page address, so a reported bug can be reproduced in one click.

### Appearance

- **Light and dark scheme** follow the operating system setting automatically. In both, the tiles show the colors unchanged.
- **System font:** no fonts are loaded.

### Accessibility

- **Keyboard:** Everything works without a mouse, moving colors included (WCAG 2.1.1, 2.5.7).
- **Skip link** "Skip to contrast grid" on the first Tab (WCAG 2.4.1).
- **Targets** of at least 24 × 24 px (WCAG 2.5.8).
- **Screen readers:** labelled buttons, landmarks, grouped filters, status messages when copying, moving and adding, and linked error messages (WCAG 1.3.1, 3.3.1, 4.1.3).
- **The interface's own contrasts** meet WCAG in both color schemes.

---

## Contrast calculation

The ratio follows the WCAG formula, based on relative luminance:

$$\text{contrast} = \frac{L_\text{lighter} + 0.05}{L_\text{darker} + 0.05}$$

The sRGB channels are linearized with the 0.04045 threshold of WCAG 2.2. The result is **floored** to two decimals, never rounded up. WCAG forbids rounding up to a threshold: 4.499:1 does not pass AA, even though it would round to 4.5.

---

## URL parameters

| Parameter | Content | Example |
|---|---|---|
| `fg` | text colors (columns), and the rows too in the shared-list mode | `FF8000;+Orange%0A000000` |
| `bg` | background colors (rows), only with separate lists | `FFFFFF%0AF2F2F2` |
| `size` | tile size in px (45–300), only if not 80 | `120` |
| `hide` | hidden levels, comma-separated, only if any are hidden | `large,fail` |

The color lists hold the text of the input fields, one color per line. To keep the address short and readable, the `#` of a hex color at the start of a line is left out and restored on load. `;`, `,` and spaces (as `+`) stay unencoded.

---

## Development

**Requirements:** Node.js 24 and npm.

```bash
npm install
npm run dev        # development server with live reload
npm run build      # production build to dist/
npm run preview    # serve dist/ locally
```

### Local placeholders

The imprint details and the feedback address are not part of the code. Locally they come from the `.env` file:

```
VITE_IMPRINT_NAME=[Vorname Nachname]
VITE_IMPRINT_STREET=[Straße und Hausnummer]
VITE_IMPRINT_CITY=[PLZ und Ort]
VITE_IMPRINT_EMAIL=[E-Mail-Adresse]
VITE_FEEDBACK_EMAIL=[Feedback-Adresse]
```

Vite reads `.env` only on start, so restart the development server after a change.

### Adding shortcuts

Shortcuts such as `/rwe` live in the `SHORTCUTS` object in [vite.config.js](vite.config.js). The value is the address the app itself writes to the address bar, so a new shortcut is made by setting up the palette and copying the address from `/?` onwards:

```js
const SHORTCUTS = {
  rwe: "/?fg=000000;+Black%0AFFFFFF;+White%0A…",
};
```

The development server redirects a shortcut directly. The build emits a redirect page for each one, e.g. `dist/rwe/index.html`.

---

## Tests

```bash
npm test            # run all tests once
npm run test:watch  # rerun on every change
```

The tests run with [Vitest](https://vitest.dev/) in two environments:

| Environment | Files | Coverage |
|---|---|---|
| Node | `tests/unit/` | contrast formula (including 100,000 random color pairs against an unrounded reference), suggestion search, address, feedback link |
| Browser | `tests/browser/` | color input and every format, grid, buttons, dragging, keyboard, messages, address bar |

The browser tests need a real browser, as color conversion relies on canvas and `CSS.supports`. **Locally** they use the installed Google Chrome. **In the pipeline** Playwright downloads its own Chromium.

---

## Deployment

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Install dependencies and fetch Chromium for the tests
2. **Run all tests.** If one fails, the previous version stays online.
3. Check that all repository variables are set
4. Build and publish to GitHub Pages

### One-time setup on GitHub

- **Settings → Pages:** source "GitHub Actions", enter the custom domain, enable "Enforce HTTPS"
- **Settings → Secrets and variables → Actions → Variables:**

  | Variable | Content |
  |---|---|
  | `IMPRINT_NAME` | first and last name |
  | `IMPRINT_STREET` | street and house number |
  | `IMPRINT_CITY` | postcode and city |
  | `IMPRINT_EMAIL` | email address for the imprint |
  | `FEEDBACK_EMAIL` | email address for feedback |

If a variable is missing, the workflow stops, so no placeholders go live.

---

## Project structure

```
├── index.html                 the app
├── impressum.html             imprint (Impressum) and privacy policy, in German
├── public/favicon.svg
├── src/
│   ├── main.js                entry point of the app
│   ├── pages/impressum.js     entry point of the imprint
│   ├── styles/project.css     colors, spacing, layout, light and dark scheme
│   ├── color/                 pure calculations, run without a browser
│   │   ├── contrast.js        contrast formula and levels
│   │   └── suggest.js         suggestion search in OKLCH
│   ├── scripts/
│   │   ├── dom.js             small DOM helpers
│   │   ├── events.js          events between form and grid
│   │   └── feedback.js        builds the feedback link
│   └── components/
│       ├── color_form/        <cg-color-form>: input, filters, tile size
│       │   ├── color_input.js color conversion, reading, checking and editing lines
│       │   ├── line_messages.js  hints for invalid and repeated lines
│       │   └── query.js       writes the state to the address and reads it back
│       ├── contrast_grid/     <cg-contrast-grid>: grid, buttons
│       │   └── drag.js        moving columns and rows by dragging
│       └── icon/              <cg-icon>: icons from Bootstrap Icons
├── tests/
│   ├── unit/
│   └── browser/
├── vite.config.js             build, shortcuts, component markup, Content Security Policy
└── vitest.config.js           test environments
```

Form and grid are web components without shadow DOM. Their markup (`color_form.html`, `contrast_grid.html`) is written into `index.html` when the page is built, so the layout is final before any script runs and nothing shifts. The components only bring it to life. They talk through events, with the form as the single source of truth: every change made in the grid goes to the form as an event, the form updates its text and has the grid redrawn.

The build adds a Content Security Policy as a `<meta>` tag: scripts, styles and everything else may only come from the site itself. The development server goes without, as it injects styles inline.

---

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. Older browsers cannot render some parts:

| Feature | requires |
|---|---|
| color conversion | `OffscreenCanvas` (Safari 16.4 or later) |
| light and dark scheme | `light-dark()` (Chrome 123, Firefox 120, Safari 17.5) |
| eyedropper | EyeDropper API (Chrome and Edge only) |
| copying | Clipboard API, over HTTPS or on `localhost` only |

---

## Acknowledgements

The OKLab conversion follows [Björn Ottosson](https://bottosson.github.io/posts/oklab/). The icons come from [Bootstrap Icons](https://icons.getbootstrap.com/) (MIT license).
