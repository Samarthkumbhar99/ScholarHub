import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Country, University, Course } from '../../types/studyAbroad';
import {
  MOCK_COUNTRIES,
  MOCK_UNIVERSITIES,
  MOCK_COURSES,
} from './data/mockStudyAbroad';
import { searchStudyAbroad } from '../../utils/studyAbroadUtils';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import { OutlineButton } from '../../components/buttons';
import {
  CountryCard,
  UniversityCard,
  CourseCard,
  CourseDetailsModal,
  ApplicationGuidanceSection,
} from './components';

type StudyAbroadNavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * StudyAbroadScreen
 * Primary international education discovery center for countries, universities, courses, and linked scholarships.
 */
export const StudyAbroadScreen: React.FC = () => {
  const navigation = useNavigation<StudyAbroadNavProp>();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'LowTuition' | 'DE' | 'UK' | 'US' | 'CA' | 'AU' | 'SG'>('All');
  const [activeCourseModal, setActiveCourseModal] = useState<Course | null>(null);

  // Search results calculation
  const searchResults = useMemo(() => {
    return searchStudyAbroad(searchQuery, MOCK_COUNTRIES, MOCK_UNIVERSITIES, MOCK_COURSES);
  }, [searchQuery]);

  // Filtered countries for default view
  const displayedCountries = useMemo(() => {
    if (selectedFilter === 'All') return MOCK_COUNTRIES;
    if (selectedFilter === 'LowTuition') return MOCK_COUNTRIES.filter((c) => c.id === 'de');
    return MOCK_COUNTRIES.filter((c) => c.code.toLowerCase() === selectedFilter.toLowerCase());
  }, [selectedFilter]);

  const isSearching = searchQuery.trim().length > 0;

  // Handlers
  const handleSelectCountry = (countryId: string) => {
    navigation.navigate('CountryDetails', { countryId });
  };

  const handleSelectUniversity = (universityId: string) => {
    navigation.navigate('UniversityDetails', { universityId });
  };

  const handleSelectCourse = (course: Course) => {
    setActiveCourseModal(course);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedFilter('All');
  };

  const filterTabs = [
    { key: 'All', label: 'All Destinations' },
    { key: 'LowTuition', label: 'Zero / Low Tuition 💰' },
    { key: 'DE', label: 'Germany 🇩🇪' },
    { key: 'UK', label: 'UK 🇬🇧' },
    { key: 'US', label: 'USA 🇺🇸' },
    { key: 'CA', label: 'Canada 🇨🇦' },
    { key: 'AU', label: 'Australia 🇦🇺' },
    { key: 'SG', label: 'Singapore 🇸🇬' },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title="Study Abroad"
          subtitle="Explore universities, courses, scholarships and application information"
          showBack
          onBackPress={() => navigation.goBack()}
        />

        {/* Search Input Bar */}
        <Card variant="elevated" className="p-3 mb-4 border border-slate-200 bg-white">
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Text className="text-base mr-2">🔍</Text>
            <TextInput
              placeholder="Search country, university or course..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-sm text-slate-900 font-medium py-1"
              returnKeyType="search"
            />
            {isSearching && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="h-6 w-6 rounded-full bg-slate-200 items-center justify-center ml-1"
                accessibilityLabel="Clear search input"
              >
                <Text className="text-xs font-bold text-slate-600">✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Filter Pills (Shown in default mode) */}
        {!isSearching && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4 -mx-1"
          >
            <View className="flex-row gap-2 px-1">
              {filterTabs.map((tab) => {
                const isSelected = selectedFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setSelectedFilter(tab.key as any)}
                    className={`py-1.5 px-3 rounded-full border ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600 shadow-2xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* 1. SEARCH RESULTS MODE */}
        {isSearching ? (
          <View>
            {searchResults.totalCount === 0 ? (
              <Card variant="outlined" className="p-8 items-center bg-white border-slate-200 my-4">
                <Text className="text-4xl mb-3">🌍</Text>
                <Text className="text-base font-extrabold text-slate-900 text-center mb-1">
                  No study-abroad opportunities found.
                </Text>
                <Text className="text-xs text-slate-500 text-center mb-5 max-w-[260px]">
                  Try another country, university or course keyword.
                </Text>
                <OutlineButton
                  title="Clear Search"
                  size="md"
                  onPress={handleClearSearch}
                />
              </Card>
            ) : (
              <View className="gap-4">
                <Text className="text-xs font-bold text-slate-500 mb-1">
                  Found {searchResults.totalCount} results for "{searchQuery}"
                </Text>

                {/* Matching Countries */}
                {searchResults.countries.length > 0 && (
                  <View>
                    <Text className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                      Matching Countries ({searchResults.countries.length})
                    </Text>
                    {searchResults.countries.map((c) => (
                      <CountryCard
                        key={c.id}
                        country={c}
                        onPress={() => handleSelectCountry(c.id)}
                      />
                    ))}
                  </View>
                )}

                {/* Matching Universities */}
                {searchResults.universities.length > 0 && (
                  <View>
                    <Text className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                      Matching Universities ({searchResults.universities.length})
                    </Text>
                    {searchResults.universities.map((u) => (
                      <UniversityCard
                        key={u.id}
                        university={u}
                        onPress={() => handleSelectUniversity(u.id)}
                      />
                    ))}
                  </View>
                )}

                {/* Matching Courses */}
                {searchResults.courses.length > 0 && (
                  <View>
                    <Text className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                      Matching Degree Programs ({searchResults.courses.length})
                    </Text>
                    {searchResults.courses.map((crs) => (
                      <CourseCard
                        key={crs.id}
                        course={crs}
                        onPress={() => handleSelectCourse(crs)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          /* 2. DEFAULT EXPLORATION MODE */
          <View>
            {/* Application Roadmap Checklist */}
            <ApplicationGuidanceSection />

            {/* Popular Destinations Header */}
            <View className="flex-row items-center justify-between mb-3 mt-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-base font-black text-slate-900">
                  Popular Destinations
                </Text>
                <Badge variant="primary" size="sm" label={`${displayedCountries.length} Countries`} />
              </View>
            </View>

            {/* Country Cards */}
            {displayedCountries.map((country) => (
              <CountryCard
                key={country.id}
                country={country}
                onPress={() => handleSelectCountry(country.id)}
              />
            ))}

            {/* Top Featured Universities */}
            <View className="mt-4 mb-2">
              <Text className="text-base font-black text-slate-900 mb-1">
                Featured Global Universities
              </Text>
              <Text className="text-xs text-slate-500 mb-3">
                Top institutions offering scholarships & high post-study returns
              </Text>
              {MOCK_UNIVERSITIES.slice(0, 3).map((uni) => (
                <UniversityCard
                  key={uni.id}
                  university={uni}
                  onPress={() => handleSelectUniversity(uni.id)}
                />
              ))}
            </View>
          </View>
        )}
      </ScreenContainer>

      {/* Course Details Modal */}
      <CourseDetailsModal
        visible={activeCourseModal !== null}
        course={activeCourseModal}
        onClose={() => setActiveCourseModal(null)}
        onViewUniversity={(uniId) => {
          navigation.navigate('UniversityDetails', { universityId: uniId });
        }}
      />
    </View>
  );
};

export default StudyAbroadScreen;
