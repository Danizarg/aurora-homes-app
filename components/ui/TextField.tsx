import { Platform, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, motion, radius, spacing, typography } from "../../constants/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  helper?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

/**
 * Airbnb-style input: a 1px-bordered box with the label floating inside above
 * the value. Focus fades a near-black ring in over the border.
 */
export function TextField({ label, helper, error, containerStyle, style, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  // The ring is drawn over the box rather than by thickening its border, so
  // focusing a field never changes its size and nudges everything below it.
  const focus = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({ opacity: focus.get() }));
  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={[styles.box, error ? styles.boxError : null, multiline && styles.boxMultiline]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => {
            focus.set(withTiming(1, { duration: motion.quick }));
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.set(withTiming(0, { duration: motion.quick }));
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
        <Animated.View pointerEvents="none" style={[styles.ring, error ? styles.ringError : null, ringStyle]} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.white,
    minHeight: 56,
    justifyContent: "center",
  },
  boxError: { borderColor: colors.error },
  boxMultiline: { minHeight: 120 },
  // Sits on the box's own 1px border and reaches 1px inside it: a 2px ring with no change in layout.
  ring: { position: "absolute", top: -1, right: -1, bottom: -1, left: -1, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.text },
  ringError: { borderColor: colors.error },
  label: { ...typography.micro, color: colors.textSecondary },
  input: { ...typography.body, color: colors.text, paddingVertical: 0, marginTop: 2, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  helper: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.xs },
  error: { ...typography.micro, color: colors.error, marginTop: spacing.xs },
});
