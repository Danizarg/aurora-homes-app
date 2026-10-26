import Svg, { Circle, Path } from "react-native-svg";

/**
 * Z mark B ("Voice") — the one brand mark for Zouza and Suzi, identical to
 * `components/brand/z-mark.tsx` on the web and `mark` in design/tokens.json.
 * Stroke-based, so it works mono on any band: white on brand-500 (the Suzi
 * orb), brand-300 on brand-900, ink on paper. Never use a sparkles icon for
 * Zouza or Suzi.
 */
export function ZMark({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d="M14 14h32" stroke={color} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M50 14 14 50" stroke={color} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 50h22" stroke={color} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={50} cy={50} r={5.5} fill={color} />
    </Svg>
  );
}
