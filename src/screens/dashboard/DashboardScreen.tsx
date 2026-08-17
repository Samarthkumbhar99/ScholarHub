import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StudentTabParamList } from '../../types/navigation';
import { useAppSelector } from '../../hooks';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import {
  PrimaryButton,
  OutlineButton,
} from '../../components/buttons';

type DashboardNavProp = BottomTabNavigationProp<StudentTabParamList, 'Dashboard'>;

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavProp>();
  const { user } = useAppSelector((state) => state.auth);

  const studentDisplayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || 'Student';

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header */}
      <Header
        title="Student Dashboard"
        subtitle={`Welcome back, ${studentDisplayName}`}
        rightAction={
          <Badge variant="success" size="sm" showDot label="Verified Student" />
        }
      />

      {/* Hero Eligibility Card */}
      <Card variant="elevated" className="mb-5 bg-blue-900 border-transparent shadow-md shadow-blue-900/20">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xs font-bold text-blue-300 uppercase tracking-wider">
              Profile Match Score
            </Text>
            <Text className="text-3xl font-black text-white mt-0.5">94% Match</Text>
          </View>
          <View className="h-14 w-14 rounded-2xl bg-blue-800 items-center justify-center border border-blue-700">
            <Text className="text-2xl">🎯</Text>
          </View>
        </View>

        <Text className="text-xs text-blue-200 leading-relaxed mb-4">
          You are eligible for 24 high-value scholarship programs matching your GPA and engineering major.
        </Text>

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <PrimaryButton
              title="Browse Matching →"
              size="sm"
              onPress={() => navigation.navigate('Scholarships')}
            />
          </View>
          <View className="flex-1">
            <OutlineButton
              title="My Profile"
              size="sm"
              className="border-blue-400 active:bg-blue-800"
              textClassName="text-white"
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
        </View>
      </Card>

      {/* Quick Metrics 2x2 Grid */}
      <Text className="text-sm font-extrabold text-slate-900 mb-3">
        Application Overview
      </Text>
      <View className="flex-row gap-3 mb-5">
        <Card variant="outlined" className="flex-1 p-3">
          <Text className="text-2xl font-black text-primary-600">24</Text>
          <Text className="text-xs font-bold text-slate-700 mt-1">Eligible</Text>
          <Text className="text-[10px] text-slate-400">Matching profile</Text>
        </Card>
        <Card variant="outlined" className="flex-1 p-3">
          <Text className="text-2xl font-black text-emerald-600">2</Text>
          <Text className="text-xs font-bold text-slate-700 mt-1">Submitted</Text>
          <Text className="text-[10px] text-slate-400">Under review</Text>
        </Card>
        <Card variant="outlined" className="flex-1 p-3">
          <Text className="text-2xl font-black text-amber-600">4</Text>
          <Text className="text-xs font-bold text-slate-700 mt-1">Saved</Text>
          <Text className="text-[10px] text-slate-400">Upcoming deadlines</Text>
        </Card>
      </View>

      {/* Urgent Deadline Notification Card */}
      <Card variant="elevated" className="mb-5 border-l-4 border-l-amber-500">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Text className="text-base mr-2">⏰</Text>
            <Text className="text-sm font-bold text-slate-900">
              National STEM Fellowship
            </Text>
          </View>
          <Badge variant="warning" size="sm" showDot label="Closing in 3 Days" />
        </View>
        <Text className="text-xs text-slate-500 mb-3 leading-relaxed">
          Application closing date: Sept 30, 2026 • Award Value: $12,000 / year
        </Text>
        <PrimaryButton
          title="Complete Application"
          size="sm"
          onPress={() => navigation.navigate('Applications')}
        />
      </Card>

      {/* Quick Navigation Cards */}
      <Text className="text-sm font-extrabold text-slate-900 mb-3">
        Quick Access
      </Text>
      <View className="gap-2.5 mb-6">
        <Card
          variant="interactive"
          onPress={() => navigation.navigate('Scholarships')}
          className="flex-row items-center justify-between p-3.5"
        >
          <View className="flex-row items-center flex-1">
            <View className="h-10 w-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
              <Text className="text-lg">🔍</Text>
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900">Scholarship Directory</Text>
              <Text className="text-xs text-slate-500">Filter government, merit & international grants</Text>
            </View>
          </View>
          <Text className="text-slate-400 font-bold">→</Text>
        </Card>

        <Card
          variant="interactive"
          onPress={() => navigation.navigate('Documents')}
          className="flex-row items-center justify-between p-3.5"
        >
          <View className="flex-row items-center flex-1">
            <View className="h-10 w-10 rounded-xl bg-emerald-50 items-center justify-center mr-3">
              <Text className="text-lg">📁</Text>
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900">Document Repository</Text>
              <Text className="text-xs text-slate-500">Transcripts, recommendations & ID proofs</Text>
            </View>
          </View>
          <Text className="text-slate-400 font-bold">→</Text>
        </Card>
      </View>
    </ScreenContainer>
  );
};

export default DashboardScreen;
