import { beforeAll, describe, expect, test } from "vitest";
import { enterColors, mountApp, qs, rowHexes, textarea } from "./app.js";

beforeAll(mountApp);

describe("dragging", () => {
  const handle = (colorset, hex) =>
    qs(`.cg-contrast-grid__key-swatch--${colorset}[data-hex="${hex}"] .cg-contrast-grid__key-swatch-drag-handle`);
  const key = (colorset, hex) => qs(`.cg-contrast-grid__key-swatch--${colorset}[data-hex="${hex}"]`);

  function drag(from, to) {
    const start = from.getBoundingClientRect();
    from.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: start.x + 5, clientY: start.y + 5 }),
    );
    document.dispatchEvent(new PointerEvent("pointermove", { clientX: to.x, clientY: to.y }));
    document.dispatchEvent(new PointerEvent("pointerup", { clientX: to.x, clientY: to.y }));
  }

  test("moves a column past the one it is dropped on", async () => {
    enterColors("#FFFFFF; White\n#FF8000; Orange\n#000000; Black\n");
    await expect.poll(rowHexes).toEqual(["#FFFFFF", "#FF8000", "#000000"]);

    const target = key("foreground", "#000000").getBoundingClientRect();
    drag(handle("foreground", "#FFFFFF"), { x: target.right - 2, y: target.top + 10 });

    expect(textarea().value).toBe("#FF8000; Orange\n#000000; Black\n#FFFFFF; White\n");
  });

  test("moves a row", () => {
    const target = key("background", "#FF8000").getBoundingClientRect();
    drag(handle("background", "#FFFFFF"), { x: target.left + 10, y: target.top + 2 });

    expect(rowHexes()).toEqual(["#FFFFFF", "#FF8000", "#000000"]);
  });

  test("leaves the order alone when dropped in place", () => {
    const before = textarea().value;
    const own = key("background", "#FFFFFF").getBoundingClientRect();
    drag(handle("background", "#FFFFFF"), { x: own.left + 10, y: own.top + own.height / 2 });

    expect(textarea().value).toBe(before);
  });
});
