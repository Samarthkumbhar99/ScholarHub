import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export interface AppLoaderProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  message = 'Loading...',
  size = 'large',
  color = '#1D4ED8',
  fullScreen = false,
}) => {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-white/90 p-6">
        <ActivityIndicator size={size} color={color} />
        {message && (
          <Text className="mt-3 text-sm font-medium text-slate-600 text-center">
            {message}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="items-center justify-center p-4">
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="mt-2 text-xs font-medium text-slate-500 text-center">
          {message}
        </Text>
      )}
    </View>
  );
};

export default AppLoader;
