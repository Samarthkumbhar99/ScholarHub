import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  ScholarshipFilterState,
  ScholarshipType,
  ScholarshipStatus,
  FundingFilterType,
  FieldOfStudy,
} from '../types';
import { PrimaryButton, OutlineButton } from '../../../components/buttons';
import { initialFilterState } from '../utils/filterScholarships';

interface FilterModalProps {
  visible: boolean;
  filter: ScholarshipFilterState;
  onClose: () => void;
  onApply: (newFilter: ScholarshipFilterState) => void;
  onReset: () => void;
}

const SCHOLARSHIP_TYPES: { key: ScholarshipType; label: string }[] = [
  { key: 'all', label: 'All Types' },
  { key: 'government', label: 'Government' },
  { key: 'private', label: 'Private Trust' },
  { key: 'international', label: 'International' },
];

const SCHOLARSHIP_STATUSES: { key: ScholarshipStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closing_soon', label: 'Closing Soon (<7 days)' },
];

const FUNDING_TYPES: { key: FundingFilterType; label: string }[] = [
  { key: 'all', label: 'All Funding' },
  { key: 'fully_funded', label: 'Fully Funded' },
  { key: 'partially_funded', label: 'Partially Funded' },
];

const FIELDS_OF_STUDY: { key: FieldOfStudy; label: string }[] = [
  { key: 'all', label: 'All Fields' },
  { key: 'Computer Science', label: 'Computer Science' },
  { key: 'Engineering', label: 'Engineering' },
  { key: 'Medicine', label: 'Medicine / Health' },
  { key: 'Business', label: 'Business & Commerce' },
  { key: 'Arts', label: 'Arts & Humanities' },
  { key: 'Science', label: 'Pure Science' },
];

const CGPA_PRESETS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: 'Any CGPA' },
  { value: 7.0, label: '7.0+ (3.0)' },
  { value: 7.5, label: '7.5+ (3.2)' },
  { value: 8.0, label: '8.0+ (3.5)' },
  { value: 8.5, label: '8.5+ (3.8)' },
];

const INCOME_PRESETS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: 'Any Income' },
  { value: 250000, label: '< ₹2.5 Lakhs' },
  { value: 450000, label: '< ₹4.5 Lakhs' },
  { value: 600000, label: '< ₹6.0 Lakhs' },
  { value: 800000, label: '< ₹8.0 Lakhs' },
];

/**
 * FilterModal
 * Bottom sheet filter modal supporting multiple combined criteria
 */
export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filter,
  onClose,
  onApply,
  onReset,
}) => {
  const [localFilter, setLocalFilter] = useState<ScholarshipFilterState>(filter);

  useEffect(() => {
    if (visible) {
      setLocalFilter(filter);
    }
  }, [visible, filter]);

  const handleApply = () => {
    onApply(localFilter);
    onClose();
  };

  const handleReset = () => {
    setLocalFilter({
      ...initialFilterState,
      searchQuery: localFilter.searchQuery,
      sortBy: localFilter.sortBy,
    });
    onReset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-900/50 justify-end">
        <SafeAreaView className="bg-white rounded-t-3xl max-h-[85%] overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-slate-200">
            <View>
              <Text className="text-lg font-bold text-slate-900">
                Smart Filters
              </Text>
              <Text className="text-xs text-slate-500">
                Filter by funding, criteria, category and major
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close filter modal"
              className="p-2 rounded-full bg-slate-100 active:bg-slate-200"
            >
              <Text className="text-slate-700 font-bold text-xs">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Filter Options Body */}
          <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
            {/* 1. Scholarship Type */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Scholarship Type
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {SCHOLARSHIP_TYPES.map((type) => {
                const isSelected = localFilter.type === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    onPress={() =>
                      setLocalFilter((prev) => ({ ...prev, type: type.key }))
                    }
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Field of Study */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Field of Study
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {FIELDS_OF_STUDY.map((field) => {
                const isSelected = localFilter.fieldOfStudy === field.key;
                return (
                  <TouchableOpacity
                    key={field.key}
                    onPress={() =>
                      setLocalFilter((prev) => ({ ...prev, fieldOfStudy: field.key }))
                    }
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {field.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Funding Level */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Funding Level
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {FUNDING_TYPES.map((fund) => {
                const isSelected = localFilter.funding === fund.key;
                return (
                  <TouchableOpacity
                    key={fund.key}
                    onPress={() =>
                      setLocalFilter((prev) => ({ ...prev, funding: fund.key }))
                    }
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {fund.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Application Status */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Application Status
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {SCHOLARSHIP_STATUSES.map((status) => {
                const isSelected = localFilter.status === status.key;
                return (
                  <TouchableOpacity
                    key={status.key}
                    onPress={() =>
                      setLocalFilter((prev) => ({ ...prev, status: status.key }))
                    }
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 5. Minimum CGPA Criteria */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              My CGPA / Score
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {CGPA_PRESETS.map((cgpa) => {
                const isSelected = localFilter.minCGPA === cgpa.value;
                return (
                  <TouchableOpacity
                    key={cgpa.label}
                    onPress={() =>
                      setLocalFilter((prev) => ({ ...prev, minCGPA: cgpa.value }))
                    }
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {cgpa.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 6. Maximum Annual Family Income */}
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Annual Family Income
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {INCOME_PRESETS.map((income) => {
                const isSelected = localFilter.maxFamilyIncome === income.value;
                return (
                  <TouchableOpacity
                    key={income.label}
                    onPress={() =>
                      setLocalFilter((prev) => ({
                        ...prev,
                        maxFamilyIncome: income.value,
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {income.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View className="p-4 border-t border-slate-200 flex-row gap-3 bg-white">
            <View className="flex-1">
              <OutlineButton
                title="Reset All"
                size="md"
                onPress={handleReset}
              />
            </View>
            <View className="flex-1">
              <PrimaryButton
                title="Apply Filters"
                size="md"
                onPress={handleApply}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default FilterModal;
