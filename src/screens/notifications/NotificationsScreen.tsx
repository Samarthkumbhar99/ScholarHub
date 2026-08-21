import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentTabParamList, RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  markNotificationRead,
  markAllNotificationsRead,
  setNotificationFilterTab,
  resetNotifications,
} from '../../store/slices/notificationSlice';
import {
  NotificationItem,
  NotificationFilterTab,
} from '../../types/notification';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  EmptyState,
} from '../../components/common';
import { PrimaryButton, OutlineButton } from '../../components/buttons';
import { NotificationCard } from './components';
import { groupNotificationsByDate } from '../../utils/notificationUtils';

type NotificationsTabNavProp = BottomTabNavigationProp<
  StudentTabParamList,
  'Notifications'
>;

/**
 * NotificationsScreen
 * Centralized student notification hub managing deadline alerts, new grants,
 * application milestones, document warnings, interview invites, and results.
 */
export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotificationsTabNavProp>();
  const dispatch = useAppDispatch();
  const { items, unreadCount, filterTab } = useAppSelector(
    (state) => state.notifications
  );

  // Filter items based on active filter tab
  const filteredItems = useMemo(() => {
    if (filterTab === 'unread') {
      return items.filter((n) => !n.isRead);
    }
    return items;
  }, [items, filterTab]);

  // Group items by calendar date (Today, Yesterday, Earlier)
  const groupedNotifications = useMemo(() => {
    return groupNotificationsByDate(filteredItems);
  }, [filteredItems]);

  // Handle user tapping on a notification
  const handleNotificationPress = (notification: NotificationItem) => {
    // 1. Mark as read immediately
    if (!notification.isRead) {
      dispatch(markNotificationRead(notification.id));
    }

    // 2. Perform contextual routing
    const parentNav =
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

    switch (notification.type) {
      case 'DEADLINE_REMINDER': {
        if (notification.scholarshipId) {
          if (parentNav) {
            parentNav.navigate('ScholarshipDetails', {
              scholarshipId: notification.scholarshipId,
            });
          } else {
            (navigation as any).navigate('ScholarshipDetails', {
              scholarshipId: notification.scholarshipId,
            });
          }
        } else if (notification.applicationId) {
          if (parentNav) {
            parentNav.navigate('ApplicationDetails', {
              applicationId: notification.applicationId,
            });
          } else {
            (navigation as any).navigate('ApplicationDetails', {
              applicationId: notification.applicationId,
            });
          }
        }
        break;
      }

      case 'NEW_SCHOLARSHIP': {
        if (notification.scholarshipId) {
          if (parentNav) {
            parentNav.navigate('ScholarshipDetails', {
              scholarshipId: notification.scholarshipId,
            });
          } else {
            (navigation as any).navigate('ScholarshipDetails', {
              scholarshipId: notification.scholarshipId,
            });
          }
        } else {
          navigation.navigate('Scholarships');
        }
        break;
      }

      case 'APPLICATION_CONFIRMATION':
      case 'RESULT':
      case 'INTERVIEW': {
        if (notification.applicationId) {
          if (parentNav) {
            parentNav.navigate('ApplicationDetails', {
              applicationId: notification.applicationId,
            });
          } else {
            (navigation as any).navigate('ApplicationDetails', {
              applicationId: notification.applicationId,
            });
          }
        } else {
          navigation.navigate('Applications');
        }
        break;
      }

      case 'MISSING_DOCUMENT': {
        if (notification.applicationId) {
          if (parentNav) {
            parentNav.navigate('ApplicationDetails', {
              applicationId: notification.applicationId,
            });
          } else {
            (navigation as any).navigate('ApplicationDetails', {
              applicationId: notification.applicationId,
            });
          }
        } else {
          navigation.navigate('Documents');
        }
        break;
      }

      default:
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllNotificationsRead());
  };

  const filterTabs: { key: NotificationFilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: items.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title="Notifications"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up • No unread alerts'
          }
          rightAction={
            unreadCount > 0 ? (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                className="py-1 px-2.5 rounded-lg bg-blue-50 border border-blue-200 active:bg-blue-100"
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
              >
                <Text className="text-[11px] font-bold text-primary-700">
                  Mark all as read
                </Text>
              </TouchableOpacity>
            ) : (
              <Badge variant="success" size="sm" showDot label="Caught up" />
            )
          }
        />

        {/* Filter Tabs: [ All (6) ] [ Unread (4) ] */}
        <View className="flex-row gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {filterTabs.map((tab) => {
            const isSelected = filterTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => dispatch(setNotificationFilterTab(tab.key))}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${tab.label} notifications tab, ${tab.count} items`}
                className={`flex-1 py-2 px-3 rounded-xl items-center justify-center flex-row gap-1.5 ${
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
                  className={`h-4 min-w-[18px] px-1.5 rounded-full items-center justify-center ${
                    isSelected
                      ? tab.key === 'unread' && tab.count > 0
                        ? 'bg-primary-600'
                        : 'bg-primary-100'
                      : 'bg-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[9px] font-black ${
                      isSelected
                        ? tab.key === 'unread' && tab.count > 0
                          ? 'text-white'
                          : 'text-primary-800'
                        : 'text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notification List / Empty States */}
        {filteredItems.length === 0 ? (
          <EmptyState
            title="You're all caught up!"
            description={
              filterTab === 'unread'
                ? 'No unread notifications. Check the "All" tab to review previous updates and scholarship milestones.'
                : 'No notifications in your inbox.'
            }
            actionTitle={
              filterTab === 'unread'
                ? 'View All Notifications ➔'
                : 'Reset Demo Alerts ↺'
            }
            onActionPress={() => {
              if (filterTab === 'unread') {
                dispatch(setNotificationFilterTab('all'));
              } else {
                dispatch(resetNotifications());
              }
            }}
          />
        ) : (
          <View className="mb-6">
            {groupedNotifications.map((group) => (
              <View key={group.title} className="mb-4">
                {/* Date Group Section Header */}
                <View className="flex-row items-center justify-between mb-2 px-1">
                  <Text className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    {group.title}
                  </Text>
                  <Text className="text-[10px] font-bold text-slate-400">
                    {group.data.length} alert{group.data.length > 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Notification Items */}
                <View className="gap-2.5">
                  {group.data.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onPress={handleNotificationPress}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Demo / Reset Tool */}
        <Card variant="outlined" className="p-4 items-center bg-slate-100/70 border-slate-200">
          <Text className="text-xs font-bold text-slate-700 text-center mb-1">
            Need to Test Notification Events?
          </Text>
          <Text className="text-[11px] text-slate-500 text-center mb-3">
            Reset notification center to initial mock alerts and unread counts.
          </Text>
          <OutlineButton
            title="Reset Notification Alerts ↺"
            size="sm"
            className="border-slate-300 bg-white"
            textClassName="text-slate-700 font-bold"
            onPress={() => {
              dispatch(resetNotifications());
            }}
          />
        </Card>
      </ScreenContainer>
    </View>
  );
};

export default NotificationsScreen;
