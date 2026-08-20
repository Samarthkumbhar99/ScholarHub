import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card, Badge } from '../../../components/common';
import { OutlineButton } from '../../../components/buttons';

interface DocumentChecklistSummaryProps {
  requiredDocuments: string[];
  onOpenDocumentCenter: () => void;
}

/**
 * DocumentChecklistSummary
 * Summarizes required documents when in PREPARING_DOCUMENTS stage, linking to Document Repository
 */
export const DocumentChecklistSummary: React.FC<DocumentChecklistSummaryProps> = ({
  requiredDocuments,
  onOpenDocumentCenter,
}) => {
  // Mock realistic checklist state for documents
  const documentItems = requiredDocuments.map((doc, idx) => ({
    name: doc,
    isReady: idx % 3 !== 1, // mock majority ready, 1 pending for realism
  }));

  const readyCount = documentItems.filter((d) => d.isReady).length;

  return (
    <Card variant="elevated" className="p-4 mb-4 border border-amber-200 bg-amber-50/30">
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-base">📄</Text>
          <Text className="text-sm font-extrabold text-slate-900">
            Required Documents Checklist
          </Text>
        </View>
        <Badge
          variant={readyCount === documentItems.length ? 'success' : 'warning'}
          size="sm"
          label={`${readyCount}/${documentItems.length} Ready`}
        />
      </View>

      <Text className="text-xs text-slate-600 mb-3">
        Ensure all required certificates, marksheets, and proof documents are uploaded to your repository before applying.
      </Text>

      {/* Checklist items */}
      <View className="gap-2 mb-3.5">
        {documentItems.map((doc, idx) => (
          <View
            key={idx}
            className="flex-row items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Text className="mr-2 text-sm">
                {doc.isReady ? '✅' : '⏳'}
              </Text>
              <Text
                className={`text-xs font-semibold ${
                  doc.isReady ? 'text-slate-800' : 'text-amber-800'
                }`}
                numberOfLines={1}
              >
                {doc.name}
              </Text>
            </View>
            <Badge
              variant={doc.isReady ? 'success' : 'warning'}
              size="sm"
              label={doc.isReady ? 'Verified' : 'Pending'}
            />
          </View>
        ))}
      </View>

      {/* Action Button */}
      <OutlineButton
        title="Open Document Center 📁"
        size="sm"
        className="border-primary-600 active:bg-blue-50"
        textClassName="text-primary-700 font-bold"
        onPress={onOpenDocumentCenter}
      />
    </Card>
  );
};

export default DocumentChecklistSummary;
