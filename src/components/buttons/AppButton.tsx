import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
} from 'react-native';
import { BaseButtonProps } from './types';
import { colors } from '../../theme';

/**
 * AppButton
 * Core button component providing unified styling, accessibility, and loading states
 */
export const AppButton: React.FC<BaseButtonProps> = ({
  title,
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  textClassName = '',
  disabled,
  accessibilityLabel,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-secondary-600 active:bg-secondary-700 border-transparent shadow-sm shadow-emerald-500/10';
      case 'outline':
        return 'bg-transparent border border-primary-600 active:bg-primary-50';
      case 'text':
      case 'ghost':
        return 'bg-transparent border-transparent active:bg-slate-100';
      case 'danger':
        return 'bg-red-600 active:bg-red-700 border-transparent shadow-sm shadow-red-500/10';
      case 'primary':
      default:
        return 'bg-primary-600 active:bg-primary-700 border-transparent shadow-sm shadow-blue-500/10';
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case 'outline':
      case 'text':
        return 'text-primary-600';
      case 'ghost':
        return 'text-slate-700';
      case 'secondary':
      case 'danger':
      case 'primary':
      default:
        return 'text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-3.5 rounded-lg';
      case 'lg':
        return 'py-4 px-6 rounded-2xl';
      case 'md':
      default:
        return 'py-3 px-5 rounded-xl';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs font-semibold';
      case 'lg':
        return 'text-base font-bold';
      case 'md':
      default:
        return 'text-sm font-semibold';
    }
  };

  const getSpinnerColor = () => {
    if (variant === 'outline' || variant === 'text') {
      return colors.primary[600];
    }
    if (variant === 'ghost') {
      return colors.neutral[600];
    }
    return '#FFFFFF';
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      activeOpacity={0.8}
      disabled={isDisabled}
      className={`flex-row items-center justify-center border ${
        fullWidth ? 'w-full' : 'self-auto'
      } ${getVariantStyles()} ${getSizeStyles()} ${
        isDisabled ? 'opacity-50' : 'opacity-100'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <View className="flex-row items-center justify-center">
          <ActivityIndicator size="small" color={getSpinnerColor()} />
          {loadingText && (
            <Text
              className={`ml-2.5 font-semibold ${getTextVariantStyles()} ${getTextSizeStyles()} ${textClassName}`}
            >
              {loadingText}
            </Text>
          )}
        </View>
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          {children ? (
            children
          ) : (
            <Text
              className={`text-center font-semibold ${getTextVariantStyles()} ${getTextSizeStyles()} ${textClassName}`}
            >
              {title}
            </Text>
          )}
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};

export default AppButton;
