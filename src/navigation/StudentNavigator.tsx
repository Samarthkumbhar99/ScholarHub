import React from 'react';
import { Text, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StudentTabParamList } from '../types/navigation';
import { DashboardScreen } from '../screens/dashboard';
import { ScholarshipsScreen } from '../screens/scholarships';
import { ApplicationsScreen } from '../screens/applications';
import { DocumentsScreen } from '../screens/documents';
import { NotificationsScreen } from '../screens/notifications';
import { ProfileScreen } from '../screens/profile';
import { useAppSelector } from '../hooks';
import { colors } from '../theme';

const Tab = createBottomTabNavigator<StudentTabParamList>();

/**
 * StudentNavigator
 * Bottom tab bar containing all student-facing features
 */
export const StudentNavigator: React.FC = () => {
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border.default,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused }) => {
          let icon = '🎓';
          switch (route.name) {
            case 'Dashboard':
              icon = '📊';
              break;
            case 'Scholarships':
              icon = '🎓';
              break;
            case 'Applications':
              icon = '📝';
              break;
            case 'Documents':
              icon = '📁';
              break;
            case 'Notifications':
              icon = '🔔';
              break;
            case 'Profile':
              icon = '👤';
              break;
          }

          return (
            <View
              className={`h-8 w-8 items-center justify-center rounded-xl ${
                focused ? 'bg-blue-50' : 'bg-transparent'
              }`}
            >
              <Text className="text-base">{icon}</Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Scholarships"
        component={ScholarshipsScreen}
        options={{ tabBarLabel: 'Scholarships' }}
      />
      <Tab.Screen
        name="Applications"
        component={ApplicationsScreen}
        options={{ tabBarLabel: 'Applications' }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ tabBarLabel: 'Documents' }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.status.error,
            fontSize: 9,
            fontWeight: '800',
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};


export default StudentNavigator;
