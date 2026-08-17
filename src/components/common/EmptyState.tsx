import React from 'react';
import { View, Text } from 'react-native';
import { EmptyStateProps } from './types';
import { AppButton } from '../buttons/AppButton';

/**
 * EmptyState
 * Reusable placeholder view when search queries, lists, or saved items are empty
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionTitle,
  onActionPress,
  actionVariant = 'primary',
  className = '',
}) => {
  return (
    <View className={`items-center justify-center p-6 my-4 ${className}`}>
      {/* Icon Graphic Container */}
      <View className="h-20 w-20 rounded-3xl bg-blue-50 border border-blue-100 items-center justify-center mb-4 shadow-sm shadow-blue-500/10">
        {icon ? (
          icon
        ) : (
          <Text className="text-3xl">📂</Text>
        )}
      </View>

      {/* Heading */}
      <Text className="text-lg font-bold text-slate-900 text-center mb-1.5">
        {title}
      </Text>

      {/* Description */}
      {Boolean(description) ? (
        <Text className="text-sm text-slate-500 text-center leading-relaxed max-w-[280px] mb-5">
          {description}
        </Text>
      ) : null}

      {/* Action CTA Button */}
      {Boolean(actionTitle && onActionPress) ? (
        <AppButton
          title={actionTitle}
          variant={actionVariant}
          size="md"
          onPress={onActionPress}
          className="mt-1"
        />
      ) : null}
    </View>
  );
};

export default EmptyState;
