import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { LoadingStateProps } from './types';
import { colors } from '../../theme';

/**
 * LoadingState
 * Standard loader placeholder for asynchronous network operations and screen transitions
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  subMessage,
  size = 'large',
  color = colors.primary[600],
  fullScreen = false,
  className = '',
}) => {
  if (fullScreen) {
    return (
      <View
        className={`flex-1 items-center justify-center bg-slate-50/95 p-6 ${className}`}
      >
        <View className="p-6 rounded-3xl bg-white border border-slate-100 shadow-md shadow-slate-200 items-center max-w-[280px]">
          <ActivityIndicator size={size} color={color} />
          {message && (
            <Text className="mt-4 text-base font-bold text-slate-800 text-center">
              {message}
            </Text>
          )}
          {subMessage && (
            <Text className="mt-1 text-xs text-slate-500 text-center">
              {subMessage}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className={`items-center justify-center p-6 my-4 ${className}`}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="mt-3 text-sm font-semibold text-slate-700 text-center">
          {message}
        </Text>
      )}
      {subMessage && (
        <Text className="mt-1 text-xs text-slate-400 text-center">
          {subMessage}
        </Text>
      )}
    </View>
  );
};

export const AppLoader = LoadingState;
export default LoadingState;
