import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card, Badge } from '../../../components/common';

interface ProfileSectionCardProps {
  title: string;
  icon: string;
  isComplete?: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}

/**
 * ProfileSectionCard
 * Common wrapper for profile sections featuring section header, completion badge, and edit trigger
 */
export const ProfileSectionCard: React.FC<ProfileSectionCardProps> = ({
  title,
  icon,
  isComplete = true,
  onEdit,
  children,
}) => {
  return (
    <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <View className="h-8 w-8 rounded-xl bg-slate-100 items-center justify-center">
            <Text className="text-sm">{icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-slate-900 leading-snug">
              {title}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onEdit}
          className="py-1 px-2.5 rounded-lg bg-blue-50 border border-blue-200 active:bg-blue-100 flex-row items-center gap-1"
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
        >
          <Text className="text-xs">✏️</Text>
          <Text className="text-xs font-bold text-primary-700">Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Section Content Fields */}
      <View className="gap-2.5">{children}</View>
    </Card>
  );
};

export default ProfileSectionCard;
