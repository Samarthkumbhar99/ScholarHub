import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  advanceApplicationStatus,
  resetApplicationStatus,
} from '../../store/slices/applicationSlice';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  EmptyState,
} from '../../components/common';
import { PrimaryButton, OutlineButton, SecondaryButton } from '../../components/buttons';
import {
  APPLICATION_STATUS_DETAILS,
  getStageIndex,
  getNextStatus,
} from '../../types/application';
import { MatchScoreBadge } from '../scholarships/components/MatchScoreBadge';
import { ApplicationTimeline } from './components/ApplicationTimeline';
import { ApplicationStatusBadge } from './components/ApplicationStatusBadge';
import { DocumentChecklistSummary } from './components/DocumentChecklistSummary';

type DetailsRouteProp = RouteProp<RootStackParamList, 'ApplicationDetails'>;
type DetailsNavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * ApplicationDetailsScreen
 * Comprehensive application tracker view providing 7-stage lifecycle visualization,
 * document checklist synchronization, and sequential stage advancement.
 */
export const ApplicationDetailsScreen: React.FC = () => {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<DetailsNavProp>();
  const dispatch = useAppDispatch();

  const { items } = useAppSelector((state) => state.applications);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const applicationId = route.params?.applicationId;
  const application = items.find((app) => app.id === applicationId);

  if (!application) {
    return (
      <ScreenContainer scrollable withSafeArea>
        <Header
          title="Application Tracker"
          showBack
          onBackPress={() => navigation.goBack()}
        />
        <EmptyState
          title="Application Not Found"
          description="The requested application record could not be found or has been removed."
          actionTitle="← Back to Applications"
          onActionPress={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const currentStageIndex = getStageIndex(application.status);
  const nextStatus = getNextStatus(application.status);
  const nextMeta = nextStatus ? APPLICATION_STATUS_DETAILS[nextStatus] : null;
  const currentMeta = APPLICATION_STATUS_DETAILS[application.status];

  // Actions
  const handleAdvanceStatus = () => {
    if (!nextStatus) {
      Alert.alert(
        'Lifecycle Completed',
        'This scholarship application has already completed all 7 stages.'
      );
      return;
    }

    dispatch(advanceApplicationStatus(application.id));
    setActionFeedback(`Application stage moved to: ${nextMeta?.label}`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleResetStatus = () => {
    dispatch(resetApplicationStatus(application.id));
    setActionFeedback('Application reset to Stage 1: Saved');
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleOpenScholarshipDetails = () => {
    navigation.navigate('ScholarshipDetails', { scholarshipId: application.scholarshipId });
  };

  const handleOpenDocumentCenter = () => {
    navigation.navigate('Student', { screen: 'Documents' } as any);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title="Application Tracker"
          subtitle={`Stage ${currentStageIndex} of 7 • ${currentMeta.label}`}
          showBack
          onBackPress={() => navigation.goBack()}
          rightAction={
            <ApplicationStatusBadge status={application.status} size="sm" />
          }
        />

        {/* Action Feedback Banner */}
        {actionFeedback ? (
          <View className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex-row items-center justify-between shadow-sm">
            <Text className="text-xs font-bold text-primary-900">
              🚀 {actionFeedback}
            </Text>
            <TouchableOpacity onPress={() => setActionFeedback(null)}>
              <Text className="text-xs font-bold text-primary-600">✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Hero Card: Overview & Progress */}
        <Card variant="elevated" className="p-5 mb-4 border border-slate-200">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center flex-wrap gap-1.5 mb-1.5">
                {application.matchScore ? (
                  <MatchScoreBadge score={application.matchScore} size="sm" />
                ) : null}
                <Badge
                  variant={currentMeta.badgeVariant}
                  size="sm"
                  label={`Stage ${currentStageIndex}/7`}
                />
              </View>
              <Text className="text-base font-black text-slate-900 leading-snug">
                {application.scholarshipTitle}
              </Text>
              <Text className="text-xs text-slate-500 font-medium mt-0.5">
                {application.provider}
              </Text>
            </View>
          </View>

          {/* Award Value & Deadline Bar */}
          <View className="flex-row items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl mb-3.5 border border-slate-100">
            <View>
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Award Amount
              </Text>
              <Text className="text-sm font-black text-emerald-700 mt-0.5">
                {application.awardAmount}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Deadline Date
              </Text>
              <Text className="text-xs font-bold text-slate-700 mt-0.5">
                {application.deadline || 'Not specified'}
              </Text>
            </View>
          </View>

          {/* Progress Bar (X / 7 Stages) */}
          <View className="pt-2 border-t border-slate-100">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-bold text-slate-700">
                Overall Lifecycle Progress
              </Text>
              <Text className="text-xs font-black text-primary-700">
                {currentStageIndex} / 7 ({Math.round((currentStageIndex / 7) * 100)}%)
              </Text>
            </View>
            <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <View
                className="h-full bg-primary-600 rounded-full"
                style={{ width: `${(currentStageIndex / 7) * 100}%` }}
              />
            </View>
          </View>
        </Card>

        {/* 7-Stage Visual Timeline Tracker */}
        <ApplicationTimeline
          currentStatus={application.status}
          appliedDate={application.appliedDate}
          lastUpdatedDate={application.lastUpdatedDate}
        />

        {/* Document Checklist Summary (Shown in PREPARING_DOCUMENTS or as helpful reference) */}
        <DocumentChecklistSummary
          requiredDocuments={application.requiredDocuments}
          onOpenDocumentCenter={handleOpenDocumentCenter}
        />

        {/* Development-Only Stage Controller */}
        <Card variant="outlined" className="p-4 mb-4 bg-indigo-50/40 border-indigo-200">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base">🛠️</Text>
              <Text className="text-xs font-extrabold text-indigo-900">
                Development Stage Controller (Mock Workflow)
              </Text>
            </View>
            <Badge variant="neutral" size="sm" label="Demo Tool" />
          </View>

          <Text className="text-[11px] text-indigo-800/80 mb-3 leading-relaxed">
            Test the sequential 7-stage application workflow. Advancing moves the mock application strictly one stage forward without skipping.
          </Text>

          <View className="gap-2">
            {nextStatus ? (
              <PrimaryButton
                title={`Advance to: ${nextMeta?.label} ➔`}
                size="sm"
                className="bg-indigo-600 active:bg-indigo-700"
                onPress={handleAdvanceStatus}
              />
            ) : (
              <View className="py-2.5 px-3 rounded-xl bg-emerald-100 border border-emerald-300 items-center">
                <Text className="text-xs font-extrabold text-emerald-800">
                  🎉 All 7 Stages Completed (Scholarship Received)
                </Text>
              </View>
            )}

            {currentStageIndex > 1 && (
              <OutlineButton
                title="Reset Stage to: Saved ↺"
                size="sm"
                className="border-indigo-300"
                textClassName="text-indigo-700 font-bold"
                onPress={handleResetStatus}
              />
            )}
          </View>
        </Card>

        {/* Action Link: View Full Scholarship Details */}
        <View className="mb-4">
          <OutlineButton
            title="View Original Scholarship Details ↗"
            size="md"
            className="border-slate-300 bg-white active:bg-slate-50"
            textClassName="text-slate-700 font-bold"
            onPress={handleOpenScholarshipDetails}
          />
        </View>
      </ScreenContainer>
    </View>
  );
};

export default ApplicationDetailsScreen;
