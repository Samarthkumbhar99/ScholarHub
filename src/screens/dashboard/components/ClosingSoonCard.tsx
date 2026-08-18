import React from 'react';
import { View, Text } from 'react-native';
import { UrgentDeadlineItem } from '../types';
import { Card, Badge } from '../../../components/common';
import { PrimaryButton } from '../../../components/buttons';

interface ClosingSoonCardProps {
  item: UrgentDeadlineItem;
  onActionPress: () => void;
}

/**
 * ClosingSoonCard
 * Highlights urgent approaching scholarship deadlines with clear action prompt
 */
export const ClosingSoonCard: React.FC<ClosingSoonCardProps> = ({
  item,
  onActionPress,
}) => {
  return (
    <Card variant="elevated" className="mb-5 border-l-4 border-l-amber-500 p-4">
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <Text className="text-base mr-2">⏰</Text>
          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Badge
          variant="warning"
          size="sm"
          showDot
          label={`Closing in ${item.daysLeft} Days`}
        />
      </View>

      {/* Deadline Info & Award Value */}
      <Text className="text-xs text-slate-500 mb-3 leading-relaxed">
        {item.provider} • Closing: {item.deadlineDate} • Award: {item.awardValue}
      </Text>

      {/* Action Button */}
      <PrimaryButton
        title="Complete Application"
        size="sm"
        onPress={onActionPress}
      />
    </Card>
  );
};

export default ClosingSoonCard;
