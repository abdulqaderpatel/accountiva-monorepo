import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { toast } from '../context/FeedbackContext';
import { Mail, ArrowRight, ArrowLeft, CircleCheck } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts } from '../theme/typography';

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToReset?: (email: string) => void;
}

export function ForgotPasswordScreen({ onNavigateToLogin, onNavigateToReset }: ForgotPasswordScreenProps) {
  const { colors, isDark } = useTheme();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error('Required', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
      toast.success('Reset Link Sent', `Check ${email.trim()} for password reset instructions.`);
    } catch (err: any) {
      toast.error(
        'Request Failed',
        err.response?.data?.message || err.message || 'Failed to send reset link.'
      );
    } finally {
      setLoading(false);
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
          <Image
            source={
              isDark
                ? require('../../assets/accountiva_dark_logo.png')
                : require('../../assets/accountiva_logo.png')
            }
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>Accountiva™</Text>
          <Text style={[styles.brandSubtitle, { color: colors.mutedForeground }]}>
            {submitted
              ? 'Check your inbox for password reset instructions'
              : 'Enter your email to receive a password reset link'}
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!submitted ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email Address</Text>
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
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      Send Reset Link
                    </Text>
                    <ArrowRight size={16} color={colors.primaryForeground} />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={[styles.successIconCircle, { backgroundColor: colors.successBg }]}>
                <CircleCheck size={36} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Reset Link Sent</Text>
              <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
                We have sent instructions to{' '}
                <Text style={{ fontWeight: '700', color: colors.foreground }}>{email}</Text>. Please follow
                the link in your email to reset your password.
              </Text>

              {onNavigateToReset ? (
                <TouchableOpacity
                  onPress={() => onNavigateToReset(email)}
                  style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                    Have a reset token? Enter it here
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        {/* Back to Login Link */}
        <TouchableOpacity
          onPress={onNavigateToLogin}
          style={styles.backToLoginRow}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.backToLoginText, { color: colors.primary }]}>Back to login</Text>
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
  logoImage: {
    width: 52,
    height: 52,
    marginBottom: 10,
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
    marginTop: 20,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
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

