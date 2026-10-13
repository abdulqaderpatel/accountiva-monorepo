import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/typography';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Icon Badge */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
          },
        ]}
      >
        <Icon size={28} color={colors.primary} />
      </View>

      {/* Title & Description */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {description}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {actionLabel && onAction ? (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={onAction}
            activeOpacity={0.8}
          >
            {ActionIcon && (
              <ActionIcon
                size={16}
                color={colors.primaryForeground}
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.primaryForeground },
              ]}
            >
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}

        {secondaryActionLabel && onSecondaryAction ? (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onSecondaryAction}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.foreground },
              ]}
            >
              {secondaryActionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionsContainer: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 220,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
});
