import { vi } from "vitest";
import "../../src/styles/project.css";
import "../../src/components/icon/icon.js";
import "../../src/components/contrast_grid/contrast_grid.js";
import "../../src/components/color_form/color_form.js";
import colorForm from "../../src/components/color_form/color_form.html?raw";
import contrastGrid from "../../src/components/contrast_grid/contrast_grid.html?raw";

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
export const textarea = () => qs("#cg-color-form__foreground-colors");

// Once per test file: each element registers document-wide listeners on connect.
export function mountApp() {
  // The form mirrors its state into the URL, which would navigate the test frame.
  vi.spyOn(history, "replaceState").mockImplementation(() => {});

  // As in the built page, where the markup is written in before the scripts run.
  document.body.innerHTML =
    `<cg-color-form>${colorForm}</cg-color-form><cg-contrast-grid>${contrastGrid}</cg-contrast-grid>`;
  qs("cg-color-form").start();
}

export function enterColors(text) {
  textarea().value = text;
  textarea().dispatchEvent(new Event("input"));
}

export function rowHexes() {
  return qsa(".cg-contrast-grid__key-swatch--background").map((s) => s.dataset.hex);
}

export function tileElement(background, foreground) {
  return qs(
    `.cg-contrast-grid__tile[data-background="${background}"][data-foreground="${foreground}"]`,
  );
}

export function tile(background, foreground) {
  const element = tileElement(background, foreground);
  return {
    ratio: qs(".cg-contrast-grid__contrast-ratio", element).textContent,
    level: qs(".cg-contrast-grid__level-badge", element).textContent,
    visible: element.style.display !== "none",
  };
}
