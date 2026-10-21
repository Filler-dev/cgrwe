const MAX_QUOTED_LENGTH = 40;

function quote(text) {
  const code = document.createElement("code");
  code.textContent =
    text.length > MAX_QUOTED_LENGTH ? text.slice(0, MAX_QUOTED_LENGTH - 1) + "…" : text;
  return code;
}

const listLines = (lines) => `${lines.slice(0, -1).join(", ")} and ${lines.at(-1)}`;

// Nodes rather than HTML, as the quoted lines are user input.
export function describeLineProblems(invalid, duplicates) {
  const parts = [];

  if (invalid.length === 1) {
    parts.push(`Line ${invalid[0].line} is not a valid color: `, quote(invalid[0].text), ".");
  } else if (invalid.length > 1) {
    parts.push(`Lines ${listLines(invalid.map((entry) => entry.line))} are not valid colors.`);
  }

  const fix = invalid.find((entry) => entry.fix)?.fix;
  if (fix) {
    parts.push(" Separate the label with a semicolon: ", quote(fix), ".");
  }

  const gap = parts.length > 0 ? " " : "";
  if (duplicates.length === 1) {
    parts.push(`${gap}Line ${duplicates[0].line} repeats line ${duplicates[0].first}.`);
  } else if (duplicates.length > 1) {
    parts.push(`${gap}Lines ${listLines(duplicates.map((entry) => entry.line))} repeat earlier colors.`);
  }

  return parts;
}
