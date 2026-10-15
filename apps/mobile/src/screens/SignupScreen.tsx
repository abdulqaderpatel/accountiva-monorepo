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
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts } from '../theme/typography';
import { GoogleIcon } from '../components/ui/GoogleIcon';

interface SignupScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToVerifyEmail?: (email: string) => void;
  onSuccess: () => void;
}

export function SignupScreen({ onNavigateToLogin, onNavigateToVerifyEmail, onSuccess }: SignupScreenProps) {
  const { colors, isDark } = useTheme();
  const { signup, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setSocialLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res) {
        toast.success('Welcome!', 'Signed up with Google successfully.');
        onSuccess();
      }
    } catch (err: any) {
      toast.error('Google Sign Up Failed', err.response?.data?.message || err.message || 'Could not sign up with Google');
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      toast.error('Required', 'Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      toast.error('Weak Password', 'Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mismatch', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signup(fullName.trim(), email.trim(), password);
      confirm({
        title: 'Account Created',
        message: 'Your account has been registered! Please check your email to verify your account.',
        confirmText: 'Verify Email',
        cancelText: 'Sign In',
        icon: 'check',
        onConfirm: () => {
          if (onNavigateToVerifyEmail) {
            onNavigateToVerifyEmail(email.trim());
          } else {
            onNavigateToLogin();
          }
        },
        onCancel: onNavigateToLogin,
      });
    } catch (err: any) {
      toast.error('Sign Up Failed', err.response?.data?.message || err.message || 'Could not register account.');
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
            Join Accountiva to start managing your invoicing
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
                <Text style={[styles.socialBtnText, { color: colors.foreground }]}>Sign up with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or sign up with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <User size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="John Doe"
              placeholderTextColor={colors.mutedForeground}
              value={fullName}
              onChangeText={setFullName}
              style={[styles.input, { color: colors.foreground }]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
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

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
            Password
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

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
            Confirm Password
          </Text>
          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Lock size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Repeat your password"
              placeholderTextColor={colors.mutedForeground}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, { color: colors.foreground }]}
            />
          </View>

          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <>
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Sign Up</Text>
                <ArrowRight size={16} color={colors.primaryForeground} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Already have an account?</Text>
          <TouchableOpacity onPress={onNavigateToLogin}>
            <Text style={[styles.linkText, { color: colors.primary }]}> Sign in</Text>
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
    marginBottom: 24,
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
