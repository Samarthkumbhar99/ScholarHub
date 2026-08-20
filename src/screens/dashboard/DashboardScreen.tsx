import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentTabParamList, RootStackParamList } from '../../types/navigation';
import { useAppSelector } from '../../hooks';
import { ScreenContainer } from '../../components/common';
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

      {/* 5. Quick Access Services Hub */}
      <QuickAccessSection
        items={MOCK_DASHBOARD_DATA.quickAccessItems}
        onNavigateTab={handleNavigateTab}
      />
    </ScreenContainer>
  );
};

export default DashboardScreen;
