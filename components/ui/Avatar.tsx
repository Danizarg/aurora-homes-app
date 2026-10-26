import { Image, StyleSheet, StyleProp, Text, View, ViewStyle } from "react-native";
import { colors, typography } from "../../constants/theme";

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Airbnb avatar: near-black circle with a white initial when there is no photo. */
export function Avatar({ name, uri, size = 48, style }: AvatarProps) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[dim, style as StyleProp<any>]} />;
  return (
    <View style={[styles.fallback, dim, style]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.text, alignItems: "center", justifyContent: "center" },
  initial: { ...typography.bodyBold, color: colors.white },
});
