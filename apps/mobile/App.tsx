import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
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
import { FeedbackProvider } from './src/context/FeedbackContext';
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
import { EstimatesScreen } from './src/screens/EstimatesScreen';
import { CreditNotesScreen } from './src/screens/CreditNotesScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { BillsScreen } from './src/screens/BillsScreen';
import { VendorsScreen } from './src/screens/VendorsScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { isFeatureEnabled } from '@accountiva/shared';
import { setupMobileApi } from './src/config/api';

// Prevent native splash screen from hiding prematurely before fonts and auth are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

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

function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, loading, currentOrg, organizations } = useAuth();
  const queryClient = useQueryClient();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [authView, setAuthView] = useState<AuthViewType>('login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingToken, setPendingToken] = useState('');

  // Clear and invalidate query cache when switching organizations to ensure strict workspace data isolation
  const prevOrgIdRef = React.useRef<string | null | undefined>(currentOrg?.id);
  useEffect(() => {
    if (prevOrgIdRef.current !== undefined && prevOrgIdRef.current !== currentOrg?.id) {
      queryClient.clear();
      queryClient.invalidateQueries();
      setCurrentScreen('dashboard');
    }
    prevOrgIdRef.current = currentOrg?.id;
  }, [currentOrg?.id, queryClient]);

  useEffect(() => {
    const handleUrl = (urlStr: string | null) => {
      if (!urlStr) return;
      try {
        let queryString = "";
        let path = "";
        if (urlStr.includes("?")) {
          const parts = urlStr.split("?");
          path = parts[0];
          queryString = parts[1];
        } else {
          path = urlStr;
        }

        const params = new URLSearchParams(queryString);
        const token = params.get("token");
        const email = params.get("email");

        if (token) {
          setPendingToken(token);
          if (path.includes("reset-password")) {
            setAuthView("reset_password");
          } else {
            setAuthView("verify_email");
          }
        } else if (email) {
          setPendingEmail(email);
        }
      } catch (err) {
        console.error("Failed to parse deep link URL:", err);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));

    if (Platform.OS === "web" && typeof window !== "undefined") {
      handleUrl(window.location.href);
    }

    return () => {
      subscription.remove();
    };
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

  const isAppReady = fontsReady && !loading;

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppReady]);

  // Safety fallback: ensure splash screen hides even if an unexpected network delay occurs
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!isAppReady) {
    return <View style={{ flex: 1, backgroundColor: '#09090b' }} />;
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
            onSuccess={() => {}}
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

  // Onboarding Gate: If user is authenticated but has no active workspace (or all workspaces deleted)
  if (!currentOrg || organizations.length === 0) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen />
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
      case 'estimates':
        return isFeatureEnabled('estimates') ? (
          <EstimatesScreen onNavigate={setCurrentScreen} />
        ) : (
          <DashboardScreen onNavigate={setCurrentScreen} />
        );
      case 'credit_notes':
        return isFeatureEnabled('creditNotes') ? (
          <CreditNotesScreen onNavigate={setCurrentScreen} />
        ) : (
          <DashboardScreen onNavigate={setCurrentScreen} />
        );
      case 'expenses':
        return isFeatureEnabled('expenses') ? (
          <ExpensesScreen onNavigate={setCurrentScreen} />
        ) : (
          <DashboardScreen onNavigate={setCurrentScreen} />
        );
      case 'bills':
        return isFeatureEnabled('bills') ? (
          <BillsScreen onNavigate={setCurrentScreen} />
        ) : (
          <DashboardScreen onNavigate={setCurrentScreen} />
        );
      case 'vendors':
        return isFeatureEnabled('vendors') ? (
          <VendorsScreen onNavigate={setCurrentScreen} />
        ) : (
          <DashboardScreen onNavigate={setCurrentScreen} />
        );
      case 'reports':
        return isFeatureEnabled('reports') ? (
          <ReportsScreen onNavigate={setCurrentScreen} />
        ) : (
          <DashboardScreen onNavigate={setCurrentScreen} />
        );
      case 'notifications':
        return <NotificationsScreen onNavigate={setCurrentScreen} />;
      case 'settings':
        return <SettingsScreen onNavigate={setCurrentScreen} />;
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
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError || Platform.OS === 'web';

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FeedbackProvider>
            <AuthProvider>
              <AppShell fontsReady={fontsReady} />
            </AuthProvider>
          </FeedbackProvider>
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
