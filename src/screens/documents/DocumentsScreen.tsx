import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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

export const DocumentsScreen: React.FC = () => {
  const documents = [
    {
      id: 'doc_01',
      title: 'Official Academic Transcript (GPA 3.82)',
      type: 'PDF • 1.4 MB',
      updatedAt: 'Aug 12, 2026',
      status: 'verified',
      statusLabel: 'Verified',
    },
    {
      id: 'doc_02',
      title: 'Faculty Recommendation Letter (Dean)',
      type: 'PDF • 820 KB',
      updatedAt: 'Aug 10, 2026',
      status: 'verified',
      statusLabel: 'Verified',
    },
    {
      id: 'doc_03',
      title: 'Household Income Declaration',
      type: 'PDF • 2.1 MB',
      updatedAt: 'Aug 15, 2026',
      status: 'pending',
      statusLabel: 'Under Review',
    },
    {
      id: 'doc_04',
      title: 'Valid Student Photo ID & Passport',
      type: 'JPEG • 950 KB',
      updatedAt: 'Jul 28, 2026',
      status: 'verified',
      statusLabel: 'Verified',
    },
  ];

  return (
    <ScreenContainer scrollable withSafeArea>
      {/* Header */}
      <Header
        title="Document Repository"
        subtitle="Manage verified verification files and certificates"
        rightAction={<Badge variant="success" size="sm" label="3 of 4 Verified" />}
      />

      {/* Upload Banner */}
      <Card variant="elevated" className="mb-5 border-blue-200 bg-blue-50/50">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-bold text-slate-900">
              One-Click Document Reusability
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              Uploaded documents are automatically attached to matching scholarship applications.
            </Text>
          </View>
          <Text className="text-2xl">📄</Text>
        </View>
        <PrimaryButton
          title="+ Upload New Document"
          size="sm"
          onPress={() => {}}
        />
      </Card>

      {/* Documents List */}
      <Text className="text-sm font-extrabold text-slate-900 mb-3">
        Uploaded Credentials
      </Text>
      <View className="gap-3 mb-6">
        {documents.map((doc) => (
          <Card key={doc.id} variant="outlined" className="p-3.5 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="h-10 w-10 rounded-xl bg-slate-100 items-center justify-center mr-3">
                <Text className="text-base">📑</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {doc.title}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  {doc.type} • {doc.updatedAt}
                </Text>
              </View>
            </View>
            <Badge
              variant={doc.status === 'verified' ? 'success' : 'warning'}
              size="sm"
              showDot
              label={doc.statusLabel}
            />
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
};

export default DocumentsScreen;
