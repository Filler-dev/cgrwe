// A line that starts with a hex color; the `#` is left out of the address and restored on load.
const HEX_LINE = /^([ \t]*)#?(?=(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})[ \t]*(?:;|$))/gim;

// `;`, `,` and spaces are legal in a query, so only what must be escaped is.
function encode(text) {
  return encodeURIComponent(text)
    .replace(/%3B/g, ";")
    .replace(/%2C/g, ",")
    .replace(/%20/g, "+");
}

const encodeList = (text) => encode(text.replace(HEX_LINE, "$1"));

// `background` is empty while one list serves both axes; `tileSize` is null at its default.
export function toQuery({ background, foreground, tileSize, hidden }) {
  const parts = [];

  if (background) {
    parts.push("bg=" + encodeList(background));
  }
  parts.push("fg=" + encodeList(foreground));
  if (tileSize !== null) {
    parts.push("size=" + tileSize);
  }
  if (hidden.length > 0) {
    parts.push("hide=" + hidden.join(","));
  }

  return "?" + parts.join("&");
}

// Missing values are null, so the form keeps its defaults.
export function fromQuery(search) {
  const params = new URLSearchParams(search);
  const list = (name) => params.get(name)?.replace(HEX_LINE, "$1#") ?? null;

  return {
    background: list("bg"),
    foreground: list("fg"),
    tileSize: params.get("size"),
    hidden: params.get("hide")?.split(",") ?? [],
  };
}
