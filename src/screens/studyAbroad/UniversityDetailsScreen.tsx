import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Course } from '../../types/studyAbroad';
import {
  getUniversityById,
  getCoursesByUniversity,
  getScholarshipsForUniversity,
} from '../../utils/studyAbroadUtils';
import { MOCK_SCHOLARSHIPS } from '../scholarships/data/mockScholarships';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import { PrimaryButton, OutlineButton } from '../../components/buttons';
import { CourseCard, CourseDetailsModal } from './components';

type UniversityDetailsRouteProp = RouteProp<RootStackParamList, 'UniversityDetails'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * UniversityDetailsScreen
 * Complete institutional dossier displaying QS ranking, tuition, courses, application guidance,
 * linked scholarships with 1-click navigation to ScholarshipDetails, and official website access.
 */
export const UniversityDetailsScreen: React.FC = () => {
  const route = useRoute<UniversityDetailsRouteProp>();
  const navigation = useNavigation<NavProp>();

  const [activeCourseModal, setActiveCourseModal] = useState<Course | null>(null);

  const university = useMemo(() => {
    return getUniversityById(route.params.universityId);
  }, [route.params.universityId]);

  const courses = useMemo(() => {
    return getCoursesByUniversity(route.params.universityId);
  }, [route.params.universityId]);

  const linkedScholarships = useMemo(() => {
    if (!university) return [];
    return getScholarshipsForUniversity(university, MOCK_SCHOLARSHIPS);
  }, [university]);

  if (!university) {
    return (
      <ScreenContainer withSafeArea contentContainerClassName="p-4 items-center justify-center">
        <Text className="text-base font-bold text-slate-900 mb-2">
          University Not Found
        </Text>
        <OutlineButton
          title="← Back to Study Abroad"
          onPress={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  // Official Website Handler
  const handleOpenOfficialWebsite = async () => {
    if (!university.officialWebsite) {
      Alert.alert(
        'Website Unavailable',
        'The official website link for this university is not currently available.'
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(university.officialWebsite);
      if (supported) {
        await Linking.openURL(university.officialWebsite);
      } else {
        Alert.alert('Unable to Open Link', `Could not open ${university.officialWebsite}`);
      }
    } catch {
      Alert.alert('Error', 'Unable to launch external browser.');
    }
  };

  const handleOpenScholarshipDetails = (scholarshipId: string) => {
    navigation.navigate('ScholarshipDetails', { scholarshipId });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title={university.name}
          subtitle={`📍 ${university.city}, ${university.countryName}`}
          showBack
          onBackPress={() => navigation.goBack()}
          rightAction={<Badge variant="primary" size="sm" label={university.ranking} />}
        />

        {/* 1. Institutional Hero Card */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 items-center justify-center">
              <Text className="text-2xl">{university.logoEmoji || '🏛️'}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-slate-900 leading-snug">
                {university.name}
              </Text>
              <Text className="text-xs text-slate-500 font-medium mt-0.5">
                {university.city} • {university.ranking}
              </Text>
            </View>
          </View>

          <Text className="text-xs text-slate-600 leading-relaxed mb-3.5">
            {university.description}
          </Text>

          {/* Quick Stats Strip */}
          <View className="flex-row gap-2">
            {university.acceptanceRate && (
              <View className="flex-1 p-2 bg-slate-50 rounded-xl border border-slate-200 items-center">
                <Text className="text-[10px] text-slate-400 font-bold uppercase">Acceptance</Text>
                <Text className="text-xs font-black text-slate-800 mt-0.5">
                  {university.acceptanceRate}
                </Text>
              </View>
            )}
            {university.internationalStudentsPercentage && (
              <View className="flex-1 p-2 bg-slate-50 rounded-xl border border-slate-200 items-center">
                <Text className="text-[10px] text-slate-400 font-bold uppercase">International</Text>
                <Text className="text-xs font-black text-slate-800 mt-0.5">
                  {university.internationalStudentsPercentage} Students
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* 2. Tuition & Estimated Living Expenses */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <Text className="text-sm font-black text-slate-900 mb-3">
            Cost of Attendance Overview
          </Text>
          <View className="gap-2.5">
            <View className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-bold text-slate-700">
                  Estimated Tuition Fee
                </Text>
                <Badge variant="success" size="sm" label="Tuition" />
              </View>
              <Text className="text-sm font-black text-emerald-800">
                {university.tuition}
              </Text>
            </View>

            <View className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-bold text-slate-700">
                  Monthly Living & Accommodation Cost
                </Text>
                <Badge variant="neutral" size="sm" label="Living" />
              </View>
              <Text className="text-sm font-black text-slate-800">
                {university.livingCost}
              </Text>
            </View>
          </View>
        </Card>

        {/* 3. Available Scholarships (Linked to ScholarHub Database) */}
        {linkedScholarships.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-black text-slate-900">
                Matching Scholarship Programs
              </Text>
              <Badge variant="primary" size="sm" label={`${linkedScholarships.length} Available`} />
            </View>

            {linkedScholarships.map((sch) => (
              <TouchableOpacity
                key={sch.id}
                onPress={() => handleOpenScholarshipDetails(sch.id)}
                activeOpacity={0.7}
                className="p-3.5 mb-2.5 rounded-2xl bg-white border border-blue-200 shadow-2xs active:bg-blue-50/40"
              >
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1 mr-2">
                    <Text className="text-xs font-black text-slate-900 leading-snug">
                      {sch.title}
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      Provided by {sch.provider}
                    </Text>
                  </View>
                  <Badge variant="success" size="sm" label={sch.fundingType === 'fully_funded' ? 'Fully Funded' : 'Partial'} />
                </View>

                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <Text className="text-xs font-extrabold text-emerald-700">
                    {sch.awardAmount}
                  </Text>
                  <Text className="text-xs font-bold text-primary-700">
                    View Scholarship Details ➔
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 4. Degree Programs Offered */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-black text-slate-900">
              Popular Degree Programs
            </Text>
            <Badge variant="neutral" size="sm" label={`${courses.length} Courses`} />
          </View>

          {courses.map((crs) => (
            <CourseCard
              key={crs.id}
              course={crs}
              onPress={() => setActiveCourseModal(crs)}
            />
          ))}
        </View>

        {/* 5. Admission Requirements Checklist */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <Text className="text-sm font-black text-slate-900 mb-2">
            General Admission Requirements
          </Text>
          <View className="gap-2">
            {university.applicationRequirements.map((req, idx) => (
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

        {/* 6. Official University Website Action */}
        <Card variant="outlined" className="p-4 mb-4 items-center bg-blue-50/30 border-blue-200">
          <Text className="text-xs font-bold text-slate-900 text-center mb-1">
            Official University Portal
          </Text>
          <Text className="text-[11px] text-slate-500 text-center mb-3">
            Visit the official university admissions page to check course catalogs, faculty directories, and direct application deadlines.
          </Text>
          <PrimaryButton
            title="Visit Official Website ↗"
            size="md"
            onPress={handleOpenOfficialWebsite}
          />
        </Card>

        {/* Back navigation */}
        <OutlineButton
          title="← Back to Universities"
          size="md"
          className="border-slate-300 bg-white"
          textClassName="text-slate-700 font-bold"
          onPress={() => navigation.goBack()}
        />
      </ScreenContainer>

      {/* Course Details Modal */}
      <CourseDetailsModal
        visible={activeCourseModal !== null}
        course={activeCourseModal}
        onClose={() => setActiveCourseModal(null)}
      />
    </View>
  );
};

export default UniversityDetailsScreen;
