import React from 'react';
import { View, Text } from 'react-native';
import {
  ApplicationStatus,
  APPLICATION_STATUS_ORDER,
  APPLICATION_STATUS_DETAILS,
  getStageIndex,
} from '../../../types/application';
import { Card, Badge } from '../../../components/common';

interface ApplicationTimelineProps {
  currentStatus: ApplicationStatus;
  appliedDate?: string;
  lastUpdatedDate?: string;
}

/**
 * ApplicationTimeline
 * 7-Stage official visual timeline tracker representing completed (✓), current (●), and upcoming (○) stages.
 */
export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  currentStatus,
  appliedDate,
  lastUpdatedDate,
}) => {
  const currentStageIndex = getStageIndex(currentStatus);

  return (
    <Card variant="elevated" className="p-4 mb-4 border border-slate-200">
      <View className="flex-row items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
        <View>
          <Text className="text-sm font-extrabold text-slate-900">
            Application Lifecycle Tracker
          </Text>
          <Text className="text-[11px] text-slate-500 font-medium mt-0.5">
            Stage {currentStageIndex} of 7 • Sequential Progression
          </Text>
        </View>
        <Badge
          variant={currentStageIndex === 7 ? 'success' : 'primary'}
          size="sm"
          label={`${Math.round((currentStageIndex / 7) * 100)}% Complete`}
        />
      </View>

      {/* Vertical Timeline Nodes */}
      <View className="pl-1 pr-1">
        {APPLICATION_STATUS_ORDER.map((status, index) => {
          const stageNumber = index + 1;
          const isCompleted = stageNumber < currentStageIndex;
          const isCurrent = stageNumber === currentStageIndex;
          const isUpcoming = stageNumber > currentStageIndex;
          const isLast = index === APPLICATION_STATUS_ORDER.length - 1;

          const meta = APPLICATION_STATUS_DETAILS[status];

          return (
            <View key={status} className="flex-row items-start relative">
              {/* Left Connector Line & Node Circle */}
              <View className="items-center mr-3.5">
                {/* Node Icon Circle */}
                <View
                  className={`h-8 w-8 rounded-full items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                      : isCurrent
                      ? 'bg-primary-600 border-primary-200 ring-4 ring-primary-100 shadow-md'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <Text className="text-white text-xs font-black">✓</Text>
                  ) : isCurrent ? (
                    <Text className="text-white text-xs font-black">●</Text>
                  ) : (
                    <Text className="text-slate-400 text-[11px] font-bold">
                      {stageNumber}
                    </Text>
                  )}
                </View>

                {/* Vertical Linking Line (between nodes) */}
                {!isLast && (
                  <View
                    className={`w-0.5 my-1 ${
                      isCompleted ? 'bg-emerald-500 h-10' : 'bg-slate-200 h-9'
                    }`}
                  />
                )}
              </View>

              {/* Right Content Description */}
              <View className={`flex-1 pb-4 ${isLast ? 'pb-1' : ''}`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text
                      className={`text-xs font-extrabold ${
                        isCompleted
                          ? 'text-slate-800'
                          : isCurrent
                          ? 'text-primary-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {stageNumber}. {meta.label}
                    </Text>

                    {isCurrent && (
                      <Badge variant="primary" size="sm" label="Current Stage" />
                    )}
                    {isCompleted && (
                      <Badge variant="success" size="sm" label="Completed ✓" />
                    )}
                  </View>
                </View>

                {/* Description or details box */}
                <Text
                  className={`text-[11px] mt-0.5 leading-relaxed ${
                    isCurrent
                      ? 'text-slate-700 font-medium'
                      : isCompleted
                      ? 'text-slate-500'
                      : 'text-slate-400'
                  }`}
                >
                  {meta.shortDescription}
                </Text>

                {/* Extra context for current stage */}
                {isCurrent && (
                  <View className="mt-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
                    <Text className="text-[10px] font-bold text-primary-800 uppercase tracking-wider">
                      Status Note
                    </Text>
                    <Text className="text-xs text-primary-900 font-semibold mt-0.5">
                      {status === 'SAVED' &&
                        'Application initialized. Gather your documents to proceed.'}
                      {status === 'PREPARING_DOCUMENTS' &&
                        'Upload and verify required documents in the Document Repository.'}
                      {status === 'APPLIED' &&
                        `Application submitted${appliedDate ? ` on ${appliedDate}` : ''}. Awaiting initial scrutiny.`}
                      {status === 'UNDER_REVIEW' &&
                        'Committee is currently auditing transcripts and criteria compliance.'}
                      {status === 'INTERVIEW' &&
                        'Prepare for your virtual technical / personal interview assessment.'}
                      {status === 'SELECTED' &&
                        'Congratulations! You have been conferred this scholarship award.'}
                      {status === 'SCHOLARSHIP_RECEIVED' &&
                        'Direct Benefit Transfer executed. Grant credited to student account.'}
                    </Text>
                    {lastUpdatedDate && (
                      <Text className="text-[10px] text-primary-600 mt-1">
                        Last stage update: {lastUpdatedDate}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

export default ApplicationTimeline;
