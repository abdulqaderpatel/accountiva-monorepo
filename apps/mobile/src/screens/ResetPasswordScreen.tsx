import React, { useState } from 'react';
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
import { Lock, Eye, EyeOff, KeyRound, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts } from '../theme/typography';

interface ResetPasswordScreenProps {
  initialToken?: string;
  onNavigateToLogin: () => void;
}

export function ResetPasswordScreen({ initialToken = '', onNavigateToLogin }: ResetPasswordScreenProps) {
  const { colors } = useTheme();
  const { resetPassword } = useAuth();

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!token.trim()) {
      Alert.alert('Required', 'Please enter your reset token');
      return;
    }

    if (!password) {
      Alert.alert('Required', 'Please enter a new password');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(password, token.trim());
      setSuccess(true);
      Alert.alert(
        'Password Reset Successful',
        'Your password has been updated. You can now sign in with your new password.',
        [{ text: 'Sign In', onPress: onNavigateToLogin }]
      );
    } catch (err: any) {
      Alert.alert(
        'Reset Failed',
        err.response?.data?.message || err.message || 'The token is invalid or has expired.'
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
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Text style={[styles.logoText, { color: colors.primaryForeground }]}>A</Text>
          </View>
          <Text style={[styles.brandTitle, { color: colors.foreground }]}>Reset Password</Text>
          <Text style={[styles.brandSubtitle, { color: colors.mutedForeground }]}>
            {success
              ? 'Password successfully updated'
              : 'Enter the reset token received in your email and choose a new password'}
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!success ? (
            <>
              {/* Token Input */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reset Token</Text>
              <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <KeyRound size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Paste reset token here"
                  placeholderTextColor={colors.mutedForeground}
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>

              {/* New Password */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 14 }]}>
                New Password
              </Text>
              <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Lock size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { color: colors.foreground }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={16} color={colors.mutedForeground} />
                  ) : (
                    <Eye size={16} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 14 }]}>
                Confirm Password
              </Text>
              <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Lock size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Repeat new password"
                  placeholderTextColor={colors.mutedForeground}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  style={[styles.input, { color: colors.foreground }]}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <EyeOff size={16} color={colors.mutedForeground} />
                  ) : (
                    <Eye size={16} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleReset}
                disabled={loading}
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      Update Password
                    </Text>
                    <ArrowRight size={16} color={colors.primaryForeground} />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={[styles.successIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <CheckCircle2 size={36} color="#10b981" />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Password Changed!</Text>
              <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
                Your account password has been updated successfully.
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
