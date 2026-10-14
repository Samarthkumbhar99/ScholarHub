import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logout } from '../../store/slices/authSlice';
import {
  providerService,
  ProviderScholarshipItem,
} from '../../services/providerService';
import { colors } from '../../theme';
import { showConfirmDialog, showMessageDialog } from '../../utils';

type ProviderDashboardNavProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProviderDashboard'
>;

export const ProviderDashboardScreen: React.FC = () => {
  const navigation = useNavigation<ProviderDashboardNavProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [scholarships, setScholarships] = useState<ProviderScholarshipItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');

  // Submit/Edit Modal State
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDeadline, setFormDeadline] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formEligibility, setFormEligibility] = useState<string>('');
  const [formWebsite, setFormWebsite] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await providerService.getSubmittedScholarships(1, 100);
      setScholarships(res.data.items || []);
    } catch (err: any) {
      // If error loading, preserve existing
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSubmissions();
  };

  const handleLogout = () => {
    showConfirmDialog({
      title: 'Sign Out',
      message: 'Are you sure you want to log out of your provider account?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: () => {
        dispatch(logout());
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
        } catch {
          navigation.navigate('Auth' as any);
        }
      },
    });
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormAmount('');
    // Default deadline 60 days in future
    const d = new Date();
    d.setDate(d.getDate() + 60);
    setFormDeadline(d.toISOString().split('T')[0]);
    setFormDescription('');
    setFormEligibility('');
    setFormWebsite('');
    setFormError(null);
    setIsModalVisible(true);
  };

  const openEditModal = (item: ProviderScholarshipItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormAmount(String(item.amount));
    setFormDeadline(item.deadline);
    setFormDescription(item.description);
    setFormEligibility(item.eligibility || '');
    setFormWebsite(item.official_website || '');
    setFormError(null);
    setIsModalVisible(true);
  };

  const handleSubmitForm = async () => {
    if (!formName.trim() || !formAmount.trim() || !formDeadline.trim() || !formDescription.trim()) {
      setFormError('Please fill in title, award amount, deadline, and description.');
      return;
    }

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid award amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingId) {
        await providerService.updateScholarship(editingId, {
          name: formName.trim(),
          amount: parsedAmount,
          deadline: formDeadline.trim(),
          description: formDescription.trim(),
          eligibility: formEligibility.trim() || undefined,
          official_website: formWebsite.trim() || undefined,
        });
        Alert.alert(
          'Submission Updated',
          'Your changes have been saved and queued for administrator moderation.'
        );
      } else {
        await providerService.submitScholarship({
          name: formName.trim(),
          amount: parsedAmount,
          deadline: formDeadline.trim(),
          description: formDescription.trim(),
          eligibility: formEligibility.trim() || undefined,
          official_website: formWebsite.trim() || undefined,
        });
        Alert.alert(
          'Scholarship Submitted',
          'Your scholarship listing has been submitted for editorial review. Once verified by an administrator, it will be published to students.'
        );
      }

      setIsModalVisible(false);
      loadSubmissions();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to submit scholarship.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    showConfirmDialog({
      title: 'Delete Listing',
      message: `Are you sure you want to delete "${name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await providerService.deleteScholarship(id);
          loadSubmissions();
        } catch (err: any) {
          showMessageDialog('Error', err.response?.data?.detail || 'Failed to delete listing.');
        }
      },
    });
  };

  // Metric counts
  const totalCount = scholarships.length;
  const pendingCount = scholarships.filter(
    (s) => s.review_status === 'PENDING_REVIEW'
  ).length;
  const verifiedCount = scholarships.filter(
    (s) => s.review_status === 'VERIFIED'
  ).length;
  const rejectedCount = scholarships.filter(
    (s) => s.review_status === 'REJECTED'
  ).length;

  const filteredScholarships = scholarships.filter((s) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') return s.review_status === 'PENDING_REVIEW';
    if (activeFilter === 'VERIFIED') return s.review_status === 'VERIFIED';
    if (activeFilter === 'REJECTED') return s.review_status === 'REJECTED';
    return true;
  });

  const orgName =
    user?.providerProfile?.organizationName ||
    user?.name ||
    'Scholarship Provider Portal';

  return (
    <View className="flex-1 bg-slate-50">
      {/* Top Header */}
      <View className="bg-slate-900 pt-14 pb-6 px-5 border-b border-slate-800">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <Text className="text-xs font-bold text-amber-400 uppercase tracking-widest mr-2">
                PROVIDER PORTAL
              </Text>
              {user?.providerProfile?.isApproved === false ? (
                <View className="bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-semibold text-amber-300">Pending Approval</Text>
                </View>
              ) : (
                <View className="bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-semibold text-emerald-300">Active</Text>
                </View>
              )}
            </View>
            <Text className="text-2xl font-black text-white" numberOfLines={1}>
              {orgName}
            </Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              {user?.email}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700"
          >
            <Text className="text-xs font-semibold text-slate-200">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Action Button: Submit Scholarship */}
        <TouchableOpacity
          onPress={openCreateModal}
          className="bg-amber-500 active:bg-amber-600 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-md shadow-amber-500/20"
        >
          <Text className="text-white font-bold text-sm tracking-wide mr-2">
            + Submit New Scholarship
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pending Approval Notice Banner */}
      {user?.providerProfile?.isApproved === false && (
        <View className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex-row items-center">
          <Text className="text-xl mr-3">⏳</Text>
          <View className="flex-1">
            <Text className="text-xs font-bold text-amber-950">
              Provider Account Pending Administrator Approval
            </Text>
            <Text className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Your organization credentials are currently undergoing review by ScholarHub administrators. You may prepare and submit scholarship listings; they will be queued for moderation.
            </Text>
          </View>
        </View>
      )}

      {/* Metrics Row */}
      <View className="flex-row px-4 py-4 gap-2 bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={() => setActiveFilter('ALL')}
          className={`flex-1 p-3 rounded-xl border items-center ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 border-slate-900'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <Text
            className={`text-lg font-black ${
              activeFilter === 'ALL' ? 'text-white' : 'text-slate-800'
            }`}
          >
            {totalCount}
          </Text>
          <Text
            className={`text-[10px] font-bold uppercase mt-0.5 ${
              activeFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveFilter('PENDING')}
          className={`flex-1 p-3 rounded-xl border items-center ${
            activeFilter === 'PENDING'
              ? 'bg-amber-500 border-amber-500'
              : 'bg-amber-50/60 border-amber-200'
          }`}
        >
          <Text
            className={`text-lg font-black ${
              activeFilter === 'PENDING' ? 'text-white' : 'text-amber-800'
            }`}
          >
            {pendingCount}
          </Text>
          <Text
            className={`text-[10px] font-bold uppercase mt-0.5 ${
              activeFilter === 'PENDING' ? 'text-amber-100' : 'text-amber-700'
            }`}
          >
            Pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveFilter('VERIFIED')}
          className={`flex-1 p-3 rounded-xl border items-center ${
            activeFilter === 'VERIFIED'
              ? 'bg-emerald-600 border-emerald-600'
              : 'bg-emerald-50/60 border-emerald-200'
          }`}
        >
          <Text
            className={`text-lg font-black ${
              activeFilter === 'VERIFIED' ? 'text-white' : 'text-emerald-800'
            }`}
          >
            {verifiedCount}
          </Text>
          <Text
            className={`text-[10px] font-bold uppercase mt-0.5 ${
              activeFilter === 'VERIFIED' ? 'text-emerald-100' : 'text-emerald-700'
            }`}
          >
            Approved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveFilter('REJECTED')}
          className={`flex-1 p-3 rounded-xl border items-center ${
            activeFilter === 'REJECTED'
              ? 'bg-rose-600 border-rose-600'
              : 'bg-rose-50/60 border-rose-200'
          }`}
        >
          <Text
            className={`text-lg font-black ${
              activeFilter === 'REJECTED' ? 'text-white' : 'text-rose-800'
            }`}
          >
            {rejectedCount}
          </Text>
          <Text
            className={`text-[10px] font-bold uppercase mt-0.5 ${
              activeFilter === 'REJECTED' ? 'text-rose-100' : 'text-rose-700'
            }`}
          >
            Rejected
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text className="text-slate-500 font-medium text-xs mt-3">
            Loading your submissions...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredScholarships}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
            />
          }
          ListEmptyComponent={
            <View className="bg-white rounded-2xl p-8 items-center border border-slate-200 my-6">
              <Text className="text-4xl mb-3">📋</Text>
              <Text className="text-base font-bold text-slate-800 text-center">
                No Submissions Found
              </Text>
              <Text className="text-xs text-slate-500 text-center mt-1 mb-5">
                {activeFilter === 'ALL'
                  ? 'You have not submitted any scholarships yet. Tap the button below to submit your first scholarship.'
                  : `No submissions matching "${activeFilter}" filter.`}
              </Text>
              {activeFilter === 'ALL' && (
                <TouchableOpacity
                  onPress={openCreateModal}
                  className="bg-amber-500 px-5 py-2.5 rounded-xl"
                >
                  <Text className="text-white font-bold text-xs">
                    + Submit Scholarship
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isPending = item.review_status === 'PENDING_REVIEW';
            const isVerified = item.review_status === 'VERIFIED';
            const isRejected = item.review_status === 'REJECTED';

            return (
              <View className="bg-white rounded-2xl p-5 mb-4 border border-slate-200 shadow-sm">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-bold text-slate-900 leading-tight">
                      {item.name}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Deadline: {item.deadline}
                    </Text>
                  </View>

                  {/* Status Pill */}
                  <View
                    className={`px-2.5 py-1 rounded-full ${
                      isVerified
                        ? 'bg-emerald-100 border border-emerald-300'
                        : isRejected
                        ? 'bg-rose-100 border border-rose-300'
                        : 'bg-amber-100 border border-amber-300'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase ${
                        isVerified
                          ? 'text-emerald-800'
                          : isRejected
                          ? 'text-rose-800'
                          : 'text-amber-800'
                      }`}
                    >
                      {item.review_status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Amount */}
                <View className="flex-row items-center my-1.5">
                  <Text className="text-xs text-slate-500 font-semibold mr-1">Award:</Text>
                  <Text className="text-sm font-extrabold text-slate-800">
                    ₹{Number(item.amount).toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Description snippet */}
                <Text
                  className="text-xs text-slate-600 mt-1 leading-relaxed"
                  numberOfLines={2}
                >
                  {item.description}
                </Text>

                {/* Rejection Alert Box */}
                {isRejected && item.rejection_reason && (
                  <View className="bg-rose-50 border border-rose-200 rounded-xl p-3 mt-3">
                    <Text className="text-[11px] font-bold text-rose-800 mb-0.5">
                      ⚠️ Moderator Feedback:
                    </Text>
                    <Text className="text-xs text-rose-700 leading-relaxed">
                      {item.rejection_reason}
                    </Text>
                    <Text className="text-[10px] text-rose-500 mt-1.5 font-medium">
                      You can edit this submission to correct issues and re-queue it for review.
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row justify-end items-center mt-4 pt-3 border-t border-slate-100 gap-2">
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.name)}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50"
                  >
                    <Text className="text-xs font-semibold text-rose-700">Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openEditModal(item)}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-900"
                  >
                    <Text className="text-xs font-semibold text-white">
                      {isRejected ? 'Revise & Re-submit' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal: Submit / Edit Scholarship */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 bg-white">
          <View className="pt-12 pb-4 px-5 border-b border-slate-200 flex-row items-center justify-between">
            <Text className="text-lg font-black text-slate-900">
              {editingId ? 'Edit Scholarship Submission' : 'Submit Scholarship for Review'}
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              className="p-1"
            >
              <Text className="text-slate-500 text-lg font-bold">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            {formError && (
              <View className="bg-rose-50 border border-rose-200 p-3 rounded-xl mb-4">
                <Text className="text-xs text-rose-700 font-semibold">{formError}</Text>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 mb-1">
                Scholarship Title *
              </Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Tata Merit Engineering Fellowship 2026"
                className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white"
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-700 mb-1">
                  Award Amount (INR) *
                </Text>
                <TextInput
                  value={formAmount}
                  onChangeText={setFormAmount}
                  placeholder="50000"
                  keyboardType="numeric"
                  className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white"
                />
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-700 mb-1">
                  Deadline (YYYY-MM-DD) *
                </Text>
                <TextInput
                  value={formDeadline}
                  onChangeText={setFormDeadline}
                  placeholder="2026-12-31"
                  className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 mb-1">
                Official Website Link
              </Text>
              <TextInput
                value={formWebsite}
                onChangeText={setFormWebsite}
                placeholder="https://organization.org/scholarship"
                autoCapitalize="none"
                keyboardType="url"
                className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-700 mb-1">
                Description & Coverage *
              </Text>
              <TextInput
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Detailed description of the grant, financial aid, or scholarship terms..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white min-h-[90px]"
              />
            </View>

            <View className="mb-6">
              <Text className="text-xs font-bold text-slate-700 mb-1">
                Eligibility Criteria
              </Text>
              <TextInput
                value={formEligibility}
                onChangeText={setFormEligibility}
                placeholder="Minimum CGPA, reservation categories, family income cap, etc."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white min-h-[70px]"
              />
            </View>

            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6">
              <Text className="text-xs font-bold text-amber-800 mb-1">
                🛡️ Review & Publication Safeguard
              </Text>
              <Text className="text-[11px] text-amber-700 leading-relaxed">
                All submitted scholarships will enter PENDING REVIEW status. A ScholarHub administrator will verify details before publication to students.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmitForm}
              disabled={isSubmitting}
              className={`py-3.5 rounded-xl items-center justify-center mb-8 ${
                isSubmitting ? 'bg-amber-400' : 'bg-amber-500 active:bg-amber-600'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-sm tracking-wide">
                  {editingId ? 'Save & Submit Changes' : 'Submit for Review'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default ProviderDashboardScreen;
