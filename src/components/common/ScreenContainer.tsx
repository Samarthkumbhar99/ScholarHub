import React from 'react';
import { View, ScrollView, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
  contentContainerClassName?: string;
  withSafeArea?: boolean;
}

/**
 * ScreenContainer provides standardized padding and safe-area boundaries for all screens.
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  className = '',
  contentContainerClassName = '',
  withSafeArea = true,
  ...rest
}) => {
  const containerClass = `flex-1 bg-slate-50 dark:bg-slate-900 ${className}`;

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
