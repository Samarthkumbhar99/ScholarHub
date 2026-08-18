import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StudentTabParamList } from '../../types/navigation';
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

  // Student greeting name from Redux or mock fallback
  const studentDisplayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || 'Student';

  // Navigation handlers
  const handleBrowseMatching = () => {
    navigation.navigate('Scholarships');
  };

  const handleViewProfile = () => {
    navigation.navigate('Profile');
  };

  const handleStatPress = (statKey: keyof DashboardStats) => {
    switch (statKey) {
      case 'eligible':
      case 'saved':
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
        stats={MOCK_DASHBOARD_DATA.stats}
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
