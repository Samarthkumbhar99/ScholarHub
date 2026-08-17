import React from 'react';
import { View, Text } from 'react-native';
import { BadgeProps, BadgeVariant } from './types';

/**
 * Badge
 * Compact status, category, and indicator pill badge
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  variant = 'neutral',
  size = 'md',
  showDot = false,
  icon,
  className = '',
  textClassName = '',
}) => {
  const getVariantStyles = (v: BadgeVariant) => {
    switch (v) {
      case 'primary':
        return {
          container: 'bg-blue-50 border-blue-200',
          text: 'text-primary-700 font-bold',
          dot: 'bg-primary-600',
        };
      case 'secondary':
        return {
          container: 'bg-emerald-50 border-emerald-200',
          text: 'text-secondary-700 font-bold',
          dot: 'bg-secondary-600',
        };
      case 'success':
        return {
          container: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-800 font-bold',
          dot: 'bg-emerald-600',
        };
      case 'warning':
        return {
          container: 'bg-amber-50 border-amber-200',
          text: 'text-amber-800 font-bold',
          dot: 'bg-amber-500',
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          text: 'text-red-700 font-bold',
          dot: 'bg-red-500',
        };
      case 'info':
        return {
          container: 'bg-sky-50 border-sky-200',
          text: 'text-sky-700 font-bold',
          dot: 'bg-sky-500',
        };
      case 'outline':
        return {
          container: 'bg-transparent border-slate-300',
          text: 'text-slate-700 font-semibold',
          dot: 'bg-slate-400',
        };
      case 'neutral':
      default:
        return {
          container: 'bg-slate-100 border-slate-200',
          text: 'text-slate-700 font-semibold',
          dot: 'bg-slate-500',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-0.5 px-2 rounded-md',
          text: 'text-[10px]',
          dot: 'h-1.5 w-1.5 mr-1',
        };
      case 'lg':
        return {
          container: 'py-1.5 px-3.5 rounded-xl',
          text: 'text-sm font-bold',
          dot: 'h-2.5 w-2.5 mr-2',
        };
      case 'md':
      default:
        return {
          container: 'py-1 px-2.5 rounded-lg',
          text: 'text-xs',
          dot: 'h-2 w-2 mr-1.5',
        };
    }
  };

  const variantStyle = getVariantStyles(variant);
  const sizeStyle = getSizeStyles();

  return (
    <View
      className={`inline-flex flex-row items-center self-start border ${variantStyle.container} ${sizeStyle.container} ${className}`}
    >
      {showDot ? <View className={`rounded-full ${variantStyle.dot} ${sizeStyle.dot}`} /> : null}
      {icon ? <View className="mr-1">{icon}</View> : null}
      {children ? (
        children
      ) : (
        <Text className={`${variantStyle.text} ${sizeStyle.text} ${textClassName}`}>
          {label}
        </Text>
      )}
    </View>
  );
};

export default Badge;
