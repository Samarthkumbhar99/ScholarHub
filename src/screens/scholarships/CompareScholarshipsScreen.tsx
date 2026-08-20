import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  removeFromCompare,
  clearComparedScholarships,
} from '../../store/slices/scholarshipSlice';
import {
  ScreenContainer,
  Header,
  Badge,
  EmptyState,
} from '../../components/common';
import { PrimaryButton, OutlineButton } from '../../components/buttons';
import { MOCK_SCHOLARSHIPS } from './data/mockScholarships';
import { MatchScoreBadge } from './components/MatchScoreBadge';
import { ScholarshipItem } from './types';

type CompareNavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * CompareScholarshipsScreen
 * Dedicated side-by-side comparison matrix for 2 to 3 scholarships.
 * Provides horizontal scrolling, best-value highlighting, graceful fallback for missing fields,
 * and 1-tap column removal.
 */
export const CompareScholarshipsScreen: React.FC = () => {
  const navigation = useNavigation<CompareNavProp>();
  const dispatch = useAppDispatch();

  const { comparedScholarshipIds } = useAppSelector((state) => state.scholarships);

  // Retrieve full scholarship objects for compared IDs
  const comparedScholarships = useMemo(() => {
    return comparedScholarshipIds
      .map((id) => MOCK_SCHOLARSHIPS.find((item) => item.id === id))
      .filter((item): item is ScholarshipItem => item !== undefined);
  }, [comparedScholarshipIds]);

  // Compute best values among compared items for clean highlighting
  const bestMetrics = useMemo(() => {
    if (comparedScholarships.length === 0) {
      return { maxAwardId: null, maxDaysLeftId: null, maxScoreId: null };
    }

    const maxAward = Math.max(...comparedScholarships.map((s) => s.numericAmount || 0));
    const maxDaysLeft = Math.max(...comparedScholarships.map((s) => s.daysLeft || 0));
    const maxScore = Math.max(...comparedScholarships.map((s) => s.matchScore || 0));

    return {
      maxAwardId:
        comparedScholarships.length > 1
          ? comparedScholarships.find((s) => s.numericAmount === maxAward)?.id
          : null,
      maxDaysLeftId:
        comparedScholarships.length > 1
          ? comparedScholarships.find((s) => s.daysLeft === maxDaysLeft)?.id
          : null,
      maxScoreId:
        comparedScholarships.length > 1
          ? comparedScholarships.find((s) => s.matchScore === maxScore)?.id
          : null,
    };
  }, [comparedScholarships]);

  const handleRemoveScholarship = (id: string) => {
    dispatch(removeFromCompare(id));
  };

  const handleClearAll = () => {
    dispatch(clearComparedScholarships());
  };

  const handleDetails = (id: string) => {
    navigation.navigate('ScholarshipDetails', { scholarshipId: id });
  };

  const handleExplore = () => {
    navigation.navigate('Student', { screen: 'Scholarships' } as any);
  };

  // Helper formatting functions with strict "Not specified" fallbacks
  const formatIncome = (income?: number) => {
    if (income === undefined || income === null || isNaN(income)) {
      return 'No income ceiling';
    }
    return `Below ₹${(income / 100000).toFixed(1)} Lakhs / yr`;
  };

  const formatCGPA = (cgpa?: number) => {
    if (cgpa === undefined || cgpa === null || isNaN(cgpa)) {
      return 'Not specified';
    }
    return `${cgpa.toFixed(1)} / 10.0`;
  };

  const formatFunding = (funding?: string) => {
    if (!funding) return 'Not specified';
    return funding === 'fully_funded' ? 'Fully Funded' : 'Partially Funded';
  };

  const formatType = (type?: string) => {
    if (!type) return 'Not specified';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header with back navigation and Clear All button */}
        <Header
          title="Compare Scholarships"
          subtitle={`${comparedScholarships.length} of 3 scholarships selected`}
          showBack
          onBackPress={() => navigation.goBack()}
          rightAction={
            comparedScholarships.length > 0 ? (
              <TouchableOpacity
                onPress={handleClearAll}
                accessibilityRole="button"
                accessibilityLabel="Clear all compared scholarships"
                className="px-3 py-1.5 rounded-xl bg-slate-100 active:bg-slate-200 border border-slate-200"
              >
                <Text className="text-xs font-bold text-slate-700">Clear All</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Empty State when 0 scholarships selected */}
        {comparedScholarships.length === 0 ? (
          <EmptyState
            title="No Scholarships to Compare"
            description="You have not selected any scholarships for comparison. Select 2 or 3 scholarships from the directory to view their awards, criteria, and benefits side-by-side."
            actionTitle="Explore Scholarships"
            onActionPress={handleExplore}
          />
        ) : (
          <View>
            {/* Status Alert if fewer than 2 are selected */}
            {comparedScholarships.length < 2 && (
              <View className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-xs font-bold text-amber-900">
                    ⚠️ Minimum 2 Scholarships Required
                  </Text>
                  <Text className="text-[11px] text-amber-700 mt-0.5">
                    Select 1 or 2 more scholarships to compare them side-by-side.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleExplore}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 active:bg-amber-700"
                >
                  <Text className="text-xs font-extrabold text-white">+ Add More</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Comparison Matrix Table with Horizontal Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6"
            >
              <View className="flex-col">
                {/* 1. TABLE HEADER: Card Overview & Actions */}
                <View className="flex-row border-b border-slate-200 bg-slate-100/70">
                  {/* Fixed Attribute Label Header */}
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-100">
                    <Text className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Scholarship
                    </Text>
                  </View>

                  {/* Scholarship Columns */}
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-4 border-r border-slate-200 justify-between bg-white"
                    >
                      <View>
                        {/* Remove Action */}
                        <View className="flex-row items-center justify-between mb-2">
                          <MatchScoreBadge score={sch.matchScore} size="sm" />
                          <TouchableOpacity
                            onPress={() => handleRemoveScholarship(sch.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${sch.title} from comparison`}
                            className="h-6 w-6 rounded-full bg-slate-100 items-center justify-center active:bg-red-50 border border-slate-200"
                          >
                            <Text className="text-xs font-bold text-slate-500">✕</Text>
                          </TouchableOpacity>
                        </View>

                        <Text
                          className="text-sm font-bold text-slate-900 leading-snug"
                          numberOfLines={2}
                        >
                          {sch.title}
                        </Text>
                        <Text
                          className="text-xs text-slate-500 font-medium mt-0.5"
                          numberOfLines={1}
                        >
                          {sch.provider}
                        </Text>
                      </View>

                      {/* View Details button */}
                      <View className="mt-3">
                        <OutlineButton
                          title="View Details ↗"
                          size="sm"
                          onPress={() => handleDetails(sch.id)}
                        />
                      </View>
                    </View>
                  ))}
                </View>

                {/* 2. ROW: Award Value */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Award Amount</Text>
                    <Text className="text-[10px] text-slate-400">Total grant</Text>
                  </View>
                  {comparedScholarships.map((sch) => {
                    const isBest = bestMetrics.maxAwardId === sch.id;
                    return (
                      <View
                        key={sch.id}
                        className={`w-56 p-3.5 border-r border-slate-200 justify-center ${
                          isBest ? 'bg-emerald-50/50' : 'bg-white'
                        }`}
                      >
                        <Text
                          className={`text-sm font-black ${
                            isBest ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {sch.awardAmount || 'Not specified'}
                        </Text>
                        {isBest && (
                          <View className="mt-1 self-start">
                            <Badge variant="success" size="sm" label="★ Highest Award" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* 3. ROW: Deadline & Days Left */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Deadline</Text>
                    <Text className="text-[10px] text-slate-400">Application close</Text>
                  </View>
                  {comparedScholarships.map((sch) => {
                    const isBest = bestMetrics.maxDaysLeftId === sch.id;
                    return (
                      <View
                        key={sch.id}
                        className={`w-56 p-3.5 border-r border-slate-200 justify-center ${
                          isBest ? 'bg-blue-50/50' : 'bg-white'
                        }`}
                      >
                        <Text className="text-xs font-bold text-slate-800">
                          {sch.deadline || 'Not specified'}
                        </Text>
                        <Text
                          className={`text-[11px] font-semibold mt-0.5 ${
                            sch.daysLeft <= 7 ? 'text-amber-600' : 'text-slate-500'
                          }`}
                        >
                          {sch.daysLeft ? `${sch.daysLeft} days remaining` : 'Not specified'}
                        </Text>
                        {isBest && (
                          <View className="mt-1 self-start">
                            <Badge variant="info" size="sm" label="★ Most Time" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* 4. ROW: Profile Match Score */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Match Score</Text>
                    <Text className="text-[10px] text-slate-400">Profile affinity</Text>
                  </View>
                  {comparedScholarships.map((sch) => {
                    const isBest = bestMetrics.maxScoreId === sch.id;
                    return (
                      <View
                        key={sch.id}
                        className={`w-56 p-3.5 border-r border-slate-200 justify-center ${
                          isBest ? 'bg-indigo-50/40' : 'bg-white'
                        }`}
                      >
                        <View className="flex-row items-center gap-1.5">
                          <MatchScoreBadge score={sch.matchScore} size="sm" />
                          {isBest && (
                            <Badge variant="primary" size="sm" label="★ Top Match" />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* 5. ROW: Maximum Family Income */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Income Limit</Text>
                    <Text className="text-[10px] text-slate-400">Max ceiling</Text>
                  </View>
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-3.5 border-r border-slate-200 justify-center bg-white"
                    >
                      <Text className="text-xs font-semibold text-slate-800">
                        {formatIncome(sch.maximumFamilyIncome)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 6. ROW: Minimum CGPA */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Min. CGPA</Text>
                    <Text className="text-[10px] text-slate-400">Academic cutoff</Text>
                  </View>
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-3.5 border-r border-slate-200 justify-center bg-white"
                    >
                      <Text className="text-xs font-bold text-primary-700">
                        {formatCGPA(sch.minimumCGPA)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 7. ROW: Scholarship Type */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Type</Text>
                    <Text className="text-[10px] text-slate-400">Sector</Text>
                  </View>
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-3.5 border-r border-slate-200 justify-center bg-white"
                    >
                      <Badge
                        variant={sch.type === 'government' ? 'primary' : 'neutral'}
                        size="sm"
                        label={formatType(sch.type)}
                      />
                    </View>
                  ))}
                </View>

                {/* 8. ROW: Funding Type */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Funding</Text>
                    <Text className="text-[10px] text-slate-400">Coverage level</Text>
                  </View>
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-3.5 border-r border-slate-200 justify-center bg-white"
                    >
                      <Text className="text-xs font-semibold text-slate-800">
                        {formatFunding(sch.fundingType)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 9. ROW: Fields of Study */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Field of Study</Text>
                    <Text className="text-[10px] text-slate-400">Disciplines</Text>
                  </View>
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-3.5 border-r border-slate-200 justify-center bg-white"
                    >
                      <Text className="text-xs text-slate-700 leading-relaxed">
                        {sch.fieldsOfStudy?.length
                          ? sch.fieldsOfStudy.join(', ')
                          : 'Not specified'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 10. ROW: Eligible Courses */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Courses</Text>
                    <Text className="text-[10px] text-slate-400">Degree levels</Text>
                  </View>
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-3.5 border-r border-slate-200 justify-center bg-white"
                    >
                      <Text className="text-xs text-slate-700 leading-relaxed">
                        {sch.eligibleCourses?.length
                          ? sch.eligibleCourses.join(', ')
                          : 'All accredited degrees'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 11. ROW: Key Benefits */}
                <View className="flex-row border-b border-slate-100">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Key Benefits</Text>
                    <Text className="text-[10px] text-slate-400">Perks & grants</Text>
                  </View>
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-3.5 border-r border-slate-200 justify-center bg-white"
                    >
                      {sch.benefits && sch.benefits.length > 0 ? (
                        <View className="gap-1.5">
                          {sch.benefits.slice(0, 2).map((benefit, idx) => (
                            <Text
                              key={idx}
                              className="text-[11px] text-slate-600 leading-tight"
                            >
                              • {benefit}
                            </Text>
                          ))}
                        </View>
                      ) : (
                        <Text className="text-xs text-slate-400 italic">
                          Not specified
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                {/* 12. ROW: Required Documents */}
                <View className="flex-row">
                  <View className="w-32 p-3.5 justify-center border-r border-slate-200 bg-slate-50">
                    <Text className="text-xs font-bold text-slate-700">Documents</Text>
                    <Text className="text-[10px] text-slate-400">Requirements</Text>
                  </View>
                  {comparedScholarships.map((sch) => (
                    <View
                      key={sch.id}
                      className="w-56 p-3.5 border-r border-slate-200 justify-center bg-white"
                    >
                      <Text className="text-xs font-bold text-slate-800">
                        {sch.requiredDocuments?.length || 0} Documents
                      </Text>
                      <Text
                        className="text-[10px] text-slate-500 mt-0.5"
                        numberOfLines={2}
                      >
                        {sch.requiredDocuments?.slice(0, 2).join(', ') || 'Not specified'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Help Note */}
            <View className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 items-center">
              <Text className="text-[11px] text-slate-500 text-center font-medium">
                💡 Tip: Swipe left/right on the table to view all attributes side-by-side.
              </Text>
            </View>
          </View>
        )}
      </ScreenContainer>
    </View>
  );
};

export default CompareScholarshipsScreen;
