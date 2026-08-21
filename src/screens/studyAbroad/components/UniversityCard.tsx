import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { University } from '../../../types/studyAbroad';
import { Card, Badge } from '../../../components/common';

interface UniversityCardProps {
  university: University;
  onPress: () => void;
}

/**
 * UniversityCard
 * Highlights university ranking, location, tuition overview, courses, and detail action.
 */
export const UniversityCard: React.FC<UniversityCardProps> = ({
  university,
  onPress,
}) => {
  return (
    <Card
      variant="elevated"
      className="p-4 mb-4 border border-slate-200 bg-white"
    >
      {/* Header */}
      <View className="flex-row items-start justify-between pb-2.5 mb-2.5 border-b border-slate-100">
        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
          <View className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center">
            <Text className="text-xl">{university.logoEmoji || '🏛️'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-slate-900 leading-snug">
              {university.name}
            </Text>
            <Text className="text-[11px] text-slate-500 font-medium mt-0.5">
              📍 {university.city}
            </Text>
          </View>
        </View>

        <Badge variant="primary" size="sm" label={university.ranking} />
      </View>

      {/* Description snippet */}
      <Text className="text-xs text-slate-600 leading-relaxed mb-3" numberOfLines={2}>
        {university.description}
      </Text>

      {/* Key Metrics */}
      <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] text-slate-500 font-medium">Estimated Tuition</Text>
          <Text className="text-[11px] font-bold text-slate-900" numberOfLines={1}>
            {university.tuition}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] text-slate-500 font-medium">Scholarships Linked</Text>
          <Text className="text-[11px] font-extrabold text-emerald-700">
            {university.scholarshipIds.length > 0 ? `${university.scholarshipIds.length} Available` : 'Institutional'}
          </Text>
        </View>
      </View>

      {/* Courses Offered Preview */}
      <View className="mb-3.5">
        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Key Degree Programs
        </Text>
        <View className="gap-1">
          {university.popularCourses.map((c, idx) => (
            <Text key={idx} className="text-xs font-semibold text-slate-700" numberOfLines={1}>
              • {c}
            </Text>
          ))}
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        onPress={onPress}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 active:bg-slate-800 items-center justify-center flex-row gap-1.5"
        accessibilityRole="button"
        accessibilityLabel={`View details for ${university.name}`}
      >
        <Text className="text-xs font-bold text-white">
          View University Profile & Costs →
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

export default UniversityCard;
