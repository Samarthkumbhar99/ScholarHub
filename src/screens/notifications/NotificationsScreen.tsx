import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';

export const NotificationsScreen: React.FC = () => {
  const notifications = [
    {
      id: 'notif_01',
      title: '⏰ Application Deadline Alert',
      message: 'National STEM Fellowship application window closes in 3 days on Sept 30.',
      time: '2 hours ago',
      unread: true,
      category: 'warning' as const,
      categoryLabel: 'Urgent',
    },
    {
      id: 'notif_02',
      title: '🎉 Application Shortlisted!',
      message: 'Congratulations! You have been shortlisted for the Oxford Global Fellowship interview round.',
      time: '1 day ago',
      unread: true,
      category: 'success' as const,
      categoryLabel: 'Update',
    },
    {
      id: 'notif_03',
      title: '🌟 New Matching Scholarship Added',
      message: 'A new grant matching your GPA (3.8+) and Computer Science major has been listed.',
      time: '3 days ago',
      unread: false,
      category: 'info' as const,
      categoryLabel: 'Opportunity',
    },
    {
      id: 'notif_04',
      title: '✅ Document Verification Complete',
      message: 'Your official academic transcript has been verified by the institutional registrar.',
      time: '5 days ago',
      unread: false,
      category: 'neutral' as const,
      categoryLabel: 'System',
    },
  ];

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header */}
      <Header
        title="Notifications"
        subtitle="Recent scholarship updates and deadline reminders"
        rightAction={<Badge variant="primary" size="sm" label="2 Unread" />}
      />

      {/* Notifications List */}
      <View className="gap-3 mb-6">
        {notifications.map((n) => (
          <Card
            key={n.id}
            variant="elevated"
            className={`p-4 ${n.unread ? 'border-l-4 border-l-primary-600 bg-white' : 'bg-slate-50/70'}`}
          >
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-sm font-bold text-slate-900 flex-1 mr-2">
                {n.title}
              </Text>
              <Badge variant={n.category} size="sm" label={n.categoryLabel} />
            </View>
            <Text className="text-xs text-slate-600 leading-relaxed mb-2">
              {n.message}
            </Text>
            <Text className="text-[10px] font-bold text-slate-400">
              {n.time}
            </Text>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
};

export default NotificationsScreen;
