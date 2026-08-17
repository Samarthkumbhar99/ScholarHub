import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainerProps } from './types';

/**
 * ScreenContainer
 * Standard wrapper providing safe area padding, uniform background, and scroll handling
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  withSafeArea = true,
  className = '',
  contentContainerClassName = '',
  ...rest
}) => {
  const containerClass = `flex-1 bg-slate-50 ${className}`;

  if (scrollable) {
    return withSafeArea ? (
      <SafeAreaView className={containerClass}>
        <ScrollView
          className="flex-1"
          contentContainerClassName={`p-4 pb-12 ${contentContainerClassName}`}
          showsVerticalScrollIndicator={false}
          {...rest}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    ) : (
      <View className={containerClass}>
        <ScrollView
          className="flex-1"
          contentContainerClassName={`p-4 pb-12 ${contentContainerClassName}`}
          showsVerticalScrollIndicator={false}
          {...rest}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return withSafeArea ? (
    <SafeAreaView className={containerClass}>
      <View className={`flex-1 p-4 ${contentContainerClassName}`} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  ) : (
    <View className={containerClass}>
      <View className={`flex-1 p-4 ${contentContainerClassName}`} {...rest}>
        {children}
      </View>
    </View>
  );
};

export default ScreenContainer;
