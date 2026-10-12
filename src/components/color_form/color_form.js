import { qs, qsa, debounce } from "../../scripts/dom.js";
import { EVENTS, emit, on } from "../../scripts/events.js";
import { findDuplicateLines, findInvalidLines, insertLineAfterColor, parseColorInput, removeColorLines, reorderColorLines} from "./color_input.js";
import { fromQuery, toQuery } from "./query.js";
import template from "./color_form.html?raw";

const MAX_QUOTED_LENGTH = 40;

function quote(text) {
  const code = document.createElement("code");
  code.textContent =
    text.length > MAX_QUOTED_LENGTH ? text.slice(0, MAX_QUOTED_LENGTH - 1) + "…" : text;
  return code;
}

const listLines = (lines) => `${lines.slice(0, -1).join(", ")} and ${lines.at(-1)}`;

// Nodes rather than HTML, as the quoted lines are user input.
function describeLineProblems(invalid, duplicates) {
  const parts = [];

  if (invalid.length === 1) {
    parts.push(`Line ${invalid[0].line} is not a valid color: `, quote(invalid[0].text), ".");
  } else if (invalid.length > 1) {
    parts.push(`Lines ${listLines(invalid.map((entry) => entry.line))} are not valid colors.`);
  }

  const fix = invalid.find((entry) => entry.fix)?.fix;
  if (fix) {
    parts.push(" Separate the label with a semicolon: ", quote(fix), ".");
  }

  const gap = parts.length > 0 ? " " : "";
  if (duplicates.length === 1) {
    parts.push(`${gap}Line ${duplicates[0].line} repeats line ${duplicates[0].first}.`);
  } else if (duplicates.length > 1) {
    parts.push(`${gap}Lines ${listLines(duplicates.map((entry) => entry.line))} repeat earlier colors.`);
  }

  return parts;
}

// Stripped before a new level is appended, so labels never read "Orange (Large) (AA)".
const LEVEL_SUFFIX = /\s*\((Large|AA|AAA)\)$/;

// Keep in sync with the min/max attributes in color_form.html.
const MIN_TILE_SIZE = 45;
const MAX_TILE_SIZE = 300;
const DEFAULT_TILE_SIZE = 80;

function normalizeTileSize(raw) {
  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return DEFAULT_TILE_SIZE;
  }

  return Math.min(MAX_TILE_SIZE, Math.max(MIN_TILE_SIZE, Math.round(value)));
}

class ColorFormElement extends HTMLElement {
  #form;
  #foregroundInput;
  #backgroundInput;
  #tileSizeRange;
  #tileSizeNumber;
  #foregroundColors = [];
  #backgroundColors = [];
  // The text colors of the separate lists, restored when switching back to them.
  #savedForeground;

  connectedCallback() {
    this.innerHTML = template;

    this.#form = qs(".cg-color-form", this);
    this.#foregroundInput = qs("#cg-color-form__foreground-colors", this);
    this.#backgroundInput = qs("#cg-color-form__background-colors", this);
    this.#tileSizeRange = qs("#cg-color-form__tile-size", this);
    this.#tileSizeNumber = qs("#cg-color-form__tile-size-number", this);

    this.#bindEvents();
  }

  // Called once every component is upgraded, so the grid is already listening.
  start() {
    this.#loadFromUrl();
    this.#broadcastHiddenLevels();
    this.#broadcastColors();
    this.#broadcastTileSize();
  }

  // Writes an edit still waiting for its debounce, for anything that reads the address now.
  syncUrl() {
    this.#updateUrl();
  }

  #bindEvents() {
    // Enter in the tile size field would submit the form and reload the page.
    this.#form.addEventListener("submit", (event) => event.preventDefault());

