import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Mail, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts } from '../theme/typography';

interface VerifyEmailScreenProps {
  initialEmail?: string;
  initialToken?: string;
  onNavigateToLogin: () => void;
}

export function VerifyEmailScreen({
  initialEmail = '',
  initialToken = '',
  onNavigateToLogin,
}: VerifyEmailScreenProps) {
  const { colors } = useTheme();
  const { verifyEmail, resendVerification } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    initialToken ? 'loading' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (initialToken) {
      handleVerify(initialToken);
    }
  }, [initialToken]);

  const handleVerify = async (tokenToVerify?: string) => {
    const activeToken = (tokenToVerify || token).trim();
    if (!activeToken) {
      Alert.alert('Required', 'Please enter your verification token');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    try {
      await verifyEmail(activeToken);
      setStatus('success');
      Alert.alert('Email Verified', 'Your email has been confirmed! You can now sign in to your account.', [
        { text: 'Sign In', onPress: onNavigateToLogin },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired verification token.';
      setStatus('error');
      setErrorMessage(msg);
      Alert.alert('Verification Failed', msg);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email to resend the verification link');
      return;
    }

    setResending(true);
    try {
      await resendVerification(email.trim());
      Alert.alert('Verification Sent', `A new verification link has been sent to ${email.trim()}.`);
    } catch (err: any) {
      Alert.alert(
        'Failed to Resend',
        err.response?.data?.message || err.message || 'Could not send verification email.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Branding header */}
        <View style={styles.brandingHeader}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Text style={[styles.logoText, { color: colors.primaryForeground }]}>A</Text>
          </View>
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>
            {status === 'success' ? 'Email Verified' : 'Verify Your Email'}
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.mutedForeground }]}>
            {status === 'success'
              ? 'Your account is ready to use'
              : 'Enter the verification token from your email or request a new one'}
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {status === 'loading' ? (
            <View style={styles.statusBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.foreground, marginTop: 14 }]}>
                Verifying your email...
              </Text>
            </View>
          ) : status === 'success' ? (
            <View style={styles.statusBox}>
              <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
                <CheckCircle2 size={36} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Verification Complete</Text>
              <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
                Your email has been confirmed. You can now sign in to your Accountiva dashboard.
              </Text>
              <TouchableOpacity
                onPress={onNavigateToLogin}
                style={[styles.submitBtn, { backgroundColor: colors.primary, width: '100%' }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                  Continue to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Token Input Section */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Verification Token
              </Text>
              <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  placeholder="Paste verification token here"
                  placeholderTextColor={colors.mutedForeground}
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>

              <TouchableOpacity
                onPress={() => handleVerify()}
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Confirm Token</Text>
                <ArrowRight size={16} color={colors.primaryForeground} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Resend Section */}
              <Text style={[styles.resendSectionTitle, { color: colors.foreground }]}>
                Didn't receive an email?
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 10 }]}>
                Email Address
              </Text>
              <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Mail size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="name@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>

              <TouchableOpacity
                onPress={handleResend}
                disabled={resending}
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                activeOpacity={0.8}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <>
                    <RefreshCw size={14} color={colors.foreground} style={{ marginRight: 6 }} />
                    <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                      Resend Verification Link
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Back to Login */}
        <TouchableOpacity
          onPress={onNavigateToLogin}
          style={styles.backToLoginRow}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.backToLoginText, { color: colors.primary }]}>Back to sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fonts.display,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginTop: 16,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  resendSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 42,
    marginTop: 14,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.display,
    marginBottom: 8,
  },
  successBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  backToLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  backToLoginText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

