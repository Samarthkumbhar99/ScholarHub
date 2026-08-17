import React from 'react';
import { View, Text } from 'react-native';
import { ErrorStateProps } from './types';
import { AppButton } from '../buttons/AppButton';

/**
 * ErrorState
 * Standard error display component with title, message, and retry button
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something Went Wrong',
  message,
  onRetry,
  retryTitle = 'Try Again',
  secondaryActionTitle,
  onSecondaryAction,
  icon,
  className = '',
}) => {
  return (
    <View className={`items-center justify-center p-6 my-4 ${className}`}>
      {/* Error Graphic */}
      <View className="h-20 w-20 rounded-3xl bg-red-50 border border-red-100 items-center justify-center mb-4 shadow-sm shadow-red-500/10">
        {icon ? (
          icon
        ) : (
          <Text className="text-3xl">⚠️</Text>
        )}
      </View>

      {/* Title */}
      <Text className="text-lg font-bold text-slate-900 text-center mb-1.5">
        {title}
      </Text>

      {/* Message */}
      <Text className="text-sm text-slate-600 text-center leading-relaxed max-w-[280px] mb-5">
        {message}
      </Text>

      {/* Actions */}
      <View className="flex-row items-center gap-3">
        {Boolean(secondaryActionTitle && onSecondaryAction) ? (
          <AppButton
            title={secondaryActionTitle}
            variant="outline"
            size="md"
            onPress={onSecondaryAction}
          />
        ) : null}
        {Boolean(onRetry) ? (
          <AppButton
            title={retryTitle}
            variant="danger"
            size="md"
            onPress={onRetry}
          />
        ) : null}
      </View>
    </View>
  );
};

export default ErrorState;
