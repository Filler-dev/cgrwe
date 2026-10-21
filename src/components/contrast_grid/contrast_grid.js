import { qs, qsa, delegate } from "../../scripts/dom.js";
import { EVENTS, emit, on } from "../../scripts/events.js";
import {
  getContrastRatioForHex,
  getLevel,
} from "../../color/contrast.js";
import { getNextLevel, suggestTextColor } from "../../color/suggest.js";
import { enableDragging } from "./drag.js";

const COPIED_FEEDBACK_MS = 1500;

const MOVE_STEPS = { left: -1, up: -1, right: 1, down: 1 };

const SORTED_EVENTS = {
  foreground: EVENTS.foregroundSorted,
  background: EVENTS.backgroundSorted,
};

// importNode rather than cloneNode, so the icons inside are upgraded as custom elements.
const instantiate = (templateElement) =>
  document.importNode(templateElement.content.firstElementChild, true);

class ContrastGridElement extends HTMLElement {
  #grid;
  #gridContent;
  #foregroundKey;
  #status;
  #foregroundKeyCellTemplate;
  #contentRowTemplate;
  #contentCellTemplate;
  #colors;
  #hiddenLevels = new Set();

  // The markup from contrast_grid.html is already in the page, put there at build time.
  connectedCallback() {
    this.#grid = qs(".cg-contrast-grid", this);
    this.#gridContent = qs(".cg-contrast-grid__content", this);
    this.#foregroundKey = qs(".cg-contrast-grid__foreground-key", this);
    this.#status = qs(".cg-contrast-grid__status", this);
    this.#foregroundKeyCellTemplate = qs(".cg-contrast-grid__foreground-key-cell-template", this);
    this.#contentRowTemplate = qs(".cg-contrast-grid__content-row-template", this);
    this.#contentCellTemplate = qs(".cg-contrast-grid__content-cell-template", this);

    this.#bindEvents();
    enableDragging(this, this.#grid, (colorset) =>
      emit(SORTED_EVENTS[colorset], this.#extractColors(colorset)),
    );
  }

  #applyLevelFilter() {
    qsa(".cg-contrast-grid__tile", this).forEach((tile) => {
      tile.style.display = this.#hiddenLevels.has(tile.dataset.level) ? "none" : "";
    });
  }

  #bindEvents() {
    on(EVENTS.colorsChanged, (colors) => this.#updateGrid(colors));
    on(EVENTS.hiddenLevelsChanged, (levels) => {
      this.#hiddenLevels = new Set(levels);
      this.#applyLevelFilter();
    });
    on(EVENTS.tileSizeChanged, (tileSize) => this.#changeTileSize(tileSize));

    delegate(
      this,
      "click",
      ".cg-contrast-grid__key-swatch-remove",
      (event, action) => {
        event.preventDefault();
        emit(EVENTS.removeColor, action.dataset.hex, action.dataset.colorset);
      },
    );

    delegate(this, "click", ".cg-contrast-grid__key-swatch-copy", (_, action) =>
      this.#copy(action),
    );

    delegate(this, "click", ".cg-contrast-grid__key-swatch-move", (_, action) =>
      this.#move(action),
    );

    delegate(this, "click", ".cg-contrast-grid__suggest", (_, action) =>
      this.#suggest(action.closest(".cg-contrast-grid__tile")),
    );
  }

  async #copy(action) {
    const { hex } = action.dataset;

    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      this.#status.textContent = `Could not copy ${hex}`;
      return;
    }

