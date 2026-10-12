import { describe, expect, test } from "vitest";
import { fromQuery, toQuery } from "../../src/components/color_form/query.js";

const shared = { background: "", foreground: "#FFFFFF; White\n#101114; Black\n", tileSize: null, hidden: [] };

describe("toQuery", () => {
  test("writes a shared list as fg only, with neither # nor escaped ; and spaces", () => {
    expect(toQuery(shared)).toBe("?fg=FFFFFF;+White%0A101114;+Black%0A");
  });

  test("adds bg, size and hide only when they differ from the default", () => {
    expect(toQuery({ ...shared, background: "#F7F7F8; Grey 100", tileSize: 118, hidden: ["large", "fail"] })).toBe(
      "?bg=F7F7F8;+Grey+100&fg=FFFFFF;+White%0A101114;+Black%0A&size=118&hide=large,fail",
    );
  });

  test("keeps the # of a hex that is not the whole color, and escapes what a query cannot hold", () => {
    expect(toQuery({ ...shared, foreground: "#FFF\n#FF8000FF; A+B\nrgb(0, 0, 0); #1 & more" })).toBe(
      "?fg=FFF%0AFF8000FF;+A%2BB%0Argb(0,+0,+0);+%231+%26+more",
    );
  });
});

describe("fromQuery", () => {
  test("restores the # and the text as typed", () => {
    expect(fromQuery("?bg=F7F7F8;+Grey+100&fg=FFF%0A++abc;+x%0Argb(0,+0,+0);+%231&size=118&hide=large,fail")).toEqual({
      background: "#F7F7F8; Grey 100",
      foreground: "#FFF\n  #abc; x\nrgb(0, 0, 0); #1",
      tileSize: "118",
      hidden: ["large", "fail"],
    });
  });

  test("returns null for what is missing, so the form keeps its defaults", () => {
    expect(fromQuery("")).toEqual({ background: null, foreground: null, tileSize: null, hidden: [] });
  });

  test("reads back what toQuery writes", () => {
    const state = { background: "#F7F7F8; Grey 100\n", foreground: "#FFFFFF; White, bright\nnope\n", tileSize: "45", hidden: ["aaa"] };
    expect(fromQuery(toQuery(state))).toEqual(state);
  });
});
