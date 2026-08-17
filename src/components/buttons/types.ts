import React from 'react';
import { TouchableOpacityProps } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseButtonProps extends TouchableOpacityProps {
  /** Text label displayed inside button */
  title?: string;
  /** Custom children element instead of text title */
  children?: React.ReactNode;
  /** Visual variant style */
  variant?: ButtonVariant;
  /** Sizing scale */
  size?: ButtonSize;
  /** Loading spinner indicator state */
  isLoading?: boolean;
  /** Optional text to display while loading */
  loadingText?: string;
  /** Icon element placed before the title */
  leftIcon?: React.ReactNode;
  /** Icon element placed after the title */
  rightIcon?: React.ReactNode;
  /** Spans full width of container */
  fullWidth?: boolean;
  /** Custom NativeWind/Tailwind container classes */
  className?: string;
  /** Custom NativeWind/Tailwind text classes */
  textClassName?: string;
}

export type SpecializedButtonProps = Omit<BaseButtonProps, 'variant'>;
