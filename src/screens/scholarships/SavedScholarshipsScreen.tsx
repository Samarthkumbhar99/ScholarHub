import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  removeSavedScholarship,
  toggleCompareScholarship,
} from '../../store/slices/scholarshipSlice';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  EmptyState,
} from '../../components/common';
import { PrimaryButton, OutlineButton } from '../../components/buttons';
import { MOCK_SCHOLARSHIPS } from './data/mockScholarships';
import { MatchScoreBadge } from './components/MatchScoreBadge';
import { CompareSelectionBar } from './components/CompareSelectionBar';
import { ScholarshipItem } from './types';

type SavedNavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * SavedScholarshipsScreen
 * Dedicated view displaying all bookmarked / saved scholarships with 1-tap remove and compare
 */
export const SavedScholarshipsScreen: React.FC = () => {
  const navigation = useNavigation<SavedNavProp>();
  const dispatch = useAppDispatch();

  const { savedScholarshipIds, comparedScholarshipIds } = useAppSelector(
    (state) => state.scholarships
  );

  // Filter mock scholarships to only those that are in savedScholarshipIds
  const savedScholarships = MOCK_SCHOLARSHIPS.filter((item) =>
    savedScholarshipIds.includes(item.id)
  );

  const handleRemove = (id: string, title: string) => {
    dispatch(removeSavedScholarship(id));
  };

  const handleDetails = (scholarship: ScholarshipItem) => {
    navigation.navigate('ScholarshipDetails', { scholarshipId: scholarship.id });
  };

  const handleToggleCompare = (id: string) => {
    if (!comparedScholarshipIds.includes(id) && comparedScholarshipIds.length >= 3) {
      Alert.alert(
        'Comparison Limit Reached',
        'You can compare up to 3 scholarships at a time. Please remove an existing selection to add another.'
      );
      return;
    }
    dispatch(toggleCompareScholarship(id));
  };

  const handleExplore = () => {
    // Navigate to student scholarships tab
    navigation.navigate('Student', { screen: 'Scholarships' } as any);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-24">
        {/* Header with back navigation */}
        <Header
          title="Saved Scholarships"
          subtitle={`${savedScholarships.length} bookmarked opportunities`}
          showBack
          onBackPress={() => navigation.goBack()}
          rightAction={
            <Badge
              variant="primary"
              size="sm"
              label={`${savedScholarships.length} Saved`}
            />
          }
        />

        {/* Empty State */}
        {savedScholarships.length === 0 ? (
          <EmptyState
            title="No Saved Scholarships"
            description="You haven't bookmarked any scholarships yet. Explore the scholarship directory to find and save opportunities matching your profile."
            actionTitle="Explore Scholarships"
            onActionPress={handleExplore}
          />
        ) : (
          <View className="gap-3.5">
            {savedScholarships.map((scholarship) => {
              const isCompared = comparedScholarshipIds.includes(scholarship.id);
              const isUrgent = scholarship.daysLeft <= 7;

              return (
                <Card
                  key={scholarship.id}
                  variant="elevated"
                  className="p-4 border border-slate-200"
                >
                  {/* Top Row: Match Badge, Featured & Bookmark indicator */}
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center flex-wrap gap-1.5 mb-1.5">
                        <MatchScoreBadge score={scholarship.matchScore} size="sm" />
                        <Badge
                          variant={scholarship.type === 'government' ? 'primary' : 'neutral'}
                          size="sm"
                          label={scholarship.type.toUpperCase()}
                        />
                        {scholarship.featured && (
                          <Badge variant="warning" size="sm" label="Featured" />
                        )}
                      </View>
                      <Text className="text-base font-bold text-slate-900 leading-snug">
                        {scholarship.title}
                      </Text>
                      <Text className="text-xs text-slate-500 font-medium mt-0.5">
                        {scholarship.provider}
                      </Text>
                    </View>

                    {/* Saved Star Badge */}
                    <View className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center">
                      <Text className="text-blue-600 text-sm">★</Text>
                    </View>
                  </View>

                  {/* Award Amount & Deadline Bar */}
                  <View className="flex-row items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl mb-3 border border-slate-100">
                    <View>
                      <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Award Value
                      </Text>
                      <Text className="text-sm font-black text-emerald-700 mt-0.5">
                        {scholarship.awardAmount}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Badge
                        variant={isUrgent ? 'warning' : 'info'}
                        size="sm"
                        showDot
                        label={`Closes in ${scholarship.daysLeft} days`}
                      />
                      <Text className="text-[10px] text-slate-400 mt-1">
                        Deadline: {scholarship.deadline}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons: Details, Remove, Compare */}
                  <View className="flex-row gap-2 items-center">
                    <View className="flex-1">
                      <PrimaryButton
                        title="View Details"
                        size="sm"
                        onPress={() => handleDetails(scholarship)}
                      />
                    </View>
                    <OutlineButton
                      title="Remove"
                      size="sm"
                      className="border-red-200 bg-red-50/50 active:bg-red-100"
                      textClassName="text-red-600 font-bold"
                      onPress={() => handleRemove(scholarship.id, scholarship.title)}
                    />
                    <TouchableOpacity
                      onPress={() => handleToggleCompare(scholarship.id)}
                      accessibilityRole="button"
                      accessibilityLabel={isCompared ? 'Remove from compare' : 'Add to compare'}
                      className={`px-3 py-2 rounded-xl border flex-row items-center justify-center ${
                        isCompared
                          ? 'bg-indigo-50 border-indigo-400 shadow-sm'
                          : 'bg-slate-50 border-slate-200 active:bg-slate-100'
                      }`}
                    >
                      <Text className="text-xs mr-1">{isCompared ? '✓' : '⚖️'}</Text>
                      <Text
                        className={`text-xs font-bold ${
                          isCompared ? 'text-indigo-700' : 'text-slate-600'
                        }`}
                      >
                        {isCompared ? 'Compared' : 'Compare'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScreenContainer>

      {/* Floating compare action bar when scholarships are selected */}
      <CompareSelectionBar bottomOffset={0} />
    </View>
  );
};

export default SavedScholarshipsScreen;
