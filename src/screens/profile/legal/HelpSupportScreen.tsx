import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, Header, Card, Badge } from '../../../components/common';
import { OutlineButton, PrimaryButton } from '../../../components/buttons';

export const HelpSupportScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
      <Header
        title="Help & Support"
        subtitle="ScholarHub student grievance & guidance desk"
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={<Badge variant="success" size="sm" label="Helpdesk" />}
      />

      <Card variant="elevated" className="p-5 mb-4 border border-slate-200">
        <Text className="text-base font-extrabold text-slate-900 mb-1.5">
          Student Assistance & FAQs
        </Text>
        <Text className="text-xs text-slate-600 leading-relaxed mb-4">
          Need assistance with scholarship application tracking, document uploads, or state nodal verification?
        </Text>

        <View className="gap-3">
          <View className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-sm">📧</Text>
              <Text className="text-xs font-bold text-slate-900">
                Email Support
              </Text>
            </View>
            <Text className="text-[11px] text-slate-600">
              support@scholarhub.edu.in
            </Text>
          </View>

          <View className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-sm">📞</Text>
              <Text className="text-xs font-bold text-slate-900">
                National Student Toll-Free Helpline
              </Text>
            </View>
            <Text className="text-[11px] text-slate-600">
              1800-118-005 (Mon-Fri, 9:00 AM - 6:00 PM IST)
            </Text>
          </View>
        </View>
      </Card>

      <OutlineButton
        title="← Back to Settings"
        size="md"
        className="border-slate-300 bg-white"
        textClassName="text-slate-700 font-bold"
        onPress={() => navigation.goBack()}
      />
    </ScreenContainer>
  );
};

export default HelpSupportScreen;
