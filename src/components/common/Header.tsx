import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
}

/**
 * Standardized top navigation and title bar for screens
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightAction,
}) => {
  return (
    <View className="flex-row items-center justify-between py-3 mb-4 border-b border-slate-200">
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity
            onPress={onBackPress}
            className="mr-3 p-2 rounded-full bg-slate-100 active:bg-slate-200"
            accessibilityLabel="Back"
          >
            <Text className="text-scholar-navy font-bold text-base">←</Text>
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-scholar-navy" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightAction && <View className="ml-2">{rightAction}</View>}
    </View>
  );
};

export default Header;
