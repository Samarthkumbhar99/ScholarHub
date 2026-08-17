import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StudentTabParamList } from '../../types/navigation';
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

type ApplicationsNavProp = BottomTabNavigationProp<StudentTabParamList, 'Applications'>;

export const ApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<ApplicationsNavProp>();

  const applications = [
    {
      id: 'app_01',
      title: 'National STEM Fellowship 2026',
      scheme: 'Ministry of Education',
      amount: '$12,000 / year',
      submittedDate: '2026-08-10',
      status: 'under_review' as const,
      statusLabel: 'Under Review',
      stage: 'Document Verification',
      progress: 60,
    },
    {
      id: 'app_02',
      title: 'Oxford Global Fellowship',
      scheme: 'International Student Board',
      amount: '£12,500',
      submittedDate: '2026-08-01',
      status: 'shortlisted' as const,
      statusLabel: 'Shortlisted for Interview',
      stage: 'Online Interview Scheduled',
      progress: 85,
    },
  ];

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header */}
      <Header
        title="My Applications"
        subtitle="Track application stages and disbursement status"
        rightAction={
          <Badge variant="primary" size="sm" label="2 Active" />
        }
      />

      {/* Applications List */}
      <View className="gap-4 mb-6">
        {applications.map((app) => (
          <Card key={app.id} variant="elevated" className="p-4">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-base font-bold text-slate-900 leading-snug">
                  {app.title}
                </Text>
                <Text className="text-xs text-slate-500 font-medium mt-0.5">
                  {app.scheme} • Submitted on {app.submittedDate}
                </Text>
              </View>
              <Badge
                variant={app.status === 'shortlisted' ? 'success' : 'warning'}
                size="sm"
                showDot
                label={app.statusLabel}
              />
            </View>

            {/* Stage & Progress */}
            <View className="bg-slate-50 border border-slate-100 rounded-xl p-3 my-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold text-slate-700">
                  Current Stage: {app.stage}
                </Text>
                <Text className="text-xs font-extrabold text-primary-700">
                  {app.progress}%
                </Text>
              </View>
              <View className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary-600 rounded-full"
                  style={{ width: `${app.progress}%` }}
                />
              </View>
            </View>

            {/* Grant Value */}
            <View className="flex-row items-center justify-between py-1 mb-3">
              <Text className="text-xs text-slate-500">Award Amount</Text>
              <Text className="text-sm font-extrabold text-emerald-700">
                {app.amount}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <OutlineButton
                  title="View Application Details"
                  size="sm"
                  onPress={() => {}}
                />
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* New Application Callout */}
      <Card variant="outlined" className="p-4 items-center bg-blue-50/50 border-blue-200">
        <Text className="text-sm font-bold text-slate-900 text-center mb-1">
          Looking for More Opportunities?
        </Text>
        <Text className="text-xs text-slate-500 text-center mb-3">
          Explore grants matching your GPA and major criteria.
        </Text>
        <PrimaryButton
          title="Browse Scholarships →"
          size="sm"
          onPress={() => navigation.navigate('Scholarships')}
        />
      </Card>
    </ScreenContainer>
  );
};

export default ApplicationsScreen;
