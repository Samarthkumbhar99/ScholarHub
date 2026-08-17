import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  textClassName = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-emerald-600 active:bg-emerald-700 border-transparent';
      case 'outline':
        return 'bg-transparent border border-blue-700 active:bg-blue-50';
      case 'ghost':
        return 'bg-transparent border-transparent active:bg-slate-100';
      case 'danger':
        return 'bg-red-600 active:bg-red-700 border-transparent';
      case 'primary':
      default:
        return 'bg-blue-700 active:bg-blue-800 border-transparent';
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return 'text-blue-700 font-semibold';
      case 'ghost':
        return 'text-slate-700 font-semibold';
      case 'secondary':
      case 'danger':
      case 'primary':
      default:
        return 'text-white font-semibold';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-3 rounded-lg';
      case 'lg':
        return 'py-4 px-6 rounded-xl';
      case 'md':
      default:
        return 'py-3 px-5 rounded-xl';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base font-bold';
      case 'md':
      default:
        return 'text-sm font-semibold';
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center border ${getVariantStyles()} ${getSizeStyles()} ${
        isDisabled ? 'opacity-50' : 'opacity-100'
      } ${className}`}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#1D4ED8' : '#FFFFFF'}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text
            className={`text-center ${getTextVariantStyles()} ${getTextSizeStyles()} ${
              leftIcon ? 'ml-2' : ''
            } ${rightIcon ? 'mr-2' : ''} ${textClassName}`}
          >
            {title}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

export default AppButton;
