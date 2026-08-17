import React from 'react';
import { View, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { CardProps } from './types';

/**
 * Card
 * Reusable surface container for grouping content and actions
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
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
      case 'interactive':
        return 'bg-white border border-slate-200 shadow-sm shadow-slate-200 active:bg-slate-50';
      case 'elevated':
      default:
        return 'bg-white border border-slate-100 shadow-sm shadow-slate-200';
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-6';
      case 'md':
      default:
        return 'p-4';
    }
  };

  const cardClasses = `rounded-2xl ${getVariantStyles()} ${getPaddingStyles()} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPress}
        activeOpacity={0.75}
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

export const AppCard = Card;
export default Card;
