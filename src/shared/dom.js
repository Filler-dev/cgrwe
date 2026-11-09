export const qs = (selector, scope = document) => scope.querySelector(selector);

export const qsa = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];

export function delegate(root, type, selector, handler, options) {
  root.addEventListener(
    type,
    (event) => {
      const match = event.target.closest(selector);
      if (match && root.contains(match)) {
        handler(event, match);
      }
    },
    options,
  );
}

// `cancel()` drops a pending call, for when its owner goes away.
export function debounce(fn, wait) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
