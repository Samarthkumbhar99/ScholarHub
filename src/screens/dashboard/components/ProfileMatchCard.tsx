import React from 'react';
import { View, Text } from 'react-native';
import { ProfileMatchSummary } from '../types';
import { Card } from '../../../components/common';
import { PrimaryButton, OutlineButton } from '../../../components/buttons';

interface ProfileMatchCardProps {
  summary: ProfileMatchSummary;
  onBrowseMatching: () => void;
  onViewProfile: () => void;
}

/**
 * ProfileMatchCard
 * Hero card summarizing student profile match score, eligibility count, and direct actions
 */
export const ProfileMatchCard: React.FC<ProfileMatchCardProps> = ({
  summary,
  onBrowseMatching,
  onViewProfile,
}) => {
  return (
    <Card
      variant="elevated"
      className="mb-5 bg-blue-900 border-transparent shadow-md shadow-blue-900/20"
    >
      {/* Top Row: Match Score & Target Icon */}
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-xs font-bold text-blue-300 uppercase tracking-wider">
            Profile Match Score
          </Text>
          <Text className="text-3xl font-black text-white mt-0.5">
            {summary.headline}
          </Text>
        </View>
        <View className="h-14 w-14 rounded-2xl bg-blue-800 items-center justify-center border border-blue-700">
          <Text className="text-2xl">🎯</Text>
        </View>
      </View>

      {/* Subtext description */}
      <Text className="text-xs text-blue-200 leading-relaxed mb-4">
        {summary.subtext}
      </Text>

      {/* Action Buttons */}
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <PrimaryButton
            title="Browse Matching →"
            size="sm"
            onPress={onBrowseMatching}
          />
        </View>
        <View className="flex-1">
          <OutlineButton
            title="My Profile"
            size="sm"
            className="border-blue-400 active:bg-blue-800"
            textClassName="text-white"
            onPress={onViewProfile}
          />
        </View>
      </View>
    </Card>
  );
};

export default ProfileMatchCard;
