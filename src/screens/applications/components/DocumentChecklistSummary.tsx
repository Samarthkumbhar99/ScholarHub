import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useAppSelector } from '../../../hooks';
import { Card, Badge } from '../../../components/common';
import { OutlineButton, PrimaryButton } from '../../../components/buttons';
import { checkApplicationDocumentReadiness } from '../../../utils/documentUtils';

interface DocumentChecklistSummaryProps {
  requiredDocuments: string[];
  onOpenDocumentCenter: () => void;
}

/**
 * DocumentChecklistSummary
 * Dynamically computes document readiness for an application by synchronizing
 * scholarship requirements with the centralized Redux student document repository.
 */
export const DocumentChecklistSummary: React.FC<DocumentChecklistSummaryProps> = ({
  requiredDocuments,
  onOpenDocumentCenter,
}) => {
  const studentDocuments = useAppSelector((state) => state.documents.items);

  // Compute live readiness evaluation
  const readiness = useMemo(() => {
    return checkApplicationDocumentReadiness(requiredDocuments, studentDocuments);
  }, [requiredDocuments, studentDocuments]);

  if (!requiredDocuments || requiredDocuments.length === 0) {
    return null;
  }

  return (
    <Card
      variant="elevated"
      className={`p-4 mb-4 border ${
        readiness.isAllReady
          ? 'border-emerald-200 bg-emerald-50/20'
          : 'border-amber-200 bg-amber-50/30'
      }`}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
          <Text className="text-base">📄</Text>
          <Text className="text-sm font-extrabold text-slate-900">
            Required Documents
          </Text>
        </View>
        <Badge
          variant={readiness.isAllReady ? 'success' : 'warning'}
          size="sm"
          label={`${readiness.uploadedCount} / ${readiness.totalRequired} Ready`}
        />
      </View>

      {/* Dynamic Readiness Banner */}
      <View
        className={`p-2.5 rounded-xl mb-3 flex-row items-center justify-between ${
          readiness.isAllReady
            ? 'bg-emerald-100/70 border border-emerald-200'
            : 'bg-amber-100/70 border border-amber-200'
        }`}
      >
        <View className="flex-row items-center flex-1 mr-2">
          <Text className="mr-2 text-sm">
            {readiness.isAllReady ? '🎉' : '⏳'}
          </Text>
          <Text
            className={`text-xs font-bold ${
              readiness.isAllReady ? 'text-emerald-900' : 'text-amber-900'
            }`}
          >
            {readiness.statusSummary}
          </Text>
        </View>
        <Text
          className={`text-xs font-black ${
            readiness.isAllReady ? 'text-emerald-800' : 'text-amber-800'
          }`}
        >
          {readiness.readinessPercentage}%
        </Text>
      </View>

      <Text className="text-xs text-slate-600 mb-3">
        Documents in your Document Center are automatically cross-referenced with this application's requirements.
      </Text>

      {/* Dynamic Checklist Items */}
      <View className="gap-2 mb-3.5">
        {readiness.items.map((item, idx) => (
          <View
            key={idx}
            className={`flex-row items-center justify-between p-2.5 rounded-xl bg-white border ${
              item.isUploaded ? 'border-slate-200' : 'border-amber-200'
            } shadow-2xs`}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Text className="mr-2 text-sm font-bold">
                {item.isUploaded ? '✓' : '✗'}
              </Text>
              <View className="flex-1">
                <Text
                  className={`text-xs font-semibold ${
                    item.isUploaded ? 'text-slate-800' : 'text-amber-900'
                  }`}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.isUploaded && item.matchedDoc?.fileName ? (
                  <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
                    {item.matchedDoc.fileName} • {item.matchedDoc.fileSize || 'Attached'}
                  </Text>
                ) : null}
              </View>
            </View>

            <Badge
              variant={item.isUploaded ? 'success' : 'warning'}
              size="sm"
              label={item.isUploaded ? 'Uploaded' : 'Missing'}
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
