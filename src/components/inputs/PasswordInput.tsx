import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TextInput } from './TextInput';
import { PasswordInputProps } from './types';

/**
 * PasswordInput
 * Secure text entry input with toggleable show/hide password visibility button
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  label = 'Password',
  placeholder = '••••••••',
  hideVisibilityToggle = false,
  rightIcon,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

  const renderToggle = () => {
    if (hideVisibilityToggle) {
      return rightIcon;
    }

    return (
      <TouchableOpacity
        onPress={toggleVisibility}
        accessibilityRole="button"
        accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
        className="px-2 py-1 bg-slate-100 rounded-md active:bg-slate-200"
      >
        <Text className="text-xs font-semibold text-slate-600">
          {isVisible ? 'Hide' : 'Show'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <TextInput
      label={label}
      placeholder={placeholder}
      secureTextEntry={!isVisible}
      autoCapitalize="none"
      autoCorrect={false}
      rightIcon={renderToggle()}
      {...props}
    />
  );
};

export default PasswordInput;
