export const EVENTS = {
  colorsChanged: "cg.colorsChanged",
  hiddenLevelsChanged: "cg.hiddenLevelsChanged",
  tileSizeChanged: "cg.tileSizeChanged",
  removeColor: "cg.removeColor",
  suggestColor: "cg.suggestColor",
  foregroundSorted: "cg.foregroundSorted",
  backgroundSorted: "cg.backgroundSorted",
};

export function emit(name, ...args) {
  document.dispatchEvent(new CustomEvent(name, { detail: args }));
}

export function on(name, handler) {
  document.addEventListener(name, (event) => handler(...(event.detail ?? [])));
}
