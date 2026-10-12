export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  surfaceSubtle: string;
  surfaceMuted: string;
  surfaceRaised: string;
  border: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  destructive: string;
  destructiveBg: string;
  input: string;
}

export const lightColors: ThemeColors = {
  background: '#ffffff',
  foreground: '#09090b',
  card: '#ffffff',
  cardForeground: '#09090b',
  surfaceSubtle: '#f8fafc',
  surfaceMuted: '#f4f4f5',
  surfaceRaised: '#ffffff',
  border: '#e4e4e7',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  primary: '#18181b',
  primaryForeground: '#fafafa',
  secondary: '#f4f4f5',
  secondaryForeground: '#18181b',
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  destructive: '#ef4444',
  destructiveBg: 'rgba(239, 68, 68, 0.12)',
  input: '#e4e4e7',
};

export const darkColors: ThemeColors = {
  background: '#09090b',
  foreground: '#fafafa',
  card: '#141416',
  cardForeground: '#fafafa',
  surfaceSubtle: '#18181b',
  surfaceMuted: '#1c1c1f',
  surfaceRaised: '#222226',
  border: 'rgba(255, 255, 255, 0.1)',
  muted: '#27272a',
  mutedForeground: '#a1a1aa',
  primary: '#fafafa',
  primaryForeground: '#18181b',
  secondary: '#27272a',
  secondaryForeground: '#fafafa',
  success: '#34d399',
  successBg: 'rgba(52, 211, 153, 0.15)',
  warning: '#fbbf24',
  warningBg: 'rgba(251, 191, 36, 0.15)',
  destructive: '#f87171',
  destructiveBg: 'rgba(248, 113, 113, 0.15)',
  input: 'rgba(255, 255, 255, 0.15)',
};

