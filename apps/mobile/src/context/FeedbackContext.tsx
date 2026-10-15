import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CircleCheck,
  CircleAlert,
  Sparkles,
  Trash,
  LogOut,
  X,
  Info,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/typography';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: 'trash' | 'alert' | 'check' | 'info' | 'logout';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertDialogOptions {
  title: string;
  message?: string;
  buttonText?: string;
  type?: 'info' | 'error' | 'success';
  onClose?: () => void;
}

interface FeedbackContextType {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
  };
  confirm: (options: ConfirmDialogOptions) => void;
  alert: (title: string, message?: string, buttonText?: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

// Module-level global references so feedback can be triggered imperatively without hook if needed
let globalToast: FeedbackContextType['toast'] = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
};

let globalConfirm: (options: ConfirmDialogOptions) => void = () => {};
let globalAlert: (title: string, message?: string, buttonText?: string) => void = () => {};

export const toast = {
  success: (title: string, message?: string) => globalToast.success(title, message),
  error: (title: string, message?: string) => globalToast.error(title, message),
  info: (title: string, message?: string) => globalToast.info(title, message),
  warning: (title: string, message?: string) => globalToast.warning(title, message),
};

export const confirm = (options: ConfirmDialogOptions) => globalConfirm(options);
export const showAlert = (title: string, message?: string, buttonText?: string) => globalAlert(title, message, buttonText);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Toast state
  const [activeToast, setActiveToast] = useState<ToastOptions | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<any>(null);

  // Dialog state
  const [dialogState, setDialogState] = useState<{
    visible: boolean;
    isConfirm: boolean;
    options: ConfirmDialogOptions;
  }>({
    visible: false,
    isConfirm: true,
    options: { title: '' },
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const dialogScaleAnim = useRef(new Animated.Value(0.92)).current;
  const dialogFadeAnim = useRef(new Animated.Value(0)).current;

  // Animate toast in and out
  const hideToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setActiveToast(null);
    });
  }, [toastAnim]);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 3200) => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setActiveToast({ type, title, message });

      Animated.spring(toastAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();

      toastTimeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [toastAnim, hideToast]
  );

  const toastMethods = useRef({
    success: (title: string, message?: string) => showToast('success', title, message),
    error: (title: string, message?: string) => showToast('error', title, message),
    info: (title: string, message?: string) => showToast('info', title, message),
    warning: (title: string, message?: string) => showToast('warning', title, message),
  }).current;

  // Confirm / Alert Modal
  const openConfirm = useCallback((options: ConfirmDialogOptions) => {
    setDialogState({
      visible: true,
      isConfirm: true,
      options,
    });
    setConfirmLoading(false);
    dialogFadeAnim.setValue(0);
    dialogScaleAnim.setValue(0.92);
    Animated.parallel([
      Animated.timing(dialogFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(dialogScaleAnim, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [dialogFadeAnim, dialogScaleAnim]);

  const openAlert = useCallback((title: string, message?: string, buttonText = 'Got It') => {
    setDialogState({
      visible: true,
      isConfirm: false,
      options: {
        title,
        message,
        confirmText: buttonText,
      },
    });
    setConfirmLoading(false);
    dialogFadeAnim.setValue(0);
    dialogScaleAnim.setValue(0.92);
    Animated.parallel([
      Animated.timing(dialogFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(dialogScaleAnim, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [dialogFadeAnim, dialogScaleAnim]);

  const closeDialog = useCallback(() => {
    Animated.parallel([
      Animated.timing(dialogFadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(dialogScaleAnim, { toValue: 0.94, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setDialogState((prev) => ({ ...prev, visible: false }));
      setConfirmLoading(false);
    });
  }, [dialogFadeAnim, dialogScaleAnim]);

  const handleConfirmPress = async () => {
    if (dialogState.options.onConfirm) {
      try {
        setConfirmLoading(true);
        await dialogState.options.onConfirm();
      } catch (err) {
        console.error('Confirmation action error:', err);
      } finally {
        setConfirmLoading(false);
      }
    }
    closeDialog();
  };

  const handleCancelPress = () => {
    if (dialogState.options.onCancel) {
      dialogState.options.onCancel();
    }
    closeDialog();
  };

  // Keep globals updated
  useEffect(() => {
    globalToast = toastMethods;
    globalConfirm = openConfirm;
    globalAlert = openAlert;
  }, [toastMethods, openConfirm, openAlert]);

  const renderToastIcon = () => {
    if (!activeToast) return null;
    switch (activeToast.type) {
      case 'success':
        return <CircleCheck size={18} color={colors.success} strokeWidth={2.2} />;
      case 'error':
        return <CircleAlert size={18} color={colors.destructive} strokeWidth={2.2} />;
      case 'warning':
        return <CircleAlert size={18} color={colors.warning} strokeWidth={2.2} />;
      case 'info':
      default:
        return <Sparkles size={18} color={colors.primary} strokeWidth={2.2} />;
    }
  };

  const renderDialogIcon = () => {
    const { icon, destructive } = dialogState.options;
    if (icon === 'trash' || destructive) {
      return (
        <View style={[styles.dialogIconBadge, { backgroundColor: colors.destructive + '15' }]}>
          <Trash size={22} color={colors.destructive} strokeWidth={2.2} />
        </View>
      );
    }
    if (icon === 'logout') {
      return (
        <View style={[styles.dialogIconBadge, { backgroundColor: colors.destructive + '15' }]}>
          <LogOut size={22} color={colors.destructive} strokeWidth={2.2} />
        </View>
      );
    }
    if (icon === 'check') {
      return (
        <View style={[styles.dialogIconBadge, { backgroundColor: colors.success + '15' }]}>
          <CircleCheck size={22} color={colors.success} strokeWidth={2.2} />
        </View>
      );
    }
    if (icon === 'alert') {
      return (
        <View style={[styles.dialogIconBadge, { backgroundColor: colors.warning + '15' }]}>
          <CircleAlert size={22} color={colors.warning} strokeWidth={2.2} />
        </View>
      );
    }
    return (
      <View style={[styles.dialogIconBadge, { backgroundColor: colors.primary + '15' }]}>
        <Info size={22} color={colors.primary} strokeWidth={2.2} />
      </View>
    );
  };

  return (
    <FeedbackContext.Provider
      value={{
        toast: toastMethods,
        confirm: openConfirm,
        alert: openAlert,
      }}
    >
      {children}

      {/* Accountiva Toast Banner (Sonner-style floating card) */}
      {activeToast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrapper,
            {
              top: Math.max(insets.top, 14) + 8,
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-24, 0],
                  }),
                },
                {
                  scale: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideToast}
            style={[
              styles.toastCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: '#000000',
              },
            ]}
          >
            <View style={styles.toastLeftIcon}>{renderToastIcon()}</View>
            <View style={styles.toastTextContainer}>
              <Text style={[styles.toastTitle, { color: colors.foreground }]} numberOfLines={2}>
                {activeToast.title}
              </Text>
              {activeToast.message ? (
                <Text style={[styles.toastMessage, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {activeToast.message}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={hideToast} style={styles.toastCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Accountiva Themed Confirmation & Alert Dialog (Modal Dialog) */}
      <Modal
        visible={dialogState.visible}
        transparent
        animationType="none"
        onRequestClose={handleCancelPress}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: dialogFadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCancelPress}
          />
          <Animated.View
            style={[
              styles.dialogCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                transform: [{ scale: dialogScaleAnim }],
              },
            ]}
          >
            {renderDialogIcon()}

            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>
              {dialogState.options.title}
            </Text>

            {dialogState.options.message ? (
              <Text style={[styles.dialogMessage, { color: colors.mutedForeground }]}>
                {dialogState.options.message}
              </Text>
            ) : null}

            <View style={styles.dialogActions}>
              {dialogState.isConfirm && (
                <TouchableOpacity
                  style={[styles.dialogBtn, styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={handleCancelPress}
                  disabled={confirmLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>
                    {dialogState.options.cancelText || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.dialogBtn,
                  styles.confirmBtn,
                  {
                    backgroundColor: dialogState.options.destructive
                      ? colors.destructive
                      : colors.primary,
                    flex: dialogState.isConfirm ? 1 : undefined,
                    width: !dialogState.isConfirm ? '100%' : undefined,
                  },
                ]}
                onPress={handleConfirmPress}
                disabled={confirmLoading}
                activeOpacity={0.75}
              >
                {confirmLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      dialogState.options.destructive ? '#ffffff' : colors.primaryForeground
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.confirmBtnText,
                      {
                        color: dialogState.options.destructive
                          ? '#ffffff'
                          : colors.primaryForeground,
                      },
                    ]}
                  >
                    {dialogState.options.confirmText || (dialogState.isConfirm ? 'Confirm' : 'Got It')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
    gap: 12,
  },
  toastLeftIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
    letterSpacing: -0.1,
  },
  toastMessage: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
    lineHeight: 15,
  },
  toastCloseBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  dialogIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: fonts.bold,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  dialogMessage: {
    fontSize: 13,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 6,
  },
  dialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    width: '100%',
  },
  dialogBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semiBold,
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});

