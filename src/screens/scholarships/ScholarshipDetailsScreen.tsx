import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  toggleSaveScholarship,
  toggleCompareScholarship,
} from '../../store/slices/scholarshipSlice';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  EmptyState,
  Divider,
} from '../../components/common';
import {
  PrimaryButton,
  OutlineButton,
  SecondaryButton,
} from '../../components/buttons';
import { MOCK_SCHOLARSHIPS } from './data/mockScholarships';
import { MatchScoreBadge } from './components/MatchScoreBadge';

import { CompareSelectionBar } from './components/CompareSelectionBar';

type DetailsRouteProp = RouteProp<RootStackParamList, 'ScholarshipDetails'>;
type DetailsNavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * ScholarshipDetailsScreen
 * Comprehensive details view for a selected scholarship
 */
export const ScholarshipDetailsScreen: React.FC = () => {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<DetailsNavProp>();
  const dispatch = useAppDispatch();

  const { savedScholarshipIds, comparedScholarshipIds } = useAppSelector(
    (state) => state.scholarships
  );

  const [compareFeedback, setCompareFeedback] = useState<string | null>(null);

  const scholarshipId = route.params?.scholarshipId;
  const scholarship = MOCK_SCHOLARSHIPS.find((item) => item.id === scholarshipId);

  // If scholarship not found, display graceful error state
  if (!scholarship) {
    return (
      <ScreenContainer scrollable withSafeArea>
        <Header
          title="Scholarship Details"
          showBack
          onBackPress={() => navigation.goBack()}
        />
        <EmptyState
          title="Scholarship Not Found"
          description="The scholarship you are looking for is unavailable, expired, or has an invalid identifier."
          actionTitle="← Back to Scholarships"
          onActionPress={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const isSaved = savedScholarshipIds.includes(scholarship.id);
  const isCompared = comparedScholarshipIds.includes(scholarship.id);
  const isUrgent = scholarship.daysLeft <= 7;

  // Handlers
  const handleToggleSave = () => {
    dispatch(toggleSaveScholarship(scholarship.id));
  };

  const handleToggleCompare = () => {
    if (!isCompared && comparedScholarshipIds.length >= 3) {
      Alert.alert(
        'Comparison Limit Reached',
        'You can compare up to 3 scholarships at a time. Please remove an existing selection to add another.'
      );
      setCompareFeedback('You can compare up to 3 scholarships.');
      setTimeout(() => setCompareFeedback(null), 3500);
      return;
    }

    dispatch(toggleCompareScholarship(scholarship.id));
    const nextState = !isCompared;
    const nextCount = nextState
      ? comparedScholarshipIds.length + 1
      : comparedScholarshipIds.length - 1;
    setCompareFeedback(
      nextState
        ? `Added to comparison list (${nextCount}/3).`
        : 'Removed from comparison list.'
    );
    setTimeout(() => setCompareFeedback(null), 3000);
  };

  const handleApplyNow = () => {
    // Navigate to Applications tab via Root -> Student
    navigation.navigate('Student', { screen: 'Applications' } as any);
  };

  const handleOpenOfficialWebsite = async () => {
    if (!scholarship.officialWebsite) {
      Alert.alert(
        'Website Unavailable',
        'The official website link for this scholarship is not currently listed.'
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(scholarship.officialWebsite);
      if (supported) {
        await Linking.openURL(scholarship.officialWebsite);
      } else {
        Alert.alert('Official Portal Link', scholarship.officialWebsite);
      }
    } catch {
      Alert.alert('Official Portal Link', scholarship.officialWebsite);
    }
  };

  const getTypeIcon = () => {
    switch (scholarship.type) {
      case 'government':
        return '🏛️';
      case 'private':
        return '🏢';
      case 'international':
        return '🌐';
      default:
        return '🎓';
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-24">
        {/* 1. Header with back control */}
        <Header
          title={scholarship.title}
          subtitle={scholarship.provider}
          showBack
          onBackPress={() => navigation.goBack()}
          rightAction={
            <Badge
              variant={scholarship.type === 'government' ? 'primary' : 'neutral'}
              size="sm"
              label={scholarship.type.toUpperCase()}
            />
          }
        />

        {/* Comparison Feedback Toast */}
        {compareFeedback ? (
          <View className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex-row items-center justify-between shadow-sm">
            <Text className="text-xs font-semibold text-primary-800">
              ⚖️ {compareFeedback}
            </Text>
            <TouchableOpacity onPress={() => setCompareFeedback(null)}>
              <Text className="text-xs font-bold text-primary-600">✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 2. Hero Header Card */}
        <Card variant="elevated" className="p-5 mb-4 border border-slate-200">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center mr-3 shadow-sm">
                <Text className="text-3xl">{getTypeIcon()}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
                  <MatchScoreBadge score={scholarship.matchScore} size="md" />
                  {scholarship.featured && (
                    <Badge variant="warning" size="sm" label="Featured" />
                  )}
                </View>
                <Text className="text-base font-black text-slate-900 leading-snug">
                  {scholarship.title}
                </Text>
                <Text className="text-xs text-slate-500 font-semibold mt-0.5">
                  {scholarship.provider}
                </Text>
              </View>
            </View>
          </View>

          {/* Tags */}
          <View className="flex-row flex-wrap gap-1.5 pt-2 border-t border-slate-100">
            {scholarship.tags.map((tag) => (
              <Badge key={tag} variant="neutral" size="sm" label={tag} />
            ))}
          </View>
        </Card>

        {/* 3. Award Value & Deadline Card */}
        <Card variant="elevated" className="p-5 mb-4 bg-emerald-900 border-transparent shadow-md shadow-emerald-900/20">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                Total Award Value
              </Text>
              <Text className="text-2xl font-black text-white mt-0.5">
                {scholarship.awardAmount}
              </Text>
            </View>
            <View className="h-12 w-12 rounded-xl bg-emerald-800 border border-emerald-700 items-center justify-center">
              <Text className="text-2xl">💰</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-3 border-t border-emerald-800/60">
            <View>
              <Text className="text-[10px] text-emerald-300 font-semibold uppercase">
                Deadline Date
              </Text>
              <Text className="text-xs font-bold text-white mt-0.5">
                {scholarship.deadline}
              </Text>
            </View>
            <Badge
              variant={isUrgent ? 'warning' : 'success'}
              size="sm"
              showDot
              label={`Closes in ${scholarship.daysLeft} Days`}
            />
          </View>
        </Card>

        {/* 4. About Scholarship */}
        <Card variant="elevated" className="p-5 mb-4">
          <Text className="text-sm font-extrabold text-slate-900 mb-2">
            About the Scholarship
          </Text>
          <Text className="text-xs text-slate-600 leading-relaxed">
            {scholarship.description ||
              'No additional descriptive information provided for this scholarship program.'}
          </Text>
        </Card>

        {/* 5. Eligibility Criteria Matrix */}
        <Card variant="elevated" className="p-5 mb-4">
          <Text className="text-sm font-extrabold text-slate-900 mb-3">
            Eligibility Requirements
          </Text>

          <View className="gap-2.5">
            {/* CGPA */}
            <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Minimum CGPA</Text>
              <Text className="text-xs font-bold text-primary-700">
                {scholarship.minimumCGPA ? `${scholarship.minimumCGPA} / 10.0 (or equiv)` : 'Not specified'}
              </Text>
            </View>

            {/* Income */}
            <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Family Income Cap</Text>
              <Text className="text-xs font-bold text-slate-800">
                {scholarship.maximumFamilyIncome
                  ? `Below ₹${(scholarship.maximumFamilyIncome / 100000).toFixed(1)} Lakhs / annum`
                  : 'No income ceiling'}
              </Text>
            </View>

            {/* Courses */}
            <View className="flex-row items-start justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium mr-2">Eligible Courses</Text>
              <Text className="text-xs font-bold text-slate-800 text-right flex-1">
                {scholarship.eligibleCourses?.join(', ') || 'All standard degree programs'}
              </Text>
            </View>

            {/* Categories */}
            <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Eligible Categories</Text>
              <Text className="text-xs font-bold text-slate-800">
                {scholarship.eligibleCategories?.join(', ') || 'Open to all categories'}
              </Text>
            </View>

            {/* Regions */}
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Eligible Regions</Text>
              <Text className="text-xs font-bold text-slate-800">
                {scholarship.eligibleStates?.join(', ') || 'All Indian States & UTs'}
              </Text>
            </View>
          </View>
        </Card>

        {/* 6. Benefits & Grants */}
        {scholarship.benefits && scholarship.benefits.length > 0 ? (
          <Card variant="elevated" className="p-5 mb-4">
            <Text className="text-sm font-extrabold text-slate-900 mb-3">
              Scholarship Benefits & Grants
            </Text>
            <View className="gap-2.5">
              {scholarship.benefits.map((benefit, idx) => (
                <View key={idx} className="flex-row items-start">
                  <Text className="text-emerald-600 text-sm font-bold mr-2">✓</Text>
                  <Text className="text-xs text-slate-700 leading-relaxed flex-1">
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* 7. Required Documents Checklist */}
        {scholarship.requiredDocuments && scholarship.requiredDocuments.length > 0 ? (
          <Card variant="elevated" className="p-5 mb-4">
            <Text className="text-sm font-extrabold text-slate-900 mb-1">
              Required Documents
            </Text>
            <Text className="text-xs text-slate-500 mb-3">
              Ensure clear scanned copies of these documents are ready before applying.
            </Text>

            <View className="gap-2.5">
              {scholarship.requiredDocuments.map((doc, idx) => (
                <View
                  key={idx}
                  className="flex-row items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <Text className="text-base mr-2.5">📄</Text>
                  <Text className="text-xs font-semibold text-slate-800 flex-1">
                    {doc}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* 8. Selection Process Roadmap */}
        {scholarship.selectionProcess && scholarship.selectionProcess.length > 0 ? (
          <Card variant="elevated" className="p-5 mb-4">
            <Text className="text-sm font-extrabold text-slate-900 mb-3">
              Selection & Disbursement Process
            </Text>
            <View className="gap-3">
              {scholarship.selectionProcess.map((step, idx) => (
                <View key={idx} className="flex-row items-start">
                  <View className="h-6 w-6 rounded-full bg-primary-600 items-center justify-center mr-2.5 mt-0.5 shadow-sm">
                    <Text className="text-white text-[10px] font-extrabold">
                      {idx + 1}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-700 leading-relaxed flex-1">
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* 9. Official Portal Link */}
        <Card variant="outlined" className="p-4 mb-5 items-center">
          <Text className="text-xs text-slate-500 mb-2.5 text-center">
            For official application guidelines, guidelines document and notifications:
          </Text>
          <OutlineButton
            title={
              scholarship.officialWebsite
                ? 'Visit Official Portal ↗'
                : 'Official Link Not Available'
            }
            disabled={!scholarship.officialWebsite}
            size="sm"
            className="border-primary-600 active:bg-blue-50"
            textClassName="text-primary-700 font-bold"
            onPress={handleOpenOfficialWebsite}
          />
        </Card>

        {/* 10. Sticky Action Bar */}
        <View className="mb-8 pt-2">
          <View className="flex-row gap-2 mb-2.5">
            {/* Bookmark / Save Toggle */}
            <TouchableOpacity
              onPress={handleToggleSave}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'Saved scholarship' : 'Save scholarship'}
              className={`flex-1 py-3 px-3 rounded-xl border flex-row items-center justify-center ${
                isSaved
                  ? 'bg-blue-50 border-blue-400 shadow-sm'
                  : 'bg-white border-slate-300 active:bg-slate-50'
              }`}
            >
              <Text className="text-base mr-1.5">{isSaved ? '★' : '☆'}</Text>
              <Text
                className={`text-xs font-bold ${
                  isSaved ? 'text-primary-700' : 'text-slate-700'
                }`}
              >
                {isSaved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>

            {/* Compare Toggle */}
            <TouchableOpacity
              onPress={handleToggleCompare}
              accessibilityRole="button"
              accessibilityLabel={isCompared ? 'Added to compare' : 'Compare scholarship'}
              className={`flex-1 py-3 px-3 rounded-xl border flex-row items-center justify-center ${
                isCompared
                  ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                  : 'bg-white border-slate-300 active:bg-slate-50'
              }`}
            >
              <Text className="text-base mr-1.5">{isCompared ? '✓' : '⚖️'}</Text>
              <Text
                className={`text-xs font-bold ${
                  isCompared ? 'text-indigo-700' : 'text-slate-700'
                }`}
              >
                {isCompared ? '✓ Added to Compare' : 'Compare'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Primary Apply Button */}
          <PrimaryButton
            title="Apply Now 🚀"
            size="lg"
            fullWidth
            onPress={handleApplyNow}
          />
        </View>
      </ScreenContainer>

      {/* Sticky Bottom Compare Bar */}
      <CompareSelectionBar bottomOffset={0} />
    </View>
  );
};

export default ScholarshipDetailsScreen;
