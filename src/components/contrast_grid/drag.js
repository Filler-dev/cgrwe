import { qsa } from "../../scripts/dom.js";

const AXES = {
  column: { item: ".cg-contrast-grid__foreground-key-cell", colorset: "foreground", horizontal: true },
  row: { item: ".cg-contrast-grid__content-row", colorset: "background", horizontal: false },
};

const AUTOSCROLL_EDGE = 40;
const AUTOSCROLL_STEP = 12;

// Scrolls while the pointer is near the edge, so a color can be dragged past the visible part.
function autoScroll(scroller, event, horizontal) {
  const box = scroller.getBoundingClientRect();
  const [position, start, end] = horizontal
    ? [event.clientX, box.left, box.right]
    : [event.clientY, box.top, box.bottom];

  if (position < start + AUTOSCROLL_EDGE) {
    scroller.scrollBy(horizontal ? -AUTOSCROLL_STEP : 0, horizontal ? 0 : -AUTOSCROLL_STEP);
  } else if (position > end - AUTOSCROLL_EDGE) {
    scroller.scrollBy(horizontal ? AUTOSCROLL_STEP : 0, horizontal ? 0 : AUTOSCROLL_STEP);
  }
}

// Moves the key along with the pointer; the tiles follow once the caller rebuilds the grid on drop.
function drag(item, axis, scroller, onDrop) {
  const siblings = () => [...item.parentElement.children];
  const startIndex = siblings().indexOf(item);
  item.classList.add("cg-contrast-grid__dragged");

  const onMove = (event) => {
    const position = axis.horizontal ? event.clientX : event.clientY;
    const others = qsa(`:scope > ${axis.item}`, item.parentElement).filter(
      (other) => other !== item,
    );
    const next = others.find((other) => {
      const box = other.getBoundingClientRect();
      return position < (axis.horizontal ? box.left + box.width / 2 : box.top + box.height / 2);
    });

    if (next && item.nextElementSibling !== next) {
      next.before(item);
    } else if (!next && others.length && item.previousElementSibling !== others.at(-1)) {
      others.at(-1).after(item);
    }

    autoScroll(scroller, event, axis.horizontal);
  };

  const onEnd = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onEnd);
    document.removeEventListener("pointercancel", onEnd);
    item.classList.remove("cg-contrast-grid__dragged");

    if (siblings().indexOf(item) !== startIndex) {
      onDrop(axis.colorset);
    }
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onEnd);
  document.addEventListener("pointercancel", onEnd);
}

// Calls `onDrop(colorset)` once a column or row has been dropped at a new place.
export function enableDragging(root, scroller, onDrop) {
  root.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest(".cg-contrast-grid__key-swatch-drag-handle");
    if (!handle || event.button !== 0) {
      return;
    }

    const axis = handle.classList.contains("cg-contrast-grid__key-swatch-drag-handle--column")
      ? AXES.column
      : AXES.row;

    // Stops text selection while dragging.
    event.preventDefault();
    drag(handle.closest(axis.item), axis, scroller, onDrop);
  });
}
