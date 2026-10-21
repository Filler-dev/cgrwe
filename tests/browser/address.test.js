import { beforeAll, describe, expect, test, vi } from "vitest";
import { enterColors, mountApp, qs, textarea } from "./app.js";

beforeAll(mountApp);

describe("address bar", () => {
  test("is replaced, not pushed, so Back leaves the page", async () => {
    const replace = vi.mocked(history.replaceState);
    const push = vi.spyOn(history, "pushState");
    enterColors("#123456\n#FFFFFF\n");
    await expect.poll(() => replace.mock.lastCall?.[2]).toContain("123456");
    expect(push).not.toHaveBeenCalled();
  });

  test("gets an edit still waiting for its debounce when the page is left", () => {
    const replace = vi.mocked(history.replaceState);
    textarea().value = "#ABCDEF\n";
    textarea().dispatchEvent(new Event("input"));
    expect(replace.mock.lastCall?.[2] ?? "").not.toContain("ABCDEF");

    window.dispatchEvent(new PageTransitionEvent("pagehide"));

    expect(replace.mock.lastCall?.[2]).toContain("ABCDEF");
  });

  test("holds a shared list as fg alone", async () => {
    const replace = vi.mocked(history.replaceState);
    enterColors("#123456; Blue\n#FFFFFF\n");
    await expect.poll(() => replace.mock.lastCall?.[2]).toBe("/?fg=123456;+Blue%0AFFFFFF%0A");
  });

  test("adds bg, size and hide once they are set", async () => {
    const replace = vi.mocked(history.replaceState);
    const size = qs("#cg-color-form__tile-size-number");
    qs(".cg-color-form__use-separate-lists").click();
    qs("#cg-color-form__background-colors").value = "#000000\n";
    enterColors("#FFFFFF\n");
    size.value = "118";
    size.dispatchEvent(new Event("change"));
    qs("#cg-color-form__show-contrast--fail").click();

    await expect.poll(() => replace.mock.lastCall?.[2]).toBe("/?bg=000000%0A&fg=FFFFFF%0A&size=118&hide=fail");

    qs("#cg-color-form__show-contrast--fail").click();
    size.value = "80";
    size.dispatchEvent(new Event("change"));
    qs(".cg-color-form__use-one-list").click();
  });

  test("is not overwritten by submitting the form with Enter", () => {
    const submit = new SubmitEvent("submit", { cancelable: true });
    qs(".cg-color-form").dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
  });
});
