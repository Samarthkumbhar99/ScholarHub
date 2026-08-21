import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { getCourseById } from '../../utils/studyAbroadUtils';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import { PrimaryButton, OutlineButton } from '../../components/buttons';

type CourseDetailsRouteProp = RouteProp<RootStackParamList, 'CourseDetails'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * CourseDetailsScreen
 * Full-page deep view for a specific degree program.
 */
export const CourseDetailsScreen: React.FC = () => {
  const route = useRoute<CourseDetailsRouteProp>();
  const navigation = useNavigation<NavProp>();

  const course = useMemo(() => {
    return getCourseById(route.params.courseId);
  }, [route.params.courseId]);

  if (!course) {
    return (
      <ScreenContainer withSafeArea contentContainerClassName="p-4 items-center justify-center">
        <Text className="text-base font-bold text-slate-900 mb-2">
          Course Not Found
        </Text>
        <OutlineButton
          title="← Back"
          onPress={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const handleViewUniversity = () => {
    navigation.navigate('UniversityDetails', { universityId: course.universityId });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title={course.name}
          subtitle={`${course.universityName} • ${course.countryName}`}
          showBack
          onBackPress={() => navigation.goBack()}
          rightAction={<Badge variant="primary" size="sm" label={course.degreeLevel} />}
        />

        {/* Quick Facts Card */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center">
              <Text className="text-xl">🎓</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-slate-900 leading-snug">
                {course.name}
              </Text>
              <Text className="text-xs text-slate-500 font-medium">
                {course.universityName}
              </Text>
            </View>
          </View>

          <View className="bg-slate-50 p-3 rounded-2xl border border-slate-200 gap-2 mb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500 font-medium">⏱️ Program Duration</Text>
              <Text className="text-xs font-bold text-slate-900">{course.duration}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500 font-medium">💰 Tuition Fee</Text>
              <Text className="text-xs font-black text-emerald-700">{course.tuition}</Text>
            </View>
            {course.languageRequirement && (
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">🗣️ Language of Instruction</Text>
                <Text className="text-xs font-bold text-slate-900">{course.languageRequirement}</Text>
              </View>
            )}
            {course.intakeSeason && (
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">📅 Typical Intakes</Text>
                <Text className="text-xs font-bold text-slate-900">{course.intakeSeason}</Text>
              </View>
            )}
          </View>

          <Text className="text-xs text-slate-600 leading-relaxed">
            {course.description}
          </Text>
        </Card>

        {/* Specialization Areas */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <Text className="text-sm font-black text-slate-900 mb-2">
            Specialization Focus Areas
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {course.fieldsOfStudy.map((f, idx) => (
              <View key={idx} className="bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                <Text className="text-xs font-bold text-primary-800">{f}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Prerequisites */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <Text className="text-sm font-black text-slate-900 mb-2">
            Admission Prerequisites
          </Text>
          <View className="gap-2">
            {course.applicationRequirements.map((req, idx) => (
              <View
                key={idx}
                className="flex-row items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
              >
                <Text className="text-xs font-bold text-primary-600">✓</Text>
                <Text className="text-xs text-slate-700 leading-snug flex-1">
                  {req}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Actions */}
        <View className="gap-2.5">
          <PrimaryButton
            title="View Host University Profile →"
            size="md"
            onPress={handleViewUniversity}
          />
          <OutlineButton
            title="← Back"
            size="md"
            className="border-slate-300 bg-white"
            textClassName="text-slate-700 font-bold"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScreenContainer>
    </View>
  );
};

export default CourseDetailsScreen;
