import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Share2,
  Sparkles,
  Layers,
  RotateCcw,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@accountiva/api';
import {
  parseAndValidateCsv,
  ENTITY_TEMPLATES,
  generateCsvContent,
  type CsvParseResult,
} from '@accountiva/shared';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/typography';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { toast } from '../context/FeedbackContext';

export interface BulkImportModalProps {
  visible: boolean;
  entity: string; // 'customers' | 'items' | etc.
  title?: string;
  onClose: () => void;
  onSuccess?: (data?: any) => void;
}

export function BulkImportModal({
  visible,
  entity,
  title,
  onClose,
  onSuccess,
}: BulkImportModalProps) {
  const { colors } = useTheme();

  // Steps: 1 = File/Text Input, 2 = Preview & Duplicate Strategy, 3 = Completed
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputTab, setInputTab] = useState<'file' | 'paste'>('file');
  const [fileName, setFileName] = useState<string>('');
  const [pastedCsv, setPastedCsv] = useState<string>('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'error'>('skip');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    message: string;
  } | null>(null);

  const templateConfig = useMemo(() => {
    return ENTITY_TEMPLATES[entity] || null;
  }, [entity]);

  const modalTitle = useMemo(() => {
    if (title) return title;
    const name = templateConfig?.displayName || (entity === 'customers' ? 'Customers' : entity === 'items' ? 'Products & Services' : entity);
    return `Import ${name}`;
  }, [title, templateConfig, entity]);

  // Reset state when opening
  useEffect(() => {
    if (visible) {
      setStep(1);
      setInputTab('file');
      setFileName('');
      setPastedCsv('');
      setParseResult(null);
      setDuplicateStrategy('skip');
      setIsImporting(false);
      setImportSummary(null);
    }
  }, [visible]);

  const processCsvContent = (text: string, name: string = 'pasted_data.csv') => {
    if (!text || !text.trim()) {
      toast.error('Empty Content', 'Please provide CSV content to import.');
      return;
    }

    try {
      const result = parseAndValidateCsv(text, entity);
      if (result.totalRows === 0) {
        toast.error('No Records Found', 'The provided CSV contains no data rows.');
        return;
      }
      setFileName(name);
      setParseResult(result);
      setStep(2);
    } catch (err: any) {
      console.error('CSV parse error:', err);
      toast.error('Invalid CSV', err?.message || 'Failed to parse CSV format.');
    }
  };

  const handlePickFile = async () => {
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv,text/comma-separated-values';
      input.style.display = 'none';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const text = await file.text();
          processCsvContent(text, file.name);
        }
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
      return;
    }

    // Native platform: Try expo-document-picker if available, else switch to paste tab
    try {
      let DocumentPicker: any = null;
      try {
        DocumentPicker = require('expo-document-picker');
      } catch {
        DocumentPicker = null;
      }

      if (DocumentPicker && typeof DocumentPicker.getDocumentAsync === 'function') {
        const res = await DocumentPicker.getDocumentAsync({
          type: ['text/csv', 'text/comma-separated-values', 'text/*'],
          copyToCacheDirectory: true,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          const asset = res.assets[0];
          if (asset.file && typeof asset.file.text === 'function') {
            const text = await asset.file.text();
            processCsvContent(text, asset.name);
            return;
          }
          if (asset.uri) {
            const response = await fetch(asset.uri);
            const text = await response.text();
            processCsvContent(text, asset.name);
            return;
          }
        }
      } else {
        // Fallback for native without document picker
        setInputTab('paste');
        toast.info('Direct Paste', 'You can paste your CSV data directly below.');
      }
    } catch (err: any) {
      console.warn('Native picker error:', err);
      setInputTab('paste');
      toast.info('Direct Paste', 'Please paste your CSV data below.');
    }
  };

  const handleLoadSample = () => {
    if (!templateConfig) return;
    const sampleCsv = generateCsvContent(templateConfig.headers, templateConfig.sampleRows);
    setPastedCsv(sampleCsv);
    toast.success('Sample Loaded', `Loaded ${templateConfig.sampleRows.length} sample records.`);
  };

  const handleShareTemplate = async () => {
    if (!templateConfig) return;
    const sampleCsv = generateCsvContent(templateConfig.headers, templateConfig.sampleRows);
    try {
      await Share.share({
        message: sampleCsv,
        title: templateConfig.fileName,
      });
    } catch (err: any) {
      toast.error('Share Failed', err?.message || 'Could not export template.');
    }
  };

  const handleExecuteImport = async () => {
    if (!parseResult || parseResult.payload.length === 0) {
      toast.error('No Valid Records', 'No valid records available to import.');
      return;
    }

    setIsImporting(true);
    try {
      const response = await api.post(`/${entity}/bulk-import`, {
        items: parseResult.payload,
        duplicateStrategy,
      });

      const data = response.data || {};
      const imported = data.importedCount ?? data.count ?? parseResult.validRows;
      const skipped = data.skippedCount ?? 0;
      const errors = data.errorCount ?? 0;

      const summary = {
        importedCount: imported,
        skippedCount: skipped,
        errorCount: errors,
        message: `Successfully imported ${imported} records.${skipped > 0 ? ` ${skipped} duplicates skipped.` : ''}`,
      };

      setImportSummary(summary);
      setStep(3);
      onSuccess?.(data);
      toast.success('Import Successful', summary.message);
    } catch (err: any) {
      console.error('Import API error:', err);
      const msg = err.response?.data?.error || err.message || 'Import failed. Please try again.';
      toast.error('Import Failed', msg);
    } finally {
      setIsImporting(false);
    }
  };

  const previewRows = useMemo(() => {
    if (!parseResult?.rows) return [];
    return parseResult.rows.slice(0, 5);
  }, [parseResult]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{modalTitle}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {step === 1
                ? 'Upload a CSV file or paste formatted CSV rows'
                : step === 2
                ? 'Review parsed data and duplicate handling'
                : 'Import summary'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Body Step 1: Input */}
        {step === 1 && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Input Method Switcher */}
            <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setInputTab('file')}
                style={[
                  styles.tabItem,
                  inputTab === 'file' && [styles.tabItemActive, { backgroundColor: colors.card }],
                ]}
                activeOpacity={0.7}
              >
                <UploadCloud size={16} color={inputTab === 'file' ? colors.foreground : colors.mutedForeground} />
                <Text
                  style={[
                    styles.tabItemText,
                    {
                      color: inputTab === 'file' ? colors.foreground : colors.mutedForeground,
                      fontWeight: inputTab === 'file' ? '700' : '500',
                    },
                  ]}
                >
                  File Upload
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setInputTab('paste')}
                style={[
                  styles.tabItem,
                  inputTab === 'paste' && [styles.tabItemActive, { backgroundColor: colors.card }],
                ]}
                activeOpacity={0.7}
              >
                <FileSpreadsheet size={16} color={inputTab === 'paste' ? colors.foreground : colors.mutedForeground} />
                <Text
                  style={[
                    styles.tabItemText,
                    {
                      color: inputTab === 'paste' ? colors.foreground : colors.mutedForeground,
                      fontWeight: inputTab === 'paste' ? '700' : '500',
                    },
                  ]}
                >
                  Paste CSV Text
                </Text>
              </TouchableOpacity>
            </View>

            {inputTab === 'file' ? (
              /* File Upload Zone */
              <TouchableOpacity
                onPress={handlePickFile}
                style={[
                  styles.dropzone,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.dropzoneIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                  <UploadCloud size={32} color={colors.primary} />
                </View>
                <Text style={[styles.dropzoneTitle, { color: colors.foreground }]}>
                  {fileName ? fileName : 'Tap to select CSV file'}
                </Text>
                <Text style={[styles.dropzoneSubtitle, { color: colors.mutedForeground }]}>
                  Supports standard CSV (.csv) format
                </Text>
                <View style={[styles.selectFilePill, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.selectFilePillText, { color: colors.primaryForeground }]}>
                    {fileName ? 'Choose Different File' : 'Browse Files'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              /* Paste CSV Area */
              <View style={styles.pasteContainer}>
                <View style={styles.pasteHeaderRow}>
                  <Text style={[styles.pasteLabel, { color: colors.mutedForeground }]}>
                    Paste raw CSV lines with headers:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={handleLoadSample}
                      style={[styles.smallActionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={12} color={colors.primary} />
                      <Text style={[styles.smallActionBtnText, { color: colors.primary }]}>Load Sample</Text>
                    </TouchableOpacity>
                    {pastedCsv ? (
                      <TouchableOpacity
                        onPress={() => setPastedCsv('')}
                        style={[styles.smallActionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                        activeOpacity={0.7}
                      >
                        <RotateCcw size={12} color={colors.mutedForeground} />
                        <Text style={[styles.smallActionBtnText, { color: colors.mutedForeground }]}>Clear</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <TextInput
                  value={pastedCsv}
                  onChangeText={setPastedCsv}
                  placeholder={`"Name","Email","Phone","GST Number"...\n"Acme Corp","info@acme.com","9876543210","29AABCU9603R1ZM"`}
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={8}
                  style={[
                    styles.csvTextInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  onPress={() => processCsvContent(pastedCsv, 'pasted_data.csv')}
                  disabled={!pastedCsv.trim()}
                  style={[
                    styles.previewBtn,
                    {
                      backgroundColor: pastedCsv.trim() ? colors.primary : colors.surfaceSubtle,
                      opacity: pastedCsv.trim() ? 1 : 0.6,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.previewBtnText,
                      { color: pastedCsv.trim() ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    Continue to Preview
                  </Text>
                  <ArrowRight size={16} color={pastedCsv.trim() ? colors.primaryForeground : colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            )}

            {/* Template Card */}
            {templateConfig ? (
              <Card style={styles.templateCard}>
                <View style={styles.templateCardContent}>
                  <View style={[styles.templateIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                    <FileSpreadsheet size={20} color={colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.templateTitle, { color: colors.foreground }]}>Need the CSV format?</Text>
                    <Text style={[styles.templateDesc, { color: colors.mutedForeground }]}>
                      Share or export the sample template with pre-filled headers and examples.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleShareTemplate}
                    style={[styles.shareTemplateBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Share2 size={14} color={colors.foreground} />
                    <Text style={[styles.shareTemplateBtnText, { color: colors.foreground }]}>Template</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : null}
          </ScrollView>
        )}

        {/* Body Step 2: Preview & Validation */}
        {step === 2 && parseResult && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Stats Overview */}
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statBoxLabel, { color: colors.mutedForeground }]}>Total Found</Text>
                <Text style={[styles.statBoxVal, { color: colors.foreground }]}>{parseResult.totalRows}</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statBoxLabel, { color: colors.mutedForeground }]}>Valid</Text>
                <Text style={[styles.statBoxVal, { color: colors.success }]}>{parseResult.validRows}</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statBoxLabel, { color: colors.mutedForeground }]}>Errors</Text>
                <Text
                  style={[
                    styles.statBoxVal,
                    { color: parseResult.invalidRows > 0 ? colors.destructive : colors.mutedForeground },
                  ]}
                >
                  {parseResult.invalidRows}
                </Text>
              </View>
            </View>

            {/* Invalid Rows Warning */}
            {parseResult.invalidRows > 0 && (
              <View style={[styles.warningBox, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
                <AlertCircle size={16} color={colors.warning} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.warningTitle, { color: colors.warning }]}>
                    {parseResult.invalidRows} row(s) contain validation errors and will be skipped:
                  </Text>
                  {parseResult.rows
                    .filter((r) => !r.isValid)
                    .slice(0, 3)
                    .map((r, i) => (
                      <Text key={i} style={[styles.warningItem, { color: colors.warning }]}>
                        • Row {r.rowIndex}: {r.errors.join(', ')}
                      </Text>
                    ))}
                </View>
              </View>
            )}

            {/* Duplicate Strategy Option */}
            <View style={styles.strategySection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Duplicate Resolution</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                How should records matching existing names or identifiers be handled?
              </Text>

              <View style={styles.strategyRow}>
                {[
                  { id: 'skip', label: 'Skip Existing', desc: 'Ignore duplicates' },
                  { id: 'update', label: 'Update', desc: 'Overwrite matching' },
                  { id: 'error', label: 'Reject All', desc: 'Fail on collision' },
                ].map((strat) => {
                  const isSelected = duplicateStrategy === strat.id;
                  return (
                    <TouchableOpacity
                      key={strat.id}
                      onPress={() => setDuplicateStrategy(strat.id as any)}
                      style={[
                        styles.strategyCard,
                        {
                          backgroundColor: isSelected ? colors.surfaceSubtle : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.strategyLabel,
                          {
                            color: isSelected ? colors.primary : colors.foreground,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {strat.label}
                      </Text>
                      <Text style={[styles.strategyDesc, { color: colors.mutedForeground }]}>{strat.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sample Parsed Rows Preview */}
            <View style={styles.previewSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Data Preview (First {previewRows.length} of {parseResult.validRows})
              </Text>

              <View style={{ gap: 8 }}>
                {previewRows.map((r, idx) => {
                  const item = r.mappedData || {};
                  const primaryText = item.name || item.itemName || `Record ${idx + 1}`;
                  const secondaryText =
                    item.email || item.sku || item.company || item.customerCode || '';
                  const detailText =
                    entity === 'items'
                      ? `${item.type || 'Product'} • ₹${item.sellingPrice ?? 0}`
                      : item.gstNumber || item.phone || '';

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.previewCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: r.isValid ? colors.border : colors.destructive,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.previewPrimary, { color: colors.foreground }]} numberOfLines={1}>
                          {primaryText}
                        </Text>
                        {secondaryText ? (
                          <Text style={[styles.previewSecondary, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {secondaryText}
                          </Text>
                        ) : null}
                      </View>

                      {detailText ? (
                        <Badge variant={r.isValid ? 'default' : 'destructive'}>{detailText}</Badge>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Body Step 3: Complete Results */}
        {step === 3 && importSummary && (
          <View style={[styles.content, styles.centerContent]}>
            <View style={[styles.successIconCircle, { backgroundColor: colors.successBg }]}>
              <CheckCircle2 size={44} color={colors.success} />
            </View>

            <Text style={[styles.completeTitle, { color: colors.foreground }]}>Import Complete</Text>
            <Text style={[styles.completeSubtitle, { color: colors.mutedForeground }]}>
              {importSummary.message}
            </Text>

            <View style={styles.summaryStatsRow}>
              <View style={[styles.summaryStatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.summaryStatVal, { color: colors.success }]}>
                  {importSummary.importedCount}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>Imported</Text>
              </View>

              <View style={[styles.summaryStatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.summaryStatVal, { color: colors.warning }]}>
                  {importSummary.skippedCount}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>Skipped</Text>
              </View>

              <View style={[styles.summaryStatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text
                  style={[
                    styles.summaryStatVal,
                    { color: importSummary.errorCount > 0 ? colors.destructive : colors.mutedForeground },
                  ]}
                >
                  {importSummary.errorCount}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>Errors</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Actions Bar */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {step === 2 && (
            <TouchableOpacity
              onPress={() => setStep(1)}
              disabled={isImporting}
              style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              activeOpacity={0.7}
            >
              <ArrowLeft size={16} color={colors.foreground} />
              <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back</Text>
            </TouchableOpacity>
          )}

          {step === 2 && (
            <TouchableOpacity
              onPress={handleExecuteImport}
              disabled={isImporting || !parseResult || parseResult.validRows === 0}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isImporting || !parseResult || parseResult.validRows === 0 ? 0.6 : 1,
                  flex: 1,
                },
              ]}
              activeOpacity={0.8}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                    Import {parseResult?.validRows || 0} Records
                  </Text>
                  <ArrowRight size={16} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
          )}

          {step === 3 && (
            <TouchableOpacity
              onPress={onClose}
              style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Done</Text>
            </TouchableOpacity>
          )}
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
    paddingBottom: 40,
    gap: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  tabItemText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  dropzoneIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dropzoneTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
  dropzoneSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  selectFilePill: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectFilePillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  pasteContainer: {
    gap: 10,
  },
  pasteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pasteLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallActionBtnText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  csvTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    height: 160,
    textAlignVertical: 'top',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  previewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  templateCard: {
    padding: 12,
  },
  templateCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  templateDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  shareTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  shareTemplateBtnText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statBoxLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  statBoxVal: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.bold,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  warningItem: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  strategySection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  strategyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  strategyCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  strategyLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  strategyDesc: {
    fontSize: 10,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  previewSection: {
    gap: 8,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  previewPrimary: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  previewSecondary: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  completeTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  completeSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  summaryStatBox: {
    width: 90,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryStatVal: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  summaryStatLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
