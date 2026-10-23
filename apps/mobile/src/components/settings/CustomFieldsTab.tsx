import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Type,
  Hash,
  Calendar,
  ListFilter,
  CheckSquare2,
  Search,
  FileText,
  Building2,
  Package,
  Calculator,
  Sparkles,
} from 'lucide-react-native';
import api from '@accountiva/api';
import { useTheme } from '../../theme/ThemeContext';
import { toast, confirm } from '../../context/FeedbackContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { fonts } from '../../theme/typography';
import { useAuth } from '../../context/AuthContext';

export interface CustomFieldRecord {
  id: string;
  name: string;
  dataType: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
  options?: string[] | null;
  entities: string[];
  printOnDocument: boolean;
  isRequired: boolean;
  isActive: boolean;
  placeholder?: string;
  orderIndex?: number;
}

const ENTITY_CONFIGS = [
  { id: 'all', label: 'All Entities' },
  { id: 'invoice', label: 'Invoices' },
  { id: 'estimate', label: 'Estimates' },
  { id: 'credit_note', label: 'Credit Notes' },
  { id: 'customer', label: 'Customers' },
  { id: 'item', label: 'Items' },
];

const DATA_TYPES: Array<{
  id: CustomFieldRecord['dataType'];
  label: string;
  desc: string;
  icon: any;
}> = [
  { id: 'text', label: 'Text', desc: 'Single-line text or note', icon: Type },
  { id: 'number', label: 'Number', desc: 'Numeric amount or count', icon: Hash },
  { id: 'date', label: 'Date', desc: 'Calendar date value', icon: Calendar },
  { id: 'dropdown', label: 'Dropdown', desc: 'Select from option list', icon: ListFilter },
  { id: 'checkbox', label: 'Checkbox', desc: 'Yes / No binary toggle', icon: CheckSquare2 },
];

