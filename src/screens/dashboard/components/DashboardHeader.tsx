import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Badge } from '../../../components/common';

interface DashboardHeaderProps {
  studentName: string;
  isVerified?: boolean;
  onNotificationPress?: () => void;
}

/**
 * DashboardHeader
 * Displays personalized time-based greeting, student name, and verification status badge
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  studentName,
  isVerified = true,
  onNotificationPress,
}) => {
  // Compute greeting based on current local hour
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View className="flex-row items-center justify-between py-3 mb-4 border-b border-slate-200">
      {/* Greeting & Title */}
      <View className="flex-1 mr-2">
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Student Portal
        </Text>
        <Text className="text-xl font-extrabold text-slate-900 mt-0.5" numberOfLines={1}>
          {getGreeting()}, {studentName} 👋
        </Text>
      </View>

      {/* Actions & Verification Badge */}
      <View className="flex-row items-center gap-2">
        {isVerified && (
          <Badge
            variant="success"
            size="sm"
            showDot
            label="Verified Student"
          />
        )}

        {onNotificationPress && (
          <TouchableOpacity
            onPress={onNotificationPress}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            className="h-9 w-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Text className="text-base">🔔</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default DashboardHeader;
