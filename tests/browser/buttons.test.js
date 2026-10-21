import { beforeAll, describe, expect, test, vi } from "vitest";
import { enterColors, mountApp, qs, qsa, rowHexes, textarea, tile, tileElement } from "./app.js";

beforeAll(mountApp);

describe("copy button", () => {
  test("copies the hex value of a color", async () => {
    enterColors("hsl(30 100% 50%); Orange\n#FFFFFF\n");
    await expect.poll(rowHexes).toEqual(["#FF8000", "#FFFFFF"]);
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();

    const button = qs('.cg-contrast-grid__key-swatch--foreground[data-hex="#FF8000"] .cg-contrast-grid__key-swatch-copy');
    button.click();

    expect(writeText).toHaveBeenCalledWith("#FF8000");
    await expect.poll(() => button.classList.contains("cg-contrast-grid__key-swatch-copy--done")).toBe(true);
    expect(qs(".cg-contrast-grid__status").textContent).toBe("Copied #FF8000");
  });
});

describe("suggestion button", () => {
  const suggestButton = (background, foreground) =>
    qs(".cg-contrast-grid__suggest", tileElement(background, foreground));

  test("adds a text color for the next level after the original", async () => {
    enterColors("#FFFFFF; White\n#FF8000; Orange\n#000000; Black\n");
    await expect.poll(rowHexes).toHaveLength(3);

    suggestButton("#FFFFFF", "#FF8000").click();
    await expect.poll(() => textarea().value).toBe(
      "#FFFFFF; White\n#FF8000; Orange\n#E97400; Orange (Large)\n#000000; Black\n",
    );
    expect(tile("#FFFFFF", "#E97400").level).toBe("Large");
  });

  test("steps on from Large without stacking the labels", async () => {
    suggestButton("#FFFFFF", "#E97400").click();

    await expect.poll(() => textarea().value).toMatch(/^#FFFFFF; White\n#FF8000; Orange\n#E97400; Orange \(Large\)\n#[0-9A-F]{6}; Orange \(AA\)\n#000000; Black\n$/);
    const aa = textarea().value.split("\n")[3].slice(0, 7);
    expect(tile("#FFFFFF", aa).level).toBe("AA");
  });

  test("is absent at AAA", () => {
    expect(suggestButton("#FFFFFF", "#000000").hidden).toBe(true);
  });

  test("is disabled when the next level is out of reach", async () => {
    enterColors("#767676\n#000000\n");
    await expect.poll(rowHexes).toEqual(["#767676", "#000000"]);

    const button = suggestButton("#767676", "#000000");
    expect(tile("#767676", "#000000").level).toBe("AA");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("AAA is out of reach on this background");

    button.click();
    expect(textarea().value).toBe("#767676\n#000000\n");
  });
});

describe("move buttons", () => {
  const moveButton = (colorset, hex, direction) =>
    qs(
      `.cg-contrast-grid__key-swatch--${colorset}[data-hex="${hex}"] .cg-contrast-grid__key-swatch-move[data-direction="${direction}"]`,
    );

  test("move a column and keep the focus on it", async () => {
    enterColors("#FFFFFF; White\n#FF8000; Orange\n#000000; Black\n");
    await expect.poll(rowHexes).toHaveLength(3);

    moveButton("foreground", "#FF8000", "right").click();

    expect(textarea().value).toBe("#FFFFFF; White\n#000000; Black\n#FF8000; Orange\n");
    expect(document.activeElement).toBe(moveButton("foreground", "#FF8000", "right"));
    expect(document.activeElement.getAttribute("aria-disabled")).toBe("true");
    expect(qs(".cg-contrast-grid__status").textContent).toBe("Orange moved to position 3 of 3");
  });

  test("move a row", () => {
    moveButton("background", "#FFFFFF", "down").click();

    expect(rowHexes()).toEqual(["#000000", "#FFFFFF", "#FF8000"]);
    expect(document.activeElement).toBe(moveButton("background", "#FFFFFF", "down"));
  });

  test("do nothing at the edge", () => {
    const up = moveButton("background", "#000000", "up");
    expect(up.getAttribute("aria-disabled")).toBe("true");

    up.click();
    expect(rowHexes()).toEqual(["#000000", "#FFFFFF", "#FF8000"]);
  });
});

describe("swap button", () => {
  const swap = () => qs(".cg-color-form__swap");
  const columnHexes = () => qsa(".cg-contrast-grid__key-swatch--foreground").map((s) => s.dataset.hex);
  const rows = () => qs("#cg-color-form__background-colors");

  test("is hidden while rows and columns share one list", () => {
    expect(swap().offsetParent).toBeNull();
  });

  test("swaps rows and columns", async () => {
    qs(".cg-color-form__use-separate-lists").click();
    expect(swap().offsetParent).not.toBeNull();

    rows().value = "#000000; Black\n";
    enterColors("#FFFFFF; White\n#FF8000; Orange\n");
    await expect.poll(rowHexes).toEqual(["#000000"]);
    expect(columnHexes()).toEqual(["#FFFFFF", "#FF8000"]);

    swap().click();

    expect(rows().value).toBe("#FFFFFF; White\n#FF8000; Orange\n");
    expect(textarea().value).toBe("#000000; Black\n");
    expect(columnHexes()).toEqual(["#000000"]);
    expect(rowHexes()).toEqual(["#FFFFFF", "#FF8000"]);

    qs(".cg-color-form__use-one-list").click();
  });
});
