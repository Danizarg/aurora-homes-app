// Aurora Homes design system — Mediterranean / European premium palette.

export const colors = {
  ivory: "#FBF7EE",
  ivoryDeep: "#F3ECDC",
  navy: "#1B2430",
  navySoft: "#2E3A4A",
  sand: "#EFE3CB",
  sandDeep: "#E4D3AC",
  gold: "#B98F41",
  goldSoft: "#D9BD84",
  terracotta: "#BE6A45",
  terracottaSoft: "#E2A181",
  white: "#FFFFFF",
  ink: "#2A2620",
  muted: "#8A8172",
  border: "#E7DEC9",
  success: "#4C7A5E",
  error: "#B5433A",
} as const;

export const gradients = {
  hero: [colors.ivory, colors.sand] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
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

export const shadow = {
  card: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 4,
  },
  soft: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  float: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const theme = { colors, spacing, radius, typography, shadow, gradients };
export type Theme = typeof theme;
