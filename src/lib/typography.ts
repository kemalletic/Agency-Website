/**
 * Joins the last two words with a no-break space, so a heading or caption never ends on one orphaned word. One- and
 * two-word texts are left alone: there a word per line is the only way to wrap.
 */
export function noWidow(text: string): string {
  const trimmed = text.trimEnd();
  if (trimmed.trim().split(/\s+/).length < 3) return text;
  return trimmed.replace(/\s+(\S+)$/, '\u00a0$1');
}

/**
 * Splits a heading into a head and its last two words, for markup that keeps the tail on one line (a span with
 * white-space: nowrap). Headings that are split into lines or letters for animation lose no-break spaces, but keep
 * nested elements.
 */
export function widowTail(text: string): [string, string] {
  const words = text.trim().split(/\s+/);
  // Two words may not fit one line on a phone; then only the last one is held (with whatever follows it).
  const keep = words.length > 2 ? 2 : 1;
  const head = words.slice(0, -keep).join(' ');
  return [head ? `${head} ` : '', words.slice(-keep).join(' ')];
}
