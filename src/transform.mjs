function linesOf(input) {
  return String(input ?? '').replace(/\r\n/g, '\n').split('\n');
}

export function trimLines(input) {
  return linesOf(input).map((line) => line.trim()).join('\n');
}

export function collapseWhitespace(input) {
  return linesOf(input)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

export function removeDuplicateLines(input) {
  const seen = new Set();
  return linesOf(input).filter((line) => {
    const key = line.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join('\n');
}

export function sortLines(input) {
  return linesOf(input)
    .filter((line) => line.length > 0)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .join('\n');
}

export function prettyJson(input) {
  return JSON.stringify(JSON.parse(String(input ?? '')), null, 2);
}

export function titleCase(input) {
  return String(input ?? '').toLocaleLowerCase().replace(/(^|[\s_-])([\p{L}\p{N}])/gu, (_match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase()}`);
}
