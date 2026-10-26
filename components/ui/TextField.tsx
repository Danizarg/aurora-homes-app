import { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  helper?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

/**
 * Airbnb-style input: a 1px-bordered box with the label floating inside above
 * the value. Focus darkens the border to near-black.
 */
export function TextField({ label, helper, error, containerStyle, style, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={[styles.box, focused && styles.boxFocused, error ? styles.boxError : null, multiline && styles.boxMultiline]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
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
  boxFocused: { borderColor: colors.text, borderWidth: 2, paddingHorizontal: spacing.md - 1 },
  boxError: { borderColor: colors.error },
  boxMultiline: { minHeight: 120 },
  label: { ...typography.micro, color: colors.textSecondary },
  input: { ...typography.body, color: colors.text, paddingVertical: 0, marginTop: 2, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}) },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  helper: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.xs },
  error: { ...typography.micro, color: colors.error, marginTop: spacing.xs },
});
