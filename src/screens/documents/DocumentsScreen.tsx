import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  uploadDocument,
  replaceDocument,
  removeDocument,
  resetDocuments,
} from '../../store/slices/documentSlice';
import {
  DocumentItem,
  DocumentCategory,
  DOCUMENT_CATEGORIES,
  CATEGORY_METADATA,
} from '../../types/document';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  EmptyState,
} from '../../components/common';
import { PrimaryButton, OutlineButton } from '../../components/buttons';
import { SearchInput } from '../../components/inputs';
import { DocumentCard, DocumentMetadataModal } from './components';
import { validateDocumentFile } from '../../utils/documentUtils';

type StatusFilterTab = 'all' | 'uploaded' | 'missing';

/**
 * DocumentsScreen (Document Center)
 * Central repository for student credentials, identity proofs, and certificates.
 * Provides real-time upload/replace with device file picker, validation, metadata viewing, and status synchronization.
 */
export const DocumentsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector((state) => state.documents.items);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterTab>('all');

  // Active Document for Modal Viewer
  const [selectedDocForModal, setSelectedDocForModal] = useState<DocumentItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // User Feedback Message Banners
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage((current) => (current?.text === text ? null : current));
    }, 4000);
  };

  // Counts
  const totalCount = documents.length;
  const uploadedCount = useMemo(() => {
    return documents.filter((d) => d.status === 'UPLOADED').length;
  }, [documents]);
  const missingCount = totalCount - uploadedCount;
  const progressPercent = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Search Query Filter (name, type, category, fileName)
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesType = doc.type.toLowerCase().includes(q);
        const matchesCategory = doc.category.toLowerCase().includes(q);
        const matchesFileName = (doc.fileName || '').toLowerCase().includes(q);
        const matchesDesc = (doc.description || '').toLowerCase().includes(q);

        if (!matchesName && !matchesType && !matchesCategory && !matchesFileName && !matchesDesc) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter === 'uploaded' && doc.status !== 'UPLOADED') {
        return false;
      }
      if (statusFilter === 'missing' && doc.status !== 'MISSING') {
        return false;
      }

      return true;
    });
  }, [documents, searchQuery, selectedCategory, statusFilter]);

  // File Picker Handler (Handles both Upload and Replace)
  const handlePickDocument = async (targetDoc: DocumentItem, isReplacing: boolean = false) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Validate File
        const validation = validateDocumentFile({
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
        });

        if (!validation.valid) {
          Alert.alert('Upload Error', validation.error || 'Failed to validate document.');
          showFeedback('error', validation.error || 'Invalid document file.');
          return;
        }

        const payload = {
          id: targetDoc.id,
          fileName: asset.name,
          fileSizeBytes: asset.size,
          fileUrl: asset.uri,
          mimeType: asset.mimeType,
          uploadedAt: new Date().toISOString(),
        };

        if (isReplacing) {
          dispatch(replaceDocument(payload));
          showFeedback('success', `Updated and replaced "${targetDoc.name}" successfully.`);
        } else {
          dispatch(uploadDocument(payload));
          showFeedback('success', `Uploaded "${targetDoc.name}" successfully!`);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred while opening the file picker.';
      Alert.alert('File Picker Error', errMsg);
      showFeedback('error', errMsg);
    }
  };

  // Open Details Modal
  const handleViewDetails = (doc: DocumentItem) => {
    setSelectedDocForModal(doc);
    setIsModalVisible(true);
  };

  // Remove Document Confirmation
  const handleRemoveDocument = (doc: DocumentItem) => {
    Alert.alert(
      'Remove Document',
      `Are you sure you want to remove "${doc.name}"? Its uploaded file metadata will be cleared and marked as missing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dispatch(removeDocument(doc.id));
            showFeedback('success', `Removed "${doc.name}" from repository.`);
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
          title="Document Center"
          subtitle={`${uploadedCount} / ${totalCount} Documents Uploaded • ${progressPercent}% Ready`}
          rightAction={
            <Badge
              variant={uploadedCount === totalCount ? 'success' : 'primary'}
              size="sm"
              label={`${uploadedCount}/${totalCount} Uploaded`}
            />
          }
        />

        {/* Dynamic Feedback Banner */}
        {feedbackMessage ? (
          <View
            className={`mb-4 p-3 rounded-2xl border flex-row items-center justify-between shadow-xs ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Text className="mr-2 text-sm">
                {feedbackMessage.type === 'success' ? '✅' : '⚠️'}
              </Text>
              <Text
                className={`text-xs font-bold ${
                  feedbackMessage.type === 'success'
                    ? 'text-emerald-900'
                    : 'text-red-900'
                }`}
                numberOfLines={2}
              >
                {feedbackMessage.text}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setFeedbackMessage(null)}>
              <Text className="text-xs font-bold text-slate-500">✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Progress & Readiness Banner */}
        <Card variant="elevated" className="mb-4 p-4 border border-blue-200 bg-blue-50/40">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Text className="text-sm">📁</Text>
                <Text className="text-sm font-extrabold text-slate-900">
                  Universal Document Reusability
                </Text>
              </View>
              <Text className="text-xs text-slate-600 leading-relaxed">
                Uploaded credentials are automatically linked to your matching scholarship applications for instant 1-click readiness.
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-base font-black text-primary-700">
                {progressPercent}%
              </Text>
              <Text className="text-[10px] text-slate-500 font-bold">
                {uploadedCount}/{totalCount} Done
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden border border-blue-200 mt-1">
            <View
              className="h-full bg-primary-600 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </Card>

        {/* Search Bar */}
        <View className="mb-3">
          <SearchInput
            placeholder="Search documents, types, categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </View>

        {/* Category Filter Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mb-3 -mx-4 px-4"
          contentContainerStyle={{ gap: 6 }}
        >
          {/* ALL Category Pill */}
          <TouchableOpacity
            onPress={() => setSelectedCategory('ALL')}
            className={`py-1.5 px-3 rounded-xl border flex-row items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-primary-600 border-primary-600 shadow-2xs'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text className="text-xs">📂</Text>
            <Text
              className={`text-xs font-bold ${
                selectedCategory === 'ALL' ? 'text-white' : 'text-slate-700'
              }`}
            >
              All Categories
            </Text>
            <View
              className={`h-4 min-w-[16px] px-1 rounded-full items-center justify-center ${
                selectedCategory === 'ALL' ? 'bg-primary-800' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-[9px] font-black ${
                  selectedCategory === 'ALL' ? 'text-white' : 'text-slate-600'
                }`}
              >
                {totalCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 7 Category Pills */}
          {DOCUMENT_CATEGORIES.map((cat) => {
            const meta = CATEGORY_METADATA[cat];
            const isSelected = selectedCategory === cat;
            const categoryDocs = documents.filter((d) => d.category === cat);
            const categoryUploaded = categoryDocs.filter((d) => d.status === 'UPLOADED').length;

            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className={`py-1.5 px-3 rounded-xl border flex-row items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary-600 border-primary-600 shadow-2xs'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text className="text-xs">{meta?.icon || '📄'}</Text>
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {cat}
                </Text>
                <View
                  className={`h-4 min-w-[16px] px-1 rounded-full items-center justify-center ${
                    isSelected ? 'bg-primary-800' : 'bg-slate-100'
                  }`}
                >
                  <Text
                    className={`text-[9px] font-black ${
                      isSelected ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {categoryUploaded}/{categoryDocs.length}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Status Quick Filter (All / Uploaded / Missing) */}
        <View className="flex-row gap-2 mb-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {(
            [
              { key: 'all', label: 'All', count: totalCount },
              { key: 'uploaded', label: '✓ Uploaded', count: uploadedCount },
              { key: 'missing', label: '⚠ Missing', count: missingCount },
            ] as const
          ).map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setStatusFilter(tab.key)}
                className={`flex-1 py-1.5 px-2 rounded-xl items-center justify-center flex-row gap-1.5 ${
                  isSelected ? 'bg-white shadow-xs' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-primary-700' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </Text>
                <View
                  className={`h-4 min-w-[16px] px-1 rounded-full items-center justify-center ${
                    isSelected ? 'bg-primary-100' : 'bg-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[9px] font-black ${
                      isSelected ? 'text-primary-800' : 'text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Document List Header & Count */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-black text-slate-900">
            {selectedCategory === 'ALL'
              ? 'All Required Documents'
              : `${selectedCategory} Documents`}
          </Text>
          <Text className="text-xs text-slate-500 font-medium">
            Showing {filteredDocuments.length} of {totalCount}
          </Text>
        </View>

        {/* Document Cards List / Empty State */}
        {filteredDocuments.length === 0 ? (
          <EmptyState
            title={
              searchQuery
                ? 'No Documents Found'
                : statusFilter === 'missing'
                ? 'All Documents Uploaded!'
                : 'No Documents in this Category'
            }
            description={
              searchQuery
                ? `No documents match "${searchQuery}". Check the spelling or try searching by category or filename.`
                : statusFilter === 'missing'
                ? 'Great job! You have uploaded all credentials in this repository view.'
                : 'No documents match the current filter selection.'
            }
            actionTitle={
              searchQuery
                ? 'Clear Search ✕'
                : selectedCategory !== 'ALL' || statusFilter !== 'all'
                ? 'Reset Filters ↺'
                : 'Reset All Documents ↺'
            }
            onActionPress={() => {
              if (searchQuery) {
                setSearchQuery('');
              } else if (selectedCategory !== 'ALL' || statusFilter !== 'all') {
                setSelectedCategory('ALL');
                setStatusFilter('all');
              } else {
                dispatch(resetDocuments());
              }
            }}
          />
        ) : (
          <View className="gap-3.5 mb-6">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onUpload={(d) => handlePickDocument(d, false)}
                onReplace={(d) => handlePickDocument(d, true)}
                onView={handleViewDetails}
                onRemove={handleRemoveDocument}
              />
            ))}
          </View>
        )}

        {/* Reset / Demo Helper Tool */}
        <Card variant="outlined" className="p-4 items-center bg-slate-100 border-slate-200">
          <Text className="text-xs font-bold text-slate-700 text-center mb-1">
            Need to Restore Initial Mock State?
          </Text>
          <Text className="text-[11px] text-slate-500 text-center mb-3">
            Reset document repository to default pre-loaded verified test files.
          </Text>
          <OutlineButton
            title="Reset Documents Repository ↺"
            size="sm"
            className="border-slate-300 bg-white"
            textClassName="text-slate-700 font-bold"
            onPress={() => {
              dispatch(resetDocuments());
              showFeedback('success', 'Document repository reset to default state.');
            }}
          />
        </Card>
      </ScreenContainer>

      {/* Metadata Viewer Modal */}
      <DocumentMetadataModal
        visible={isModalVisible}
        document={selectedDocForModal}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedDocForModal(null);
        }}
        onReplace={(d) => handlePickDocument(d, true)}
        onRemove={handleRemoveDocument}
      />
    </View>
  );
};

export default DocumentsScreen;
