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
  X,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { PlanUpgradeCard } from "@/components/ui/PlanUpgradeCard";
import { UpgradePlanModal } from "@/components/ui/UpgradePlanModal";
import { isFeatureEnabled } from "@accountiva/shared";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

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

const DATA_TYPE_OPTIONS: Array<{
  id: CustomFieldRecord["dataType"];
  label: string;
  description: string;
  icon: any;
}> = [
  { id: "text", label: "Text", description: "Single line text, notes", icon: Type },
  { id: "number", label: "Number", description: "Numeric values, counters", icon: Hash },
  { id: "date", label: "Date", description: "Calendar date picker", icon: Calendar },
  { id: "dropdown", label: "Dropdown", description: "List of options", icon: ListFilter },
  { id: "checkbox", label: "Checkbox", description: "Yes / No binary toggle", icon: CheckSquare2 },
];

export function CustomFieldsManagement() {
  const { currentOrganization } = useAuth();
  const currentOrgId = currentOrganization?.id;

  const [fields, setFields] = useState<CustomFieldRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [customFieldPlanError, setCustomFieldPlanError] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDataType, setFormDataType] = useState<CustomFieldRecord["dataType"]>("text");
  const [dropdownOptionsList, setDropdownOptionsList] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");
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
    setFields([]);
    setIsModalOpen(false);
    setEditingField(null);
    fetchFields();
  }, [currentOrgId]);

  const openCreateModal = () => {
    setEditingField(null);
    setFormName("");
    setFormDataType("text");
    setDropdownOptionsList([]);
    setNewOptionInput("");
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
    setDropdownOptionsList(Array.isArray(f.options) ? f.options : []);
    setNewOptionInput("");
    setFormEntities(f.entities || []);
    setFormIsRequired(f.isRequired);
    setFormPrintOnDoc(f.printOnDocument);
    setFormIsActive(f.isActive);
    setFormPlaceholder(f.placeholder || "");
    setIsModalOpen(true);
  };

  const addDropdownOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (dropdownOptionsList.includes(trimmed)) {
      toast.error("Option already exists");
      return;
    }
    setDropdownOptionsList([...dropdownOptionsList, trimmed]);
    setNewOptionInput("");
  };

  const removeDropdownOption = (index: number) => {
    setDropdownOptionsList(dropdownOptionsList.filter((_, i) => i !== index));
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
      if (dropdownOptionsList.length === 0) {
        toast.error("Please add at least one dropdown option");
        return;
      }
      payload.options = dropdownOptionsList;
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
      setCustomFieldPlanError(null);
      fetchFields();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to save field";
      const isLimit =
        err.response?.status === 403 &&
        (errorMsg.toLowerCase().includes("limit") ||
          errorMsg.toLowerCase().includes("plan") ||
          errorMsg.toLowerCase().includes("upgrade"));
      if (isLimit) {
        setCustomFieldPlanError(errorMsg);
        setIsModalOpen(false);
        setIsUpgradeModalOpen(true);
      } else {
        setCustomFieldPlanError(null);
        toast.error(errorMsg);
      }
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
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <TableHead className="py-2.5 px-3">Field Label</TableHead>
                  <TableHead className="py-2.5 px-3">Data Type</TableHead>
                  <TableHead className="py-2.5 px-3">Applies To</TableHead>
                  <TableHead className="py-2.5 px-3 text-center">Settings</TableHead>
                  <TableHead className="py-2.5 px-3 text-center">Status</TableHead>
                  <TableHead className="py-2.5 px-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFields.map((field) => (
                  <TableRow key={field.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-3 font-semibold text-foreground">
                      {field.name}
                      {field.placeholder && (
                        <div className="text-[10px] font-normal text-muted-foreground">
                          Hint: {field.placeholder}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-3">
                      <div className="flex items-center gap-1.5 capitalize font-medium text-foreground">
                        {getDataTypeIcon(field.dataType)}
                        <span>{field.dataType}</span>
                        {field.dataType === "dropdown" && field.options?.length ? (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ({field.options.length})
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {field.entities.map((ent) => (
                          <Badge key={ent} variant="secondary" className="text-[10px] capitalize">
                            {ent.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-3 text-center">
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
                    </TableCell>
                    <TableCell className="py-3 px-3 text-center">
                      <Badge variant={field.isActive ? "success" : "secondary"} className="text-[10px]">
                        {field.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-3 text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Custom Field" : "Create Custom Field"}
            </DialogTitle>
            <DialogDescription>
              Add a personalized field to capture specific business data across records.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {customFieldPlanError && (
              <PlanUpgradeCard
                title="Custom Fields Require Professional"
                description={customFieldPlanError}
                dismissible={true}
                onDismiss={() => setCustomFieldPlanError(null)}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="customFieldName">
                  Field Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customFieldName"
                  placeholder="e.g. Purchase Order #"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              {formDataType !== "checkbox" && (
                <div className="space-y-1.5">
                  <Label htmlFor="customFieldPlaceholder">
                    Hint / Placeholder <span className="text-[10px] text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="customFieldPlaceholder"
                    placeholder="e.g. Enter PO number..."
                    value={formPlaceholder}
                    onChange={(e) => setFormPlaceholder(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            {/* Data Type Selection Grid */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Data Type <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-5 gap-1.5">
                {DATA_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = formDataType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormDataType(opt.id)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 group ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30 shadow-2xs"
                          : "border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-[11px] font-semibold block leading-tight">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dropdown Options Builder */}
            {formDataType === "dropdown" && (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-primary" />
                    <span>Dropdown Options</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Press Enter or click Add</span>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDropdownOption();
                      }
                    }}
                    placeholder="Type option name..."
                    className="h-8 text-xs bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDropdownOption}
                    className="h-8 px-3 text-xs gap-1 shrink-0 cursor-pointer"
                  >
                    Add
                  </Button>
                </div>

                {dropdownOptionsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {dropdownOptionsList.map((opt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-xs text-foreground"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => removeDropdownOption(idx)}
                          className="hover:text-destructive cursor-pointer"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Applicable Modules */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="text-xs">
                Applicable Modules <span className="text-destructive">*</span>
              </Label>
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
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => {
                          if (val) {
                            setFormEntities([...formEntities, e.id]);
                          } else {
                            setFormEntities(formEntities.filter((x) => x !== e.id));
                          }
                        }}
                      />
                      <span>{e.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Field Options Switches */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold cursor-pointer">Required Field</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Must be populated before record can be saved
                  </p>
                </div>
                <Switch
                  checked={formIsRequired}
                  onCheckedChange={setFormIsRequired}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold cursor-pointer">Print on Documents</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Show this custom attribute on generated invoice / quote PDFs
                  </p>
                </div>
                <Switch
                  checked={formPrintOnDoc}
                  onCheckedChange={setFormPrintOnDoc}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold cursor-pointer">Active</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Inactive fields are hidden from create / edit forms
                  </p>
                </div>
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="gap-1.5 cursor-pointer"
              >
                {isSaving && <Loader2 className="size-3.5 animate-spin" />}
                <span>{editingField ? "Save Changes" : "Create Field"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <UpgradePlanModal
        open={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        feature="custom_fields"
        title="Custom Fields Require Professional"
        description={
          customFieldPlanError ||
          "Custom fields are exclusive to the Professional plan. Upgrade now to capture unique business data across your invoices, items, and customers."
        }
      />
    </Card>
  );
}
