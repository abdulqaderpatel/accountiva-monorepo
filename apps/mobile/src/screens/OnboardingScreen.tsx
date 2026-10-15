import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { toast, confirm } from '../context/FeedbackContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  LogOut,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { fonts } from '../theme/typography';

const POPULAR_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee', country: 'India' },
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar', country: 'United States' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro', country: 'Germany' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound', country: 'United Kingdom' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ) - UAE Dirham', country: 'United Arab Emirates' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$) - Canadian Dollar', country: 'Canada' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$) - Australian Dollar', country: 'Australia' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$) - Singapore Dollar', country: 'Singapore' },
];

export function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const { createOrganization, joinOrganization, logout, user } = useAuth();

  const [step, setStep] = useState<'choice' | 'create' | 'join'>('choice');
  const [orgName, setOrgName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [inviteTokenInput, setInviteTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      toast.error('Required', 'Please enter an organization name.');
      return;
    }

    setLoading(true);
    try {
      await createOrganization(orgName.trim(), currency);
      toast.success('Welcome to Accountiva!', `${orgName.trim()} created successfully.`);
    } catch (err: any) {
      toast.error(
        'Failed to Create Workspace',
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Could not create organization.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinInvite = async () => {
    const rawInput = inviteTokenInput.trim();
    if (!rawInput) {
      toast.error('Required', 'Please enter an invitation token or link.');
      return;
    }

    const token = rawInput.includes('/') ? rawInput.split('/').filter(Boolean).pop() : rawInput;
    if (!token) {
      toast.error('Invalid Input', 'Could not parse invitation token.');
      return;
    }

    setLoading(true);
    try {
      await joinOrganization(token);
      toast.success('Joined Workspace', 'You have successfully joined the organization.');
    } catch (err: any) {
      toast.error(
        'Failed to Join',
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Invalid or expired invitation token.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      destructive: true,
      icon: 'logout',
      onConfirm: async () => await logout(),
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Logo & Brand Header */}
          <View style={styles.brandContainer}>
            <Image
              source={
                isDark
                  ? require('../../assets/accountiva_dark_logo.png')
                  : require('../../assets/accountiva_logo.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brandTitle, { color: colors.foreground }]}>Accountiva</Text>
            {user?.name ? (
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                Welcome, {user.name}
              </Text>
            ) : null}
          </View>

          {/* STEP 1: CHOICE */}
          {step === 'choice' && (
            <View style={styles.section}>
              <View style={styles.headerTextBlock}>
                <Text style={[styles.mainHeading, { color: colors.foreground }]}>
                  Set up your workspace
                </Text>
                <Text style={[styles.subHeading, { color: colors.mutedForeground }]}>
                  Choose how you want to get started with Accountiva
                </Text>
              </View>

              <View style={styles.cardsGrid}>
                {/* Option A: Create */}
                <TouchableOpacity
                  style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setStep('create')}
                  activeOpacity={0.75}
                >
                  <View style={[styles.choiceIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                    <Building size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.choiceTitle, { color: colors.foreground }]}>
                      Create Organization
                    </Text>
                    <Text style={[styles.choiceDesc, { color: colors.mutedForeground }]}>
                      Configure a fresh workspace, set local currency, tax registers, and start invoicing.
                    </Text>
                  </View>
                  <View style={styles.actionArrowRow}>
                    <Text style={[styles.actionArrowText, { color: colors.primary }]}>Get started</Text>
                    <ArrowRight size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>

                {/* Option B: Join */}
                <TouchableOpacity
                  style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setStep('join')}
                  activeOpacity={0.75}
                >
                  <View style={[styles.choiceIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                    <Users size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.choiceTitle, { color: colors.foreground }]}>
                      Join Existing
                    </Text>
                    <Text style={[styles.choiceDesc, { color: colors.mutedForeground }]}>
                      Have an invitation token or link? Paste it here to access your company workspace.
                    </Text>
                  </View>
                  <View style={styles.actionArrowRow}>
                    <Text style={[styles.actionArrowText, { color: colors.primary }]}>Accept invite</Text>
                    <ArrowRight size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 2: CREATE */}
          {step === 'create' && (
            <Card style={styles.formCard}>
              <View style={styles.formCardHeader}>
                <TouchableOpacity
                  onPress={() => setStep('choice')}
                  style={styles.backBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowLeft size={18} color={colors.foreground} />
                </TouchableOpacity>
                <View>
                  <Text style={[styles.formCardTitle, { color: colors.foreground }]}>
                    Create Organization
                  </Text>
                  <Text style={[styles.formCardSub, { color: colors.mutedForeground }]}>
                    Set up your business workspace
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Organization Name *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  placeholder="e.g. Acme Corporation"
                  placeholderTextColor={colors.mutedForeground}
                  value={orgName}
                  onChangeText={setOrgName}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Base Currency</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setIsCurrencyPickerOpen(!isCurrencyPickerOpen)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerButtonText, { color: colors.foreground }]}>
                    {POPULAR_CURRENCIES.find((c) => c.code === currency)?.label || currency}
                  </Text>
                </TouchableOpacity>

                {isCurrencyPickerOpen ? (
                  <View
                    style={[
                      styles.currencyList,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    {POPULAR_CURRENCIES.map((c) => {
                      const isSelected = currency === c.code;
                      return (
                        <TouchableOpacity
                          key={c.code}
                          style={[
                            styles.currencyOption,
                            {
                              backgroundColor: isSelected ? colors.surfaceSubtle : 'transparent',
                              borderBottomColor: colors.border,
                            },
                          ]}
                          onPress={() => {
                            setCurrency(c.code);
                            setIsCurrencyPickerOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.currencyOptionText,
                              { color: colors.foreground, fontWeight: isSelected ? '700' : '500' },
                            ]}
                          >
                            {c.label}
                          </Text>
                          {isSelected ? <Check size={16} color={colors.primary} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateOrg}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Sparkles size={16} color={colors.primaryForeground} />
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      Create Workspace
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          )}

          {/* STEP 3: JOIN */}
          {step === 'join' && (
            <Card style={styles.formCard}>
              <View style={styles.formCardHeader}>
                <TouchableOpacity
                  onPress={() => setStep('choice')}
                  style={styles.backBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowLeft size={18} color={colors.foreground} />
                </TouchableOpacity>
                <View>
                  <Text style={[styles.formCardTitle, { color: colors.foreground }]}>
                    Join an Organization
                  </Text>
                  <Text style={[styles.formCardSub, { color: colors.mutedForeground }]}>
                    Enter your invitation link or code
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Invitation Token or URL *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  placeholder="Paste invite token or full URL..."
                  placeholderTextColor={colors.mutedForeground}
                  value={inviteTokenInput}
                  onChangeText={setInviteTokenInput}
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleJoinInvite}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <>
                    <Users size={16} color={colors.primaryForeground} />
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      Accept & Join Workspace
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          )}

          {/* Sign Out Link */}
          <TouchableOpacity
            style={styles.logoutRow}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={14} color={colors.mutedForeground} />
            <Text style={[styles.logoutText, { color: colors.mutedForeground }]}>
              Sign out of Accountiva
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  greeting: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  section: {
    width: '100%',
    maxWidth: 440,
  },
  headerTextBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainHeading: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 4,
  },
  cardsGrid: {
    gap: 12,
  },
  choiceCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  choiceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  choiceDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  actionArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  actionArrowText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    padding: 18,
    gap: 16,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  formCardSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  textInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  pickerButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  currencyList: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  currencyOptionText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  submitBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
    padding: 8,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
});