    const onType = debounce(() => this.#broadcastColors(), 500);
    this.#foregroundInput.addEventListener("input", onType);
    this.#backgroundInput.addEventListener("input", onType);

    on(EVENTS.removeColor, (hex, colorset) => this.#removeColor(hex, colorset));
    on(EVENTS.suggestColor, (original, hex, level) =>
      this.#addSuggestion(original, hex, level),
    );
    on(EVENTS.foregroundSorted, (order) => this.#sortForeground(order));
    on(EVENTS.backgroundSorted, (order) => this.#sortBackground(order));

    qsa(
      ".cg-color-form__use-separate-lists, .cg-color-form__use-one-list",
      this,
    ).forEach((link) =>
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.#toggleSeparateLists();
        this.#broadcastColors();
      }),
    );

    qs(".cg-color-form__swap", this).addEventListener("click", () => {
      [this.#foregroundInput.value, this.#backgroundInput.value] = [
        this.#backgroundInput.value,
        this.#foregroundInput.value,
      ];
      this.#broadcastColors();
    });

    // Dragging fires continuously, so keep the history write off the hot path.
    const onTileSizeSettled = debounce(() => this.#updateUrl(), 300);

    // Reads the form directly, so an edit still waiting for its debounce is not lost.
    window.addEventListener("pagehide", () => this.syncUrl());

    this.#tileSizeRange.addEventListener("input", () => {
      this.#applyTileSize(normalizeTileSize(this.#tileSizeRange.value));
      onTileSizeSettled();
    });

    // Clamping while typing would fight the user, so only react to a value
    // that is already in range and tidy up on blur.
    this.#tileSizeNumber.addEventListener("input", () => {
      const value = Number(this.#tileSizeNumber.value);
      if (value >= MIN_TILE_SIZE && value <= MAX_TILE_SIZE) {
        this.#applyTileSize(Math.round(value), { syncNumber: false });
        onTileSizeSettled();
      }
    });

