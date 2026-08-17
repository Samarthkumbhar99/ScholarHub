import React from 'react';
import { View, Text } from 'react-native';
import { TextInput } from './TextInput';
import { SearchInputProps } from './types';

/**
 * SearchInput
 * Specialized search input with search icon, return key trigger, and instant clear button
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search scholarships, grants, schemes...',
  onSearch,
  value,
  onChangeText,
  leftIcon,
  clearable = true,
  returnKeyType = 'search',
  className = '',
  ...props
}) => {
  const defaultLeftIcon = (
    <View className="items-center justify-center pl-1">
      <Text className="text-slate-400 text-sm">🔍</Text>
    </View>
  );

  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      clearable={clearable}
      returnKeyType={returnKeyType}
      onSubmitEditing={(e) => {
        onSearch?.(e.nativeEvent.text);
      }}
      leftIcon={leftIcon || defaultLeftIcon}
      className={`text-sm ${className}`}
      {...props}
    />
  );
};

export default SearchInput;
