/**
 * Small, forgiving readers for spoken answers ("two", "about 1,200 euros",
 * "yeah, it does", "skip that"). Deterministic and on-device; they return
 * null when unsure so Suza can ask again instead of guessing.
 */

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  a: 1, an: 1, single: 1, couple: 2,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** Reads the first number said, in digits ("1,200", "1.5k", "2m") or words ("two thousand five hundred"). */
export function spokenNumber(text: string): number | null {
  const t = text.toLowerCase().replace(/€|euros?|eur\b/g, " ");
  const digits = t.match(/(\d[\d,.]*)\s*(k|thousand|m|million)?\b/);
  if (digits) {
    let n = Number(digits[1].replace(/,/g, "").replace(/\.(?=\d{3}\b)/g, ""));
    if (Number.isNaN(n)) return null;
    const unit = digits[2];
    if (unit === "k" || unit === "thousand") n *= 1000;
    if (unit === "m" || unit === "million") n *= 1_000_000;
    return n;
  }
  const words = t.replace(/-/g, " ").split(/[^a-z]+/).filter(Boolean);
  let total = 0;
  let current = 0;
  let seen = false;
  for (const w of words) {
    if (w in UNITS && !(w === "a" || w === "an") ) {
      current += UNITS[w];
      seen = true;
    } else if ((w === "a" || w === "an") && !seen) {
      continue; // "a" only counts before hundred/thousand: "a thousand"
    } else if (w in TENS) {
      current += TENS[w];
      seen = true;
    } else if (w === "hundred") {
      current = (current || 1) * 100;
      seen = true;
    } else if (w === "thousand") {
      total += (current || 1) * 1000;
      current = 0;
      seen = true;
    } else if (w === "million") {
      total += (current || 1) * 1_000_000;
      current = 0;
      seen = true;
    } else if (w === "and" && seen) {
      continue;
    } else if (seen) {
      break;
    }
  }
  return seen ? total + current : null;
}

export function spokenYesNo(text: string): boolean | null {
  const t = text.toLowerCase();
  if (/\b(no|nope|nah|not|none|don't|doesn't|isn't|aren't|without)\b/.test(t)) return false;
  if (/\b(yes|yeah|yep|yup|sure|of course|it does|it is|there is|they are|allowed|included|correct|definitely|absolutely)\b/.test(t)) return true;
  return null;
}

export function spokenSkip(text: string): boolean {
  return /\b(skip|later|not sure|don't know|no idea|leave it|blank|no price)\b/i.test(text);
}

export function spokenGoOn(text: string): boolean {
  return /\b(next|continue|go on|done|ready|that's it|that is it|looks good|carry on|move on|ok|okay|yes|yeah)\b/i.test(text);
}
