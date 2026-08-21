import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DocumentItem, CATEGORY_METADATA } from '../../../types/document';
import { Card, Badge } from '../../../components/common';
import { PrimaryButton, OutlineButton } from '../../../components/buttons';
import { formatDate } from '../../../utils/formatters';

interface DocumentCardProps {
  document: DocumentItem;
  onUpload: (document: DocumentItem) => void;
  onReplace: (document: DocumentItem) => void;
  onView: (document: DocumentItem) => void;
  onRemove: (document: DocumentItem) => void;
}

/**
 * DocumentCard
 * Renders individual document item with status indicator, file details, and quick action buttons
 */
export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onUpload,
  onReplace,
  onView,
  onRemove,
}) => {
  const isUploaded = document.status === 'UPLOADED';
  const categoryMeta = CATEGORY_METADATA[document.category];

  return (
    <Card
      variant="elevated"
      className={`p-4 border ${
        isUploaded
          ? 'border-slate-200 bg-white'
          : 'border-amber-200 bg-amber-50/20'
      }`}
    >
      {/* Header Row: Category Badge & Status Badge */}
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-1.5">
          <View className="h-6 w-6 rounded-lg bg-slate-100 items-center justify-center">
            <Text className="text-xs">{categoryMeta?.icon || '📄'}</Text>
          </View>
          <Badge
            variant="neutral"
            size="sm"
            label={document.category}
          />
        </View>

        <Badge
          variant={isUploaded ? 'success' : 'warning'}
          size="sm"
          showDot
          label={isUploaded ? '✓ Uploaded' : '⚠ Missing'}
        />
      </View>

      {/* Document Name & Description */}
      <Text className="text-base font-bold text-slate-900 leading-snug">
        {document.name}
      </Text>

      {document.description ? (
        <Text className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
          {document.description}
        </Text>
      ) : null}

      {/* Uploaded File Info Box (If Uploaded) */}
      {isUploaded ? (
        <View className="my-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-200 items-center justify-center mr-2.5 shrink-0">
              <Text className="text-sm">
                {document.mimeType?.includes('pdf') || document.fileName?.endsWith('.pdf')
                  ? '📕'
                  : '🖼️'}
              </Text>
            </View>
            <View className="flex-1">
              <Text
                className="text-xs font-bold text-slate-800"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {document.fileName || 'Attached Document'}
              </Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">
                {document.fileSize || 'Local File'} • Uploaded{' '}
                {document.uploadedAt ? formatDate(document.uploadedAt) : 'Recently'}
              </Text>
            </View>
          </View>

          {/* Direct Delete Trigger */}
          <TouchableOpacity
            onPress={() => onRemove(document)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={`Remove ${document.name}`}
            className="h-8 w-8 rounded-lg bg-red-50 border border-red-200 items-center justify-center"
          >
            <Text className="text-xs">🗑️</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="my-3 p-2.5 rounded-xl bg-amber-50/60 border border-dashed border-amber-300 flex-row items-center">
          <Text className="text-sm mr-2">📌</Text>
          <Text className="text-[11px] text-amber-900 flex-1 leading-tight">
            Required for scholarship eligibility and biometric background verification.
          </Text>
        </View>
      )}

      {/* Action Buttons Row */}
      <View className="flex-row gap-2 mt-1 items-center">
        {isUploaded ? (
          <>
            <View className="flex-1">
              <OutlineButton
                title="View Details 👁️"
                size="sm"
                className="border-slate-300 active:bg-slate-100"
                textClassName="text-slate-700 font-bold"
                onPress={() => onView(document)}
              />
            </View>
            <View className="flex-1">
              <PrimaryButton
                title="Replace 🔄"
                size="sm"
                className="bg-primary-600 active:bg-primary-700"
                onPress={() => onReplace(document)}
              />
            </View>
          </>
        ) : (
          <View className="flex-1">
            <PrimaryButton
              title="+ Upload Document"
              size="sm"
              className="bg-primary-600 active:bg-primary-700"
              onPress={() => onUpload(document)}
            />
          </View>
        )}
      </View>
    </Card>
  );
};

export default DocumentCard;