    this.#status.textContent = `Copied ${hex}`;
    action.classList.add("cg-contrast-grid__key-swatch-copy--done");
    setTimeout(
      () => action.classList.remove("cg-contrast-grid__key-swatch-copy--done"),
      COPIED_FEEDBACK_MS,
    );
  }

  #suggest(tile) {
    const { foreground, background } = tile.dataset;
    const suggestion = suggestTextColor(foreground, background);
    if (!suggestion) {
      return;
    }

    if (this.#colors.foregroundColors.some((c) => c.hex === suggestion.hex)) {
      this.#status.textContent = `${suggestion.hex} is already in the list`;
      return;
    }

    this.#status.textContent = `Added ${suggestion.hex} for ${suggestion.level}`;
    emit(EVENTS.suggestColor, foreground, suggestion.hex, suggestion.level);
  }

  // A keyboard and single-click alternative to dragging (WCAG 2.1.1, 2.5.7).
  #move(action) {
    if (action.getAttribute("aria-disabled") === "true") {
      return;
    }

    const swatch = action.closest(".cg-contrast-grid__key-swatch");
    const colorset = swatch.classList.contains("cg-contrast-grid__key-swatch--foreground")
      ? "foreground"
      : "background";
    const { hex } = swatch.dataset;
    const { direction } = action.dataset;

    const order = this.#extractColors(colorset);
    const from = order.indexOf(hex);
    const to = from + MOVE_STEPS[direction];
    [order[from], order[to]] = [order[to], order[from]];

    // The grid is rebuilt synchronously, so the button has to be found again.
    emit(SORTED_EVENTS[colorset], order);
    qs(
      `.cg-contrast-grid__key-swatch--${colorset}[data-hex="${hex}"] .cg-contrast-grid__key-swatch-move[data-direction="${direction}"]`,
      this,
    )?.focus();

    this.#status.textContent = `${action.dataset.name} moved to position ${to + 1} of ${order.length}`;
  }

  #fillMoveActions(swatch, color, index, count) {
    const name = color.label ?? color.hex;

    qsa(".cg-contrast-grid__key-swatch-move", swatch).forEach((action) => {
      const { direction } = action.dataset;
      const target = index + MOVE_STEPS[direction];

      action.dataset.name = name;
      action.setAttribute("aria-label", `Move ${name} ${direction}`);
      action.setAttribute("aria-disabled", String(target < 0 || target >= count));
      action.title = `Move ${direction}`;
    });
  }

  #extractColors(colorset) {
    return qsa(`.cg-contrast-grid__key-swatch--${colorset}`, this).map(
      (swatch) => swatch.dataset.hex,
    );
  }

  #getBackgroundColors() {
    return this.#colors.backgroundColors.length
      ? this.#colors.backgroundColors
      : this.#colors.foregroundColors;
  }

  #fillKeySwatch(swatch, hex, colorset) {
    swatch.style.backgroundColor = hex;
    swatch.dataset.hex = hex;

    const removeAction = qs(".cg-contrast-grid__key-swatch-remove", swatch);
    removeAction.dataset.hex = hex;
    removeAction.dataset.colorset = colorset;
    removeAction.setAttribute("aria-label", `Remove ${hex}`);

    const copyAction = qs(".cg-contrast-grid__key-swatch-copy", swatch);
    copyAction.dataset.hex = hex;
    copyAction.setAttribute("aria-label", `Copy ${hex}`);
    copyAction.title = `Copy ${hex}`;

    return {
      text: qs(".cg-contrast-grid__key-swatch-label-text", swatch),
      hex: qs(".cg-contrast-grid__key-swatch-label-hex", swatch),
    };
  }

  #generateForegroundKey() {
    const colors = this.#colors.foregroundColors;
    // With one shared list the row keys already carry the labels.
    const showLabels = this.#colors.backgroundColors.length > 0;

    colors.forEach((color, index) => {
      const cell = instantiate(this.#foregroundKeyCellTemplate);
      const swatch = qs(".cg-contrast-grid__key-swatch", cell);
      const label = color.label ?? color.hex;
      const labels = this.#fillKeySwatch(swatch, color.hex, "foreground");
      this.#fillMoveActions(swatch, color, index, colors.length);

      if (showLabels) {
        labels.text.textContent = label;
        if (color.hex !== label) {
          labels.hex.textContent = color.hex;
        }
      } else {
        labels.text.textContent = color.hex;
      }

      this.#foregroundKey.append(cell);
    });
  }

  #generateContentRows() {
    const foregroundColors = this.#colors.foregroundColors;
    const backgroundColors = this.#getBackgroundColors();

    backgroundColors.forEach((background, index) => {
      const row = instantiate(this.#contentRowTemplate);
      const swatch = qs(".cg-contrast-grid__key-swatch", row);
      const label = background.label ?? background.hex;
      const labels = this.#fillKeySwatch(swatch, background.hex, "background");
      this.#fillMoveActions(swatch, background, index, backgroundColors.length);

      labels.text.textContent = label;
      if (label !== background.hex) {
        labels.hex.textContent = background.hex;
      }

      for (const foreground of foregroundColors) {
        const cell = instantiate(this.#contentCellTemplate);

        if (background.hex === foreground.hex) {
          const spacer = document.createElement("div");
          spacer.className = "cg-contrast-grid__tile-spacer";
          cell.replaceChildren(spacer);
        } else {
          const tile = qs(".cg-contrast-grid__tile", cell);
          tile.style.backgroundColor = background.hex;
          tile.style.color = foreground.hex;
          tile.dataset.foreground = foreground.hex;
          tile.dataset.background = background.hex;
        }

        row.append(cell);
      }

      this.#gridContent.append(row);
    });
  }

  // Labels and controls take black or white, whichever contrasts more; pure white and black get an outline.
  #markContrastClasses(element, backgroundColor) {
    const withWhite = getContrastRatioForHex("#FFFFFF", backgroundColor);
    const withBlack = getContrastRatioForHex("#000000", backgroundColor);

    element.classList.toggle("cg-contrast-grid--white-swatch", withWhite === 1);
    element.classList.toggle("cg-contrast-grid--black-swatch", withBlack === 1);
    element.classList.toggle("cg-contrast-grid--dark-label", withBlack > withWhite);
  }

  // From the colors as entered, not as rendered: a Windows contrast theme replaces the rendered ones.
  #addContrastToTiles() {
    qsa(".cg-contrast-grid__tile", this).forEach((tile) => {
      const { foreground, background } = tile.dataset;
      const ratio = getContrastRatioForHex(foreground, background);
      const level = getLevel(ratio);
      const badge = qs(".cg-contrast-grid__level-badge", tile);

      tile.dataset.level = level.toLowerCase();
      qs(".cg-contrast-grid__contrast-ratio", tile).textContent = ratio;
      badge.textContent = level;
      badge.classList.add(`cg-contrast-grid__level-badge--${tile.dataset.level}`);
      this.#markContrastClasses(tile, background);
    });
  }

  // Only whether the next level is reachable; the search itself waits for a click.
  #prepareSuggestions() {
    qsa(".cg-contrast-grid__tile", this).forEach((tile) => {
      const button = qs(".cg-contrast-grid__suggest", tile);
      const next = getNextLevel(tile.dataset.foreground, tile.dataset.background);

      button.hidden = !next;
      if (!next) {
        return;
      }

      const label = next.reachable
        ? `Add a text color that passes ${next.level}`
        : `${next.level} is out of reach on this background`;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-disabled", String(!next.reachable));
      button.title = label;
    });
  }

  #setKeySwatchLabelColors() {
    qsa(".cg-contrast-grid__key-swatch", this).forEach((swatch) =>
      this.#markContrastClasses(swatch, swatch.dataset.hex),
    );
  }

  #markSingleColor() {
    const singleColor =
      this.#colors.foregroundColors.length <= 1 &&
      this.#colors.backgroundColors.length <= 1;

    this.#grid.classList.toggle("cg-contrast-grid--single-color", singleColor);
  }

  #reset() {
    qsa(".cg-contrast-grid__content-row", this).forEach((row) => row.remove());
    qsa(".cg-contrast-grid__foreground-key-cell", this).forEach((cell) =>
      cell.remove(),
    );
  }

  #generate() {
    this.#generateForegroundKey();
    this.#generateContentRows();
    this.#addContrastToTiles();
    this.#applyLevelFilter();
    this.#prepareSuggestions();
    this.#setKeySwatchLabelColors();
    this.#markSingleColor();
  }

  #updateGrid(colors) {
    this.#colors = colors;
    this.#reset();
    this.#generate();
  }

  #changeTileSize(size) {
    this.#grid.style.setProperty("--tile-size", `${size}px`);
  }
}

customElements.define("cg-contrast-grid", ContrastGridElement);
