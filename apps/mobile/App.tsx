import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BottomNav, ScreenType } from './src/components/BottomNav';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { InvoicesScreen } from './src/screens/InvoicesScreen';
import { CreateInvoiceScreen } from './src/screens/CreateInvoiceScreen';
import { CustomersScreen } from './src/screens/CustomersScreen';
import { ItemsScreen } from './src/screens/ItemsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { VerifyEmailScreen } from './src/screens/VerifyEmailScreen';
import { setupMobileApi } from './src/config/api';

// Initialize shared api client
setupMobileApi();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

type AuthViewType = 'login' | 'signup' | 'forgot_password' | 'reset_password' | 'verify_email';

function AppShell() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [authView, setAuthView] = useState<AuthViewType>('login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingToken, setPendingToken] = useState('');

  useEffect(() => {
    // Check for web URL query parameters when running in React Native Web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      const path = window.location.pathname;

      if (token) {
        setPendingToken(token);
        if (path.includes('reset-password')) {
          setAuthView('reset_password');
        } else {
          setAuthView('verify_email');
        }
      } else if (email) {
        setPendingEmail(email);
      }
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const linkId = 'accountiva-web-fonts';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
      }

      // Set global font family style
      const styleId = 'accountiva-font-override';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          * {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Authentication Gate
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {authView === 'login' && (
          <LoginScreen
            onNavigateToSignup={() => setAuthView('signup')}
            onNavigateToForgotPassword={() => setAuthView('forgot_password')}
            onNavigateToVerifyEmail={(email) => {
              if (email) setPendingEmail(email);
              setAuthView('verify_email');
            }}
            onSuccess={() => {}}
          />
        )}
        {authView === 'signup' && (
          <SignupScreen
            onNavigateToLogin={() => setAuthView('login')}
            onNavigateToVerifyEmail={(email) => {
              setPendingEmail(email);
              setAuthView('verify_email');
            }}
            onSuccess={() => setAuthView('login')}
          />
        )}
        {authView === 'forgot_password' && (
          <ForgotPasswordScreen
            onNavigateToLogin={() => setAuthView('login')}
            onNavigateToReset={(email) => {
              setPendingEmail(email);
              setAuthView('reset_password');
            }}
          />
        )}
        {authView === 'reset_password' && (
          <ResetPasswordScreen
            initialToken={pendingToken}
            onNavigateToLogin={() => {
              setPendingToken('');
              setAuthView('login');
            }}
          />
        )}
        {authView === 'verify_email' && (
          <VerifyEmailScreen
            initialEmail={pendingEmail}
            initialToken={pendingToken}
            onNavigateToLogin={() => {
              setPendingToken('');
              setAuthView('login');
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen onNavigate={setCurrentScreen} />;
      case 'invoices':
        return <InvoicesScreen onNavigate={setCurrentScreen} />;
      case 'create_invoice':
        return <CreateInvoiceScreen onNavigate={setCurrentScreen} />;
      case 'customers':
        return <CustomersScreen onNavigate={setCurrentScreen} />;
      case 'items':
        return <ItemsScreen onNavigate={setCurrentScreen} />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.screenContainer}>{renderScreen()}</View>
      <BottomNav currentScreen={currentScreen} onSelectScreen={setCurrentScreen} />
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded && Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
