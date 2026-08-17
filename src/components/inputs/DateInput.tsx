import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput as RNTextInput,
} from 'react-native';
import { DateInputProps } from './types';

/**
 * DateInput
 * Cross-platform date picker input with interactive calendar selector and formatted entry
 */
export const DateInput: React.FC<DateInputProps> = ({
  label,
  placeholder = 'YYYY-MM-DD',
  value,
  onChangeDate,
  error,
  helperText,
  required = false,
  disabled = false,
  containerClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(value || '');

  // Helper to format ISO date to YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleOpen = () => {
    if (disabled) return;
    setTempDate(value || '');
    setIsOpen(true);
  };

  const handleApply = (dateStr: string) => {
    onChangeDate(dateStr);
    setIsOpen(false);
  };

  const setPresetDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const dateStr = formatDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
    setTempDate(dateStr);
    handleApply(dateStr);
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
      {Boolean(label) ? (
        <View className="flex-row items-center mb-1.5">
          <Text className="text-sm font-semibold text-slate-700">{label}</Text>
          {required ? <Text className="text-sm font-bold text-red-500 ml-1">*</Text> : null}
        </View>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled }}
        disabled={disabled}
        activeOpacity={0.7}
        onPress={handleOpen}
        className={`flex-row items-center justify-between border rounded-xl px-3.5 py-3 ${getBorderColorClass()} ${
          disabled ? 'bg-slate-100 opacity-60' : ''
        }`}
      >
        <View className="flex-row items-center flex-1 mr-2">
          <Text className="text-base mr-2.5">📅</Text>
          <Text
            className={`text-base ${
              value ? 'text-slate-900 font-medium' : 'text-slate-400'
            }`}
          >
            {value || placeholder}
          </Text>
        </View>
        <Text className="text-slate-400 text-xs font-bold">Select</Text>
      </TouchableOpacity>

      {Boolean(error) ? (
        <Text className="text-xs text-red-500 mt-1 font-medium">{error}</Text>
      ) : Boolean(helperText) ? (
        <Text className="text-xs text-slate-500 mt-1">{helperText}</Text>
      ) : null}

      {/* Date Picker Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 bg-slate-900/50 justify-end">
          <SafeAreaView className="bg-white rounded-t-3xl p-5 overflow-hidden">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-slate-200">
              <Text className="text-lg font-bold text-slate-900">
                {label || 'Select Date'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                className="p-2 rounded-full bg-slate-100"
              >
                <Text className="text-slate-700 font-bold text-xs">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">
              Quick Select
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {[
                { label: 'Today', days: 0 },
                { label: 'In 7 Days', days: 7 },
                { label: 'In 30 Days', days: 30 },
                { label: 'In 90 Days', days: 90 },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => setPresetDate(preset.days)}
                  className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg active:bg-blue-100"
                >
                  <Text className="text-xs font-semibold text-primary-700">
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Date Input */}
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Custom Date (YYYY-MM-DD)
            </Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 mb-5">
              <Text className="text-base mr-2">📅</Text>
              <RNTextInput
                placeholder="2026-12-31"
                placeholderTextColor="#94A3B8"
                value={tempDate}
                onChangeText={setTempDate}
                className="flex-1 text-base text-slate-900 font-medium"
              />
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl items-center"
              >
                <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApply(tempDate)}
                className="flex-1 py-3 bg-primary-600 rounded-xl items-center"
              >
                <Text className="text-sm font-semibold text-white">Apply Date</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

export default DateInput;
