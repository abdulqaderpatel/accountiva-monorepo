import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Mail, Send, FileText, CheckCircle2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSendInvoice } from '@accountiva/api';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/typography';
import { Card } from './ui/Card';
import { toast } from '../context/FeedbackContext';
import { useAuth } from '../context/AuthContext';
import { useKeyboard } from '../hooks/useKeyboard';

export interface SendInvoiceModalProps {
  visible: boolean;
  invoice: any | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendInvoiceModal({
  visible,
  invoice,
  onClose,
  onSuccess,
}: SendInvoiceModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const { isKeyboardVisible, keyboardHeight } = useKeyboard();
  const sendInvoiceMutation = useSendInvoice();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const invoiceNum = String(invoice?.number || invoice?.invoiceNumber || 'INV');
  const orgName = currentOrg?.name || 'Accountiva';
  const clientName = typeof invoice?.customer === 'string'
    ? invoice.customer
    : typeof invoice?.customer?.name === 'string'
    ? invoice.customer.name
    : typeof invoice?.customerName === 'string'
    ? invoice.customerName
    : typeof invoice?.customers?.name === 'string'
    ? invoice.customers.name
    : 'Valued Client';

  useEffect(() => {
    if (visible && invoice) {
      const defaultEmail =
        invoice.email ||
        invoice.customerEmail ||
        invoice.customer?.email ||
        invoice.customers?.email ||
        '';

      setRecipientEmail(defaultEmail);
      setSubject(`Invoice ${invoiceNum} from ${orgName}`);
      setMessage(
        `Dear ${clientName},\n\nPlease find attached your invoice ${invoiceNum} in official PDF format for recent products/services.\n\nYou can review the itemized breakdown and make a payment directly online.\n\nThank you for your business!\n\nBest regards,\n${orgName}`
      );
    }
  }, [visible, invoice, currentOrg, invoiceNum, orgName, clientName]);

  const handleSend = async () => {
    const cleanEmail = recipientEmail.trim();
    if (!cleanEmail) {
      toast.error('Email Required', 'Please enter a recipient email address.');
      return;
    }

    if (!invoice?.id) return;

    try {
      await sendInvoiceMutation.mutateAsync({
        id: invoice.id,
        payload: {
          recipientEmail: cleanEmail,
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      toast.success(
        'Invoice Sent',
        `Invoice PDF successfully delivered to ${cleanEmail}`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error sending invoice:', err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to deliver invoice email';
      toast.error('Send Failed', errorMsg);
    }
  };

  if (!visible || !invoice) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Send Invoice via Email</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Deliver {invoiceNum} in official PDF format directly to your client
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: isKeyboardVisible ? keyboardHeight + 20 : 20 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Attachment preview banner */}
            <Card style={styles.attachmentCard}>
              <View style={[styles.attachmentIconBox, { backgroundColor: colors.primary + '15' }]}>
                <FileText size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.attachmentTitle, { color: colors.foreground }]}>
                  {invoiceNum}.pdf
                </Text>
                <Text style={[styles.attachmentSubtitle, { color: colors.mutedForeground }]}>
                  Generated with custom layout & branding
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                <CheckCircle2 size={12} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>Attached</Text>
              </View>
            </Card>

            {/* Recipient Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Recipient Email <Text style={{ color: colors.destructive }}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
                <Mail size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  placeholder="client@company.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>
            </View>

            {/* Subject */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Subject</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
                <TextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Invoice subject..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>
            </View>

            {/* Message Body */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Message Body</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Write your email message..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={[
                  styles.textArea,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSubtle,
                  },
                ]}
              />
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              disabled={sendInvoiceMutation.isPending}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              disabled={sendInvoiceMutation.isPending}
            >
              {sendInvoiceMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <View style={styles.sendBtnContent}>
                  <Send size={15} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.sendBtnText, { color: colors.primaryForeground }]}>Send Invoice</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  attachmentIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentTitle: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  attachmentSubtitle: {
    fontSize: 10,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  sendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  sendBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendBtnText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
});
