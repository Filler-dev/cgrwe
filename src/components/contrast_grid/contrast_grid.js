import Sortable from "sortablejs";
import { qs, qsa, delegate } from "../../scripts/dom.js";
import { EVENTS, emit, on } from "../../scripts/events.js";
import { cssColorToHex, getContrastRatioForHex } from "./contrast.js";
import template from "./contrast_grid.html?raw";

class ContrastGridElement extends HTMLElement {
  #grid;
  #gridContent;
  #foregroundKey;
  #foregroundKeyCellTemplate;
  #contentRowTemplate;
  #contentCellTemplate;
  #showLabelsOnColumnKeys = false;
  #gridData;

  connectedCallback() {
    this.innerHTML = template;

    this.#grid = qs(".cg-contrast-grid", this);
    this.#gridContent = qs(".cg-contrast-grid__content", this);
    this.#foregroundKey = qs(".cg-contrast-grid__foreground-key", this);

    this.#takeTemplates();
    this.#bindEvents();
    this.#enableDragUi();
  }

  addAccessibilityToSwatches() {
    const shown = this.#getVisibleLevels();

    qsa(".cg-contrast-grid__swatch", this).forEach((swatch) => {
      const contrast = parseFloat(
        qs(".cg-contrast-grid__contrast-ratio", swatch).textContent,
      );

      let level = "Fail";
      if (contrast >= 7.0) {
        level = "AAA";
      } else if (contrast >= 4.5) {
        level = "AA";
      } else if (contrast >= 3.0) {
        level = "Large";
      }

      swatch.style.display = shown[level] ? "" : "none";

      const pill = qs(".cg-contrast-grid__accessibility-label", swatch);
      pill.textContent = level;
      pill.classList.add(
        "cg-contrast-grid__accessibility-label--" + level.toLowerCase(),
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

    this.#contentCellTemplate = take("cg-contrast-grid__content-cell-template");
    this.#foregroundKeyCellTemplate = take(
      "cg-contrast-grid__foreground-key-cell-template",
    );
    this.#contentRowTemplate = take("cg-contrast-grid__content-row-template");
  }

  #bindEvents() {
    on(EVENTS.colorFormValuesChanged, (data) => this.#updateGrid(data));
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
  }

  #enableDragUi() {
    const shared = {
      animation: 150,
      ghostClass: "cg-drag-placeholder",
      dragClass: "cg-drag-helper",
      fallbackOnBody: true,
    };

    // Sortable only reorders the DOM; the grid is then rebuilt from the color
    // form, which is the single source of truth.
    const broadcast = (event, colorset) =>
      setTimeout(() => emit(event, this.#extractColors(colorset)), 0);

    Sortable.create(this.#gridContent, {
      ...shared,
      direction: "vertical",
      draggable: ".cg-contrast-grid__content-row",
      handle: ".cg-contrast-grid__key-swatch-drag-handle--row",
      onEnd: () => broadcast(EVENTS.rowsSorted, "background"),
    });

    Sortable.create(this.#foregroundKey, {
      ...shared,
      direction: "horizontal",
      draggable: ".cg-contrast-grid__foreground-key-cell",
      handle: ".cg-contrast-grid__key-swatch-drag-handle--column",
      onEnd: () => broadcast(EVENTS.columnsSorted, "foreground"),
    });
  }

  #extractColors(colorset) {
    return qsa(`.cg-contrast-grid__key-swatch--${colorset}`, this).map(
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

    const removeAction = qs(".cg-contrast-grid__key-swatch-remove", swatch);
    removeAction.dataset.hex = hex;
    removeAction.dataset.colorset = colorset;

    return {
      text: qs(".cg-contrast-grid__key-swatch-label-text", swatch),
      hex: qs(".cg-contrast-grid__key-swatch-label-hex", swatch),
    };
  }

  #generateForegroundKey() {
    for (const color of this.#getForegroundColors()) {
      const cell = this.#foregroundKeyCellTemplate.cloneNode(true);
      const swatch = qs(".cg-contrast-grid__key-swatch", cell);
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
      const swatch = qs(".cg-contrast-grid__key-swatch", row);
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
          spacer.className = "cg-contrast-grid__swatch-spacer";
          cell.replaceChildren(spacer);
        } else {
          const tile = qs(".cg-contrast-grid__swatch", cell);
          tile.style.backgroundColor = background.hex;
          tile.style.color = foreground.hex;
        }

        row.append(cell);
      }

      this.#gridContent.append(row);
    }
  }

  #getVisibleLevels() {
    const group = qs(".cg-color-form__checkbox-group");

    return {
      AAA: !!qs("#cg-color-form__show-contrast--aaa:checked", group),
      AA: !!qs("#cg-color-form__show-contrast--aa:checked", group),
      Large: !!qs("#cg-color-form__show-contrast--large:checked", group),
      Fail: !!qs("#cg-color-form__show-contrast--fail:checked", group),
    };
  }

  #markDarkLabel(element, backgroundColor) {
    const contrastWithWhite = getContrastRatioForHex("#FFFFFF", backgroundColor);

    if (contrastWithWhite === 1) {
      element.classList.add(
        "cg-contrast-grid--bordered-swatch",
        "cg-contrast-grid--dark-label",
      );
    } else if (contrastWithWhite < 4.0) {
      element.classList.add("cg-contrast-grid--dark-label");
    }
  }

  #addContrastToSwatches() {
    qsa(".cg-contrast-grid__swatch", this).forEach((swatch) => {
      const styles = getComputedStyle(swatch);
      const backgroundColor = cssColorToHex(styles.backgroundColor);

      qs(".cg-contrast-grid__contrast-ratio", swatch).textContent =
        getContrastRatioForHex(cssColorToHex(styles.color), backgroundColor);

      this.#markDarkLabel(swatch, backgroundColor);
    });
  }

  #setKeySwatchLabelColors() {
    qsa(".cg-contrast-grid__key-swatch", this).forEach((swatch) =>
      this.#markDarkLabel(
        swatch,
        cssColorToHex(getComputedStyle(swatch).backgroundColor),
      ),
    );
  }

  #setGridUiStatus() {
    const singleColor =
      this.#gridData.foregroundColors.length <= 1 &&
      this.#gridData.backgroundColors.length <= 1;

    this.#grid.classList.toggle(
      "cg-contrast-grid--row-and-column-removal-disabled",
      singleColor,
    );
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
    this.#addContrastToSwatches();
    this.addAccessibilityToSwatches();
    this.#setKeySwatchLabelColors();
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

customElements.define("cg-contrast-grid", ContrastGridElement);
