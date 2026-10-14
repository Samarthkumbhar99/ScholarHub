import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import {
  adminService,
  AdminScholarshipDetail,
} from '../../services/adminService';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  LoadingState,
  ErrorState,
  Divider,
} from '../../components/common';
import { PrimaryButton, SecondaryButton, OutlineButton } from '../../components/buttons';

type ReviewRouteProp = RouteProp<RootStackParamList, 'AdminScholarshipReview'>;
type ReviewNavProp = NativeStackNavigationProp<RootStackParamList>;

export const AdminScholarshipReviewScreen: React.FC = () => {
  const route = useRoute<ReviewRouteProp>();
  const navigation = useNavigation<ReviewNavProp>();
  const scholarshipId = route.params.scholarshipId;

  // State
  const [scholarship, setScholarship] = useState<AdminScholarshipDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Rejection Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    provider: string;
    amount: string;
    deadline: string;
    eligibility: string;
    description: string;
    official_website: string;
  }>({
    name: '',
    provider: '',
    amount: '',
    deadline: '',
    eligibility: '',
    description: '',
    official_website: '',
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch scholarship details
  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getScholarshipDetails(scholarshipId);
      if (res.data) {
        setScholarship(res.data);
        setEditForm({
          name: res.data.name || '',
          provider: res.data.provider || '',
          amount: String(res.data.amount || ''),
          deadline: res.data.deadline || '',
          eligibility: res.data.eligibility || '',
          description: res.data.description || '',
          official_website: res.data.official_website || '',
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve scholarship review record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [scholarshipId]);

  // Approve action
  const handleApprove = async () => {
    Alert.alert(
      'Approve Scholarship',
      'Are you sure you want to approve this scholarship? It will become VERIFIED and visible to all students.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Publish',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await adminService.approveScholarship(scholarshipId);
              if (res.data) {
                setScholarship(res.data);
                setFeedbackMessage('Scholarship successfully approved and published! ✅');
              }
            } catch (err: any) {
              Alert.alert('Approval Error', err?.message || 'Failed to approve scholarship.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Reject action
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectError('A valid rejection reason is strictly required.');
      return;
    }
    try {
      setActionLoading(true);
      setRejectError(null);
      const res = await adminService.rejectScholarship(
        scholarshipId,
        rejectionReason.trim()
      );
      if (res.data) {
        setScholarship(res.data);
        setRejectModalVisible(false);
        setRejectionReason('');
        setFeedbackMessage('Scholarship has been rejected and hidden from public APIs. ❌');
      }
    } catch (err: any) {
      setRejectError(err?.message || 'Failed to reject scholarship.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit & Save action
  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      setEditError('Scholarship name cannot be empty.');
      return;
    }
    if (!editForm.provider.trim()) {
      setEditError('Provider name cannot be empty.');
      return;
    }
    const numAmount = parseFloat(editForm.amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setEditError('Amount must be a non-negative number.');
      return;
    }

    try {
      setActionLoading(true);
      setEditError(null);
      const res = await adminService.updateScholarship(scholarshipId, {
        name: editForm.name.trim(),
        provider: editForm.provider.trim(),
        amount: numAmount,
        deadline: editForm.deadline.trim(),
        eligibility: editForm.eligibility.trim() || undefined,
        description: editForm.description.trim(),
        official_website: editForm.official_website.trim() || undefined,
      });
      if (res.data) {
        setScholarship(res.data);
        setEditModalVisible(false);
        setFeedbackMessage('Scholarship details updated successfully. ✏️');
      }
    } catch (err: any) {
      setEditError(err?.message || 'Failed to save changes.');
    } finally {
      setActionLoading(false);
    }
  };

  const openUrl = (url?: string) => {
    if (!url) return;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Unable to open URL', url);
        }
      })
      .catch((err) => Alert.alert('Error', err.message));
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning" label="⏳ Pending Review" size="md" />;
      case 'VERIFIED':
        return <Badge variant="success" label="✓ Verified & Published" size="md" />;
      case 'REJECTED':
        return <Badge variant="error" label="✕ Rejected" size="md" />;
      case 'LEGACY':
        return <Badge variant="neutral" label="📜 Legacy Catalog" size="md" />;
      default:
        return <Badge variant="outline" label={status} size="md" />;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <LoadingState message="Loading scholarship review record..." />
      </View>
    );
  }

  if (error || !scholarship) {
    return (
      <View className="flex-1 bg-slate-50 p-4 justify-center">
        <ErrorState
          message={error || 'Scholarship record not found.'}
          onRetry={fetchDetails}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-24 px-4">
        {/* Header */}
        <Header
          title="Review Scholarship"
          subtitle={scholarship.provider}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        {/* Feedback Alert Banner */}
        {feedbackMessage && (
          <View className="mb-4 bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex-row items-center justify-between">
            <Text className="text-xs font-bold text-emerald-800 flex-1">
              {feedbackMessage}
            </Text>
            <TouchableOpacity onPress={() => setFeedbackMessage(null)}>
              <Text className="text-emerald-700 text-xs font-bold ml-2">✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Status & Provenance Card */}
        <Card variant="elevated" className="p-4 mb-4 bg-white border border-slate-200">
          <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <Text className="text-sm font-extrabold text-slate-900">
              Provenance & Status
            </Text>
            {renderStatusBadge(scholarship.review_status)}
          </View>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500 font-medium">Source Registry:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {scholarship.source_name || 'Direct Manual Entry'}
              </Text>
            </View>

            {scholarship.source_url ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">Source URL:</Text>
                <TouchableOpacity
                  onPress={() => openUrl(scholarship.source_url)}
                  className="flex-row items-center"
                >
                  <Text className="text-xs font-bold text-primary-600 underline mr-1">
                    View Official Source
                  </Text>
                  <Text className="text-xs text-primary-600">↗</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {scholarship.official_website ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">Official Portal:</Text>
                <TouchableOpacity
                  onPress={() => openUrl(scholarship.official_website)}
                  className="flex-row items-center"
                >
                  <Text className="text-xs font-bold text-primary-600 underline mr-1">
                    Website Link
                  </Text>
                  <Text className="text-xs text-primary-600">↗</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {scholarship.external_id ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">External Source ID:</Text>
                <Text className="text-xs font-mono text-slate-700">
                  {scholarship.external_id}
                </Text>
              </View>
            ) : null}

            {scholarship.fingerprint ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">Content Fingerprint:</Text>
                <Text className="text-[10px] font-mono text-slate-500" numberOfLines={1}>
                  {scholarship.fingerprint.slice(0, 16)}...
                </Text>
              </View>
            ) : null}

            {scholarship.last_collected_at ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">Collected At:</Text>
                <Text className="text-xs text-slate-700">
                  {new Date(scholarship.last_collected_at).toLocaleString()}
                </Text>
              </View>
            ) : null}

            {scholarship.last_verified_at ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 font-medium">Approved At:</Text>
                <Text className="text-xs text-emerald-700 font-bold">
                  {new Date(scholarship.last_verified_at).toLocaleString()}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Rejection Reason Card (if rejected) */}
        {scholarship.review_status === 'REJECTED' && scholarship.rejection_reason && (
          <Card variant="outlined" className="p-4 mb-4 bg-red-50 border-red-300">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Text className="text-sm">⚠️</Text>
              <Text className="text-xs font-extrabold text-red-900">
                Official Rejection Reason
              </Text>
            </View>
            <Text className="text-xs text-red-800 leading-relaxed">
              {scholarship.rejection_reason}
            </Text>
          </Card>
        )}

        {/* 2. Scholarship Core Details */}
        <Card variant="elevated" className="p-4 mb-4 bg-white border border-slate-200">
          <Text className="text-base font-extrabold text-slate-900 mb-1">
            {scholarship.name}
          </Text>
          <Text className="text-xs font-bold text-slate-500 mb-3">
            {scholarship.provider}
          </Text>

          <View className="flex-row gap-3 py-2 border-y border-slate-100 mb-3">
            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 font-medium">Award Amount</Text>
              <Text className="text-sm font-extrabold text-primary-700">
                ₹{Number(scholarship.amount).toLocaleString('en-IN')}{' '}
                <Text className="text-[10px] text-slate-500 font-normal">
                  {scholarship.currency}
                </Text>
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[10px] text-slate-400 font-medium">Deadline</Text>
              <Text className="text-sm font-extrabold text-slate-800">
                {scholarship.deadline}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View className="mb-3">
            <Text className="text-xs font-bold text-slate-700 mb-1">Description:</Text>
            <Text className="text-xs text-slate-600 leading-relaxed">
              {scholarship.description}
            </Text>
          </View>

          {/* Eligibility */}
          {scholarship.eligibility ? (
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-700 mb-1">
                Eligibility Criteria:
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed">
                {scholarship.eligibility}
              </Text>
            </View>
          ) : null}

          {/* Benefits */}
          {scholarship.benefits && scholarship.benefits.length > 0 ? (
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-700 mb-1">Benefits:</Text>
              {scholarship.benefits.map((b, idx) => (
                <Text key={idx} className="text-xs text-slate-600 mb-0.5">
                  • {b}
                </Text>
              ))}
            </View>
          ) : null}

          {/* Selection Process */}
          {scholarship.selection_process && scholarship.selection_process.length > 0 ? (
            <View className="mb-3">
              <Text className="text-xs font-bold text-slate-700 mb-1">
                Selection Process:
              </Text>
              {scholarship.selection_process.map((sp, idx) => (
                <Text key={idx} className="text-xs text-slate-600 mb-0.5">
                  {idx + 1}. {sp}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>

        {/* 3. Action Buttons */}
        <Card variant="elevated" className="p-4 bg-white border border-slate-200">
          <Text className="text-xs font-extrabold text-slate-900 mb-3">
            Administrative Moderation Actions
          </Text>

          <View className="gap-2.5">
            {/* Edit Before Approval */}
            <OutlineButton
              title="Edit Scholarship Data ✏️"
              size="md"
              fullWidth
              onPress={() => setEditModalVisible(true)}
              disabled={actionLoading}
            />

            {/* Approve Button */}
            <PrimaryButton
              title={
                scholarship.review_status === 'VERIFIED'
                  ? 'Re-Confirm Approval & Publish ✓'
                  : 'Approve & Publish to Students ✅'
              }
              size="md"
              fullWidth
              onPress={handleApprove}
              isLoading={actionLoading}
            />

            {/* Reject Button */}
            <TouchableOpacity
              onPress={() => setRejectModalVisible(true)}
              disabled={actionLoading}
              className="py-3 px-4 rounded-xl border border-red-300 bg-red-50/50 items-center justify-center active:bg-red-100"
            >
              <Text className="text-xs font-bold text-red-700">
                Reject Scholarship ❌
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScreenContainer>

      {/* REJECT MODAL */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl">
            <Text className="text-base font-extrabold text-slate-900 mb-1">
              Reject Scholarship
            </Text>
            <Text className="text-xs text-slate-500 mb-3">
              Please enter the specific reason for rejecting this scholarship. The reason is required and will be saved in the audit log.
            </Text>

            {rejectError && (
              <View className="bg-red-50 p-2 rounded mb-2 border border-red-200">
                <Text className="text-xs text-red-700 font-semibold">{rejectError}</Text>
              </View>
            )}

            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="e.g. Ineligible provider, deadline expired, missing eligibility terms..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              className="border border-slate-300 rounded-xl p-3 text-xs text-slate-800 bg-slate-50 min-h-[90px] mb-4"
              textAlignVertical="top"
            />

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectError(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 items-center bg-slate-50"
              >
                <Text className="text-xs font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmReject}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 items-center"
              >
                <Text className="text-xs font-bold text-white">
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl max-h-[85%]">
            <Text className="text-base font-extrabold text-slate-900 mb-1">
              Edit Scholarship Information
            </Text>
            <Text className="text-xs text-slate-500 mb-3">
              Correct inaccurate or incomplete fields before approval. Source provenance is preserved.
            </Text>

            {editError && (
              <View className="bg-red-50 p-2 rounded mb-2 border border-red-200">
                <Text className="text-xs text-red-700 font-semibold">{editError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} className="gap-2.5">
              <View>
                <Text className="text-[11px] font-bold text-slate-700 mb-1">Name *</Text>
                <TextInput
                  value={editForm.name}
                  onChangeText={(val) => setEditForm({ ...editForm, name: val })}
                  className="border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-slate-50"
                />
              </View>

              <View>
                <Text className="text-[11px] font-bold text-slate-700 mb-1">Provider *</Text>
                <TextInput
                  value={editForm.provider}
                  onChangeText={(val) => setEditForm({ ...editForm, provider: val })}
                  className="border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-slate-50"
                />
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-700 mb-1">
                    Amount (₹) *
                  </Text>
                  <TextInput
                    value={editForm.amount}
                    onChangeText={(val) => setEditForm({ ...editForm, amount: val })}
                    keyboardType="numeric"
                    className="border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-slate-50"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-700 mb-1">
                    Deadline (YYYY-MM-DD) *
                  </Text>
                  <TextInput
                    value={editForm.deadline}
                    onChangeText={(val) => setEditForm({ ...editForm, deadline: val })}
                    className="border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-slate-50"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[11px] font-bold text-slate-700 mb-1">
                  Eligibility Criteria
                </Text>
                <TextInput
                  value={editForm.eligibility}
                  onChangeText={(val) => setEditForm({ ...editForm, eligibility: val })}
                  multiline
                  numberOfLines={2}
                  className="border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-slate-50"
                />
              </View>

              <View>
                <Text className="text-[11px] font-bold text-slate-700 mb-1">Description</Text>
                <TextInput
                  value={editForm.description}
                  onChangeText={(val) => setEditForm({ ...editForm, description: val })}
                  multiline
                  numberOfLines={3}
                  className="border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-slate-50"
                />
              </View>

              <View>
                <Text className="text-[11px] font-bold text-slate-700 mb-1">
                  Official Website
                </Text>
                <TextInput
                  value={editForm.official_website}
                  onChangeText={(val) => setEditForm({ ...editForm, official_website: val })}
                  className="border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-slate-50"
                />
              </View>
            </ScrollView>

            <View className="flex-row gap-2 mt-4 pt-2 border-t border-slate-100">
              <TouchableOpacity
                onPress={() => {
                  setEditModalVisible(false);
                  setEditError(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 items-center bg-slate-50"
              >
                <Text className="text-xs font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 items-center"
              >
                <Text className="text-xs font-bold text-white">
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AdminScholarshipReviewScreen;
