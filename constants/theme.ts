// Zouza design system v2 (violet) — mirrors design/tokens.json in the
// zouza-ai repo hex for hex. One accent (brand), one cool neutral system.
// Change tokens there and here together.

export const colors = {
  // Brand scale (from #7255F0)
  brand50: "#F4F1FE",
  brand100: "#EEEAFE",
  brand200: "#DCD4FC",
  brand300: "#C1B3F9",
  brand400: "#9C86F5",
  /** Primary: buttons, selected borders, links, the Suzi orb. */
  brand500: "#7255F0",
  brand600: "#5E3FE0",
  brand700: "#4B2FC4",
  brand800: "#3B259C",
  /** Dark: bands, chat headers, user bubbles. */
  brand900: "#2D1F7A",
  brand950: "#231760",

  // Neutrals (violet-tinted)
  /** Page background. */
  paper: "#FAF9FC",
  /** Alternating band, AI bubbles, neutral chips, image placeholders. */
  paper2: "#F2F0F7",
  /** Cards, inputs. */
  white: "#FFFFFF",
  /** Decorative hairlines and card edges. */
  border: "#E6E3EF",
  /** Input and checkbox boundaries (3.17:1). */
  borderStrong: "#8F8AA6",
  /** Headings, primary text (14.67:1). */
  ink: "#24223A",
  /** Labels, card titles, body in chat bubbles. */
  ink2: "#3A3850",
  /** Secondary body text, eyebrows (5.13:1). */
  muted: "#6A6880",
  /** Placeholders and captions. */
  muted2: "#747286",
  /** Decorative icons and dividers only — never text. */
  faint: "#9896A8",

  success: "#2E7D5B",
  danger: "#B4453D",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** v2 radius scale: controls 8, cards 12, large cards 16. */
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700" as const },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: "700" as const },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: "700" as const },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: "600" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: "600" as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: "600" as const },
};

/** Ink-tinted shadows (rgba 36 34 58), as shadow-card / shadow-lift on the web. */
export const shadow = {
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 4,
  },
  soft: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  float: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const theme = { colors, spacing, radius, typography, shadow };
export type Theme = typeof theme;
