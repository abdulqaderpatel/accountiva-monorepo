import { Platform } from 'react-native';

export const fonts = {
  regular: Platform.select({
    web: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    default: 'PlusJakartaSans_400Regular',
  }),
  medium: Platform.select({
    web: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    default: 'PlusJakartaSans_500Medium',
  }),
  semiBold: Platform.select({
    web: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    default: 'PlusJakartaSans_600SemiBold',
  }),
  bold: Platform.select({
    web: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    default: 'PlusJakartaSans_700Bold',
  }),
  extraBold: Platform.select({
    web: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    default: 'PlusJakartaSans_800ExtraBold',
  }),
  display: Platform.select({
    web: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    default: 'Outfit_700Bold',
  }),
  mono: Platform.select({
    web: "monospace, Courier",
    default: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  }),
};

