import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.75,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [opacityAnim]);

  const baseBg = isDark ? '#27272a' : '#e4e4e7';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseBg,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonCard: Renders a skeleton placeholder matching list card layouts
 * (Left avatar/icon, title, subtitle, and right-side amount/badge)
 */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <Skeleton width={38} height={38} borderRadius={10} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="65%" height={14} borderRadius={4} />
          <Skeleton width="45%" height={11} borderRadius={4} />
        </View>
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

/**
 * SkeletonList: Renders multiple skeleton cards for screen loading states
 */
export function SkeletonList({ count = 4, style }: { count?: number; style?: ViewStyle }) {
  return (
    <View style={[styles.listContainer, style]}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </View>
  );
}

/**
 * SkeletonCustomFields: Renders field placeholders for CustomFieldRenderer load state
 */
export function SkeletonCustomFields({ count = 2 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 12, marginVertical: 6 }}>
      {/* Header shimmer */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Skeleton width={110} height={14} borderRadius={4} />
        <Skeleton width={32} height={18} borderRadius={10} />
      </View>

      {/* Field shimmers */}
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={{ gap: 6 }}>
          <Skeleton width={90} height={12} borderRadius={4} />
          <Skeleton width="100%" height={44} borderRadius={10} />
        </View>
      ))}
    </View>
  );
}

/**
 * SkeletonHero: Renders a hero metrics card placeholder (used on Dashboard / Reports)
 */
export function SkeletonHero({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: colors.card, borderColor: colors.border, padding: 20, gap: 16 },
        style,
      ]}
    >
      <View style={{ gap: 8 }}>
        <Skeleton width={100} height={13} borderRadius={4} />
        <Skeleton width={180} height={32} borderRadius={6} />
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ gap: 6 }}>
          <Skeleton width={70} height={11} borderRadius={4} />
          <Skeleton width={90} height={16} borderRadius={4} />
        </View>
        <View style={{ gap: 6 }}>
          <Skeleton width={70} height={11} borderRadius={4} />
          <Skeleton width={90} height={16} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

/**
 * SkeletonReports: Full reports page loading state
 */
export function SkeletonReports() {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 16, paddingHorizontal: 16, paddingTop: 8 }}>
      <SkeletonHero />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={[
            styles.cardContainer,
            { flex: 1, backgroundColor: colors.card, borderColor: colors.border, padding: 16, gap: 10 },
          ]}
        >
          <Skeleton width={80} height={12} borderRadius={4} />
          <Skeleton width="70%" height={22} borderRadius={6} />
          <Skeleton width={60} height={10} borderRadius={4} />
        </View>
        <View
          style={[
            styles.cardContainer,
            { flex: 1, backgroundColor: colors.card, borderColor: colors.border, padding: 16, gap: 10 },
          ]}
        >
          <Skeleton width={80} height={12} borderRadius={4} />
          <Skeleton width="70%" height={22} borderRadius={6} />
          <Skeleton width={60} height={10} borderRadius={4} />
        </View>
      </View>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  cardContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
