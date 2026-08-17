import React from 'react';
import { ViewProps, TouchableOpacityProps } from 'react-native';

export interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView */
  scrollable?: boolean;
  /** Wrap in SafeAreaView */
  withSafeArea?: boolean;
  /** Custom NativeWind/Tailwind class for outer container */
  className?: string;
  /** Custom NativeWind/Tailwind class for inner content / ScrollView */
  contentContainerClassName?: string;
}

export interface HeaderProps {
  /** Screen or section title */
  title: string;
  /** Subtitle context */
  subtitle?: string;
  /** Display left back arrow */
  showBack?: boolean;
  /** Action handler when back button is pressed */
  onBackPress?: () => void;
  /** Custom left action node (replaces back arrow if provided) */
  leftAction?: React.ReactNode;
  /** Custom right action node (e.g. icon button, filter, avatar) */
  rightAction?: React.ReactNode;
  /** Show bottom border line */
  borderBottom?: boolean;
  /** Custom class */
  className?: string;
}

export type CardVariant = 'elevated' | 'outlined' | 'flat' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  /** Visual surface variant */
  variant?: CardVariant;
  /** Inner padding scale */
  padding?: CardPadding;
  /** Optional press handler (converts card to touchable) */
  onPress?: () => void;
  /** Custom NativeWind class */
  className?: string;
}

export type AppCardProps = CardProps;

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'outline';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  /** Text displayed inside badge */
  label?: string;
  /** Custom children node */
  children?: React.ReactNode;
  /** Color theme variant */
  variant?: BadgeVariant;
  /** Sizing scale */
  size?: BadgeSize;
  /** Show status indicator dot */
  showDot?: boolean;
  /** Custom icon node placed before label */
  icon?: React.ReactNode;
  /** Custom container class */
  className?: string;
  /** Custom text class */
  textClassName?: string;
}

export interface DividerProps {
  /** Optional centered text label (e.g. 'OR') */
  label?: string;
  /** Spacing above and below divider */
  spacing?: 'sm' | 'md' | 'lg';
  /** Custom container class */
  className?: string;
  /** Custom text class for label */
  textClassName?: string;
}

export interface EmptyStateProps {
  /** Main heading */
  title: string;
  /** Explanatory description */
  description?: string;
  /** Custom icon element or emoji glyph (default: '📂') */
  icon?: React.ReactNode;
  /** Call to action button text */
  actionTitle?: string;
  /** Call to action press handler */
  onActionPress?: () => void;
  /** Visual variant for the CTA button */
  actionVariant?: 'primary' | 'secondary' | 'outline';
  /** Custom class */
  className?: string;
}

export interface LoadingStateProps {
  /** Loading title or status text */
  message?: string;
  /** Secondary subtitle */
  subMessage?: string;
  /** Spinner size */
  size?: 'small' | 'large';
  /** Custom spinner color */
  color?: string;
  /** Renders full screen centered overlay */
  fullScreen?: boolean;
  /** Custom class */
  className?: string;
}

export type AppLoaderProps = LoadingStateProps;

export interface ErrorStateProps {
  /** Error header title */
  title?: string;
  /** Error message details */
  message: string;
  /** Retry action handler */
  onRetry?: () => void;
  /** Retry button title (default: 'Try Again') */
  retryTitle?: string;
  /** Secondary action title */
  secondaryActionTitle?: string;
  /** Secondary action handler */
  onSecondaryAction?: () => void;
  /** Custom icon node or emoji */
  icon?: React.ReactNode;
  /** Custom class */
  className?: string;
}
