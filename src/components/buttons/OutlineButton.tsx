import React from 'react';
import { AppButton } from './AppButton';
import { SpecializedButtonProps } from './types';

/**
 * OutlineButton
 * Border-styled button for secondary or neutral actions
 */
export const OutlineButton: React.FC<SpecializedButtonProps> = (props) => {
  return <AppButton variant="outline" {...props} />;
};

export default OutlineButton;
