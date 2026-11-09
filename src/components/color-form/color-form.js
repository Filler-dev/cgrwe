import { LEVELS } from "../../color/contrast.js";
import { qs, qsa, debounce } from "../../shared/dom.js";
import { EVENTS, emit, on } from "../../shared/events.js";
import { appendColorLine, findDuplicateLines, findInvalidLines, insertLineAfterColor, parseColorInput, removeColorLines, reorderColorLines} from "./color-lines.js";
import { describeLineProblems } from "./line-messages.js";
import { fromQuery, toQuery } from "./url-state.js";
import { TileSize } from "./tile-size.js";

// Stripped before a new level is appended, so labels never read "Orange (Large) (AA)".
const LEVEL_SUFFIX = new RegExp(`\\s*\\((${LEVELS.map((level) => level.name).join("|")})\\)$`);

class ColorFormElement extends HTMLElement {
  #form;
  #foregroundInput;
  #backgroundInput;
  #tileSize;
  #foregroundColors = [];
  #backgroundColors = [];
  // The text colors of the separate lists, restored when switching back to them.
  #savedForeground;
  #listeners;
  #broadcastColorsSoon = debounce(() => this.#broadcastColors(), 500);
  // Dragging the slider fires continuously, so keep the history write off the hot path.
  #updateUrlSoon = debounce(() => this.#updateUrl(), 300);

  // The markup from color-form.html is already in the page, put there at build time.
  connectedCallback() {
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;

    this.#form = qs(".cg-color-form", this);
    this.#foregroundInput = qs("#cg-color-form__foreground-colors", this);
    this.#backgroundInput = qs("#cg-color-form__background-colors", this);
    this.#tileSize = new TileSize(
      qs("#cg-color-form__tile-size", this),
      qs("#cg-color-form__tile-size-number", this),
      (size) => {
        emit(EVENTS.tileSizeChanged, size);
        this.#updateUrlSoon();
      },
      { signal },
    );

    this.#bindEvents(signal);
  }

  disconnectedCallback() {
    this.#listeners.abort();
    this.#broadcastColorsSoon.cancel();
    this.#updateUrlSoon.cancel();
  }

  // Called once every component is upgraded, so the grid is already listening.
  start() {
    this.#loadFromUrl();
    this.#broadcastHiddenLevels();
    this.#broadcastColors();
    emit(EVENTS.tileSizeChanged, this.#tileSize.size);
  }

  // Writes an edit still waiting for its debounce, for anything that reads the address now.
  syncUrl() {
    this.#updateUrl();
  }

  #bindEvents(signal) {
    const options = { signal };

    // Enter in the tile size field would submit the form and reload the page.
    this.#form.addEventListener("submit", (event) => event.preventDefault(), options);

    this.#foregroundInput.addEventListener("input", this.#broadcastColorsSoon, options);
    this.#backgroundInput.addEventListener("input", this.#broadcastColorsSoon, options);

    on(EVENTS.removeColor, (hex, colorset) => this.#removeColor(hex, colorset), options);
    on(EVENTS.suggestColor, (original, hex, level) =>
      this.#addSuggestion(original, hex, level),
    options);
    on(EVENTS.foregroundSorted, (order) => this.#sortForeground(order), options);
    on(EVENTS.backgroundSorted, (order) => this.#sortBackground(order), options);

    qsa(
      ".cg-color-form__use-separate-lists, .cg-color-form__use-one-list",
      this,
    ).forEach((link) =>
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.#toggleSeparateLists();
        this.#broadcastColors();
      }, options),
    );

    qs(".cg-color-form__swap", this).addEventListener("click", () => {
      [this.#foregroundInput.value, this.#backgroundInput.value] = [
        this.#backgroundInput.value,
        this.#foregroundInput.value,
      ];
      this.#broadcastColors();
    }, options);

    // Reads the form directly, so an edit still waiting for its debounce is not lost.
    window.addEventListener("pagehide", () => this.syncUrl(), options);

    qsa(".cg-color-form__level-toggle", this).forEach((input) =>
      input.addEventListener("change", () => {
        this.#broadcastHiddenLevels();
        this.#updateUrl();
      }, options),
    );

    // Chromium only, so the buttons stay hidden unless the API is there.
    const supportsEyeDropper = "EyeDropper" in window;
    qsa(".cg-color-form__eyedropper", this).forEach((button) => {
      button.hidden = !supportsEyeDropper;
      button.addEventListener("click", () => this.#pickFromScreen(button), options);
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

    textarea.value = appendColorLine(textarea.value, hex);
    this.#broadcastColors();
  }

  #readColors() {
    this.#foregroundColors = parseColorInput(this.#foregroundInput.value);
    this.#backgroundColors = parseColorInput(this.#backgroundInput.value);

    return {
      foregroundColors: this.#foregroundColors,
      backgroundColors: this.#backgroundColors,
    };
  }

  #broadcastColors() {
    this.#showLineProblems(this.#foregroundInput);
    this.#showLineProblems(this.#backgroundInput);
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

  #showLineProblems(textarea) {
    const invalid = findInvalidLines(textarea.value);

    textarea.setAttribute("aria-invalid", String(invalid.length > 0));
    qs(`#${textarea.id}-error`, this).replaceChildren(
      ...describeLineProblems(invalid, findDuplicateLines(textarea.value)),
    );
  }

  #updateUrl() {
    const size = this.#tileSize.size;

    const query = toQuery({
      background: this.#backgroundInput.value,
      foreground: this.#foregroundInput.value,
      tileSize: size === this.#tileSize.initial ? null : size,
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
    const separate = this.#form.classList.toggle("cg-color-form--separate-lists");

    if (!separate) {
      this.#savedForeground = this.#foregroundInput.value;
      this.#foregroundInput.value = this.#backgroundInput.value;
      this.#backgroundInput.value = "";
      return;
    }

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
      this.#tileSize.restore(tileSize);
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
