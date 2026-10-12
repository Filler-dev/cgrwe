import { describe, expect, test } from "vitest";
import { feedbackHref } from "../../src/scripts/feedback.js";

describe("feedbackHref", () => {
  const page = "https://example.org/?fg=FF8000;+Orange%0A&hide=fail";
  const href = feedbackHref("feedback@example.org", page);
  const params = Object.fromEntries(
    href.split("?")[1].split("&").map((pair) => pair.split("=")),
  );

  test("addresses the mail as given", () => {
    expect(href.startsWith("mailto:feedback@example.org?")).toBe(true);
  });

  test("encodes spaces as %20, not as +", () => {
    expect(params.subject).toBe("Contrast%20Grid%20%E2%80%93%20Feedback");
    expect(href).not.toContain("+");
  });

  test("puts the page address below room for the message, with CRLF line breaks", () => {
    expect(decodeURIComponent(params.body)).toBe(`\r\n\r\n\r\nPage: ${page}`);
  });

  test("escapes the & of the page address, so it cannot end the body early", () => {
    expect(href.split("&")).toHaveLength(2);
  });
});
