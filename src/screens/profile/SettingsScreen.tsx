import React from 'react';
import { View, Text, Switch, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { updateSettings, logout } from '../../store/slices/authSlice';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
} from '../../components/common';
import { OutlineButton } from '../../components/buttons';
import { colors } from '../../theme';

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * SettingsScreen
 * Student account and application settings: notification toggles, language, legal documents, and sign out.
 */
export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const settings = user?.settings || {
    notificationsEnabled: true,
    deadlineRemindersEnabled: true,
    emailAlertsEnabled: true,
    language: 'English (US)',
  };

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    dispatch(updateSettings({ [key]: value }));
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from your ScholarHub account on this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title="Settings"
          subtitle="Application preferences, privacy & account controls"
          showBack
          onBackPress={() => navigation.goBack()}
        />

        {/* 1. Notification Preferences Card */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <View className="flex-row items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <Text className="text-base">🔔</Text>
            <Text className="text-sm font-extrabold text-slate-900">
              Notification Preferences
            </Text>
          </View>

          <View className="gap-3.5">
            {/* In-App Notifications Toggle */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-bold text-slate-800">
                  Push & In-App Alerts
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  Receive real-time updates when matching scholarships are published.
                </Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(val) => handleToggle('notificationsEnabled', val)}
                trackColor={{ false: colors.neutral[300], true: colors.primary[600] }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Deadline Reminders Toggle */}
            <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-bold text-slate-800">
                  Deadline Reminders
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  Get notified 7 days and 3 days before closing dates for saved grants.
                </Text>
              </View>
              <Switch
                value={settings.deadlineRemindersEnabled}
                onValueChange={(val) => handleToggle('deadlineRemindersEnabled', val)}
                trackColor={{ false: colors.neutral[300], true: colors.primary[600] }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Email Alerts Toggle */}
            <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-bold text-slate-800">
                  Email Digests
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  Weekly scholarship recommendations sent to your registered email.
                </Text>
              </View>
              <Switch
                value={settings.emailAlertsEnabled}
                onValueChange={(val) => handleToggle('emailAlertsEnabled', val)}
                trackColor={{ false: colors.neutral[300], true: colors.primary[600] }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </Card>

        {/* 2. General Preferences Card */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <View className="flex-row items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <Text className="text-base">🌐</Text>
            <Text className="text-sm font-extrabold text-slate-900">
              Language & Regional
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-1">
            <View>
              <Text className="text-xs font-bold text-slate-800">
                Interface Language
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5">
                Current display language
              </Text>
            </View>
            <Badge variant="neutral" size="sm" label={settings.language || 'English (US)'} />
          </View>
        </Card>

        {/* 3. Support & Legal Documents Card */}
        <Card variant="elevated" className="p-4 mb-4 border border-slate-200 bg-white">
          <View className="flex-row items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <Text className="text-base">🛡️</Text>
            <Text className="text-sm font-extrabold text-slate-900">
              Support & Legal
            </Text>
          </View>

          <View className="divide-y divide-slate-100">
            <TouchableOpacity
              onPress={() => navigation.navigate('PrivacyPolicy')}
              className="py-3 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-xs">🔒</Text>
                <Text className="text-xs font-bold text-slate-800">
                  Privacy Policy
                </Text>
              </View>
              <Text className="text-xs text-slate-400">➔</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('TermsOfService')}
              className="py-3 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-xs">📜</Text>
                <Text className="text-xs font-bold text-slate-800">
                  Terms & Conditions
                </Text>
              </View>
              <Text className="text-xs text-slate-400">➔</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('HelpSupport')}
              className="py-3 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-xs">💬</Text>
                <Text className="text-xs font-bold text-slate-800">
                  Help & Support Desk
                </Text>
              </View>
              <Text className="text-xs text-slate-400">➔</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* 4. Logout / Session Card */}
        <Card variant="outlined" className="p-4 items-center bg-red-50/20 border-red-200">
          <Text className="text-xs font-bold text-slate-800 text-center mb-1">
            Account Session
          </Text>
          <Text className="text-[11px] text-slate-500 text-center mb-3">
            Sign out of ScholarHub on this device.
          </Text>
          <OutlineButton
            title="Sign Out of Account 🚪"
            size="md"
            className="border-red-300 bg-white active:bg-red-50"
            textClassName="text-red-600 font-bold"
            onPress={handleLogout}
          />
        </Card>
      </ScreenContainer>
    </View>
  );
};

export default SettingsScreen;
