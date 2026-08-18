import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScholarshipFilterState } from '../types';

interface ActiveFilterChipsProps {
  filter: ScholarshipFilterState;
  onRemoveFilter: (key: keyof ScholarshipFilterState) => void;
  onClearAll: () => void;
}

interface ActiveChipItem {
  key: keyof ScholarshipFilterState;
  label: string;
}

/**
 * ActiveFilterChips
 * Horizontal scrollable bar of applied smart filters with quick dismiss buttons and Clear All action
 */
export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filter,
  onRemoveFilter,
  onClearAll,
}) => {
  const activeChips: ActiveChipItem[] = [];

  if (filter.type !== 'all') {
    activeChips.push({
      key: 'type',
      label: `Type: ${filter.type.charAt(0).toUpperCase() + filter.type.slice(1)}`,
    });
  }

  if (filter.status !== 'all') {
    activeChips.push({
      key: 'status',
      label: `Status: ${filter.status === 'closing_soon' ? 'Closing Soon' : 'Open'}`,
    });
  }

  if (filter.funding !== 'all') {
    activeChips.push({
      key: 'funding',
      label: `Funding: ${filter.funding === 'fully_funded' ? 'Full' : 'Partial'}`,
    });
  }

  if (filter.fieldOfStudy !== 'all') {
    activeChips.push({
      key: 'fieldOfStudy',
      label: `Field: ${filter.fieldOfStudy}`,
    });
  }

  if (filter.minCGPA !== undefined) {
    activeChips.push({
      key: 'minCGPA',
      label: `CGPA: ${filter.minCGPA}+`,
    });
  }

  if (filter.maxFamilyIncome !== undefined) {
    activeChips.push({
      key: 'maxFamilyIncome',
      label: `Income < ₹${(filter.maxFamilyIncome / 100000).toFixed(1)}L`,
    });
  }

  if (activeChips.length === 0) {
    return null;
  }

  return (
    <View className="mb-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-4 px-4"
      >
        <View className="flex-row items-center gap-2 py-1">
          {activeChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              onPress={() => onRemoveFilter(chip.key)}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter ${chip.label}`}
              className="flex-row items-center bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg"
            >
              <Text className="text-xs font-semibold text-primary-700 mr-1.5">
                {chip.label}
              </Text>
              <Text className="text-xs font-bold text-primary-600">✕</Text>
            </TouchableOpacity>
          ))}

          {/* Clear All button */}
          <TouchableOpacity
            onPress={onClearAll}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg"
          >
            <Text className="text-xs font-bold text-slate-600">Clear All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default ActiveFilterChips;
