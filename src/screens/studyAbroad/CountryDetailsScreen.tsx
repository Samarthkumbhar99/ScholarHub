import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import {
  getCountryById,
  getUniversitiesByCountry,
} from '../../utils/studyAbroadUtils';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import { OutlineButton } from '../../components/buttons';
import { UniversityCard } from './components/UniversityCard';

type CountryDetailsRouteProp = RouteProp<RootStackParamList, 'CountryDetails'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * CountryDetailsScreen
 * Full profile of destination country including costs, visa regulations, popular fields, and universities.
 */
export const CountryDetailsScreen: React.FC = () => {
  const route = useRoute<CountryDetailsRouteProp>();
  const navigation = useNavigation<NavProp>();

  const country = useMemo(() => {
    return getCountryById(route.params.countryId);
  }, [route.params.countryId]);

  const universities = useMemo(() => {
    return getUniversitiesByCountry(route.params.countryId);
  }, [route.params.countryId]);

  if (!country) {
    return (
      <ScreenContainer withSafeArea contentContainerClassName="p-4 items-center justify-center">
        <Text className="text-base font-bold text-slate-900 mb-2">
          Country Not Found
        </Text>
        <OutlineButton
          title="← Back to Study Abroad"
          onPress={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const handleSelectUniversity = (universityId: string) => {
    navigation.navigate('UniversityDetails', { universityId });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header with Country Flag */}
        <Header
          title={`${country.flag} ${country.name}`}
          subtitle={`Higher education & university opportunities in ${country.name}`}
          showBack
          onBackPress={() => navigation.goBack()}
          rightAction={
            <Badge
              variant="primary"
              size="sm"
              label={`${universities.length} Universities`}
            />
          }
        />

        {/* 1. Country Overview Card */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <Text className="text-sm font-black text-slate-900 mb-2">
            Why Study in {country.name}?
          </Text>
          <Text className="text-xs text-slate-600 leading-relaxed mb-4">
            {country.description}
          </Text>

          {/* Financial & Visa Matrix */}
          <View className="gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <View className="flex-row items-start justify-between">
              <Text className="text-xs text-slate-500 font-medium w-[35%]">
                💰 Tuition Cost
              </Text>
              <Text className="text-xs font-bold text-slate-900 text-right flex-1 ml-2">
                {country.tuitionSummary}
              </Text>
            </View>

            <View className="flex-row items-start justify-between pt-2 border-t border-slate-200/60">
              <Text className="text-xs text-slate-500 font-medium w-[35%]">
                🏠 Living Expenses
              </Text>
              <Text className="text-xs font-bold text-slate-900 text-right flex-1 ml-2">
                {country.livingCostSummary}
              </Text>
            </View>

            <View className="flex-row items-start justify-between pt-2 border-t border-slate-200/60">
              <Text className="text-xs text-slate-500 font-medium w-[35%]">
                🛡️ Visa Process
              </Text>
              <Text className="text-xs font-semibold text-slate-700 text-right flex-1 ml-2">
                {country.visaSummary}
              </Text>
            </View>

            <View className="flex-row items-start justify-between pt-2 border-t border-slate-200/60">
              <Text className="text-xs text-slate-500 font-medium w-[35%]">
                💼 Post-Study Rights
              </Text>
              <Text className="text-xs font-extrabold text-emerald-700 text-right flex-1 ml-2">
                {country.postStudyWorkVisa}
              </Text>
            </View>

            <View className="flex-row items-start justify-between pt-2 border-t border-slate-200/60">
              <Text className="text-xs text-slate-500 font-medium w-[35%]">
                🗣️ Language
              </Text>
              <Text className="text-xs font-semibold text-slate-700 text-right flex-1 ml-2">
                {country.languageRequirements}
              </Text>
            </View>
          </View>
        </Card>

        {/* 2. Popular Courses in Country */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <Text className="text-sm font-black text-slate-900 mb-2">
            Top Fields of Study in {country.name}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {country.popularCourses.map((c, i) => (
              <View
                key={i}
                className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex-row items-center gap-1.5"
              >
                <Text className="text-xs font-bold text-primary-900">🎓 {c}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* 3. Featured Universities in Country */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-black text-slate-900">
              Universities in {country.name}
            </Text>
            <Badge variant="neutral" size="sm" label={`${universities.length} Listed`} />
          </View>

          {universities.map((uni) => (
            <UniversityCard
              key={uni.id}
              university={uni}
              onPress={() => handleSelectUniversity(uni.id)}
            />
          ))}
        </View>

        {/* Back navigation */}
        <OutlineButton
          title="← Back to All Destinations"
          size="md"
          className="border-slate-300 bg-white"
          textClassName="text-slate-700 font-bold"
          onPress={() => navigation.goBack()}
        />
      </ScreenContainer>
    </View>
  );
};

export default CountryDetailsScreen;
