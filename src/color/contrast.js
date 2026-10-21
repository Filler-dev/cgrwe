// An sRGB channel from 0 to 1 in linear light, with the 0.04045 threshold of WCAG 2.2.
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

// One parse and no callbacks: the suggestion search calls this thousands of times per click.
export function hexToLinearRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [toLinear((n >> 16) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

function luminance(hex) {
  const [r, g, b] = hexToLinearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatioForHex(foregroundColor, backgroundColor) {
  const a = luminance(foregroundColor);
  const b = luminance(backgroundColor);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  // Floor, not round: WCAG forbids rounding up to a threshold. The epsilon absorbs float error.
  return Math.floor(((lighter + 0.05) / (darker + 0.05)) * 100 + 1e-9) / 100;
}

export function getLevel(ratio) {
  if (ratio >= 7) {
    return "AAA";
  }
  if (ratio >= 4.5) {
    return "AA";
  }
  if (ratio >= 3) {
    return "Large";
  }
  return "Fail";
}
