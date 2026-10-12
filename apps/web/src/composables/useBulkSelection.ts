import { ref, computed, type Ref, type ComputedRef } from 'vue';

export function useBulkSelection<T = any>(
  items: Ref<T[]> | ComputedRef<T[]>,
  getId: (item: T) => string = (item: any) => item.id
) {
  const selectedIds = ref<Set<string>>(new Set());

  const selectedCount = computed(() => selectedIds.value.size);

  const selectedItems = computed(() => {
    return items.value.filter((item) => selectedIds.value.has(getId(item)));
  });

  const isSelected = (id: string) => {
    return selectedIds.value.has(id);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedIds.value = next;
  };

  const isAllSelected = computed(() => {
    if (items.value.length === 0) return false;
    return items.value.every((item) => selectedIds.value.has(getId(item)));
  });

  const isIndeterminate = computed(() => {
    if (items.value.length === 0) return false;
    const countOnPage = items.value.filter((item) => selectedIds.value.has(getId(item))).length;
    return countOnPage > 0 && countOnPage < items.value.length;
  });

  const toggleSelectAll = () => {
    const allIdsOnPage = items.value.map(getId);
    const next = new Set(selectedIds.value);

    if (isAllSelected.value) {
      // Unselect all items on current view
      allIdsOnPage.forEach((id) => next.delete(id));
    } else {
      // Select all items on current view
      allIdsOnPage.forEach((id) => next.add(id));
    }
    selectedIds.value = next;
  };

  const selectAll = (customIds?: string[]) => {
    const ids = customIds || items.value.map(getId);
    const next = new Set(selectedIds.value);
    ids.forEach((id) => next.add(id));
    selectedIds.value = next;
  };

  const clearSelection = () => {
    selectedIds.value = new Set();
  };

  return {
    selectedIds,
    selectedCount,
    selectedItems,
    isSelected,
    toggleSelect,
    isAllSelected,
    isIndeterminate,
    toggleSelectAll,
    selectAll,
    clearSelection,
  };
}

