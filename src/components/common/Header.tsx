import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { HeaderProps } from './types';

/**
 * Header
 * Standardized navigation and screen title header
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  leftAction,
  rightAction,
  borderBottom = true,
  className = '',
}) => {
  return (
    <View
      className={`flex-row items-center justify-between py-3 mb-4 ${
        borderBottom ? 'border-b border-slate-200' : ''
      } ${className}`}
    >
      <View className="flex-row items-center flex-1 mr-2">
        {leftAction ? (
          <View className="mr-3">{leftAction}</View>
        ) : showBack ? (
          <TouchableOpacity
            onPress={onBackPress}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="mr-3 h-10 w-10 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Text className="text-slate-800 font-bold text-base">←</Text>
          </TouchableOpacity>
        ) : null}

        <View className="flex-1">
          <Text className="text-xl font-extrabold text-slate-900" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs text-slate-500 font-medium mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction && <View className="ml-2 flex-row items-center">{rightAction}</View>}
    </View>
  );
};

export default Header;
