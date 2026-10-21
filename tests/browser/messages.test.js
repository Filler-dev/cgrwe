import { beforeAll, describe, expect, test } from "vitest";
import { describeLineProblems } from "../../src/components/color_form/line_messages.js";
import { enterColors, mountApp, qs, textarea } from "./app.js";

beforeAll(mountApp);

const asText = (parts) => parts.map((part) => (typeof part === "string" ? part : part.textContent)).join("");

describe("describeLineProblems", () => {
  test("says nothing when every line is fine", () => {
    expect(describeLineProblems([], [])).toEqual([]);
  });

  test("lists line numbers with a final and", () => {
    const invalid = [1, 3, 4].map((line) => ({ line, text: "x" }));
    expect(asText(describeLineProblems(invalid, []))).toBe("Lines 1, 3 and 4 are not valid colors.");
  });

  test("shortens a long quoted line to 40 characters", () => {
    const [, code] = describeLineProblems([{ line: 1, text: "x".repeat(60) }], []);
    expect(code.textContent).toBe("x".repeat(39) + "…");
  });
});

describe("invalid lines", () => {
  const message = () => qs("#cg-color-form__foreground-colors-error");

  test("are named below the field, with a fix for a comma label", async () => {
    enterColors("#FFFFFF; White\nrgb(255, 0, 0), Red\n");
    await expect.poll(() => message().textContent).toBe(
      "Line 2 is not a valid color: rgb(255, 0, 0), Red. Separate the label with a semicolon: rgb(255, 0, 0); Red.",
    );
    expect(textarea().getAttribute("aria-invalid")).toBe("true");
    expect(textarea().getAttribute("aria-describedby")).toBe(message().id);
  });

  test("are summed up when there are several", async () => {
    enterColors("nope\n#FFFFFF\nnah\nnever\n");
    await expect.poll(() => message().textContent).toBe("Lines 1, 3 and 4 are not valid colors.");
  });

  test("render as text, never as markup", async () => {
    enterColors('<img src=x onerror="window.__injected = true">\n');
    await expect.poll(() => message().querySelector("code")?.textContent).toMatch(/^<img src=x/);
    expect(message().querySelector("img")).toBeNull();
    expect(window.__injected).toBeUndefined();
  });

  test("stay in place, with their message, when colors are removed, moved or added", async () => {
    enterColors("#FFFFFF; White\nnope\n#FF8000; Orange\n#000000; Black\n");
    await expect.poll(() => message().textContent).toMatch(/^Line 2 /);

    qs('.cg-contrast-grid__key-swatch--background[data-hex="#000000"] .cg-contrast-grid__key-swatch-remove').click();
    expect(textarea().value).toBe("#FFFFFF; White\nnope\n#FF8000; Orange\n");

    qs('.cg-contrast-grid__key-swatch--foreground[data-hex="#FF8000"] .cg-contrast-grid__key-swatch-move[data-direction="left"]').click();
    expect(textarea().value).toBe("#FF8000; Orange\nnope\n#FFFFFF; White\n");

    qs('.cg-contrast-grid__tile[data-background="#FFFFFF"][data-foreground="#FF8000"] .cg-contrast-grid__suggest').click();
    expect(textarea().value).toBe("#FF8000; Orange\n#E97400; Orange (Large)\nnope\n#FFFFFF; White\n");
    expect(message().textContent).toMatch(/^Line 3 is not a valid color/);
  });

  test("name repeated colors without marking the field invalid", async () => {
    enterColors("#FFFFFF\n#000000\nwhite; Again\n");
    await expect.poll(() => message().textContent).toBe("Line 3 repeats line 1.");
    expect(textarea().getAttribute("aria-invalid")).toBe("false");
  });

  test("combine invalid and repeated lines in one message", async () => {
    enterColors("#FFFFFF\nnope\n#FFF\n#000\nblack\n");
    await expect.poll(() => message().textContent).toBe(
      "Line 2 is not a valid color: nope. Lines 3 and 5 repeat earlier colors.",
    );
  });

  test("clear once every line is valid", async () => {
    enterColors("#FFFFFF\n#000000\n");
    await expect.poll(() => message().textContent).toBe("");
    expect(textarea().getAttribute("aria-invalid")).toBe("false");
  });
});
