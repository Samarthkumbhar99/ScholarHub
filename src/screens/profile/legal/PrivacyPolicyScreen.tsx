import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, Header, Card, Badge } from '../../../components/common';
import { OutlineButton } from '../../../components/buttons';

export const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
      <Header
        title="Privacy Policy"
        subtitle="ScholarHub student data privacy standards"
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={<Badge variant="info" size="sm" label="v1.0" />}
      />

      <Card variant="elevated" className="p-5 mb-4 border border-slate-200">
        <Text className="text-base font-extrabold text-slate-900 mb-2">
          Your Data Privacy is Protected
        </Text>
        <Text className="text-xs text-slate-600 leading-relaxed mb-3">
          ScholarHub is committed to safeguarding student personal, academic, and socio-economic information. We do not sell or monetize student data.
        </Text>

        <View className="gap-3 mt-2">
          <View className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Text className="text-xs font-bold text-slate-800 mb-1">
              🔒 Local Device Storage
            </Text>
            <Text className="text-[11px] text-slate-500 leading-snug">
              Credentials and certificates are securely stored in your local repository for 1-click scholarship readiness.
            </Text>
          </View>

          <View className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Text className="text-xs font-bold text-slate-800 mb-1">
              🛡️ Role-Based Verification
            </Text>
            <Text className="text-[11px] text-slate-500 leading-snug">
              Only authorized institutional nodal officers and scholarship committees review verified documents upon application submission.
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

export default PrivacyPolicyScreen;
