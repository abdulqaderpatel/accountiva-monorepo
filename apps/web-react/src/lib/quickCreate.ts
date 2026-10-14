export type QuickCreateAction = 'invoice' | 'customer' | 'estimate' | 'item' | null;

let pendingAction: QuickCreateAction = null;
const listeners = new Set<(action: QuickCreateAction) => void>();

export const quickCreate = {
  trigger: (action: QuickCreateAction) => {
    pendingAction = action;
    listeners.forEach((l) => l(action));
  },
  consume: (expected?: QuickCreateAction): QuickCreateAction => {
    const action = pendingAction;
    if (expected && action !== expected) return null;
    pendingAction = null;
    return action;
  },
  subscribe: (listener: (action: QuickCreateAction) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
