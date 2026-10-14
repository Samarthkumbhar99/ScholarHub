import { Alert, Platform } from 'react-native';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Cross-platform confirmation dialog that functions properly on both React Native
 * mobile platforms (iOS/Android) and React Native Web (where Alert.alert is a no-op).
 */
export const showConfirmDialog = ({
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogOptions): void => {
  if (Platform.OS === 'web') {
    const promptText = title ? `${title}\n\n${message}` : message;
    const confirmed =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(promptText)
        : true;

    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      {
        text: confirmText,
        style: isDestructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);
  }
};

/**
 * Cross-platform alert message for errors, notifications, and informational prompts.
 */
export const showMessageDialog = (title: string, message?: string): void => {
  if (Platform.OS === 'web') {
    const text = title ? (message ? `${title}\n\n${message}` : title) : message || '';
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(text);
    }
  } else {
    Alert.alert(title, message);
  }
};
