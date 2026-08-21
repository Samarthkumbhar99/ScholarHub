import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Country } from '../../../types/studyAbroad';
import { Card, Badge } from '../../../components/common';

interface CountryCardProps {
  country: Country;
  onPress: () => void;
}

/**
 * CountryCard
 * Displays destination country flag, tuition profile, popular disciplines, and exploration trigger.
 */
export const CountryCard: React.FC<CountryCardProps> = ({ country, onPress }) => {
  return (
    <Card
      variant="elevated"
      className="p-4 mb-4 border border-slate-200 bg-white"
    >
      {/* Header: Flag, Name & Stats */}
      <View className="flex-row items-start justify-between pb-3 mb-3 border-b border-slate-100">
        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
          <View className="h-11 w-11 rounded-2xl bg-slate-100 items-center justify-center border border-slate-200">
            <Text className="text-2xl">{country.flag}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-black text-slate-900 leading-snug">
              {country.name}
            </Text>
            <Text className="text-[11px] text-slate-500 font-medium mt-0.5">
              {country.universityCount} Featured Universities • {country.scholarshipCount}+ Scholarships
            </Text>
          </View>
        </View>

        <Badge
          variant={country.id === 'de' ? 'success' : 'primary'}
          size="sm"
          label={country.id === 'de' ? 'Zero Tuition' : country.code}
        />
      </View>

      {/* Description */}
      <Text className="text-xs text-slate-600 leading-relaxed mb-3" numberOfLines={2}>
        {country.description}
      </Text>

      {/* Highlights Grid */}
      <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] text-slate-500 font-medium">💰 Tuition</Text>
          <Text className="text-[11px] font-bold text-slate-800" numberOfLines={1}>
            {country.tuitionSummary}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] text-slate-500 font-medium">🏠 Living Cost</Text>
          <Text className="text-[11px] font-bold text-slate-800" numberOfLines={1}>
            {country.livingCostSummary}
          </Text>
        </View>
      </View>

      {/* Popular Courses Tags */}
      <View className="mb-3.5">
        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Popular Fields of Study
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {country.popularCourses.slice(0, 3).map((course, idx) => (
            <View
              key={idx}
              className="bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"
            >
              <Text className="text-[10px] font-bold text-primary-800">
                {course}
              </Text>
            </View>
          ))}
          {country.popularCourses.length > 3 && (
            <View className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
              <Text className="text-[10px] font-bold text-slate-600">
                +{country.popularCourses.length - 3} more
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Trigger */}
      <TouchableOpacity
        onPress={onPress}
        className="w-full py-2.5 px-4 rounded-xl bg-primary-600 active:bg-primary-700 items-center justify-center flex-row gap-1.5"
        accessibilityRole="button"
        accessibilityLabel={`Explore universities in ${country.name}`}
      >
        <Text className="text-xs font-bold text-white">
          Explore {country.name} →
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

export default CountryCard;
