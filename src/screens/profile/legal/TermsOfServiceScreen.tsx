import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, Header, Card, Badge } from '../../../components/common';
import { OutlineButton } from '../../../components/buttons';

export const TermsOfServiceScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
      <Header
        title="Terms & Conditions"
        subtitle="ScholarHub student portal usage terms"
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={<Badge variant="neutral" size="sm" label="Terms" />}
      />

      <Card variant="elevated" className="p-5 mb-4 border border-slate-200">
        <Text className="text-base font-extrabold text-slate-900 mb-2">
          ScholarHub Terms of Service
        </Text>
        <Text className="text-xs text-slate-600 leading-relaxed mb-3">
          By utilizing the ScholarHub mobile application, students agree to maintain authentic and accurate academic and category credentials.
        </Text>

        <View className="gap-3 mt-2">
          <View className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Text className="text-xs font-bold text-slate-800 mb-1">
              📜 Accurate Submissions
            </Text>
            <Text className="text-[11px] text-slate-500 leading-snug">
              All submitted marksheets, income certificates, and bonafide documents must be genuine and issued by authorized governing bodies.
            </Text>
          </View>

          <View className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Text className="text-xs font-bold text-slate-800 mb-1">
              🎓 Student Eligibility
            </Text>
            <Text className="text-[11px] text-slate-500 leading-snug">
              Scholarship grants are awarded directly by the respective grant providers based on declared criteria and committee verification.
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

export default TermsOfServiceScreen;
