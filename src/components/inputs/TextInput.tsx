import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
} from 'react-native';
import { TextInputProps } from './types';

/**
 * TextInput
 * Standard single-line or multi-line text input with label, icons, and error handling
 */
export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  clearable = false,
  onClear,
  containerClassName = '',
  className = '',
  value,
  onChangeText,
  editable,
  placeholderTextColor = '#94A3B8',
  onFocus,
  onBlur,
  accessibilityLabel,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const isInputDisabled = disabled || editable === false;
  const showClear = clearable && value && value.length > 0 && !isInputDisabled;

  const handleClear = () => {
    if (onChangeText) {
      onChangeText('');
    }
    if (onClear) {
      onClear();
    }
  };

  const getBorderColorClass = () => {
    if (error) {
      return 'border-red-500 bg-red-50/20';
    }
    if (isFocused) {
      return 'border-primary-600 ring-2 ring-primary-100 bg-white';
    }
    return 'border-slate-300 bg-white';
  };

  return (
    <View className={`w-full mb-4 ${containerClassName}`}>
      {label && (
        <View className="flex-row items-center mb-1.5">
          <Text className="text-sm font-semibold text-slate-700">{label}</Text>
          {required && <Text className="text-sm font-bold text-red-500 ml-1">*</Text>}
        </View>
      )}

      <View
        className={`flex-row items-center border rounded-xl px-3.5 py-2.5 transition-all ${getBorderColorClass()} ${
          isInputDisabled ? 'bg-slate-100 opacity-60' : ''
        }`}
      >
        {leftIcon && <View className="mr-2.5">{leftIcon}</View>}

        <RNTextInput
          accessibilityLabel={accessibilityLabel || label}
          accessibilityState={{ disabled: isInputDisabled }}
          value={value}
          onChangeText={onChangeText}
          editable={!isInputDisabled}
          placeholderTextColor={placeholderTextColor}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className={`flex-1 text-base text-slate-900 ${className}`}
          {...props}
        />

        {showClear && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear input"
            onPress={handleClear}
            className="p-1 mr-1"
          >
            <View className="h-4 w-4 rounded-full bg-slate-300 items-center justify-center">
              <Text className="text-white text-[10px] font-bold leading-none">✕</Text>
            </View>
          </TouchableOpacity>
        )}

        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>

      {error ? (
        <Text className="text-xs text-red-500 mt-1 font-medium">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs text-slate-500 mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
};

export const AppTextInput = TextInput;
export default TextInput;
