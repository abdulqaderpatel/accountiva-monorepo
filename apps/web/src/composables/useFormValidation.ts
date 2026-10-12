import { ref, watch, type Ref } from 'vue';
import { z } from 'zod';

export function useFormValidation<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  state: Ref<T> | T
) {
  const errors = ref<Partial<Record<keyof T, string>>>({});
  const stateRef = ref(state) as Ref<T>;

  // Run validation on the entire form state
  const validate = (): boolean => {
    const result = schema.safeParse(stateRef.value);
    if (result.success) {
      errors.value = {};
      return true;
    }

    const formattedErrors: Partial<Record<keyof T, string>> = {};
    for (const issue of result.error.issues) {
      // Safely access the first path segment (the field name)
      const path = issue.path[0] as keyof T;
      if (path && !formattedErrors[path]) {
        formattedErrors[path] = issue.message;
      }
    }
    errors.value = formattedErrors;
    return false;
  };

  // Run validation on a single field
  const validateField = (field: keyof T): boolean => {
    const result = schema.safeParse(stateRef.value);
    if (result.success) {
      delete errors.value[field];
      return true;
    }

    const issue = result.error.issues.find((i) => i.path[0] === field);
    if (issue) {
      errors.value[field] = issue.message;
      return false;
    } else {
      delete errors.value[field];
      return true;
    }
  };

  const clearErrors = () => {
    errors.value = {};
  };

  // Watch state changes to dynamically clear/update errors in real time
  watch(
    () => stateRef.value,
    () => {
      // Only validate fields that currently have active error messages
      const activeErrorKeys = Object.keys(errors.value) as (keyof T)[];
      if (activeErrorKeys.length === 0) return;

      const result = schema.safeParse(stateRef.value);
      if (result.success) {
        errors.value = {};
        return;
      }

      activeErrorKeys.forEach((key) => {
        const issue = result.error.issues.find((i) => i.path[0] === key);
        if (!issue) {
          delete errors.value[key];
        } else {
          errors.value[key] = issue.message;
        }
      });
    },
    { deep: true }
  );

  return {
    errors,
    validate,
    validateField,
    clearErrors,
  };
}
