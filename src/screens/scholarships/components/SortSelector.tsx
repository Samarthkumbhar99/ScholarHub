import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SortOption } from '../types';

interface SortSelectorProps {
  currentSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
}

interface SortItemConfig {
  key: SortOption;
  label: string;
  icon: string;
}

const SORT_OPTIONS: SortItemConfig[] = [
  { key: 'best_match', label: 'Best Match', icon: '🎯' },
  { key: 'deadline_soon', label: 'Deadline Soon', icon: '⏰' },
  { key: 'highest_award', label: 'Highest Award', icon: '💰' },
];

/**
 * SortSelector
 * Compact sort pills allowing quick re-ordering of scholarship listings
 */
export const SortSelector: React.FC<SortSelectorProps> = ({
  currentSort,
  onSelectSort,
}) => {
  return (
    <View className="flex-row items-center justify-between mb-3 bg-slate-100/80 p-1 rounded-xl">
      {SORT_OPTIONS.map((opt) => {
        const isSelected = currentSort === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            accessibilityRole="tab"
            accessibilityLabel={`Sort by ${opt.label}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectSort(opt.key)}
            className={`flex-1 py-1.5 px-2 rounded-lg items-center flex-row justify-center ${
              isSelected ? 'bg-white shadow-sm' : 'bg-transparent'
            }`}
          >
            <Text className="text-xs mr-1">{opt.icon}</Text>
            <Text
              className={`text-xs font-bold ${
                isSelected ? 'text-primary-700' : 'text-slate-500'
              }`}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default SortSelector;
