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
import { toast, confirm } from '../context/FeedbackContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts } from '../theme/typography';
import { GoogleIcon } from '../components/ui/GoogleIcon';

interface LoginScreenProps {
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onNavigateToVerifyEmail: (email?: string) => void;
  onSuccess: () => void;
}

export function LoginScreen({
  onNavigateToSignup,
  onNavigateToForgotPassword,
  onNavigateToVerifyEmail,
  onSuccess,
}: LoginScreenProps) {
  const { colors, isDark } = useTheme();
  const { login, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setSocialLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res) {
        toast.success('Welcome back!', 'Signed in successfully.');
        onSuccess();
      }
    } catch (err: any) {
      toast.error('Google Sign In Failed', err.response?.data?.message || err.message || 'Could not sign in with Google');
    } finally {
      setSocialLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error('Required', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!', 'Signed in successfully.');
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || '';
      const code = err.response?.data?.code || err.code || '';

      if (code === 'EMAIL_NOT_VERIFIED' || message.includes('EMAIL_NOT_VERIFIED') || message.toLowerCase().includes('verify')) {
        confirm({
          title: 'Verification Required',
          message: 'Please verify your email address to continue.',
          confirmText: 'Verify Email',
          icon: 'alert',
          onConfirm: () => onNavigateToVerifyEmail(email.trim()),
        });
        return;
      }

      toast.error('Sign In Failed', message || 'Please check your credentials.');
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
            Sign in to access your financial dashboard
          </Text>
        </View>

        {/* Input Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Google Sign In */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={socialLoading || loading}
            style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            activeOpacity={0.8}
          >
            {socialLoading ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <>
                <GoogleIcon size={18} />
                <Text style={[styles.socialBtnText, { color: colors.foreground }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or continue with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

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

          <View style={styles.passwordLabelRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Password
            </Text>
            <TouchableOpacity onPress={onNavigateToForgotPassword} activeOpacity={0.7}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Lock size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Enter your password"
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

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <>
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
                <ArrowRight size={16} color={colors.primaryForeground} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Don't have an account?</Text>
          <TouchableOpacity onPress={onNavigateToSignup}>
            <Text style={[styles.linkText, { color: colors.primary }]}> Sign up</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
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
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.display,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
