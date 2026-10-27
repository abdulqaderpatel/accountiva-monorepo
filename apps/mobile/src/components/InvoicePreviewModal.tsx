import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import {
  X,
  Share2,
  FileText,
  Printer,
  Sparkles,
  Building2,
  Check,
  Calendar,
  Layers,
  Sliders,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { fonts } from '../theme/typography';
import { formatCurrency, calculateFinancialDocumentSubtotal, getDocumentSummaryDetails } from '@accountiva/shared';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/FeedbackContext';

export type TemplateId = 'standard' | 'modern' | 'minimal' | 'premium';

interface InvoicePreviewModalProps {
  visible: boolean;
  invoice: any | null;
  onClose: () => void;
}

const TEMPLATES: Array<{ id: TemplateId; label: string }> = [
  { id: 'standard', label: 'Standard' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'premium', label: 'Premium' },
];

export function InvoicePreviewModal({ visible, invoice, onClose }: InvoicePreviewModalProps) {
  const { colors, isDark } = useTheme();
  const { currentOrg } = useAuth();
  const currency = currentOrg?.currency || 'INR';

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('standard');
  const [showDueDate, setShowDueDate] = useState(true);
  const [showNotes, setShowNotes] = useState(true);

  if (!visible || !invoice) return null;

  const lineItems: any[] = Array.isArray(invoice.items) ? invoice.items : [];
  const summary = getDocumentSummaryDetails(invoice);
  const status = String(invoice.status || 'Draft').toUpperCase();
  const isPaid = status === 'PAID';

  const clientName =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : typeof invoice.customer?.name === 'string'
      ? invoice.customer.name
      : typeof invoice.customerName === 'string'
      ? invoice.customerName
      : typeof invoice.customers?.name === 'string'
      ? invoice.customers.name
      : 'Client Entity';

  const invoiceNum = String(invoice.number || invoice.invoiceNumber || 'INV-000');
  const invoiceDate = String(invoice.date || 'Recent');
  const invoiceDueDate = String(invoice.dueDate || 'Upon Receipt');
  const orgName = currentOrg?.name || 'Accountiva Business';

  const handleShareFormatted = async () => {
    try {
      let itemsSummary = lineItems
        .map(
          (i, idx) =>
            `${idx + 1}. ${i.name || i.itemName} - ${i.quantity || 1} x ${formatCurrency(
              Number(i.rate) || 0,
              currency
            )} = ${formatCurrency(Number(i.amount) || (i.quantity || 1) * (Number(i.rate) || 0), currency)}`
        )
        .join('\n');

      const chargesLines: string[] = [
        `Subtotal: ${formatCurrency(summary.subtotal, currency)}`,
      ];
      if (summary.discountAmount > 0) {
        chargesLines.push(`Discount${summary.discountType === 'percentage' && summary.discountValue ? ` (${summary.discountValue}%)` : ''}: -${formatCurrency(summary.discountAmount, currency)}`);
      }
      if (summary.taxAmount > 0 || summary.taxPercent > 0) {
        chargesLines.push(`Tax (GST ${summary.taxPercent}%): ${formatCurrency(summary.taxAmount, currency)}`);
      }
      if (summary.shippingCharges > 0) {
        chargesLines.push(`Shipping: ${formatCurrency(summary.shippingCharges, currency)}`);
      }
      if (summary.adjustment !== 0) {
        chargesLines.push(`Adjustment: ${summary.adjustment > 0 ? '+' : ''}${formatCurrency(summary.adjustment, currency)}`);
      }
      chargesLines.push(`TOTAL AMOUNT: ${formatCurrency(summary.total, currency)}`);

      const fullMessage = `--- INVOICE ${invoiceNum} ---\nOrganization: ${orgName}\nBilled To: ${clientName}\nDate: ${invoiceDate}\nDue Date: ${invoiceDueDate}\nStatus: ${status}\n\nITEMS:\n${itemsSummary}\n\n${chargesLines.join('\n')}\n\nGenerated via Accountiva™`;

      await Share.share({
        message: fullMessage,
        title: `Invoice ${invoiceNum}`,
      });
    } catch (err: any) {
      toast.error('Share Failed', err.message || 'Could not share invoice document');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Invoice Preview</Text>
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                {invoiceNum} • Template: {selectedTemplate.toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleShareFormatted} style={styles.iconBtn} activeOpacity={0.7}>
                <Share2 size={18} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Template Selector Pills */}
          <View style={[styles.templateSelectorBar, { borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatePillsScroll}>
              {TEMPLATES.map((tmpl) => {
                const isActive = selectedTemplate === tmpl.id;
                return (
                  <TouchableOpacity
                    key={tmpl.id}
                    onPress={() => setSelectedTemplate(tmpl.id)}
                    style={[
                      styles.templatePill,
                      isActive
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.templatePillText,
                        { color: isActive ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      {tmpl.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Scrollable Canvas / Simulated Paper Document */}
          <ScrollView contentContainerStyle={styles.previewCanvas} showsVerticalScrollIndicator={false}>
            {/* The Document Paper */}
            <View
              style={[
                styles.paperDocument,
                selectedTemplate === 'standard' && styles.docStandard,
                selectedTemplate === 'modern' && [styles.docModern, { borderLeftColor: colors.primary }],
                selectedTemplate === 'minimal' && styles.docMinimal,
                selectedTemplate === 'premium' && [styles.docPremium, { borderColor: colors.primary }],
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Document Banner / Header according to Template */}
              {selectedTemplate === 'modern' && (
                <View style={[styles.modernTopBand, { backgroundColor: colors.primary }]}>
                  <Text style={styles.modernTopBandText}>INVOICE</Text>
                  <Text style={styles.modernTopBandSub}>{invoiceNum}</Text>
                </View>
              )}

              {/* Organization and Invoice Top Row */}
              <View style={styles.docHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docOrgName, { color: colors.foreground }]}>{orgName}</Text>
                  <Text style={[styles.docOrgSub, { color: colors.mutedForeground }]}>
                    Tax Compliance & Billing
                  </Text>
                </View>

                {selectedTemplate !== 'modern' && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.docTypeHeading, { color: colors.primary }]}>INVOICE</Text>
                    <Text style={[styles.docNumberText, { color: colors.foreground }]}>#{invoiceNum}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.docDivider, { backgroundColor: colors.border }]} />

              {/* Bill To & Dates Grid */}
              <View style={styles.docMetaGrid}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.docSectionLabel, { color: colors.mutedForeground }]}>BILLED TO</Text>
                  <Text style={[styles.docClientName, { color: colors.foreground }]}>{clientName}</Text>
                  <Text style={[styles.docMetaText, { color: colors.mutedForeground }]}>
                    {invoice.billingAddress || invoice.address || 'Standard Client Terms'}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.docSectionLabel, { color: colors.mutedForeground }]}>DATE ISSUED</Text>
                  <Text style={[styles.docMetaVal, { color: colors.foreground }]}>{invoiceDate}</Text>

                  {showDueDate && (
                    <>
                      <Text style={[styles.docSectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
                        DUE DATE
                      </Text>
                      <Text style={[styles.docMetaVal, { color: colors.foreground }]}>{invoiceDueDate}</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Status Badge */}
              <View style={styles.docStatusRow}>
                <Badge variant={isPaid ? 'success' : 'warning'}>
                  {status}
                </Badge>
              </View>

              {/* Line Items Table */}
              <View style={[styles.docItemsTable, { borderColor: colors.border }]}>
                {/* Table Header */}
                <View style={[styles.docTableHeader, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.thColName, { color: colors.mutedForeground }]}>Item & Description</Text>
                  <Text style={[styles.thColQty, { color: colors.mutedForeground }]}>Qty</Text>
                  <Text style={[styles.thColRate, { color: colors.mutedForeground }]}>Rate</Text>
                  <Text style={[styles.thColTotal, { color: colors.mutedForeground }]}>Amount</Text>
                </View>

                {/* Table Rows */}
                {lineItems.map((item, idx) => (
                  <View key={item.id || idx} style={[styles.docTableRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.tdColName}>
                      <Text style={[styles.tdItemTitle, { color: colors.foreground }]}>
                        {item.name || item.itemName}
                      </Text>
                      {item.description ? (
                        <Text style={[styles.tdItemDesc, { color: colors.mutedForeground }]}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.tdColQty, { color: colors.foreground }]}>{item.quantity || 1}</Text>
                    <Text style={[styles.tdColRate, { color: colors.foreground }]}>
                      {formatCurrency(Number(item.rate) || 0, currency)}
                    </Text>
                    <Text style={[styles.tdColTotal, { color: colors.foreground }]}>
                      {formatCurrency(
                        Number.isFinite(Number(item.amount))
                          ? Number(item.amount)
                          : (item.quantity || 1) * (Number(item.rate) || 0),
                        currency
                      )}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Totals Summary */}
              <View style={styles.docTotalsContainer}>
                <View style={styles.docTotalsBox}>
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                    <Text style={[styles.totalsValue, { color: colors.foreground }]}>
                      {formatCurrency(summary.subtotal, currency)}
                    </Text>
                  </View>

                  {summary.discountAmount > 0 ? (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>
                        Discount{summary.discountType === 'percentage' && summary.discountValue > 0 ? ` (${summary.discountValue}%)` : ''}
                      </Text>
                      <Text style={[styles.totalsValue, { color: colors.success }]}>
                        -{formatCurrency(summary.discountAmount, currency)}
                      </Text>
                    </View>
                  ) : null}

                  {summary.discountAmount > 0 && summary.taxAmount > 0 ? (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>Taxable Amount</Text>
                      <Text style={[styles.totalsValue, { color: colors.foreground }]}>
                        {formatCurrency(summary.taxableAmount, currency)}
                      </Text>
                    </View>
                  ) : null}

                  {summary.taxAmount > 0 || summary.taxPercent > 0 ? (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>
                        Tax {summary.taxPercent > 0 ? `(${summary.taxPercent}%)` : ''}
                      </Text>
                      <Text style={[styles.totalsValue, { color: colors.foreground }]}>
                        {formatCurrency(summary.taxAmount, currency)}
                      </Text>
                    </View>
                  ) : null}

                  {summary.shippingCharges > 0 ? (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>Shipping</Text>
                      <Text style={[styles.totalsValue, { color: colors.foreground }]}>
                        {formatCurrency(summary.shippingCharges, currency)}
                      </Text>
                    </View>
                  ) : null}

                  {summary.packagingCharges > 0 ? (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>Packaging / Packing</Text>
                      <Text style={[styles.totalsValue, { color: colors.foreground }]}>
                        {formatCurrency(summary.packagingCharges, currency)}
                      </Text>
                    </View>
                  ) : null}

                  {summary.adjustment !== 0 ? (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: colors.mutedForeground }]}>
                        {Math.abs(summary.adjustment) < 1 ? 'Round Off' : 'Adjustment'}
                      </Text>
                      <Text style={[styles.totalsValue, { color: colors.foreground }]}>
                        {summary.adjustment > 0 ? '+' : ''}{formatCurrency(summary.adjustment, currency)}
                      </Text>
                    </View>
                  ) : null}

                  <View style={[styles.totalsDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.totalsRow}>
                    <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Total</Text>
                    <Text style={[styles.grandTotalValue, { color: colors.primary }]}>
                      {formatCurrency(summary.total, currency)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes and Terms Footer */}
              {showNotes && (invoice.notes || invoice.terms) ? (
                <View style={[styles.docFooterBox, { backgroundColor: colors.surfaceSubtle }]}>
                  {invoice.notes ? (
                    <View style={{ marginBottom: 6 }}>
                      <Text style={[styles.docFooterHeading, { color: colors.mutedForeground }]}>NOTES</Text>
                      <Text style={[styles.docFooterText, { color: colors.foreground }]}>{invoice.notes}</Text>
                    </View>
                  ) : null}
                  {invoice.terms ? (
                    <View>
                      <Text style={[styles.docFooterHeading, { color: colors.mutedForeground }]}>TERMS</Text>
                      <Text style={[styles.docFooterText, { color: colors.foreground }]}>{invoice.terms}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Watermark Branding */}
              <View style={styles.docWatermarkRow}>
                <Text style={[styles.docWatermarkText, { color: colors.mutedForeground }]}>
                  Powered by Accountiva™ Financial Platform
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Button
              onPress={handleShareFormatted}
              style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Share2 size={16} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontFamily: fonts.semiBold }}>
                Share Formatted Invoice
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 6,
  },
  templateSelectorBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  templatePillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  templatePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  templatePillText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  previewCanvas: {
    padding: 16,
    paddingBottom: 24,
  },
  paperDocument: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  docStandard: {},
  docModern: {
    borderLeftWidth: 5,
  },
  docMinimal: {
    borderWidth: 0,
    padding: 12,
  },
  docPremium: {
    borderWidth: 2,
  },
  modernTopBand: {
    marginHorizontal: -18,
    marginTop: -18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernTopBandText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 13,
    fontFamily: fonts.display,
  },
  modernTopBandSub: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  docOrgName: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  docOrgSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  docTypeHeading: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: fonts.display,
  },
  docNumberText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    marginTop: 2,
  },
  docDivider: {
    height: 1,
    marginVertical: 14,
  },
  docMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  docSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: fonts.semiBold,
    marginBottom: 3,
  },
  docClientName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  docMetaText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  docMetaVal: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  docStatusRow: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  docItemsTable: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  docTableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  thColName: {
    flex: 3,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  thColQty: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  thColRate: {
    flex: 1.5,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  thColTotal: {
    flex: 1.5,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  docTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tdColName: {
    flex: 3,
  },
  tdItemTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  tdItemDesc: {
    fontSize: 10,
    fontFamily: fonts.regular,
    marginTop: 1,
  },
  tdColQty: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  tdColRate: {
    flex: 1.5,
    textAlign: 'right',
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  tdColTotal: {
    flex: 1.5,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
  },
  docTotalsContainer: {
    marginTop: 14,
    alignItems: 'flex-end',
  },
  docTotalsBox: {
    width: '60%',
    gap: 6,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalsLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  totalsValue: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  totalsDivider: {
    height: 1,
    marginVertical: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
  docFooterBox: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
  },
  docFooterHeading: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: fonts.semiBold,
  },
  docFooterText: {
    fontSize: 10,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 14,
  },
  docWatermarkRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  docWatermarkText: {
    fontSize: 9,
    fontFamily: fonts.medium,
    opacity: 0.6,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
  },
});
