import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentTabParamList, RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  setFilterTab,
  ApplicationFilterTab,
} from '../../store/slices/applicationSlice';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  EmptyState,
} from '../../components/common';
import {
  PrimaryButton,
  OutlineButton,
} from '../../components/buttons';
import {
  APPLICATION_STATUS_DETAILS,
  getStageIndex,
  isActiveStatus,
  isCompletedStatus,
} from '../../types/application';
import { MatchScoreBadge } from '../scholarships/components/MatchScoreBadge';
import { ApplicationStatusBadge } from './components/ApplicationStatusBadge';

type ApplicationsTabNavProp = BottomTabNavigationProp<StudentTabParamList, 'Applications'>;

/**
 * ApplicationsScreen
 * Main Application Tracker directory featuring status filtering (All, Active, Completed),
 * stage indicators, match scores, and 1-tap navigation to the 7-stage tracker.
 */
export const ApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<ApplicationsTabNavProp>();
  const dispatch = useAppDispatch();
  const { items, filterTab } = useAppSelector((state) => state.applications);

  // Filter application items
  const filteredApplications = useMemo(() => {
    switch (filterTab) {
      case 'active':
        return items.filter((app) => isActiveStatus(app.status));
      case 'completed':
        return items.filter((app) => isCompletedStatus(app.status));
      case 'all':
      default:
        return items;
    }
  }, [items, filterTab]);

  const activeCount = useMemo(() => {
    return items.filter((app) => isActiveStatus(app.status)).length;
  }, [items]);

  const completedCount = useMemo(() => {
    return items.filter((app) => isCompletedStatus(app.status)).length;
  }, [items]);

  const handleOpenTracker = (applicationId: string) => {
    const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (parentNav) {
      parentNav.navigate('ApplicationDetails', { applicationId });
    } else {
      (navigation as any).navigate('ApplicationDetails', { applicationId });
    }
  };

  const handleBrowseScholarships = () => {
    navigation.navigate('Scholarships');
  };

  const filterTabs: { key: ApplicationFilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Applications', count: items.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'completed', label: 'Completed', count: completedCount },
  ];

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header */}
      <Header
        title="Application Tracker"
        subtitle={`${items.length} Total • ${activeCount} Active • ${completedCount} Completed`}
        rightAction={
          <Badge
            variant="primary"
            size="sm"
            label={`${activeCount} In Progress`}
          />
        }
      />

      {/* Filter Tabs (All / Active / Completed) */}
      <View className="flex-row gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        {filterTabs.map((tab) => {
          const isSelected = filterTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => dispatch(setFilterTab(tab.key))}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${tab.label} filter tab, ${tab.count} items`}
              className={`flex-1 py-2 px-2 rounded-xl items-center justify-center flex-row gap-1.5 ${
                isSelected ? 'bg-white shadow-xs' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-extrabold ${
                  isSelected ? 'text-primary-700' : 'text-slate-600'
                }`}
              >
                {tab.label}
              </Text>
              <View
                className={`h-4 min-w-[16px] px-1 rounded-full items-center justify-center ${
                  isSelected ? 'bg-primary-100' : 'bg-slate-200'
                }`}
              >
                <Text
                  className={`text-[9px] font-black ${
                    isSelected ? 'text-primary-800' : 'text-slate-600'
                  }`}
                >
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <EmptyState
          title={
            filterTab === 'active'
              ? 'No Active Applications'
              : filterTab === 'completed'
              ? 'No Completed Applications'
              : 'No Applications Yet'
          }
          description={
            filterTab === 'completed'
              ? 'None of your scholarship applications have reached final Selection or Disbursement yet.'
              : 'You have not started any scholarship applications. Browse matching scholarships and click Apply Now to start tracking your 7-stage application journey.'
          }
          actionTitle="Browse Scholarships →"
          onActionPress={handleBrowseScholarships}
        />
      ) : (
        <View className="gap-3.5 mb-6">
          {filteredApplications.map((app) => {
            const stageIndex = getStageIndex(app.status);
            const meta = APPLICATION_STATUS_DETAILS[app.status];
            const progressPercent = Math.round((stageIndex / 7) * 100);

            return (
              <Card
                key={app.id}
                variant="elevated"
                className="p-4 border border-slate-200"
              >
                {/* Header: Title, Provider, Match Badge, Status Badge */}
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center flex-wrap gap-1.5 mb-1.5">
                      {app.matchScore ? (
                        <MatchScoreBadge score={app.matchScore} size="sm" />
                      ) : null}
                      <ApplicationStatusBadge status={app.status} size="sm" />
                    </View>
                    <Text className="text-base font-bold text-slate-900 leading-snug">
                      {app.scholarshipTitle}
                    </Text>
                    <Text className="text-xs text-slate-500 font-medium mt-0.5">
                      {app.provider}
                    </Text>
                  </View>
                </View>

                {/* Stage & Progress Box */}
                <View className="bg-slate-50 border border-slate-100 rounded-xl p-3 my-2.5">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-bold text-slate-700">
                      Stage {stageIndex} of 7 • {meta.label}
                    </Text>
                    <Text className="text-xs font-black text-primary-700">
                      {progressPercent}%
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-primary-600 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </View>

                  <Text className="text-[10px] text-slate-400 font-medium mt-1.5" numberOfLines={1}>
                    {meta.shortDescription}
                  </Text>
                </View>

                {/* Award & Deadline Info */}
                <View className="flex-row items-center justify-between py-1 mb-3">
                  <View>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase">
                      Award Value
                    </Text>
                    <Text className="text-xs font-black text-emerald-700 mt-0.5">
                      {app.awardAmount}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] text-slate-400 font-bold uppercase">
                      Deadline
                    </Text>
                    <Text className="text-xs font-bold text-slate-700 mt-0.5">
                      {app.deadline || 'Not specified'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-2 items-center">
                  <View className="flex-1">
                    <PrimaryButton
                      title="View Tracker ➔"
                      size="sm"
                      onPress={() => handleOpenTracker(app.id)}
                    />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Explore More Callout */}
      <Card variant="outlined" className="p-4 items-center bg-blue-50/50 border-blue-200">
        <Text className="text-sm font-bold text-slate-900 text-center mb-1">
          Looking for More Opportunities?
        </Text>
        <Text className="text-xs text-slate-500 text-center mb-3">
          Explore government, private, and international grants matching your profile.
        </Text>
        <PrimaryButton
          title="Browse Scholarships →"
          size="sm"
          onPress={handleBrowseScholarships}
        />
      </Card>
    </ScreenContainer>
  );
};

export default ApplicationsScreen;
