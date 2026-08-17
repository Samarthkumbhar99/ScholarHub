import React from 'react';
import { View, Text } from 'react-native';
import { DividerProps } from './types';

/**
 * Divider
 * Horizontal separator with optional centered text label
 */
export const Divider: React.FC<DividerProps> = ({
  label,
  spacing = 'md',
  className = '',
  textClassName = '',
}) => {
  const getSpacingClass = () => {
    switch (spacing) {
      case 'sm':
        return 'my-2';
      case 'lg':
        return 'my-6';
      case 'md':
      default:
        return 'my-4';
    }
  };

  if (label) {
    return (
      <View className={`flex-row items-center w-full ${getSpacingClass()} ${className}`}>
        <View className="flex-1 h-[1px] bg-slate-200" />
        <Text
          className={`mx-3 text-xs font-bold text-slate-400 uppercase tracking-wider ${textClassName}`}
        >
          {label}
        </Text>
        <View className="flex-1 h-[1px] bg-slate-200" />
      </View>
    );
  }

  return <View className={`w-full h-[1px] bg-slate-200 ${getSpacingClass()} ${className}`} />;
};

export default Divider;