export function CustomFieldsTab() {
  const { colors } = useTheme();
  const { currentOrg } = useAuth();
  const currentOrgId = currentOrg?.id;

  const [fields, setFields] = useState<CustomFieldRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDataType, setFormDataType] = useState<CustomFieldRecord['dataType']>('text');
  const [formEntities, setFormEntities] = useState<string[]>(['invoice']);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState('');
  const [formPlaceholder, setFormPlaceholder] = useState('');
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formPrintOnDoc, setFormPrintOnDoc] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<CustomFieldRecord[]>('/custom-fields');
      setFields(Array.isArray(data) ? data : []);
    } catch {
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    setFields([]);
    setIsModalOpen(false);
    setEditingField(null);
    fetchFields();
  }, [fetchFields]);

  const openCreateModal = () => {
    setEditingField(null);
    setFormName('');
    setFormDataType('text');
    setFormEntities(['invoice']);
    setDropdownOptions([]);
    setNewOptionText('');
    setFormPlaceholder('');
    setFormIsRequired(false);
    setFormPrintOnDoc(true);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (field: CustomFieldRecord) => {
    setEditingField(field);
    setFormName(field.name);
    setFormDataType(field.dataType);
    setFormEntities(field.entities || []);
    setDropdownOptions(Array.isArray(field.options) ? field.options : []);
    setNewOptionText('');
    setFormPlaceholder(field.placeholder || '');
    setFormIsRequired(Boolean(field.isRequired));
    setFormPrintOnDoc(Boolean(field.printOnDocument));
    setFormIsActive(field.isActive !== false);
    setIsModalOpen(true);
  };

  const toggleEntitySelection = (entityId: string) => {
    setFormEntities((prev) =>
      prev.includes(entityId) ? prev.filter((e) => e !== entityId) : [...prev, entityId]
    );
  };

  const addDropdownOption = () => {
    const trimmed = newOptionText.trim();
    if (!trimmed) return;
    if (dropdownOptions.includes(trimmed)) {
      toast.error('Duplicate', 'This option is already added');
      return;
    }
    setDropdownOptions((prev) => [...prev, trimmed]);
    setNewOptionText('');
  };

  const removeDropdownOption = (index: number) => {
    setDropdownOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Validation Error', 'Field label is required');
      return;
    }

    if (formEntities.length === 0) {
      toast.error('Validation Error', 'Select at least one applicable entity');
      return;
    }

    if (formDataType === 'dropdown' && dropdownOptions.length === 0) {
      toast.error('Validation Error', 'Add at least one dropdown option');
      return;
    }

    const payload: any = {
      name: formName.trim(),
      dataType: formDataType,
      entities: formEntities,
      isRequired: formIsRequired,
      printOnDocument: formPrintOnDoc,
      isActive: formIsActive,
      placeholder: formPlaceholder.trim() || undefined,
    };

    if (formDataType === 'dropdown') {
      payload.options = dropdownOptions;
    }

    try {
      setSaving(true);
      if (editingField) {
        await api.put(`/custom-fields/${editingField.id}`, payload);
        toast.success('Field Updated', `${formName} updated successfully`);
      } else {
        await api.post('/custom-fields', payload);
        toast.success('Field Created', `${formName} created successfully`);
      }
      setIsModalOpen(false);
      fetchFields();
    } catch (err: any) {
      toast.error(
        'Save Failed',
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not save custom field'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (field: CustomFieldRecord) => {
    confirm({
      title: 'Delete Custom Field',
      message: `Are you sure you want to delete "${field.name}"? Values stored under this field will no longer be visible on forms.`,
      confirmText: 'Delete Field',
      destructive: true,
      icon: 'trash',
      onConfirm: async () => {
        try {
          await api.delete(`/custom-fields/${field.id}`);
          toast.success('Field Deleted', `${field.name} was removed`);
          setFields((prev) => prev.filter((f) => f.id !== field.id));
        } catch (err: any) {
          toast.error(
            'Delete Failed',
            err.response?.data?.error || err.response?.data?.message || err.message || 'Could not delete field'
          );
        }
      },
    });
  };

  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchesEntity =
        selectedEntity === 'all' || (Array.isArray(f.entities) && f.entities.includes(selectedEntity));
      return matchesSearch && matchesEntity;
    });
  }, [fields, search, selectedEntity]);

  const renderDataTypeIcon = (type: string) => {
    switch (type) {
      case 'number':
        return <Hash size={14} color="#3b82f6" />;
      case 'date':
        return <Calendar size={14} color="#f59e0b" />;
      case 'dropdown':
        return <ListFilter size={14} color="#8b5cf6" />;
      case 'checkbox':
        return <CheckSquare2 size={14} color="#10b981" />;
      default:
        return <Type size={14} color={colors.mutedForeground} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Custom Fields</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {fields.length} {fields.length === 1 ? 'custom field' : 'custom fields'} configured
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 4 }} />
          <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>New Field</Text>
        </TouchableOpacity>
      </View>

      {/* Entity Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {ENTITY_CONFIGS.map((ent) => {
          const isSelected = selectedEntity === ent.id;
          return (
            <TouchableOpacity
              key={ent.id}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedEntity(ent.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color: isSelected ? colors.primaryForeground : colors.foreground,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {ent.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Fields List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading && fields.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Loading custom fields...
            </Text>
          </View>
        ) : filteredFields.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No Custom Fields"
            description="Create custom attributes to track unique information across invoices, items, and customers."
            actionLabel="Create Custom Field"
            onAction={openCreateModal}
          />
        ) : (
          filteredFields.map((field) => (
            <Card key={field.id} style={styles.fieldCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleWrap}>
                  <View style={[styles.dataTypeIconBox, { backgroundColor: colors.surfaceSubtle }]}>
                    {renderDataTypeIcon(field.dataType)}
                  </View>
                  <View>
                    <Text style={[styles.fieldName, { color: colors.foreground }]}>{field.name}</Text>
                    <Text style={[styles.fieldMeta, { color: colors.mutedForeground }]}>
                      Type: {field.dataType.toUpperCase()} {field.isRequired ? '• Required' : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => openEditModal(field)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Edit2 size={16} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(field)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Entity Badges */}
              <View style={styles.entitiesWrap}>
                {(field.entities || []).map((ent) => (
                  <Badge key={ent} variant="outline">
                    {ent.charAt(0).toUpperCase() + ent.slice(1).replace('_', ' ')}
                  </Badge>
                ))}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editingField ? 'Edit Custom Field' : 'New Custom Field'}
                </Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                  Configure attribute label, data type, and target screens
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent} showsVerticalScrollIndicator={false}>
              {/* Field Label */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Field Label *</Text>
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Purchase Order #, Delivery Date"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              {/* Data Type */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Data Type</Text>
                <View style={styles.dataTypeGrid}>
                  {DATA_TYPES.map((dt) => {
                    const isSelected = formDataType === dt.id;
                    return (
                      <TouchableOpacity
                        key={dt.id}
                        onPress={() => setFormDataType(dt.id)}
                        style={[
                          styles.dataTypePill,
                          {
                            backgroundColor: isSelected ? colors.surfaceSubtle : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        {renderDataTypeIcon(dt.id)}
                        <Text
                          style={[
                            styles.dataTypeText,
                            { color: colors.foreground, fontWeight: isSelected ? '700' : '500' },
                          ]}
                        >
                          {dt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Applicable Entities */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Applicable Modules *</Text>
                <View style={styles.entitiesGrid}>
                  {ENTITY_CONFIGS.filter((e) => e.id !== 'all').map((e) => {
                    const isSelected = formEntities.includes(e.id);
                    return (
                      <TouchableOpacity
                        key={e.id}
                        onPress={() => toggleEntitySelection(e.id)}
                        style={[
                          styles.entityChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        {isSelected ? (
                          <Check size={14} color={colors.primaryForeground} style={{ marginRight: 4 }} />
                        ) : null}
                        <Text
                          style={[
                            styles.entityChipText,
                            { color: isSelected ? colors.primaryForeground : colors.foreground },
                          ]}
                        >
                          {e.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Dropdown Options Input */}
              {formDataType === 'dropdown' ? (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Dropdown Options *</Text>
                  <View style={styles.addOptionRow}>
                    <TextInput
                      value={newOptionText}
                      onChangeText={setNewOptionText}
                      placeholder="Add an option..."
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          color: colors.foreground,
                        },
                      ]}
                    />
                    <TouchableOpacity
                      onPress={addDropdownOption}
                      style={[styles.addOptionBtn, { backgroundColor: colors.primary }]}
                    >
                      <Plus size={18} color={colors.primaryForeground} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.optionsChipsWrap}>
                    {dropdownOptions.map((opt, idx) => (
                      <View
                        key={idx}
                        style={[styles.optionChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                      >
                        <Text style={[styles.optionChipText, { color: colors.foreground }]}>{opt}</Text>
                        <TouchableOpacity onPress={() => removeDropdownOption(idx)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <X size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Placeholder */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Placeholder / Hint</Text>
                <TextInput
                  value={formPlaceholder}
                  onChangeText={setFormPlaceholder}
                  placeholder="Optional input prompt..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                />
              </View>

              {/* Switches */}
              <View style={[styles.switchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabel, { color: colors.foreground }]}>Required Field</Text>
                    <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
                      Mandatory before saving record
                    </Text>
                  </View>
                  <Switch
                    value={formIsRequired}
                    onValueChange={setFormIsRequired}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabel, { color: colors.foreground }]}>Print on Invoices / Documents</Text>
                    <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
                      Display on exported PDFs and public share views
                    </Text>
                  </View>
                  <Switch
                    value={formPrintOnDoc}
                    onValueChange={setFormPrintOnDoc}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                    {editingField ? 'Update Field' : 'Create Custom Field'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
    marginTop: 8,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  fieldCard: {
    padding: 14,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dataTypeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  fieldMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 4,
  },
  entitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '85%',
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
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  modalFormContent: {
    padding: 16,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  dataTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dataTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dataTypeText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  entitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  entityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  entityChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  addOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addOptionBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  switchCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  switchSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  saveBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
