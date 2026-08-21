import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { DocumentItem, CATEGORY_METADATA } from '../../../types/document';
import { Card, Badge, Divider } from '../../../components/common';
import { PrimaryButton, OutlineButton } from '../../../components/buttons';
import { formatDate } from '../../../utils/formatters';

interface DocumentMetadataModalProps {
  visible: boolean;
  document: DocumentItem | null;
  onClose: () => void;
  onReplace: (document: DocumentItem) => void;
  onRemove: (document: DocumentItem) => void;
}

/**
 * DocumentMetadataModal
 * Provides full metadata view for an uploaded document without pretending a remote cloud preview exists
 */
export const DocumentMetadataModal: React.FC<DocumentMetadataModalProps> = ({
  visible,
  document,
  onClose,
  onReplace,
  onRemove,
}) => {
  if (!document) return null;

  const categoryMeta = CATEGORY_METADATA[document.category];
  const isUploaded = document.status === 'UPLOADED';

  const handleReplace = () => {
    onClose();
    onReplace(document);
  };

  const handleRemove = () => {
    onClose();
    onRemove(document);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="w-full max-w-md bg-white rounded-3xl p-5 shadow-xl border border-slate-200 max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View className="flex-row items-center gap-2 flex-1 mr-2">
              <View className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center">
                <Text className="text-base">{categoryMeta?.icon || '📄'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-slate-900" numberOfLines={1}>
                  Document Details
                </Text>
                <Text className="text-[10px] text-slate-500">
                  {document.category} Category Proof
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 rounded-full bg-slate-100 items-center justify-center"
              accessibilityLabel="Close document details"
            >
              <Text className="text-sm font-bold text-slate-600">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="my-3" showsVerticalScrollIndicator={false}>
            {/* Main Document Title */}
            <View className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 mb-3.5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Document Type
                </Text>
                <Badge
                  variant={isUploaded ? 'success' : 'warning'}
                  size="sm"
                  label={isUploaded ? '✓ Uploaded' : '⚠ Missing'}
                />
              </View>
              <Text className="text-base font-black text-slate-900">
                {document.name}
              </Text>
              {document.description ? (
                <Text className="text-xs text-slate-500 mt-1">
                  {document.description}
                </Text>
              ) : null}
            </View>

            {/* Metadata Fields Table */}
            <Text className="text-xs font-black text-slate-900 mb-2">
              File Metadata
            </Text>

            <View className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-3.5">
              <View className="p-3 flex-row items-center justify-between border-b border-slate-100">
                <Text className="text-xs text-slate-500 font-medium">File Name</Text>
                <Text className="text-xs font-bold text-slate-900 flex-1 text-right ml-4" numberOfLines={1}>
                  {document.fileName || 'Not attached'}
                </Text>
              </View>

              <View className="p-3 flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <Text className="text-xs text-slate-500 font-medium">File Size</Text>
                <Text className="text-xs font-bold text-slate-900">
                  {document.fileSize || 'N/A'}
                </Text>
              </View>

              <View className="p-3 flex-row items-center justify-between border-b border-slate-100">
                <Text className="text-xs text-slate-500 font-medium">Upload Date</Text>
                <Text className="text-xs font-bold text-slate-900">
                  {document.uploadedAt ? formatDate(document.uploadedAt) : 'Pending'}
                </Text>
              </View>

              <View className="p-3 flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <Text className="text-xs text-slate-500 font-medium">MIME Format</Text>
                <Text className="text-xs font-bold text-slate-900">
                  {document.mimeType || (document.fileName?.endsWith('.pdf') ? 'application/pdf' : 'image/*')}
                </Text>
              </View>

              <View className="p-3 flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">Repository Key</Text>
                <Text className="text-[11px] font-mono text-slate-600">
                  {document.id}
                </Text>
              </View>
            </View>

            {/* Storage Notice */}
            <View className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex-row items-start mb-2">
              <Text className="text-sm mr-2 mt-0.5">ℹ️</Text>
              <Text className="text-[11px] text-primary-900 leading-snug flex-1">
                This document is verified and cached locally on this device. When applying for scholarships, ScholarHub automatically references this verified copy for 1-click readiness.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View className="pt-2 border-t border-slate-100 gap-2">
            <View className="flex-row gap-2">
              <View className="flex-1">
                <OutlineButton
                  title="Replace File 🔄"
                  size="sm"
                  className="border-primary-600"
                  textClassName="text-primary-700 font-bold"
                  onPress={handleReplace}
                />
              </View>
              <View className="flex-1">
                <OutlineButton
                  title="Remove 🗑️"
                  size="sm"
                  className="border-red-300 active:bg-red-50"
                  textClassName="text-red-700 font-bold"
                  onPress={handleRemove}
                />
              </View>
            </View>

            <PrimaryButton
              title="Done"
              size="sm"
              className="bg-slate-900 active:bg-slate-800"
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DocumentMetadataModal;
