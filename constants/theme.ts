// Zouza design system.
//
// Layout, spacing, type scale and neutrals follow the Airbnb mobile app
// (white canvas, near-black text, hairline dividers, 8/12px radii, pill
// search bar, gradient primary button). The accent is Zouza's violet brand
// scale from design/tokens.json in the zouza-ai repo (brand-500 #7255F0);
// `brand` below is the only thing to change to re-skin the accent.
// The brand mark is components/brand/ZMark.tsx — never a sparkles icon.

export const brand = {
  name: "Zouza",
  assistant: "Suzi",
  /** brand-500: the active tab, saved hearts, the Suzi orb, emphasised links. */
  primary: "#7255F0",
  /** brand-600: pressed / text-on-light accent. */
  primaryDark: "#5E3FE0",
  /** brand-100: tinted chips and icon circles. */
  primaryLight: "#EEEAFE",
  /** brand-900: dark bands and user chat bubbles. */
  primaryDeep: "#2D1F7A",
  /** Three-stop gradient used on primary buttons (Airbnb-style), brand-400 → 500 → 600. */
  gradient: ["#8B72F3", "#7255F0", "#5E3FE0"] as const,
};

export const colors = {
  // Brand
  primary: brand.primary,
  primaryDark: brand.primaryDark,
  primaryLight: brand.primaryLight,
  primaryDeep: brand.primaryDeep,

  // Canvas
  white: "#FFFFFF",
  black: "#000000",
  bg: "#FFFFFF",
  bgSecondary: "#F7F7F7",
  bgTertiary: "#EBEBEB",

  // Text
  text: "#222222",
  textSecondary: "#6A6A6A",
  textTertiary: "#B0B0B0",
  textInverse: "#FFFFFF",

  // Lines
  border: "#DDDDDD",
  borderStrong: "#222222",
  divider: "#EBEBEB",

  // Status
  success: "#008A05",
  error: "#C13515",
  warning: "#E07912",

  // Overlays
  scrim: "rgba(0,0,0,0.5)",
  overlayPill: "rgba(34,34,34,0.65)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

// Airbnb Cereal is proprietary; the system font (SF Pro / Roboto) is used
// with Cereal's sizes, weights and tight tracking.
export const typography = {
  display: { fontSize: 32, lineHeight: 36, fontWeight: "700" as const, letterSpacing: -0.6 },
  h1: { fontSize: 26, lineHeight: 30, fontWeight: "600" as const, letterSpacing: -0.4 },
  h2: { fontSize: 22, lineHeight: 26, fontWeight: "600" as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, lineHeight: 22, fontWeight: "600" as const, letterSpacing: -0.2 },
  h4: { fontSize: 16, lineHeight: 20, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: "500" as const },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: "600" as const },
  small: { fontSize: 14, lineHeight: 18, fontWeight: "400" as const },
  smallMedium: { fontSize: 14, lineHeight: 18, fontWeight: "500" as const },
  smallBold: { fontSize: 14, lineHeight: 18, fontWeight: "600" as const },
  micro: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
  microBold: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const },
  tab: { fontSize: 10, lineHeight: 12, fontWeight: "500" as const },
};

export const shadow = {
  // Search pill / floating controls
  search: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  // Small white pills on top of photos (badges, heart)
  float: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
  // Elevated cards (profile card, host card)
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  // Sticky bars
  bar: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const layout = {
  screenPadding: 24,
  tabBarHeight: 84,
  buttonHeight: 48,
  controlHeight: 44,
};

export const theme = { brand, colors, spacing, radius, typography, shadow, layout };
export type Theme = typeof theme;
