import React from 'react';
import { View, Text } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logout } from '../../store/slices/authSlice';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import {
  OutlineButton,
} from '../../components/buttons';

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const studentDisplayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || 'Alex Morgan';

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header */}
      <Header
        title="Student Profile"
        subtitle="Manage academic credentials and account settings"
      />

      {/* Profile Info Card */}
      <Card variant="elevated" className="mb-5 items-center p-5">
        <View className="h-20 w-20 rounded-full bg-primary-600 items-center justify-center mb-3 shadow-md shadow-blue-500/20 border-2 border-white">
          <Text className="text-white text-3xl font-extrabold">
            {studentDisplayName.charAt(0)}
          </Text>
        </View>
        <Text className="text-lg font-extrabold text-slate-900">
          {studentDisplayName}
        </Text>
        <Text className="text-xs text-slate-500 font-medium mt-0.5">
          {user?.email || 'alex.morgan@university.edu'}
        </Text>
        <View className="mt-2.5">
          <Badge variant="success" size="sm" showDot label="Verified Student ID" />
        </View>
      </Card>

      {/* Academic Details Card */}
      <Card variant="outlined" className="mb-5">
        <Text className="text-sm font-extrabold text-slate-900 mb-3">
          Academic Credentials
        </Text>
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Institution</Text>
            <Text className="text-xs font-bold text-slate-800">State University of Technology</Text>
          </View>
          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Major / Program</Text>
            <Text className="text-xs font-bold text-slate-800">
              {user?.major || 'B.S. Computer Science & AI'}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1.5 border-b border-slate-100">
            <Text className="text-xs text-slate-500 font-medium">Cumulative GPA</Text>
            <Text className="text-xs font-extrabold text-primary-700">
              {user?.gpa ? `${user.gpa} / 4.00` : '3.82 / 4.00'}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1.5">
            <Text className="text-xs text-slate-500 font-medium">Country / Region</Text>
            <Text className="text-xs font-bold text-slate-800">
              {user?.country || 'United States'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Logout Action */}
      <Card variant="outlined" className="p-4 items-center">
        <Text className="text-xs text-slate-500 mb-3">
          Sign out from this device to end your session.
        </Text>
        <OutlineButton
          title="Sign Out of Account"
          fullWidth
          className="border-red-300 active:bg-red-50"
          textClassName="text-red-600 font-bold"
          onPress={handleLogout}
        />
      </Card>
    </ScreenContainer>
  );
};

export default ProfileScreen;
