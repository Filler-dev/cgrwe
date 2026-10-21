import { beforeAll, describe, expect, test } from "vitest";
import { enterColors, mountApp, qs, qsa, rowHexes, textarea, tile, tileElement } from "./app.js";

beforeAll(mountApp);

describe("contrast grid", () => {
  test("renders the default palette", () => {
    expect(rowHexes()).toHaveLength(8);
    expect(tile("#FFFFFF", "#767676")).toEqual({ ratio: "4.54", level: "AA", visible: true });
    expect(tile("#000000", "#FFFFFF")).toEqual({ ratio: "21", level: "AAA", visible: true });
  });

  test("accepts any CSS format and shows the label", async () => {
    enterColors("hsl(30 100% 50%); Orange\nrgb(0, 0, 0); Black, deep\n#FFF\n");

    await expect.poll(rowHexes).toEqual(["#FF8000", "#000000", "#FFFFFF"]);
    expect(
      qs(".cg-contrast-grid__key-swatch--background .cg-contrast-grid__key-swatch-label-text").textContent,
    ).toBe("Orange");
    expect(tile("#FFFFFF", "#FF8000")).toMatchObject({ ratio: "2.51", level: "Fail" });
  });

  test("keeps the notation when a color is removed", async () => {
    enterColors("hsl(30 100% 50%); Orange\nrgb(0, 0, 0); Black, deep\n#FFF\n");
    await expect.poll(rowHexes).toHaveLength(3);

    qs('.cg-contrast-grid__key-swatch--background[data-hex="#FFFFFF"] .cg-contrast-grid__key-swatch-remove').click();

    expect(textarea().value).toBe("hsl(30 100% 50%); Orange\nrgb(0, 0, 0); Black, deep\n");
    expect(rowHexes()).toEqual(["#FF8000", "#000000"]);
  });

  test("hides a level when its filter is unchecked", async () => {
    enterColors("#FFFFFF\n#FF8000\n#000000\n");
    await expect.poll(rowHexes).toHaveLength(3);

    const failFilter = qs("#cg-color-form__show-contrast--fail");
    failFilter.click();
    expect(tile("#FFFFFF", "#FF8000")).toMatchObject({ level: "Fail", visible: false });
    expect(tile("#000000", "#FF8000")).toMatchObject({ level: "AAA", visible: true });

    failFilter.click();
    expect(tile("#FFFFFF", "#FF8000").visible).toBe(true);
  });

  test("labels a color in black or white, whichever contrasts more", async () => {
    // #767676 has 4.54:1 with white but 4.62:1 with black.
    enterColors("#767676\n#000000\n");
    await expect.poll(rowHexes).toEqual(["#767676", "#000000"]);

    const dark = (element) => element.classList.contains("cg-contrast-grid--dark-label");
    expect(dark(qs('.cg-contrast-grid__key-swatch--background[data-hex="#767676"]'))).toBe(true);
    expect(dark(tileElement("#767676", "#000000"))).toBe(true);
    expect(dark(tileElement("#000000", "#767676"))).toBe(false);
  });
});

describe("keyboard access", () => {
  test("reaches the hidden controls and shows them on focus", async () => {
    enterColors("#FFFFFF\n#FF8000\n");
    await expect.poll(rowHexes).toHaveLength(2);

    const controls = qs(".cg-contrast-grid__key-swatch--foreground .cg-contrast-grid__key-swatch-controls");
    expect(getComputedStyle(controls).opacity).toBe("0");

    qs(".cg-contrast-grid__key-swatch-copy", controls).focus();
    expect(document.activeElement.classList).toContain("cg-contrast-grid__key-swatch-copy");
    expect(getComputedStyle(controls).opacity).toBe("1");
  });

  test("offers targets of at least 24 by 24 pixels", () => {
    for (const target of qsa(".cg-contrast-grid__key-swatch-action, .cg-contrast-grid__suggest:not([hidden])")) {
      const { width, height } = target.getBoundingClientRect();
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(24);
    }
  });
});
