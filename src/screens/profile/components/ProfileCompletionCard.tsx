import React from 'react';
import { View, Text } from 'react-native';
import { Card, Badge } from '../../../components/common';
import { PrimaryButton, OutlineButton } from '../../../components/buttons';
import { ProfileCompletionResult } from '../../../utils/profileUtils';

interface ProfileCompletionCardProps {
  completion: ProfileCompletionResult;
  onEditProfile: () => void;
}

/**
 * ProfileCompletionCard
 * Renders deterministic profile completion progress bar and section indicators
 */
export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  completion,
  onEditProfile,
}) => {
  const { percentage, isComplete, completedCount, totalCount, sections } = completion;

  return (
    <Card
      variant="elevated"
      className={`p-4 mb-4 border ${
        isComplete
          ? 'border-emerald-200 bg-emerald-50/20'
          : 'border-blue-200 bg-blue-50/30'
      }`}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
          <Text className="text-base">{isComplete ? '🎉' : '📊'}</Text>
          <Text className="text-sm font-extrabold text-slate-900">
            Profile Completion
          </Text>
        </View>
        <Badge
          variant={isComplete ? 'success' : 'primary'}
          size="sm"
          label={isComplete ? 'Complete 100%' : `${percentage}%`}
        />
      </View>

      {/* Progress Bar */}
      <View className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden my-1 border border-slate-300/40">
        <View
          className={`h-full rounded-full ${
            isComplete ? 'bg-emerald-600' : 'bg-primary-600'
          }`}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        />
      </View>

      {/* Breakdown Checklist */}
      <View className="flex-row flex-wrap gap-2 my-2.5">
        <View className="flex-row items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
          <Text className="text-[10px]">
            {sections.personal.completed ? '✅' : '⏳'}
          </Text>
          <Text className="text-[10px] font-bold text-slate-700">Personal</Text>
        </View>
        <View className="flex-row items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
          <Text className="text-[10px]">
            {sections.academic.completed ? '✅' : '⏳'}
          </Text>
          <Text className="text-[10px] font-bold text-slate-700">Academic</Text>
        </View>
        <View className="flex-row items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
          <Text className="text-[10px]">
            {sections.category.completed ? '✅' : '⏳'}
          </Text>
          <Text className="text-[10px] font-bold text-slate-700">Category</Text>
        </View>
        <View className="flex-row items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
          <Text className="text-[10px]">
            {sections.preferences.completed ? '✅' : '⏳'}
          </Text>
          <Text className="text-[10px] font-bold text-slate-700">Preferences</Text>
        </View>
      </View>

      {/* Callout */}
      <Text className="text-xs text-slate-600 leading-relaxed mb-3">
        {isComplete
          ? 'Your student profile is 100% complete with verified academic credentials.'
          : `${completedCount} of ${totalCount} required fields completed. Complete your profile to improve your scholarship match accuracy.`}
      </Text>

      {/* Button */}
      {!isComplete ? (
        <PrimaryButton
          title="Complete Profile →"
          size="sm"
          onPress={onEditProfile}
        />
      ) : (
        <OutlineButton
          title="Edit Profile Information ✏️"
          size="sm"
          className="border-slate-300 bg-white"
          textClassName="text-slate-700 font-bold"
          onPress={onEditProfile}
        />
      )}
    </Card>
  );
};

export default ProfileCompletionCard;
