import React, { useState, useEffect, useMemo } from "react";
import { api } from "@accountiva/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Asterisk, SlidersHorizontal } from "lucide-react";

export type CustomFieldDataType = "text" | "number" | "date" | "dropdown" | "checkbox";

export interface CustomField {
  id: string;
  entity: string;
  name: string;
  dataType: CustomFieldDataType;
  isRequired?: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: any;
}

export interface CustomFieldRendererProps {
  entity: string;
  value?: Record<string, any> | Array<{ customFieldId: string; value: any; id?: string }>;
  onChange?: (value: Record<string, any>) => void;
  errors?: Record<string, string>;
  readonly?: boolean;
  title?: string;
  showTitle?: boolean;
}

export const CustomFieldRenderer: React.FC<CustomFieldRendererProps> = ({
  entity,
  value,
  onChange,
  errors = {},
  readonly = false,
  title = "Custom Fields",
  showTitle = true,
}) => {
  const [allFields, setAllFields] = useState<CustomField[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.get<CustomField[]>("/custom-fields")
      .then(({ data }) => {
        if (isMounted && Array.isArray(data)) {
          setAllFields(data);
        }
      })
      .catch(() => {
        // Silently catch if not enabled
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const fields = useMemo(() => {
    return allFields.filter(
      (f) => String(f.entity).toLowerCase() === String(entity).toLowerCase()
    );
  }, [allFields, entity]);

  // Normalize value into a dictionary { [fieldId]: val }
  const localValues = useMemo(() => {
    const result: Record<string, any> = {};
    if (Array.isArray(value)) {
      for (const item of value) {
        const key = item.customFieldId || item.id;
        if (key) {
          result[key] = item.value;
        }
      }
    } else if (value && typeof value === "object") {
      Object.assign(result, value);
    }
    return result;
  }, [value]);

  const updateFieldValue = (fieldId: string, val: any) => {
    const next = { ...localValues, [fieldId]: val };
    onChange?.(next);
  };

  const getDropdownOptions = (field: CustomField) => {
    if (!field.options || !Array.isArray(field.options)) return [];
    return field.options.map((opt) => ({
      id: opt,
      name: opt,
    }));
  };

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4 pt-2">
      {/* Header / Divider */}
      {showTitle && (
        <div className="flex items-center gap-2 pb-1 border-b border-border">
          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <h4 className="text-xs md:text-sm font-semibold text-foreground">
            {title}
          </h4>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {fields.length}
          </span>
        </div>
      )}

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => {
          const isCheckbox = field.dataType === "checkbox";
          const fieldValue = localValues[field.id];

          return (
            <div
              key={field.id}
              className={`space-y-1.5 ${
                isCheckbox
                  ? "flex flex-row items-center justify-between gap-3 p-3 rounded-md border border-border bg-card"
                  : ""
              }`}
            >
              {!isCheckbox && (
                <Label
                  htmlFor={`cf-${field.id}`}
                  className="text-xs font-medium text-foreground flex items-center gap-1"
                >
                  <span>{field.name}</span>
                  {field.isRequired && (
                    <Asterisk className="w-3 h-3 text-destructive" />
                  )}
                </Label>
              )}

              {/* TEXT Field */}
              {field.dataType === "text" && (
                <Input
                  id={`cf-${field.id}`}
                  value={fieldValue ?? ""}
                  onChange={(e) => updateFieldValue(field.id, e.target.value)}
                  placeholder={
                    field.placeholder || `Enter ${field.name.toLowerCase()}`
                  }
                  disabled={readonly}
                  error={errors[field.id]}
                  className="h-9 text-xs"
                />
              )}

              {/* NUMBER Field */}
              {field.dataType === "number" && (
                <Input
                  id={`cf-${field.id}`}
                  type="number"
                  value={fieldValue ?? ""}
                  onChange={(e) =>
                    updateFieldValue(
                      field.id,
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  placeholder={field.placeholder || "0"}
                  disabled={readonly}
                  error={errors[field.id]}
                  className="h-9 text-xs"
                />
              )}

              {/* DATE Field */}
              {field.dataType === "date" && (
                <DatePicker
                  value={fieldValue ?? ""}
                  onChange={(val) => updateFieldValue(field.id, val)}
                  disabled={readonly}
                  error={errors[field.id]}
                  className="h-9 text-xs"
                />
              )}

              {/* DROPDOWN Field */}
              {field.dataType === "dropdown" && (
                <Select
                  value={fieldValue ?? ""}
                  onChange={(val) => updateFieldValue(field.id, val)}
                  options={getDropdownOptions(field)}
                  placeholder={
                    field.placeholder || `Select ${field.name.toLowerCase()}`
                  }
                  disabled={readonly}
                  className="w-full text-xs"
                />
              )}

              {/* CHECKBOX Field */}
              {isCheckbox && (
                <>
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`cf-${field.id}`}
                      className="text-xs font-medium text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      <span>{field.name}</span>
                      {field.isRequired && (
                        <Asterisk className="w-3 h-3 text-destructive" />
                      )}
                    </Label>
                    {field.placeholder && (
                      <p className="text-[10px] text-muted-foreground">
                        {field.placeholder}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={`cf-${field.id}`}
                    checked={Boolean(fieldValue)}
                    onCheckedChange={(checked) =>
                      updateFieldValue(field.id, checked)
                    }
                    disabled={readonly}
                    className="data-[state=checked]:bg-primary cursor-pointer shrink-0"
                  />
                </>
              )}

              {errors[field.id] && (
                <p className="text-xs text-destructive font-medium">
                  {errors[field.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomFieldRenderer;
