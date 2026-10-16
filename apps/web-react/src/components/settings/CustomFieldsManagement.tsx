import React, { useState, useEffect, useMemo } from "react";
import {
  SlidersHorizontal,
  Plus,
  Search,
  Type,
  Hash,
  Calendar,
  ListFilter,
  CheckSquare2,
  Printer,
  Edit2,
  Trash2,
  FileText,
  Building2,
  Package,
  Calculator,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { isFeatureEnabled } from "@accountiva/shared";
import api from "@/lib/api";
import { toast } from "sonner";

export interface CustomFieldRecord {
  id: string;
  name: string;
  dataType: "text" | "number" | "date" | "dropdown" | "checkbox";
  options?: string[] | null;
  entities: string[];
  printOnDocument: boolean;
  isRequired: boolean;
  isActive: boolean;
  placeholder?: string;
  orderIndex?: number;
}

const ALL_ENTITY_OPTIONS = [
  { id: "invoice", label: "Invoices", feature: "invoices", icon: FileText },
  { id: "estimate", label: "Estimates", feature: "estimates", icon: Calculator },
  { id: "credit_note", label: "Credit Notes", feature: "creditNotes", icon: Sparkles },
  { id: "customer", label: "Customers", feature: "customers", icon: Building2 },
  { id: "item", label: "Items / Catalog", feature: "items", icon: Package },
];

export function CustomFieldsManagement() {
  const [fields, setFields] = useState<CustomFieldRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDataType, setFormDataType] = useState<CustomFieldRecord["dataType"]>("text");
  const [formOptions, setFormOptions] = useState("");
  const [formEntities, setFormEntities] = useState<string[]>(["invoice"]);
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formPrintOnDoc, setFormPrintOnDoc] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPlaceholder, setFormPlaceholder] = useState("");

  const activeEntityOptions = useMemo(() => {
    return ALL_ENTITY_OPTIONS.filter((e) => isFeatureEnabled(e.feature as any));
  }, []);

  const fetchFields = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get<CustomFieldRecord[]>("/custom-fields");
      setFields(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error("Failed to fetch custom fields");
      setFields([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const openCreateModal = () => {
    setEditingField(null);
    setFormName("");
    setFormDataType("text");
    setFormOptions("");
    setFormEntities([activeEntityOptions[0]?.id || "invoice"]);
    setFormIsRequired(false);
    setFormPrintOnDoc(true);
    setFormIsActive(true);
    setFormPlaceholder("");
    setIsModalOpen(true);
  };

  const openEditModal = (f: CustomFieldRecord) => {
    setEditingField(f);
    setFormName(f.name);
    setFormDataType(f.dataType);
    setFormOptions(Array.isArray(f.options) ? f.options.join(", ") : "");
    setFormEntities(f.entities || []);
    setFormIsRequired(f.isRequired);
    setFormPrintOnDoc(f.printOnDocument);
    setFormIsActive(f.isActive);
    setFormPlaceholder(f.placeholder || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Field label is required");
      return;
    }
    if (formEntities.length === 0) {
      toast.error("Select at least one applicable entity");
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

    if (formDataType === "dropdown") {
      payload.options = formOptions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (payload.options.length === 0) {
        toast.error("Please provide comma-separated options for dropdown");
        return;
      }
    }

    try {
      setIsSaving(true);
      if (editingField) {
        await api.put(`/custom-fields/${editingField.id}`, payload);
        toast.success("Custom field updated successfully");
      } else {
        await api.post("/custom-fields", payload);
        toast.success("Custom field created successfully");
      }
      setIsModalOpen(false);
      fetchFields();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || "Failed to save field");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete custom field "${name}"?`)) return;
    try {
      await api.delete(`/custom-fields/${id}`);
      toast.success("Custom field deleted");
      fetchFields();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete custom field");
    }
  };

  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchesEntity =
        selectedEntity === "all" || (Array.isArray(f.entities) && f.entities.includes(selectedEntity));
      return matchesSearch && matchesEntity;
    });
  }, [fields, search, selectedEntity]);

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case "number":
        return <Hash className="size-3.5 text-blue-500" />;
      case "date":
        return <Calendar className="size-3.5 text-amber-500" />;
      case "dropdown":
        return <ListFilter className="size-3.5 text-violet-500" />;
      case "checkbox":
        return <CheckSquare2 className="size-3.5 text-emerald-500" />;
      default:
        return <Type className="size-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            Custom Fields & Metadata
          </CardTitle>
          <CardDescription className="text-xs">
            Extend your documents and records with custom tracking attributes and PDF document fields.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreateModal} className="gap-1.5 font-bold cursor-pointer">
          <Plus className="size-4" />
          <span>Add Custom Field</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search custom fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedEntity("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedEntity === "all"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All Entities
            </button>
            {activeEntityOptions.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEntity(e.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedEntity === e.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fields List */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : filteredFields.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No custom fields found"
            description="Add custom attributes to capture organization-specific metadata on invoices, quotes, or customers."
            actionLabel="Add Custom Field"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="py-2.5 px-3">Field Label</th>
                  <th className="py-2.5 px-3">Data Type</th>
                  <th className="py-2.5 px-3">Applies To</th>
                  <th className="py-2.5 px-3 text-center">Settings</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredFields.map((field) => (
                  <tr key={field.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-foreground">
                      {field.name}
                      {field.placeholder && (
                        <div className="text-[10px] font-normal text-muted-foreground">
                          Hint: {field.placeholder}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 capitalize font-medium text-foreground">
                        {getDataTypeIcon(field.dataType)}
                        <span>{field.dataType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {field.entities.map((ent) => (
                          <Badge key={ent} variant="secondary" className="text-[10px] capitalize">
                            {ent.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {field.isRequired && (
                          <Badge variant="destructive" className="text-[9px]">
                            Required
                          </Badge>
                        )}
                        {field.printOnDocument && (
                          <Badge variant="outline" className="text-[9px] gap-1">
                            <Printer className="size-2.5" /> PDF
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={field.isActive ? "success" : "secondary"} className="text-[10px]">
                        {field.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => openEditModal(field)}
                          title="Edit Field"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => handleDelete(field.id, field.name)}
                          title="Delete Field"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingField ? "Edit Custom Field" : "Create Custom Field"}
        description="Add a personalized field to capture specific business data across records."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customFieldName">Field Label *</Label>
            <Input
              id="customFieldName"
              placeholder="e.g. Purchase Order #, Vehicle No, Project Code"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="customFieldDataType">Data Type</Label>
              <select
                id="customFieldDataType"
                value={formDataType}
                onChange={(e) => setFormDataType(e.target.value as any)}
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="text">Text (Single Line)</option>
                <option value="number">Numeric (Digits / Quantities)</option>
                <option value="date">Date (Picker)</option>
                <option value="dropdown">Dropdown (Selection)</option>
                <option value="checkbox">Checkbox (Yes / No)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customFieldPlaceholder">Placeholder / Hint</Label>
              <Input
                id="customFieldPlaceholder"
                placeholder="Optional input prompt..."
                value={formPlaceholder}
                onChange={(e) => setFormPlaceholder(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {formDataType === "dropdown" && (
            <div className="space-y-1.5">
              <Label htmlFor="customFieldOptions">Dropdown Options (Comma separated) *</Label>
              <Input
                id="customFieldOptions"
                placeholder="Option 1, Option 2, Option 3"
                value={formOptions}
                onChange={(e) => setFormOptions(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          )}

          {/* Applicable Modules Multi-select */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label>Applicable Modules *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeEntityOptions.map((e) => {
                const checked = formEntities.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      checked
                        ? "border-primary bg-primary/5 text-foreground font-semibold"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setFormEntities(formEntities.filter((x) => x !== e.id));
                        } else {
                          setFormEntities([...formEntities, e.id]);
                        }
                      }}
                      className="rounded accent-primary"
                    />
                    <span>{e.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Options Toggles */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={formIsRequired}
                onChange={(e) => setFormIsRequired(e.target.checked)}
                className="rounded accent-primary"
              />
              <span>Mark as Mandatory (Required field)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={formPrintOnDoc}
                onChange={(e) => setFormPrintOnDoc(e.target.checked)}
                className="rounded accent-primary"
              />
              <span>Display on Generated PDF / Invoices</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded accent-primary"
              />
              <span>Field is Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="font-bold">
              {isSaving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Save Field"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