    this.#tileSizeNumber.addEventListener("change", () => {
      this.#applyTileSize(normalizeTileSize(this.#tileSizeNumber.value));
      onTileSizeSettled();
    });

    qsa(".cg-color-form__level-toggle", this).forEach((input) =>
      input.addEventListener("change", () => {
        this.#broadcastHiddenLevels();
        this.#updateUrl();
      }),
    );

    // Chromium only, so the buttons stay hidden unless the API is there.
    const supportsEyeDropper = "EyeDropper" in window;
    qsa(".cg-color-form__eyedropper", this).forEach((button) => {
      button.hidden = !supportsEyeDropper;
      button.addEventListener("click", () => this.#pickFromScreen(button));
    });
  }

  async #pickFromScreen(button) {
    let picked;

    try {
      picked = await new window.EyeDropper().open();
    } catch {
      return; // The picker was dismissed.
    }

    const textarea = qs("#" + button.dataset.target, this);
    const hex = picked.sRGBHex.toUpperCase();

    if (parseColorInput(textarea.value).some((color) => color.hex === hex)) {
      return;
    }

    const existing = textarea.value.replace(/\s+$/, "");
    textarea.value = (existing ? existing + "\n" : "") + hex + "\n";
    this.#broadcastColors();
  }

  #readColors() {
    this.#foregroundColors = parseColorInput(this.#foregroundInput.value);
    this.#backgroundColors = parseColorInput(this.#backgroundInput.value);
    this.#showInvalidLines(this.#foregroundInput);
    this.#showInvalidLines(this.#backgroundInput);

    return {
      foregroundColors: this.#foregroundColors,
      backgroundColors: this.#backgroundColors,
    };
  }

  #broadcastColors() {
    emit(EVENTS.colorsChanged, this.#readColors());
    this.#updateUrl();
  }

  // Showing everything is the default, so only the hidden levels are passed on.
  #hiddenLevels() {
    return qsa(".cg-color-form__level-toggle", this)
      .filter((input) => !input.checked)
      .map((input) => input.dataset.level);
  }

  #broadcastHiddenLevels() {
    emit(EVENTS.hiddenLevelsChanged, this.#hiddenLevels());
  }

  #showInvalidLines(textarea) {
    const invalid = findInvalidLines(textarea.value);

    textarea.setAttribute("aria-invalid", String(invalid.length > 0));
    qs(`#${textarea.id}-error`, this).replaceChildren(
      ...describeLineProblems(invalid, findDuplicateLines(textarea.value)),
    );
  }

  #applyTileSize(size, { syncNumber = true } = {}) {
    this.#tileSizeRange.value = size;

    if (syncNumber) {
      this.#tileSizeNumber.value = size;
    }

    emit(EVENTS.tileSizeChanged, size);
  }

  #broadcastTileSize() {
    this.#applyTileSize(normalizeTileSize(this.#tileSizeRange.value));
  }

  #updateUrl() {
    const size = normalizeTileSize(this.#tileSizeRange.value);

    const query = toQuery({
      background: this.#backgroundInput.value,
      foreground: this.#foregroundInput.value,
      tileSize: size === DEFAULT_TILE_SIZE ? null : size,
      hidden: this.#hiddenLevels(),
    });

    // Replaced rather than pushed: Back leaves the page, and Forward returns to the latest state.
    window.history.replaceState(null, "", "/" + query);
  }

  // In the shared-list mode rows come from the foreground field too.
  #backgroundSource() {
    return this.#backgroundColors.length > 0
      ? this.#backgroundInput
      : this.#foregroundInput;
  }

  #removeColor(hex, colorset) {
    const input =
      colorset === "background" ? this.#backgroundSource() : this.#foregroundInput;

    input.value = removeColorLines(input.value, hex);
    this.#broadcastColors();
  }

  // Text colors are the columns, which always come from the foreground list.
  #addSuggestion(original, hex, level) {
    const color = this.#foregroundColors.find((c) => c.hex === original);
    const name = (color.label ?? color.source).replace(LEVEL_SUFFIX, "");

    this.#foregroundInput.value = insertLineAfterColor(
      this.#foregroundInput.value,
      original,
      `${hex}; ${name} (${level})`,
    );
    this.#broadcastColors();
  }

  #sortForeground(order) {
    this.#foregroundInput.value = reorderColorLines(this.#foregroundInput.value, order);
    this.#broadcastColors();
  }

  #sortBackground(order) {
    const input = this.#backgroundSource();
    input.value = reorderColorLines(input.value, order);
    this.#broadcastColors();
  }

  #toggleSeparateLists() {
    const label = qs("label[for='cg-color-form__foreground-colors']", this);
    const separate = this.#form.classList.toggle("cg-color-form--separate-lists");

    if (!separate) {
      label.textContent = "Your colors";
      this.#savedForeground = this.#foregroundInput.value;
      this.#foregroundInput.value = this.#backgroundInput.value;
      this.#backgroundInput.value = "";
      return;
    }

    label.textContent = "Text colors (columns)";

    // Already populated when the state was restored from the URL.
    if (this.#backgroundInput.value.length === 0) {
      this.#backgroundInput.value = this.#foregroundInput.value;
    }
    if (this.#savedForeground !== undefined) {
      this.#foregroundInput.value = this.#savedForeground;
    }
  }

  #loadFromUrl() {
    const { background, foreground, tileSize, hidden } = fromQuery(window.location.search);

    if (foreground !== null) {
      this.#foregroundInput.value = foreground;
    }
    if (background !== null) {
      this.#backgroundInput.value = background;
    }
    if (tileSize !== null) {
      this.#tileSizeRange.value = normalizeTileSize(tileSize);
    }

    qsa(".cg-color-form__level-toggle", this).forEach((input) => {
      input.checked = !hidden.includes(input.dataset.level);
    });

    if (this.#backgroundInput.value.length > 0) {
      this.#toggleSeparateLists();
    }
  }
}

customElements.define("cg-color-form", ColorFormElement);
