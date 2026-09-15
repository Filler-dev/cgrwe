import Sortable from "sortablejs";
import { qs, qsa, delegate } from "../../scripts/dom.js";
import { EVENTS, emit, on } from "../../scripts/events.js";
import { cssColorToHex, getContrastRatioForHex } from "./contrast.js";
import template from "./contrast_grid.html?raw";

const DEFAULT_GRID_DATA = {
  foregroundColors: [
    { hex: "#000", label: "Black" },
    { hex: "#323232" },
    { hex: "#4D4D4D" },
    { hex: "#F3F1F1" },
    { hex: "#FFF", label: "White" },
    { hex: "#DC6729" },
    { hex: "#3995A9", label: "Link Color" },
  ],
  backgroundColors: [],
};

class ContrastGridElement extends HTMLElement {
  #grid;
  #gridContent;
  #foregroundKey;
  #foregroundKeyCellTemplate;
  #contentRowTemplate;
  #contentCellTemplate;
  #showLabelsOnColumnKeys = false;
  #gridData = DEFAULT_GRID_DATA;

  connectedCallback() {
    this.innerHTML = template;

    this.#grid = qs(".es-contrast-grid", this);
    this.#gridContent = qs(".es-contrast-grid__content", this);
    this.#foregroundKey = qs(".es-contrast-grid__foreground-key", this);

    this.#takeTemplates();
    this.#bindEvents();
    this.#enableDragUi();
  }

  addAccessibilityToSwatches() {
    const shown = this.#getVisibleLevels();

    qsa(".es-contrast-grid__swatch", this).forEach((swatch) => {
      const contrast = parseFloat(
        qs(".es-contrast-grid__contrast-ratio", swatch).textContent,
      );

      let level = "DNP";
      if (contrast >= 7.0) {
        level = "AAA";
      } else if (contrast >= 4.5) {
        level = "AA";
      } else if (contrast >= 3.0) {
        level = "AA18";
      }

      swatch.style.display = shown[level] ? "" : "none";

      const pill = qs(".es-contrast-grid__accessibility-label", swatch);
      pill.textContent = level;
      pill.classList.add(
        "es-contrast-grid__accessibility-label--" + level.toLowerCase(),
      );
    });
  }

  #takeTemplates() {
    const take = (id) => {
      const original = qs("#" + id, this);
      const clone = original.cloneNode(true);
      clone.removeAttribute("id");
      original.remove();
      return clone;
    };

