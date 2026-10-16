import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SlidersHorizontal, ChevronDown, Check, X, Asterisk, Calendar as CalendarIcon } from 'lucide-react-native';
import api from '@accountiva/api';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/typography';
import { Badge } from './Badge';

export type CustomFieldDataType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface MobileCustomField {
  id: string;
  name: string;
  dataType: CustomFieldDataType;
  options?: string[] | null;
  entities: string[];
  printOnDocument?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
  placeholder?: string;
  orderIndex?: number;
}

export interface CustomFieldRendererProps {
  entity: 'invoice' | 'estimate' | 'credit_note' | 'customer' | 'item' | string;
  values?: Record<string, any> | Array<{ customFieldId: string; value: any; id?: string }>;
  onChange?: (values: Record<string, any>) => void;
  errors?: Record<string, string>;
  readonly?: boolean;
  title?: string;
  showTitle?: boolean;
}

export function CustomFieldRenderer({
  entity,
  values = {},
  onChange,
  errors = {},
  readonly = false,
  title = 'Custom Fields',
  showTitle = true,
}: CustomFieldRendererProps) {
  const { colors } = useTheme();
  const [allFields, setAllFields] = useState<MobileCustomField[]>([]);
  const [activeDropdownField, setActiveDropdownField] = useState<MobileCustomField | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    api
      .get<MobileCustomField[]>('/custom-fields')
      .then(({ data }) => {
        if (isMounted && Array.isArray(data)) {
          setAllFields(data);
        }
      })
      .catch(() => {
        // Silently catch if custom fields endpoint fails or is disabled
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const fields = useMemo(() => {
    const target = entity.toLowerCase();
    return allFields.filter((f) => {
      if (f.isActive === false) return false;
      if (Array.isArray(f.entities)) {
        return f.entities.some((e) => e.toLowerCase() === target);
      }
      return false;
    });
  }, [allFields, entity]);

  const localValues = useMemo(() => {
    const result: Record<string, any> = {};
    if (Array.isArray(values)) {
      for (const item of values) {
        const key = item.customFieldId || item.id;
        if (key) {
          result[key] = item.value;
        }
      }
    } else if (values && typeof values === 'object') {
      Object.assign(result, values);
    }
    return result;
  }, [values]);

  const updateValue = (fieldId: string, val: any) => {
    if (readonly) return;
    const next = { ...localValues, [fieldId]: val };
    onChange?.(next);
  };

  if (fields.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <View style={styles.titleWrap}>
            <View style={[styles.iconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <SlidersHorizontal size={14} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          </View>
          <Badge variant="outline">{fields.length}</Badge>
        </View>
      )}

      <View style={styles.fieldsList}>
        {fields.map((field) => {
          const val = localValues[field.id];
          const hasError = errors[field.id];

          if (field.dataType === 'checkbox') {
            return (
              <View
                key={field.id}
                style={[
                  styles.checkboxRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.fieldLabelInline, { color: colors.foreground }]}>
                      {field.name}
                    </Text>
                    {field.isRequired ? <Asterisk size={11} color={colors.destructive} /> : null}
                  </View>
                  {field.placeholder ? (
                    <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                      {field.placeholder}
                    </Text>
                  ) : null}
                </View>
                <Switch
                  value={Boolean(val)}
                  onValueChange={(checked) => updateValue(field.id, checked)}
                  disabled={readonly}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            );
          }

          if (field.dataType === 'dropdown') {
            const options = Array.isArray(field.options) ? field.options : [];
            return (
              <View key={field.id} style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    {field.name}
                  </Text>
                  {field.isRequired ? <Asterisk size={11} color={colors.destructive} /> : null}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (readonly) return;
                    setDropdownSearch('');
                    setActiveDropdownField(field);
                  }}
                  style={[
                    styles.pickerButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: hasError ? colors.destructive : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                  disabled={readonly}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      { color: val ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {val || field.placeholder || `Select ${field.name.toLowerCase()}...`}
                  </Text>
                  <ChevronDown size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
                {hasError ? (
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{hasError}</Text>
                ) : null}
              </View>
            );
          }

          return (
            <View key={field.id} style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  {field.name}
                </Text>
                {field.isRequired ? <Asterisk size={11} color={colors.destructive} /> : null}
              </View>

              <TextInput
                value={val != null ? String(val) : ''}
                onChangeText={(text) => {
                  if (field.dataType === 'number') {
                    const num = text.trim() === '' ? null : Number(text);
                    updateValue(field.id, isNaN(num as any) ? text : num);
                  } else {
                    updateValue(field.id, text);
                  }
                }}
                keyboardType={field.dataType === 'number' ? 'numeric' : 'default'}
                placeholder={field.placeholder || (field.dataType === 'date' ? 'YYYY-MM-DD' : `Enter ${field.name.toLowerCase()}`)}
                placeholderTextColor={colors.mutedForeground}
                editable={!readonly}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: hasError ? colors.destructive : colors.border,
                    color: colors.foreground,
                  },
                ]}
              />

              {hasError ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{hasError}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Dropdown Options Modal */}
      {activeDropdownField && (
        <Modal
          visible={!!activeDropdownField}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveDropdownField(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    Select {activeDropdownField.name}
                  </Text>
                  <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                    Choose an option from the list
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveDropdownField(null)}>
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {activeDropdownField.options && activeDropdownField.options.length > 5 ? (
                <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    placeholder="Search options..."
                    placeholderTextColor={colors.mutedForeground}
                    value={dropdownSearch}
                    onChangeText={setDropdownSearch}
                    style={[styles.searchInput, { color: colors.foreground }]}
                  />
                </View>
              ) : null}

              <FlatList
                data={(activeDropdownField.options || []).filter((opt) =>
                  opt.toLowerCase().includes(dropdownSearch.toLowerCase())
                )}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.optionsList}
                renderItem={({ item }) => {
                  const isSelected = localValues[activeDropdownField.id] === item;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        updateValue(activeDropdownField.id, item);
                        setActiveDropdownField(null);
                      }}
                      style={[
                        styles.optionItem,
                        {
                          backgroundColor: isSelected ? colors.surfaceSubtle : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: colors.foreground,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {item}
                      </Text>
                      {isSelected ? <Check size={18} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldsList: {
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabelInline: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerButton: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  errorText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  searchBox: {
    margin: 16,
    marginBottom: 8,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  optionsList: {
    padding: 16,
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
});

