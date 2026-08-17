import React from 'react';
import { AppButton } from './AppButton';
import { SpecializedButtonProps } from './types';

/**
 * TextButton
 * Minimal borderless text button for inline actions, links, or tertiary actions
 */
export const TextButton: React.FC<SpecializedButtonProps> = (props) => {
  return <AppButton variant="text" {...props} />;
};

export default TextButton;
