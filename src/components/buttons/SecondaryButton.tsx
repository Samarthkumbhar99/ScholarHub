import React from 'react';
import { AppButton } from './AppButton';
import { SpecializedButtonProps } from './types';

/**
 * SecondaryButton
 * Medium-emphasis action button with secondary emerald theme
 */
export const SecondaryButton: React.FC<SpecializedButtonProps> = (props) => {
  return <AppButton variant="secondary" {...props} />;
};

export default SecondaryButton;
