import React from 'react';
import { View, TouchableOpacity, ViewProps, TouchableOpacityProps } from 'react-native';

export interface AppCardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  onPress?: () => void;
  className?: string;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  variant = 'elevated',
  onPress,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return 'bg-white border border-slate-200';
      case 'flat':
        return 'bg-slate-100 border border-transparent';
      case 'elevated':
      default:
        return 'bg-white border border-slate-100 shadow-sm shadow-slate-200';
    }
  };

  const cardClasses = `rounded-2xl p-4 ${getVariantStyles()} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={cardClasses}
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={cardClasses} {...props}>
      {children}
    </View>
  );
};

export default AppCard;
