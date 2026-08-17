import React from 'react';
import { TextInputProps as RNTextInputProps } from 'react-native';

export interface BaseInputProps {
  /** Field title label displayed above the input */
  label?: string;
  /** Error message text displayed below the input */
  error?: string;
  /** Helpful hint or description displayed below the input */
  helperText?: string;
  /** Marks field with visual required asterisk (*) */
  required?: boolean;
  /** Disables user input and applies dimmed styling */
  disabled?: boolean;
  /** Element or icon placed at the left of the text input */
  leftIcon?: React.ReactNode;
  /** Element or icon placed at the right of the text input */
  rightIcon?: React.ReactNode;
  /** Custom NativeWind/Tailwind class for outer container */
  containerClassName?: string;
  /** Custom NativeWind/Tailwind class for the input element */
  className?: string;
}

export interface TextInputProps extends RNTextInputProps, BaseInputProps {
  /** Optional clear button inside input when value is not empty */
  clearable?: boolean;
  /** Callback fired when clear button is tapped */
  onClear?: () => void;
}

export interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  /** Hide toggle visibility button */
  hideVisibilityToggle?: boolean;
}

export interface SearchInputProps extends TextInputProps {
  /** Callback fired on search query submission */
  onSearch?: (query: string) => void;
}

export interface SelectOption {
  label: string;
  value: string | number;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SelectInputProps extends BaseInputProps {
  /** Placeholder when no option is selected */
  placeholder?: string;
  /** Currently selected value */
  value?: string | number;
  /** List of selectable items */
  options: SelectOption[];
  /** Callback when option is selected */
  onSelect: (value: string | number, option: SelectOption) => void;
  /** Title displayed in the selection modal */
  modalTitle?: string;
  /** Enable search filter in option list */
  searchable?: boolean;
}

export interface DateInputProps extends BaseInputProps {
  /** Placeholder text when date is not set */
  placeholder?: string;
  /** Date string in YYYY-MM-DD or DD/MM/YYYY format */
  value?: string;
  /** Callback fired when date is chosen */
  onChangeDate: (date: string) => void;
  /** Minimum selectable date (YYYY-MM-DD) */
  minDate?: string;
  /** Maximum selectable date (YYYY-MM-DD) */
  maxDate?: string;
}
