import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Course } from '../../../types/studyAbroad';
import { Badge } from '../../../components/common';

interface CourseCardProps {
  course: Course;
  onPress: () => void;
}

/**
 * CourseCard
 * Displays individual course offerings, degree level, duration, and tuition.
 */
export const CourseCard: React.FC<CourseCardProps> = ({ course, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="p-3.5 mb-2.5 rounded-2xl bg-white border border-slate-200 active:border-primary-400"
    >
      <View className="flex-row items-start justify-between mb-1.5">
        <View className="flex-1 mr-2">
          <Text className="text-xs font-black text-slate-900 leading-snug">
            {course.name}
          </Text>
          <Text className="text-[11px] text-slate-500 font-medium mt-0.5">
            {course.universityName} • {course.countryName}
          </Text>
        </View>

        <Badge
          variant={course.degreeLevel === 'Master' ? 'primary' : 'info'}
          size="sm"
          label={course.degreeLevel}
        />
      </View>

      <Text className="text-xs text-slate-600 leading-relaxed mb-2.5" numberOfLines={2}>
        {course.description}
      </Text>

      <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs">⏱️</Text>
          <Text className="text-[11px] font-bold text-slate-700">
            {course.duration}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Text className="text-[11px] font-black text-primary-700">
            {course.tuition}
          </Text>
          <Text className="text-xs text-slate-400">➔</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CourseCard;
