import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentTabParamList, RootStackParamList } from '../../types/navigation';
import { useAppSelector } from '../../hooks';
import { ScreenContainer, Card } from '../../components/common';

import { DashboardStats } from './types';
import { MOCK_DASHBOARD_DATA } from './data/mockDashboardData';
import { DashboardHeader } from './components/DashboardHeader';
import { ProfileMatchCard } from './components/ProfileMatchCard';
import { StatsGrid } from './components/StatsGrid';
import { ClosingSoonCard } from './components/ClosingSoonCard';
import { QuickAccessSection } from './components/QuickAccessSection';

type DashboardNavProp = BottomTabNavigationProp<StudentTabParamList, 'Dashboard'>;

/**
 * DashboardScreen
 * Main Student Hub composing Discover, Manage, and Support features
 */
export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavProp>();
  const { user } = useAppSelector((state) => state.auth);
  const { savedScholarshipIds } = useAppSelector((state) => state.scholarships);
  const { items: applicationItems } = useAppSelector((state) => state.applications);

  // Student greeting name from Redux or mock fallback
  const studentDisplayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || 'Student';

  // Dynamic statistics reflecting live Redux saved & application state
  const dynamicStats: DashboardStats = {
    ...MOCK_DASHBOARD_DATA.stats,
    saved: savedScholarshipIds.length,
    applied: applicationItems.length,
  };

  // Navigation handlers
  const handleBrowseMatching = () => {
    navigation.navigate('Scholarships');
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile');
  };

  const handleStatPress = (statKey: keyof DashboardStats) => {
    switch (statKey) {
      case 'saved': {
        const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
        if (parentNav) {
          parentNav.navigate('SavedScholarships');
        } else {
          (navigation as any).navigate('SavedScholarships');
        }
        break;
      }
      case 'eligible':
      case 'recommended':
        navigation.navigate('Scholarships');
        break;
      case 'applied':
      case 'closingSoon':
      case 'resultsDeclared':
      default:
        navigation.navigate('Applications');
        break;
    }
  };

  const handleClosingSoonAction = () => {
    navigation.navigate('Applications');
  };

  const handleNavigateTab = (tab: keyof StudentTabParamList) => {
    navigation.navigate(tab);
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* 1. Header with greeting and verification badge */}
      <DashboardHeader
        studentName={studentDisplayName}
        isVerified={user?.isProfileComplete ?? true}
        onNotificationPress={handleNotificationPress}
      />

      {/* 2. Profile Match Hero Card */}
      <ProfileMatchCard
        summary={MOCK_DASHBOARD_DATA.matchSummary}
        onBrowseMatching={handleBrowseMatching}
        onViewProfile={handleViewProfile}
      />

      {/* 3. Summary Statistics Grid (6 core metrics) */}
      <StatsGrid
        stats={dynamicStats}
        onStatPress={handleStatPress}
      />

      {/* 4. Urgent Approaching Deadline Card */}
      <ClosingSoonCard
        item={MOCK_DASHBOARD_DATA.urgentDeadline}
        onActionPress={handleClosingSoonAction}
      />

      {/* 5. Study Abroad Global Exploration Card */}
      <Card variant="elevated" className="p-4 mb-4 border border-blue-200 bg-blue-50/30">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 mr-2">
            <View className="h-10 w-10 rounded-xl bg-blue-100 items-center justify-center border border-blue-200">
              <Text className="text-xl">✈️</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-slate-900 leading-snug">
                Study Abroad & Global Programs
              </Text>
              <Text className="text-[11px] text-slate-500 font-medium mt-0.5">
                Explore universities in Germany, UK, USA, Canada & Singapore
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              const parentNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
              if (parentNav) {
                parentNav.navigate('StudyAbroad');
              } else {
                (navigation as any).navigate('StudyAbroad');
              }
            }}
            className="py-1.5 px-3 rounded-xl bg-primary-600 active:bg-primary-700 items-center justify-center"
          >
            <Text className="text-xs font-bold text-white">Explore ➔</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 6. Quick Access Services Hub */}
      <QuickAccessSection
        items={MOCK_DASHBOARD_DATA.quickAccessItems}
        onNavigateTab={handleNavigateTab}
      />

    </ScreenContainer>
  );
};

export default DashboardScreen;
