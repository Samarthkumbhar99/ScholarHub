import React from 'react';
import { AppButton } from './AppButton';
import { SpecializedButtonProps } from './types';

/**
 * PrimaryButton
 * High-emphasis action button with primary brand theme
 */
export const PrimaryButton: React.FC<SpecializedButtonProps> = (props) => {
  return <AppButton variant="primary" {...props} />;
};

export default PrimaryButton;
