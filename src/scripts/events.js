// Application-wide event bus, replacing the jQuery events that were triggered
// on `document`.
export const EVENTS = {
  colorFormValuesChanged: "escg.colorFormValuesChanged",
  tileSizeChanged: "escg.tileSizeChanged",
  removeColor: "escg.removeColor",
  columnsSorted: "escg.columnsSorted",
  rowsSorted: "escg.rowsSorted",
};

export function emit(name, ...args) {
  document.dispatchEvent(new CustomEvent(name, { detail: args }));
}

export function on(name, handler) {
  document.addEventListener(name, (event) => handler(...(event.detail ?? [])));
}
