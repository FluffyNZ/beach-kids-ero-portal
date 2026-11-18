// Special-sunblock details live in the existing `children.sunblock_instructions`
// text column (no schema change). The product name, when given, is kept on
// the first line as "Product: …" and the application instructions follow
// on the next line(s). Text saved before this format existed has no
// "Product:" line and reads back as instructions only, unchanged.

/** Longest "Several months" span on the Sunblock Charts page. */
export const MAX_MONTH_SPAN = 12;

export const SUNBLOCK_PRODUCT_MAX = 60;
export const SUNBLOCK_INSTRUCTIONS_MAX = 160;

const PRODUCT_PREFIX = /^Product:[ \t]*/i;

export type SunblockDetails = { product: string; instructions: string };

export function parseSunblockDetails(text: string | null | undefined): SunblockDetails {
  if (!text) return { product: "", instructions: "" };
  const [first, ...rest] = text.split("\n");
  if (PRODUCT_PREFIX.test(first)) {
    return { product: first.replace(PRODUCT_PREFIX, "").trim(), instructions: rest.join("\n").trim() };
  }
  return { product: "", instructions: text.trim() };
}

/** The value saved to `sunblock_instructions` — null when both are empty. */
export function composeSunblockDetails(product: string, instructions: string): string | null {
  const p = product.replace(/\s+/g, " ").trim();
  const i = instructions.trim();
  if (!p && !i) return null;
  if (!p) return i;
  return i ? `Product: ${p}\n${i}` : `Product: ${p}`;
}