    this.#contentCellTemplate = take("es-contrast-grid__content-cell-template");
    this.#foregroundKeyCellTemplate = take(
      "es-contrast-grid__foreground-key-cell-template",
    );
    this.#contentRowTemplate = take("es-contrast-grid__content-row-template");
  }

  #bindEvents() {
    on(EVENTS.colorFormValuesChanged, (data) => this.#updateGrid(data));
    on(EVENTS.tileSizeChanged, (tileSize) => this.#changeTileSize(tileSize));

    delegate(
      this,
      "click",
      ".es-contrast-grid__key-swatch-remove",
      (event, action) => {
        event.preventDefault();
        emit(EVENTS.removeColor, action.dataset.hex, action.dataset.colorset);
      },
    );
  }

  #enableDragUi() {
    const shared = {
      animation: 150,
      ghostClass: "escg-drag-placeholder",
      dragClass: "escg-drag-helper",
      fallbackOnBody: true,
    };

    // Sortable only reorders the DOM; the grid is then rebuilt from the color
    // form, which is the single source of truth.
    const broadcast = (event, colorset) =>
      setTimeout(() => emit(event, this.#extractColors(colorset)), 0);

    Sortable.create(this.#gridContent, {
      ...shared,
      direction: "vertical",
      draggable: ".es-contrast-grid__content-row",
      handle: ".es-contrast-grid__key-swatch-drag-handle--row",
      onEnd: () => broadcast(EVENTS.rowsSorted, "background"),
    });

    Sortable.create(this.#foregroundKey, {
      ...shared,
      direction: "horizontal",
      draggable: ".es-contrast-grid__foreground-key-cell",
      handle: ".es-contrast-grid__key-swatch-drag-handle--column",
      onEnd: () => broadcast(EVENTS.columnsSorted, "foreground"),
    });
  }

  #extractColors(colorset) {
    return qsa(`.es-contrast-grid__key-swatch--${colorset}`, this).map(
      (swatch) => swatch.dataset.hex,
    );
  }

  #getForegroundColors() {
    return this.#gridData.foregroundColors;
  }

  #getBackgroundColors() {
    return this.#gridData.backgroundColors?.length
      ? this.#gridData.backgroundColors
      : this.#gridData.foregroundColors.slice(0);
  }

  #fillKeySwatch(swatch, hex, colorset) {
    swatch.style.backgroundColor = hex;
    swatch.dataset.hex = hex;

    const removeAction = qs(".es-contrast-grid__key-swatch-remove", swatch);
    removeAction.dataset.hex = hex;
    removeAction.dataset.colorset = colorset;

    return {
      text: qs(".es-contrast-grid__key-swatch-label-text", swatch),
      hex: qs(".es-contrast-grid__key-swatch-label-hex", swatch),
    };
  }

  #generateForegroundKey() {
    for (const color of this.#getForegroundColors()) {
      const cell = this.#foregroundKeyCellTemplate.cloneNode(true);
      const swatch = qs(".es-contrast-grid__key-swatch", cell);
      const label = color.label ?? color.hex;
      const labels = this.#fillKeySwatch(swatch, color.hex, "foreground");

      if (this.#showLabelsOnColumnKeys) {
        labels.text.textContent = label;
        if (color.hex !== label) {
          labels.hex.textContent = color.hex;
        }
      } else {
        labels.text.textContent = color.hex;
      }

      this.#foregroundKey.append(cell);
    }
  }

  #generateContentRows() {
    const foregroundColors = this.#getForegroundColors();

    for (const background of this.#getBackgroundColors()) {
      const row = this.#contentRowTemplate.cloneNode(true);
      const swatch = qs(".es-contrast-grid__key-swatch", row);
      const label = background.label ?? background.hex;
      const labels = this.#fillKeySwatch(swatch, background.hex, "background");

      labels.text.textContent = label;
      if (label !== background.hex) {
        labels.hex.textContent = background.hex;
      }

      for (const foreground of foregroundColors) {
        const cell = this.#contentCellTemplate.cloneNode(true);

        if (background.hex === foreground.hex) {
          const spacer = document.createElement("div");
          spacer.className = "es-contrast-grid__swatch-spacer";
          cell.replaceChildren(spacer);
        } else {
          const tile = qs(".es-contrast-grid__swatch", cell);
          tile.style.backgroundColor = background.hex;
          tile.style.color = foreground.hex;
        }

        row.append(cell);
      }

      this.#gridContent.append(row);
    }
  }

  #getVisibleLevels() {
    const group = qs(".es-color-form__checkbox-group");

    return {
      AAA: !!qs("#es-color-form__show-contrast--aaa:checked", group),
      AA: !!qs("#es-color-form__show-contrast--aa:checked", group),
      AA18: !!qs("#es-color-form__show-contrast--aa18:checked", group),
      DNP: !!qs("#es-color-form__show-contrast--dnp:checked", group),
    };
  }

  #markDarkLabel(element, backgroundColor) {
    const contrastWithWhite = getContrastRatioForHex("#FFFFFF", backgroundColor);

    if (contrastWithWhite === 1) {
      element.classList.add(
        "es-contrast-grid--bordered-swatch",
        "es-contrast-grid--dark-label",
      );
    } else if (contrastWithWhite < 4.0) {
      element.classList.add("es-contrast-grid--dark-label");
    }
  }

  #addContrastToSwatches() {
    qsa(".es-contrast-grid__swatch", this).forEach((swatch) => {
      const styles = getComputedStyle(swatch);
      const backgroundColor = cssColorToHex(styles.backgroundColor);

      qs(".es-contrast-grid__contrast-ratio", swatch).textContent =
        getContrastRatioForHex(cssColorToHex(styles.color), backgroundColor);

      this.#markDarkLabel(swatch, backgroundColor);
    });
  }

  #setKeySwatchLabelColors() {
    qsa(".es-contrast-grid__key-swatch", this).forEach((swatch) =>
      this.#markDarkLabel(
        swatch,
        cssColorToHex(getComputedStyle(swatch).backgroundColor),
      ),
    );
  }

  #truncateContrastDisplayValues() {
    const twoDecimals = /[\d]*.[\d][\d]/;
    const dotZero = /[\d]*.0/;

    qsa(".es-contrast-grid__contrast-ratio", this).forEach((ratio) => {
      let value = ratio.textContent;
      if (twoDecimals.exec(value) === null) {
        return;
      }

      value = value.slice(0, -1);
      if (dotZero.exec(value) !== null) {
        value = value.slice(0, -2);
      }
      ratio.textContent = value;
    });
  }

  #setGridUiStatus() {
    const singleColor =
      this.#gridData.foregroundColors.length <= 1 &&
      this.#gridData.backgroundColors.length <= 1;

    this.#grid.classList.toggle(
      "es-contrast-grid--row-and-column-removal-disabled",
      singleColor,
    );
  }

  #reset() {
    qsa(".es-contrast-grid__content-row", this).forEach((row) => row.remove());
    qsa(".es-contrast-grid__foreground-key-cell", this).forEach((cell) =>
      cell.remove(),
    );
  }

  #generate() {
    this.#generateForegroundKey();
    this.#generateContentRows();
    this.#addContrastToSwatches();
    this.addAccessibilityToSwatches();
    this.#setKeySwatchLabelColors();
    this.#truncateContrastDisplayValues();
    this.#setGridUiStatus();
  }

  #updateGrid(data) {
    this.#gridData = data;
    this.#showLabelsOnColumnKeys = data.backgroundColors.length > 0;
    this.#reset();
    this.#generate();
  }

  #changeTileSize(size) {
    this.#grid.style.setProperty("--swatch-size", `${size}px`);
  }
}

customElements.define("es-contrast-grid", ContrastGridElement);
