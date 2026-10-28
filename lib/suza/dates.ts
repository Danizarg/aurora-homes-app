import { addDays, startOfToday, toIsoDate } from "../booking/dates";

const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function monthIndex(word: string) {
  const w = word.toLowerCase().slice(0, 3);
  return months.findIndex((m) => m.startsWith(w));
}

function nextOccurrence(day: number, month: number) {
  const today = startOfToday();
  let d = new Date(today.getFullYear(), month, day);
  if (d < today) d = new Date(today.getFullYear() + 1, month, day);
  return d;
}

/**
 * "3 to 8 November", "from 3 nov until 8 nov", "next month", "asap",
 * "in January" → { dateStart, dateEnd? } as ISO dates. Null when nothing
 * date-like was said. Deliberately conservative: a wrong date is worse than
 * asking again.
 */
export function parseDateRange(text: string): { dateStart: string; dateEnd?: string } | null {
  const t = text.toLowerCase();
  const today = startOfToday();

  if (/\b(asap|as soon as possible|right away|immediately|now)\b/.test(t)) return { dateStart: toIsoDate(today) };
  if (/\bnext week\b/.test(t)) return { dateStart: toIsoDate(addDays(today, 7)) };
  if (/\bnext month\b/.test(t)) {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return { dateStart: toIsoDate(d) };
  }

  const range = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?([a-z]{3,9})?\s*(?:to|until|till|-|–|through)\s*(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?([a-z]{3,9})\b/);
  if (range) {
    const m2 = monthIndex(range[4]);
    const m1 = range[2] ? monthIndex(range[2]) : m2;
    if (m1 >= 0 && m2 >= 0) {
      const start = nextOccurrence(Number(range[1]), m1);
      let end = new Date(start.getFullYear(), m2, Number(range[3]));
      if (end < start) end = new Date(start.getFullYear() + 1, m2, Number(range[3]));
      return { dateStart: toIsoDate(start), dateEnd: toIsoDate(end) };
    }
  }

  const single = t.match(/\b(?:from|on|in|starting)?\s*(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?([a-z]{3,9})\b/);
  if (single) {
    const m = monthIndex(single[2]);
    if (m >= 0 && Number(single[1]) >= 1 && Number(single[1]) <= 31) return { dateStart: toIsoDate(nextOccurrence(Number(single[1]), m)) };
  }

  const monthOnly = t.match(/\b(?:in|from|for)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (monthOnly) {
    const m = monthIndex(monthOnly[1]);
    return { dateStart: toIsoDate(nextOccurrence(1, m)) };
  }
  return null;
}
