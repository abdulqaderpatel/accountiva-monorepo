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
} from 'react-native';
import { X, Mail, Send, FileText, CheckCircle2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSendEstimate } from '@accountiva/api';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/typography';
import { Card } from './ui/Card';
import { toast } from '../context/FeedbackContext';
import { useAuth } from '../context/AuthContext';

export interface SendEstimateModalProps {
  visible: boolean;
  estimate: any | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendEstimateModal({
  visible,
  estimate,
  onClose,
  onSuccess,
}: SendEstimateModalProps) {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const sendEstimateMutation = useSendEstimate();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const estimateNum = String(estimate?.number || estimate?.estimateNumber || 'EST');
  const orgName = currentOrg?.name || 'Accountiva';
  const clientName = typeof estimate?.customer === 'string'
    ? estimate.customer
    : typeof estimate?.customer?.name === 'string'
    ? estimate.customer.name
    : typeof estimate?.customerName === 'string'
    ? estimate.customerName
    : typeof estimate?.customers?.name === 'string'
    ? estimate.customers.name
    : 'Valued Client';

  useEffect(() => {
    if (visible && estimate) {
      const defaultEmail =
        estimate.email ||
        estimate.customerEmail ||
        estimate.customer?.email ||
        estimate.customers?.email ||
        '';

      setRecipientEmail(defaultEmail);
      setSubject(`Estimate ${estimateNum} from ${orgName}`);
      setMessage(
        `Dear ${clientName},\n\nPlease find attached the official quote ${estimateNum} in PDF format for your review.\n\nFeel free to contact us with any questions or to approve this estimate.\n\nBest regards,\n${orgName}`
      );
    }
  }, [visible, estimate, currentOrg, estimateNum, orgName, clientName]);

  const handleSend = async () => {
    const cleanEmail = recipientEmail.trim();
    if (!cleanEmail) {
      toast.error('Email Required', 'Please enter a recipient email address.');
      return;
    }

    if (!estimate?.id) return;

    try {
      await sendEstimateMutation.mutateAsync({
        id: estimate.id,
        payload: {
          recipientEmail: cleanEmail,
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      toast.success(
        'Estimate Sent',
        `Quote PDF successfully delivered to ${cleanEmail}`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error sending estimate:', err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to deliver estimate email';
      toast.error('Send Failed', errorMsg);
    }
  };

  if (!visible || !estimate) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Send Quote via Email</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Deliver {estimateNum} in official PDF format directly to your client
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recipient Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Recipient Email *</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Mail size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="client@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: colors.foreground }]}
              />
            </View>
          </View>

          {/* Subject Line */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Subject Line</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                placeholder="Quote Subject"
                placeholderTextColor={colors.mutedForeground}
                value={subject}
                onChangeText={setSubject}
                style={[styles.input, { color: colors.foreground }]}
              />
            </View>
          </View>

          {/* Message Body */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Message Body</Text>
            <TextInput
              placeholder="Custom message to client..."
              placeholderTextColor={colors.mutedForeground}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              style={[
                styles.textArea,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>

          {/* PDF Attachment Banner */}
          <Card style={styles.pdfCard}>
            <View style={styles.pdfCardRow}>
              <View style={[styles.pdfIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                <FileText size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pdfFileName, { color: colors.foreground }]}>{estimateNum}.pdf</Text>
                <Text style={[styles.pdfFileDesc, { color: colors.mutedForeground }]}>
                  Vector PDF with itemized calculation and business branding attached automatically.
                </Text>
              </View>
              <View style={[styles.attachedBadge, { backgroundColor: colors.successBg }]}>
                <CheckCircle2 size={12} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={[styles.attachedBadgeText, { color: colors.success }]}>PDF Attached</Text>
              </View>
            </View>
          </Card>
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSend}
            disabled={sendEstimateMutation.isPending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: colors.primary,
                opacity: sendEstimateMutation.isPending ? 0.7 : 1,
              },
            ]}
            activeOpacity={0.8}
          >
            {sendEstimateMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Send size={15} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                <Text style={[styles.sendBtnText, { color: colors.primaryForeground }]}>Send Quote PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
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
    fontSize: 13,
    fontFamily: fonts.regular,
    height: 120,
    textAlignVertical: 'top',
  },
  pdfCard: {
    padding: 14,
    marginTop: 4,
  },
  pdfCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfFileName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  pdfFileDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 15,
  },
  attachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attachedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});

