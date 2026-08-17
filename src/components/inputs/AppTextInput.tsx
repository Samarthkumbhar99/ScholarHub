import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';

export interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName = '',
  className = '',
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View className={`w-full mb-4 ${containerClassName}`}>
      {label && (
        <Text className="text-sm font-semibold text-slate-700 mb-1.5">{label}</Text>
      )}
      <View
        className={`flex-row items-center bg-white border rounded-xl px-3.5 py-2.5 ${
          error
            ? 'border-red-500 bg-red-50/20'
            : isFocused
            ? 'border-blue-600 ring-2 ring-blue-100'
            : 'border-slate-300'
        }`}
      >
        {leftIcon && <View className="mr-2.5">{leftIcon}</View>}
        <TextInput
          className={`flex-1 text-base text-slate-900 ${className}`}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="p-1"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Text className="text-xs font-semibold text-slate-500">
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        ) : (
          rightIcon && <View className="ml-2">{rightIcon}</View>
        )}
      </View>
      {error ? (
        <Text className="text-xs text-red-500 mt-1 font-medium">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs text-slate-500 mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
};

export default AppTextInput;
