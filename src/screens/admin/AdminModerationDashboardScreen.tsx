import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import {
  adminService,
  AdminDashboardStats,
  AdminScholarshipItem,
  AdminCollectionJobItem,
} from '../../services/adminService';
import {
  ScreenContainer,
  Header,
  Card,
  Badge,
  LoadingState,
  ErrorState,
  EmptyState,
  Divider,
} from '../../components/common';
import { OutlineButton } from '../../components/buttons';
import { useAppDispatch } from '../../hooks';
import { logout } from '../../store/slices/authSlice';
import { showConfirmDialog } from '../../utils';

type AdminNavProp = NativeStackNavigationProp<RootStackParamList>;
type DashboardTab = 'pending' | 'all' | 'jobs';

export const AdminModerationDashboardScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavProp>();
  const dispatch = useAppDispatch();

  const handleAdminLogout = () => {
    showConfirmDialog({
      title: 'Sign Out',
      message: 'Are you sure you want to log out of the administrator portal?',
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

  // State
  const [activeTab, setActiveTab] = useState<DashboardTab>('pending');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // List data
  const [scholarships, setScholarships] = useState<AdminScholarshipItem[]>([]);
  const [collectionJobs, setCollectionJobs] = useState<AdminCollectionJobItem[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Load stats
  const fetchStats = async () => {
    try {
      const res = await adminService.getDashboardStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load admin stats:', err);
    }
  };

  // Load tab-specific data
  const fetchData = async () => {
    try {
      setError(null);
      if (activeTab === 'pending') {
        const res = await adminService.listPendingScholarships({
          page,
          page_size: pageSize,
          search: searchQuery.trim() || undefined,
        });
        if (res.data) {
          setScholarships(res.data.items);
          setTotalRecords(res.data.total);
          setTotalPages(res.data.total_pages);
        }
      } else if (activeTab === 'all') {
        const res = await adminService.listScholarships({
          page,
          page_size: pageSize,
          search: searchQuery.trim() || undefined,
          review_status: statusFilter || undefined,
        });
        if (res.data) {
          setScholarships(res.data.items);
          setTotalRecords(res.data.total);
          setTotalPages(res.data.total_pages);
        }
      } else if (activeTab === 'jobs') {
        const res = await adminService.listCollectionJobs({
          page,
          page_size: pageSize,
          status: statusFilter || undefined,
        });
        if (res.data) {
          setCollectionJobs(res.data.items);
          setTotalRecords(res.data.total);
          setTotalPages(res.data.total_pages);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve administrative records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchData();
    }, [activeTab, page, statusFilter])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchData()]);
  };

  const handleSearchSubmit = () => {
    setPage(1);
    fetchData();
  };

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setPage(1);
    setStatusFilter('');
    setSearchQuery('');
    setLoading(true);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning" label="⏳ Pending Review" size="sm" />;
      case 'VERIFIED':
        return <Badge variant="success" label="✓ Verified" size="sm" />;
      case 'REJECTED':
        return <Badge variant="error" label="✕ Rejected" size="sm" />;
      case 'LEGACY':
        return <Badge variant="neutral" label="📜 Legacy" size="sm" />;
      default:
        return <Badge variant="outline" label={status} size="sm" />;
    }
  };

  const renderJobStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success" label="✓ Success" size="sm" />;
      case 'RUNNING':
        return <Badge variant="info" label="⚙ Running" size="sm" />;
      case 'FAILED':
        return <Badge variant="error" label="✕ Failed" size="sm" />;
      case 'PARTIAL_SUCCESS':
        return <Badge variant="warning" label="⚠ Partial" size="sm" />;
      default:
        return <Badge variant="neutral" label={status} size="sm" />;
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenContainer scrollable withSafeArea contentContainerClassName="pb-16 px-4">
        {/* Header */}
        <Header
          title="Moderation Portal"
          subtitle="Review discovered scholarships, verify records & inspect collection history"
          showBack
          onBackPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              handleAdminLogout();
            }
          }}
          rightAction={
            <TouchableOpacity
              onPress={handleAdminLogout}
              className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              <Text className="text-xs font-semibold text-slate-200">Sign Out</Text>
            </TouchableOpacity>
          }
        />

        {/* 1. Dashboard Metrics Overview */}
        <Card variant="elevated" className="p-4 mb-4 bg-white border border-slate-200">
          <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <View className="flex-row items-center gap-2">
              <Text className="text-base">🛡️</Text>
              <Text className="text-sm font-extrabold text-slate-900">
                Discovery & Review Safeguards
              </Text>
            </View>
            <TouchableOpacity onPress={handleRefresh} accessibilityLabel="Refresh statistics">
              <Text className="text-xs font-semibold text-primary-600">↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {/* Pending Count Card */}
            <TouchableOpacity
              onPress={() => handleTabChange('pending')}
              className={`flex-1 min-w-[130px] p-3 rounded-xl border ${
                activeTab === 'pending'
                  ? 'bg-amber-50 border-amber-400'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text className="text-xs text-amber-800 font-bold">⏳ Pending Review</Text>
              <Text className="text-xl font-extrabold text-amber-900 mt-1">
                {stats ? stats.pending_scholarships : '—'}
              </Text>
              <Text className="text-[10px] text-amber-700 mt-0.5">Awaiting decision</Text>
            </TouchableOpacity>

            {/* Verified Count Card */}
            <TouchableOpacity
              onPress={() => {
                setActiveTab('all');
                setStatusFilter('VERIFIED');
                setPage(1);
              }}
              className="flex-1 min-w-[130px] p-3 rounded-xl border bg-emerald-50/50 border-emerald-200"
            >
              <Text className="text-xs text-emerald-800 font-bold">✓ Published</Text>
              <Text className="text-xl font-extrabold text-emerald-900 mt-1">
                {stats ? stats.verified_scholarships : '—'}
              </Text>
              <Text className="text-[10px] text-emerald-700 mt-0.5">Live for students</Text>
            </TouchableOpacity>

            {/* Rejected Count Card */}
            <TouchableOpacity
              onPress={() => {
                setActiveTab('all');
                setStatusFilter('REJECTED');
                setPage(1);
              }}
              className="flex-1 min-w-[130px] p-3 rounded-xl border bg-red-50/40 border-red-200"
            >
              <Text className="text-xs text-red-800 font-bold">✕ Rejected</Text>
              <Text className="text-xl font-extrabold text-red-900 mt-1">
                {stats ? stats.rejected_scholarships : '—'}
              </Text>
              <Text className="text-[10px] text-red-700 mt-0.5">Hidden from search</Text>
            </TouchableOpacity>

            {/* Collection Jobs Card */}
            <TouchableOpacity
              onPress={() => handleTabChange('jobs')}
              className={`flex-1 min-w-[130px] p-3 rounded-xl border ${
                activeTab === 'jobs'
                  ? 'bg-blue-50 border-blue-400'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text className="text-xs text-blue-800 font-bold">🤖 Collection Jobs</Text>
              <Text className="text-xl font-extrabold text-blue-900 mt-1">
                {stats ? stats.total_collection_jobs : '—'}
              </Text>
              <Text className="text-[10px] text-blue-700 mt-0.5">Execution logs</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* 2. Tab Navigation Switcher */}
        <View className="flex-row bg-slate-200/80 p-1 rounded-xl mb-4">
          <TouchableOpacity
            onPress={() => handleTabChange('pending')}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === 'pending' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'pending' ? 'text-amber-800' : 'text-slate-600'
              }`}
            >
              Pending ({stats?.pending_scholarships ?? 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTabChange('all')}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === 'all' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'all' ? 'text-primary-700' : 'text-slate-600'
              }`}
            >
              All Catalog
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTabChange('jobs')}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === 'jobs' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'jobs' ? 'text-blue-700' : 'text-slate-600'
              }`}
            >
              Job History
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Search and Status Filters */}
        {activeTab !== 'jobs' ? (
          <View className="mb-4 gap-2">
            <View className="flex-row gap-2">
              <View className="flex-1 flex-row items-center bg-white border border-slate-300 rounded-xl px-3 py-1.5">
                <Text className="text-slate-400 mr-2 text-sm">🔍</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  placeholder="Search by scholarship or provider..."
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-xs text-slate-800 py-1"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setPage(1);
                      fetchData();
                    }}
                  >
                    <Text className="text-slate-400 text-xs px-1">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={handleSearchSubmit}
                className="bg-primary-600 px-4 rounded-xl justify-center items-center"
              >
                <Text className="text-white text-xs font-bold">Search</Text>
              </TouchableOpacity>
            </View>

            {/* Status pills when viewing all catalog */}
            {activeTab === 'all' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                {[
                  { key: '', label: 'All Statuses' },
                  { key: 'PENDING_REVIEW', label: '⏳ Pending' },
                  { key: 'VERIFIED', label: '✓ Verified' },
                  { key: 'REJECTED', label: '✕ Rejected' },
                  { key: 'LEGACY', label: '📜 Legacy' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => {
                      setStatusFilter(item.key);
                      setPage(1);
                    }}
                    className={`mr-2 px-3 py-1.5 rounded-full border ${
                      statusFilter === item.key
                        ? 'bg-primary-50 border-primary-500'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        statusFilter === item.key ? 'text-primary-700' : 'text-slate-600'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          /* Job Status Filter Pills */
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 py-1">
            {[
              { key: '', label: 'All Jobs' },
              { key: 'SUCCESS', label: '✓ Success' },
              { key: 'RUNNING', label: '⚙ Running' },
              { key: 'FAILED', label: '✕ Failed' },
              { key: 'PARTIAL_SUCCESS', label: '⚠ Partial' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => {
                  setStatusFilter(item.key);
                  setPage(1);
                }}
                className={`mr-2 px-3 py-1.5 rounded-full border ${
                  statusFilter === item.key
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    statusFilter === item.key ? 'text-blue-700' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 4. Content Render: Loading, Error, Empty, or List */}
        {loading && !refreshing ? (
          <LoadingState message="Loading records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : activeTab !== 'jobs' ? (
          scholarships.length === 0 ? (
            <EmptyState
              title={
                activeTab === 'pending'
                  ? 'No Scholarships Pending Review'
                  : 'No Scholarships Found'
              }
              description={
                activeTab === 'pending'
                  ? 'All automatically discovered scholarships have been moderated! Great job.'
                  : 'No scholarship records match your search or filter parameters.'
              }
            />
          ) : (
            <View className="gap-3">
              {scholarships.map((item) => (
                <Card
                  key={item.id}
                  variant="elevated"
                  className="p-4 bg-white border border-slate-200"
                >
                  <View className="flex-row justify-between items-start mb-1.5">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-extrabold text-slate-900" numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text className="text-xs text-slate-500 font-medium mt-0.5">
                        {item.provider}
                      </Text>
                    </View>
                    {renderStatusBadge(item.review_status)}
                  </View>

                  {/* Provenance badge */}
                  <View className="flex-row items-center gap-2 mb-2">
                    <Badge
                      variant="info"
                      size="sm"
                      label={`Source: ${item.source_name || 'Direct / Manual Entry'}`}
                    />
                    {item.external_id ? (
                      <Text className="text-[10px] text-slate-400 font-mono">
                        ID: {item.external_id}
                      </Text>
                    ) : null}
                  </View>

                  {/* Description preview */}
                  <Text className="text-xs text-slate-600 mb-2.5" numberOfLines={2}>
                    {item.description}
                  </Text>

                  {/* Rejection reason alert banner if rejected */}
                  {item.review_status === 'REJECTED' && item.rejection_reason && (
                    <View className="bg-red-50 p-2 rounded-lg border border-red-200 mb-2.5">
                      <Text className="text-[11px] font-bold text-red-800">
                        Rejection Reason:
                      </Text>
                      <Text className="text-[11px] text-red-700 mt-0.5">
                        {item.rejection_reason}
                      </Text>
                    </View>
                  )}

                  <Divider className="my-2" />

                  {/* Footer metadata & Review action */}
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-xs font-extrabold text-primary-700">
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </Text>
                      <Text className="text-[10px] text-slate-500">
                        Deadline: {item.deadline}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('AdminScholarshipReview', {
                          scholarshipId: item.id,
                        })
                      }
                      className="bg-primary-50 border border-primary-300 px-3.5 py-1.5 rounded-lg flex-row items-center"
                    >
                      <Text className="text-xs font-bold text-primary-700 mr-1">
                        {item.review_status === 'PENDING_REVIEW'
                          ? 'Review & Decide ➔'
                          : 'Inspect / Edit ➔'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )
        ) : (
          /* Collection Jobs List & Scheduler Banner */
          <View>
            {stats?.scheduler_info && (
              <Card variant="outlined" className="p-3 mb-3 bg-indigo-50 border-indigo-200">
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm">⏰</Text>
                    <Text className="text-xs font-bold text-indigo-950">
                      Discovery Scheduler: {stats.scheduler_info.enabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                  <Badge
                    variant={stats.scheduler_info.is_running ? 'success' : 'neutral'}
                    label={stats.scheduler_info.is_running ? 'Active' : 'Standby'}
                    size="sm"
                  />
                </View>
                <Text className="text-[11px] text-indigo-900 mb-0.5">
                  Frequency: Every {stats.scheduler_info.interval_hours}h • Sources: {stats.scheduler_info.configured_sources.join(', ') || 'nsp'}
                </Text>
                {stats.scheduler_info.next_run_at ? (
                  <Text className="text-[11px] text-indigo-700 font-medium">
                    Next Run: {new Date(stats.scheduler_info.next_run_at).toLocaleString()}
                  </Text>
                ) : null}
              </Card>
            )}

            {collectionJobs.length === 0 ? (
              <EmptyState
                title="No Collection Jobs Recorded"
                description="No automated discovery jobs have been executed yet."
              />
            ) : (
              <View className="gap-3">
                {collectionJobs.map((job) => (
                <Card
                  key={job.id}
                  variant="elevated"
                  className="p-4 bg-white border border-slate-200"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-extrabold text-slate-900">
                        {job.source_name || 'General Collector'}
                      </Text>
                      <Text className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Started: {new Date(job.started_at).toLocaleString()}
                      </Text>
                    </View>
                    {renderJobStatusBadge(job.status)}
                  </View>

                  {/* Metrics grid */}
                  <View className="flex-row flex-wrap gap-2 py-2 border-y border-slate-100 mb-2">
                    <View className="min-w-[70px] bg-slate-50 p-1.5 rounded">
                      <Text className="text-[10px] text-slate-500">Discovered</Text>
                      <Text className="text-xs font-bold text-slate-800">
                        {job.records_discovered}
                      </Text>
                    </View>
                    <View className="min-w-[70px] bg-emerald-50 p-1.5 rounded">
                      <Text className="text-[10px] text-emerald-700">Created</Text>
                      <Text className="text-xs font-bold text-emerald-900">
                        {job.records_created}
                      </Text>
                    </View>
                    <View className="min-w-[70px] bg-blue-50 p-1.5 rounded">
                      <Text className="text-[10px] text-blue-700">Updated</Text>
                      <Text className="text-xs font-bold text-blue-900">
                        {job.records_updated}
                      </Text>
                    </View>
                    <View className="min-w-[70px] bg-amber-50 p-1.5 rounded">
                      <Text className="text-[10px] text-amber-700">Duplicates</Text>
                      <Text className="text-xs font-bold text-amber-900">
                        {job.records_duplicates_skipped}
                      </Text>
                    </View>
                    <View className="min-w-[70px] bg-red-50 p-1.5 rounded">
                      <Text className="text-[10px] text-red-700">Rejected</Text>
                      <Text className="text-xs font-bold text-red-900">
                        {job.records_rejected}
                      </Text>
                    </View>
                  </View>

                  {/* Error summary if failed */}
                  {job.error_summary && (
                    <View className="bg-red-50 p-2 rounded border border-red-200 mt-1">
                      <Text className="text-[10px] font-bold text-red-800">Error:</Text>
                      <Text className="text-[11px] text-red-700">{job.error_summary}</Text>
                    </View>
                  )}
                </Card>
              ))}
            </View>
          )}
        </View>
      )}

        {/* 5. Pagination Bar */}
        {totalPages > 1 && (
          <View className="flex-row items-center justify-between mt-5 py-3 border-t border-slate-200">
            <TouchableOpacity
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-1.5 rounded-lg border ${
                page <= 1 ? 'border-slate-200 bg-slate-100' : 'border-slate-300 bg-white'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  page <= 1 ? 'text-slate-400' : 'text-slate-700'
                }`}
              >
                ◀ Prev
              </Text>
            </TouchableOpacity>

            <Text className="text-xs text-slate-500 font-medium">
              Page {page} of {totalPages} ({totalRecords} records)
            </Text>

            <TouchableOpacity
              disabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`px-3 py-1.5 rounded-lg border ${
                page >= totalPages ? 'border-slate-200 bg-slate-100' : 'border-slate-300 bg-white'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  page >= totalPages ? 'text-slate-400' : 'text-slate-700'
                }`}
              >
                Next ▶
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScreenContainer>
    </View>
  );
};

export default AdminModerationDashboardScreen;
