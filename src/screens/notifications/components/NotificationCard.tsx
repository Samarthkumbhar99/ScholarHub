import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  NotificationItem,
  NOTIFICATION_TYPE_METADATA,
} from '../../../types/notification';
import { Card, Badge } from '../../../components/common';
import { formatRelativeTime } from '../../../utils/notificationUtils';

interface NotificationCardProps {
  notification: NotificationItem;
  onPress: (notification: NotificationItem) => void;
}

/**
 * NotificationCard
 * Renders individual notification with read/unread visual styling,
 * type badge, relative time, and tap action handler.
 */
export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
}) => {
  const meta = NOTIFICATION_TYPE_METADATA[notification.type];
  const isUnread = !notification.isRead;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}, ${isUnread ? 'Unread' : 'Read'}`}
    >
      <Card
        variant="elevated"
        className={`p-4 border transition-all ${
          isUnread
            ? 'border-l-4 border-l-primary-600 border-slate-200 bg-white shadow-xs'
            : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        {/* Header Row: Category Badge, Unread Dot & Timestamp */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-1.5 flex-1 mr-2">
            <View className="h-6 w-6 rounded-lg bg-slate-100 items-center justify-center">
              <Text className="text-xs">{meta?.icon || '🔔'}</Text>
            </View>
            <Badge
              variant={meta?.badgeVariant || 'neutral'}
              size="sm"
              label={meta?.categoryLabel || 'Notice'}
            />
            {isUnread && (
              <View className="flex-row items-center gap-1 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                <View className="h-1.5 w-1.5 rounded-full bg-primary-600" />
                <Text className="text-[10px] font-black text-primary-700">
                  New
                </Text>
              </View>
            )}
          </View>

          <Text className="text-[11px] font-bold text-slate-400">
            {formatRelativeTime(notification.createdAt)}
          </Text>
        </View>

        {/* Title */}
        <Text
          className={`text-sm leading-snug mb-1 ${
            isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'
          }`}
        >
          {notification.title}
        </Text>

        {/* Message */}
        <Text
          className={`text-xs leading-relaxed mb-2.5 ${
            isUnread ? 'text-slate-700 font-medium' : 'text-slate-500'
          }`}
        >
          {notification.message}
        </Text>

        {/* Action Link Footer */}
        <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
          <Text className="text-[11px] font-extrabold text-primary-700">
            {meta?.actionPrompt || 'View Details ➔'}
          </Text>
          <Text className="text-xs text-primary-600 font-bold">➔</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export default NotificationCard;
