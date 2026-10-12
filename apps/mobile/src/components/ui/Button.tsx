import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: ButtonVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
}: ButtonProps) {
  const { colors } = useTheme();

  let bg = colors.primary;
  let text = colors.primaryForeground;
  let border = 'transparent';

  switch (variant) {
    case 'secondary':
      bg = colors.surfaceSubtle;
      text = colors.foreground;
      border = colors.border;
      break;
    case 'outline':
      bg = 'transparent';
      text = colors.foreground;
      border = colors.border;
      break;
    case 'ghost':
      bg = 'transparent';
      text = colors.foreground;
      border = 'transparent';
      break;
    case 'destructive':
      bg = colors.destructive;
      text = '#ffffff';
      border = 'transparent';
      break;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: text }, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // native mobile touch target standard
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
