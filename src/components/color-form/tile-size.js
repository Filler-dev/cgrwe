// Keeps the slider and the number field in step. The limits come from the slider's markup.
export class TileSize {
  #range;
  #number;
  #min;
  #max;
  initial;

  // `onChange` gets each size the user sets, not the ones restored through `restore()`.
  constructor(range, number, onChange, options) {
    this.#range = range;
    this.#number = number;
    this.#min = Number(range.min);
    this.#max = Number(range.max);
    this.initial = Number(range.defaultValue);

    range.addEventListener("input", () => {
      this.#set(this.#normalize(range.value));
      onChange(this.size);
    }, options);

    // Clamping while typing would fight the user, so only react to a value
    // that is already in range and tidy up on blur.
    number.addEventListener("input", () => {
      const value = Number(number.value);
      if (value >= this.#min && value <= this.#max) {
        range.value = Math.round(value);
        onChange(this.size);
      }
    }, options);

    number.addEventListener("change", () => {
      this.#set(this.#normalize(number.value));
      onChange(this.size);
    }, options);
  }

  get size() {
    return this.#normalize(this.#range.value);
  }

  restore(raw) {
    this.#set(this.#normalize(raw));
  }

  #set(size) {
    this.#range.value = size;
    this.#number.value = size;
  }

  #normalize(raw) {
    const value = Number(raw);
    return Number.isFinite(value)
      ? Math.min(this.#max, Math.max(this.#min, Math.round(value)))
      : this.initial;
  }
}
