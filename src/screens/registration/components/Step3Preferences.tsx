import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  PreferencesDetails,
  RegistrationErrors,
  ReservationCategory,
  SpecialCategory,
  StudyPreference,
} from '../../../types';
import { Card } from '../../../components/common';
import { TextInput } from '../../../components/inputs';
import {
  RESERVATION_CATEGORIES,
  SPECIAL_CATEGORIES,
  STUDY_PREFERENCES,
} from '../constants';

interface Step3Props {
  data: PreferencesDetails;
  errors: RegistrationErrors['preferences'];
  onChange: <K extends keyof PreferencesDetails>(field: K, value: PreferencesDetails[K]) => void;
  onClearError: (field: keyof PreferencesDetails) => void;
}

/**
 * Step 3: Category & Preferences
 */
export const Step3Preferences: React.FC<Step3Props> = ({
  data,
  errors,
  onChange,
  onClearError,
}) => {
  // Handle Reservation Category selection
  const handleSelectReservation = (cat: ReservationCategory) => {
    onChange('reservationCategory', cat);
    if (errors.reservationCategory) onClearError('reservationCategory');
  };

  // Handle multi-selection for Special Categories
  const handleToggleSpecialCategory = (cat: SpecialCategory) => {
    let updated: SpecialCategory[];
    if (cat === 'None') {
      updated = ['None'];
    } else {
      const existingWithoutNone = data.specialCategories.filter((c) => c !== 'None');
      if (existingWithoutNone.includes(cat)) {
        updated = existingWithoutNone.filter((c) => c !== cat);
      } else {
        updated = [...existingWithoutNone, cat];
      }
    }

    onChange('specialCategories', updated);
    if (errors.specialCategories) onClearError('specialCategories');
  };

  // Handle Study Preference selection
  const handleSelectStudyPreference = (pref: StudyPreference) => {
    onChange('studyPreference', pref);
    if (errors.studyPreference) onClearError('studyPreference');
  };

  return (
    <View className="gap-4 mb-4">
      {/* 1. Reservation & Social Category Card */}
      <Card variant="elevated" className="p-5">
        <View className="mb-4 border-b border-slate-100 pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">
              Reservation Category
            </Text>
            <Text className="text-xs font-bold text-red-500">* Required</Text>
          </View>
          <Text className="text-xs text-slate-500 mt-0.5">
            Select your government-recognized social reservation category.
          </Text>
        </View>

        {/* Category Radio Grid */}
        <View className="flex-row flex-wrap gap-2.5">
          {RESERVATION_CATEGORIES.map((cat) => {
            const isSelected = data.reservationCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                accessibilityRole="radio"
                accessibilityLabel={`Category ${cat.label}`}
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.7}
                onPress={() => handleSelectReservation(cat.value)}
                className={`flex-1 min-w-[45%] p-3 rounded-xl border flex-row items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50 border-primary-600 ring-2 ring-primary-100'
                    : 'bg-white border-slate-200 active:bg-slate-50'
                }`}
              >
                <View className="flex-1 mr-1">
                  <Text
                    className={`text-sm font-bold ${
                      isSelected ? 'text-primary-700' : 'text-slate-800'
                    }`}
                  >
                    {cat.label}
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
                    {cat.description}
                  </Text>
                </View>
                <View
                  className={`h-5 w-5 rounded-full border items-center justify-center ${
                    isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <View className="h-2 w-2 rounded-full bg-white" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {Boolean(errors.reservationCategory) && (
          <Text className="text-xs text-red-500 mt-2 font-medium">
            {errors.reservationCategory}
          </Text>
        )}
      </Card>

      {/* 2. Special Categories (Multi-select) Card */}
      <Card variant="elevated" className="p-5">
        <View className="mb-4 border-b border-slate-100 pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">
              Special Categories
            </Text>
            <Text className="text-xs font-medium text-slate-400">Multi-select enabled</Text>
          </View>
          <Text className="text-xs text-slate-500 mt-0.5">
            Select all affirmative action or quota criteria that apply to you.
          </Text>
        </View>

        {/* Special Category Selection List */}
        <View className="gap-2.5">
          {SPECIAL_CATEGORIES.map((cat) => {
            const isSelected = data.specialCategories.includes(cat.value);
            return (
              <TouchableOpacity
                key={cat.value}
                accessibilityRole="checkbox"
                accessibilityLabel={cat.label}
                accessibilityState={{ checked: isSelected }}
                activeOpacity={0.7}
                onPress={() => handleToggleSpecialCategory(cat.value)}
                className={`p-3 rounded-xl border flex-row items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-100'
                    : 'bg-white border-slate-200 active:bg-slate-50'
                }`}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Text className="text-lg mr-2.5">{cat.icon}</Text>
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-emerald-800' : 'text-slate-800'
                    }`}
                  >
                    {cat.label}
                  </Text>
                </View>
                <View
                  className={`h-5 w-5 rounded-md border items-center justify-center ${
                    isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {Boolean(errors.specialCategories) && (
          <Text className="text-xs text-red-500 mt-2 font-medium">
            {errors.specialCategories}
          </Text>
        )}
      </Card>

      {/* 3. Annual Family Income Card */}
      <Card variant="elevated" className="p-5">
        <View className="mb-4 border-b border-slate-100 pb-3">
          <Text className="text-base font-bold text-slate-900">
            Annual Family Income
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Gross annual household income from all sources (in INR ₹).
          </Text>
        </View>

        <TextInput
          label="Total Annual Family Income (INR ₹ / annum)"
          placeholder="e.g. 350000"
          value={data.familyIncome}
          onChangeText={(val) => {
            onChange('familyIncome', val);
            if (errors.familyIncome) onClearError('familyIncome');
          }}
          error={errors.familyIncome}
          keyboardType="numeric"
          leftIcon={<Text className="text-base font-bold text-slate-600">₹</Text>}
          helperText="Required for income-contingent waivers, government freemilk and trust grants"
          required
        />
      </Card>

      {/* 4. Study Preference Card */}
      <Card variant="elevated" className="p-5">
        <View className="mb-4 border-b border-slate-100 pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">
              Study Preference
            </Text>
            <Text className="text-xs font-bold text-red-500">* Required</Text>
          </View>
          <Text className="text-xs text-slate-500 mt-0.5">
            Where do you plan to pursue your current or upcoming academic programs?
          </Text>
        </View>

        {/* 3-Column Preference Selector */}
        <View className="flex-row gap-2.5">
          {STUDY_PREFERENCES.map((pref) => {
            const isSelected = data.studyPreference === pref.value;
            return (
              <TouchableOpacity
                key={pref.value}
                accessibilityRole="button"
                accessibilityLabel={`Study preference: ${pref.label}`}
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.7}
                onPress={() => handleSelectStudyPreference(pref.value)}
                className={`flex-1 p-3.5 rounded-xl border items-center text-center justify-between ${
                  isSelected
                    ? 'bg-blue-50 border-primary-600 ring-2 ring-primary-100'
                    : 'bg-white border-slate-200 active:bg-slate-50'
                }`}
              >
                <Text className="text-2xl mb-1.5">{pref.icon}</Text>
                <Text
                  className={`text-sm font-bold text-center ${
                    isSelected ? 'text-primary-700' : 'text-slate-800'
                  }`}
                >
                  {pref.label}
                </Text>
                <Text
                  className="text-[10px] text-slate-400 text-center mt-0.5 leading-tight"
                  numberOfLines={2}
                >
                  {pref.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {Boolean(errors.studyPreference) && (
          <Text className="text-xs text-red-500 mt-2 font-medium">
            {errors.studyPreference}
          </Text>
        )}
      </Card>
    </View>
  );
};

export default Step3Preferences;
