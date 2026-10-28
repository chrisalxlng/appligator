const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const maxCodePoint = 0x10ffff;

function decodeEntity(entity: string, name: string) {
  if (!name.startsWith("#")) return entities[name.toLowerCase()] ?? entity;

  const isHex = name[1]?.toLowerCase() === "x";
  const codePoint = Number.parseInt(name.slice(isHex ? 2 : 1), isHex ? 16 : 10);
  return codePoint <= maxCodePoint ? String.fromCodePoint(codePoint) : entity;
}

export function htmlToText(html: string) {
  return html
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/ul|\/ol|\/div)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
