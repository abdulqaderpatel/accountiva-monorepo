import { defineStore } from 'pinia';
import { ref } from 'vue';

export type QuickCreateAction = 'invoice' | 'expense' | 'customer' | 'estimate' | 'project' | null;

/**
 * Lightweight store to signal a "quick create" intent from the TopBar.
 * The target view watches `pendingAction` on mount and opens its form automatically.
 */
export const useQuickCreateStore = defineStore('quickCreate', () => {
  const pendingAction = ref<QuickCreateAction>(null);
  const actionToken = ref(0);

  const trigger = (action: QuickCreateAction) => {
    pendingAction.value = action;
    actionToken.value++;
  };

  const consume = (expectedAction?: QuickCreateAction): QuickCreateAction => {
    const action = pendingAction.value;
    if (expectedAction && action !== expectedAction) {
      return null;
    }
    pendingAction.value = null;
    return action;
  };

  return { pendingAction, actionToken, trigger, consume };
});
