import React from 'react';
import { AppButton } from './AppButton';
import { BaseButtonProps } from './types';

export interface LoadingButtonProps extends BaseButtonProps {
  /** Text to display next to the spinner while loading (default: 'Please wait...') */
  loadingText?: string;
}

/**
 * LoadingButton
 * Button that explicitly supports asynchronous operations with loading spinner
 */
export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = true,
  loadingText = 'Loading...',
  variant = 'primary',
  ...props
}) => {
  return (
    <AppButton
      isLoading={isLoading}
      loadingText={loadingText}
      variant={variant}
      {...props}
    />
  );
};

export default LoadingButton;
