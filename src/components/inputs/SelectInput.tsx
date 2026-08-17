import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  TextInput as RNTextInput,
} from 'react-native';
import { SelectInputProps, SelectOption } from './types';

/**
 * SelectInput
 * Accessible dropdown and modal picker input for single-selection menus
 */
export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  placeholder = 'Select an option',
  value,
  options = [],
  onSelect,
  error,
  helperText,
  required = false,
  disabled = false,
  leftIcon,
  modalTitle,
  searchable = false,
  containerClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onSelect(option.value, option);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getBorderColorClass = () => {
    if (error) {
      return 'border-red-500 bg-red-50/20';
    }
    if (isOpen) {
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

      <TouchableOpacity
        accessibilityRole="combobox"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled, expanded: isOpen }}
        disabled={disabled}
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        className={`flex-row items-center justify-between border rounded-xl px-3.5 py-3 ${getBorderColorClass()} ${
          disabled ? 'bg-slate-100 opacity-60' : ''
        }`}
      >
        <View className="flex-row items-center flex-1 mr-2">
          {leftIcon && <View className="mr-2.5">{leftIcon}</View>}
          <Text
            className={`text-base ${
              selectedOption ? 'text-slate-900 font-medium' : 'text-slate-400'
            }`}
            numberOfLines={1}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>
        <Text className="text-slate-400 text-xs font-bold">▼</Text>
      </TouchableOpacity>

      {error ? (
        <Text className="text-xs text-red-500 mt-1 font-medium">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs text-slate-500 mt-1">{helperText}</Text>
      ) : null}

      {/* Option Picker Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 bg-slate-900/50 justify-end">
          <SafeAreaView className="bg-white rounded-t-3xl max-h-[80%] overflow-hidden">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-slate-200">
              <Text className="text-lg font-bold text-slate-900">
                {modalTitle || label || 'Select Option'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="p-2 rounded-full bg-slate-100 active:bg-slate-200"
                accessibilityLabel="Close modal"
              >
                <Text className="text-slate-700 font-bold text-xs">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Optional Search Bar */}
            {searchable && (
              <View className="p-3 border-b border-slate-100 bg-slate-50">
                <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-3 py-2">
                  <Text className="text-slate-400 mr-2 text-xs">🔍</Text>
                  <RNTextInput
                    placeholder="Filter options..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 text-sm text-slate-900"
                  />
                </View>
              </View>
            )}

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item.value)}
              contentContainerClassName="p-2 pb-6"
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    disabled={item.disabled}
                    className={`p-3.5 rounded-xl mb-1 flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'active:bg-slate-50'
                    } ${item.disabled ? 'opacity-40' : ''}`}
                  >
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <Text
                          className={`text-base ${
                            isSelected
                              ? 'font-bold text-primary-700'
                              : 'font-normal text-slate-800'
                          }`}
                        >
                          {item.label}
                        </Text>
                        {item.badge && (
                          <View className="ml-2 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Text className="text-[10px] font-bold text-emerald-800">
                              {item.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      {item.description && (
                        <Text className="text-xs text-slate-500 mt-0.5">
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Text className="text-primary-600 font-bold text-base">✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="p-8 items-center justify-center">
                  <Text className="text-slate-400 text-sm">No matching options</Text>
                </View>
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

export default SelectInput;
