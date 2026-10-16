import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/typography';

export type BadgeVariant = 'success' | 'warning' | 'destructive' | 'default' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const { colors } = useTheme();

  let bg = colors.surfaceSubtle;
  let text = colors.mutedForeground;
  let border = 'transparent';

  switch (variant) {
    case 'success':
      bg = colors.successBg;
      text = colors.success;
      border = colors.success;
      break;
    case 'warning':
      bg = colors.warningBg;
      text = colors.warning;
      border = colors.warning;
      break;
    case 'destructive':
      bg = colors.destructiveBg;
      text = colors.destructive;
      border = colors.destructive;
      break;
    case 'outline':
      bg = 'transparent';
      text = colors.foreground;
      border = colors.border;
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }, style]}>
      <Text style={[styles.text, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },
});

