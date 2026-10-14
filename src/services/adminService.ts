import { apiClient, ApiResponse } from './api';
import { API_ENDPOINTS } from '../constants';

export interface AdminSchedulerInfo {
  enabled: boolean;
  is_running: boolean;
  is_executing: boolean;
  interval_hours: number;
  initial_delay_seconds: number;
  timeout_seconds: number;
  max_retries: number;
  configured_sources: string[];
  last_run_at?: string;
  next_run_at?: string;
  last_run_status?: string;
  last_run_source?: string;
  last_run_records_discovered?: number;
  last_run_records_created?: number;
  last_run_records_updated?: number;
  last_run_records_duplicates_skipped?: number;
  last_run_records_rejected?: number;
  last_run_error_summary?: string;
}

export interface AdminSchedulerTriggerResponse {
  detail: string;
  status: string;
  job_id?: string;
  records_discovered?: number;
  records_created?: number;
  records_updated?: number;
  records_duplicates_skipped?: number;
  records_rejected?: number;
  error_summary?: string;
}

export interface AdminDashboardStats {
  total_users: number;
  total_students: number;
  total_scholarships: number;
  active_scholarships: number;
  total_applications: number;
  total_saved_scholarships: number;
  total_documents: number;
  unread_notifications: number;
  pending_scholarships: number;
  verified_scholarships: number;
  rejected_scholarships: number;
  legacy_scholarships: number;
  total_collection_jobs: number;
  scheduler_info?: AdminSchedulerInfo;
}

export interface AdminScholarshipItem {
  id: string;
  name: string;
  provider: string;
  description: string;
  amount: number | string;
  currency: string;
  deadline: string;
  eligibility?: string;
  official_website?: string;
  is_verified: boolean;
  review_status: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'LEGACY' | string;
  source_id?: string;
  source_name?: string;
  external_id?: string;
  rejection_reason?: string;
  last_collected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminScholarshipDetail extends AdminScholarshipItem {
  benefits?: string[];
  selection_process?: string[];
  source_url?: string;
  fingerprint?: string;
  last_verified_at?: string;
}

export interface AdminScholarshipListResponseData {
  items: AdminScholarshipItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminCollectionJobItem {
  id: string;
  source_id?: string;
  source_name?: string;
  status: string;
  started_at: string;
  finished_at?: string;
  records_discovered: number;
  records_created: number;
  records_updated: number;
  records_duplicates_skipped: number;
  records_rejected: number;
  error_summary?: string;
  created_at: string;
}

export interface AdminCollectionJobListResponseData {
  items: AdminCollectionJobItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ListAdminScholarshipsParams {
  page?: number;
  page_size?: number;
  search?: string;
  review_status?: string;
  source_id?: string;
}

export interface ListCollectionJobsParams {
  page?: number;
  page_size?: number;
  source_id?: string;
  source_slug?: string;
  status?: string;
}

/**
 * Administrator Moderation and Discovery Audit Service
 */
export const adminService = {
  /**
   * Retrieve aggregate moderation metrics and operational counts
   */
  async getDashboardStats(): Promise<ApiResponse<AdminDashboardStats>> {
    return apiClient.get<AdminDashboardStats>(API_ENDPOINTS.ADMIN.DASHBOARD_STATS);
  },

  /**
   * List pending scholarships awaiting moderation
   */
  async listPendingScholarships(
    params?: Omit<ListAdminScholarshipsParams, 'review_status'>
  ): Promise<ApiResponse<AdminScholarshipListResponseData>> {
    return apiClient.get<AdminScholarshipListResponseData>(
      API_ENDPOINTS.ADMIN.MODERATION_PENDING,
      params as Record<string, string | number | boolean | undefined>
    );
  },

  /**
   * List scholarships across all moderation statuses with pagination and search
   */
  async listScholarships(
    params?: ListAdminScholarshipsParams
  ): Promise<ApiResponse<AdminScholarshipListResponseData>> {
    return apiClient.get<AdminScholarshipListResponseData>(
      API_ENDPOINTS.ADMIN.SCHOLARSHIPS,
      params as Record<string, string | number | boolean | undefined>
    );
  },

  /**
   * Get detailed scholarship inspection record including source provenance
   */
  async getScholarshipDetails(
    scholarshipId: string
  ): Promise<ApiResponse<AdminScholarshipDetail>> {
    return apiClient.get<AdminScholarshipDetail>(
      API_ENDPOINTS.ADMIN.SCHOLARSHIP_DETAIL(scholarshipId)
    );
  },

  /**
   * Approve a scholarship for public student discovery
   */
  async approveScholarship(
    scholarshipId: string
  ): Promise<ApiResponse<AdminScholarshipDetail>> {
    return apiClient.post<AdminScholarshipDetail>(
      API_ENDPOINTS.ADMIN.APPROVE(scholarshipId)
    );
  },

  /**
   * Reject a scholarship with required rejection reason
   */
  async rejectScholarship(
    scholarshipId: string,
    rejectionReason: string
  ): Promise<ApiResponse<AdminScholarshipDetail>> {
    return apiClient.post<AdminScholarshipDetail>(
      API_ENDPOINTS.ADMIN.REJECT(scholarshipId),
      { rejection_reason: rejectionReason }
    );
  },

  /**
   * Edit incorrect or incomplete scholarship information before or after approval
   */
  async updateScholarship(
    scholarshipId: string,
    payload: Partial<AdminScholarshipDetail>
  ): Promise<ApiResponse<AdminScholarshipDetail>> {
    return apiClient.put<AdminScholarshipDetail>(
      API_ENDPOINTS.ADMIN.UPDATE(scholarshipId),
      payload
    );
  },

  /**
   * View collection job history and execution metrics
   */
  async listCollectionJobs(
    params?: ListCollectionJobsParams
  ): Promise<ApiResponse<AdminCollectionJobListResponseData>> {
    return apiClient.get<AdminCollectionJobListResponseData>(
      API_ENDPOINTS.ADMIN.COLLECTION_JOBS,
      params as Record<string, string | number | boolean | undefined>
    );
  },

  /**
   * View single collection job audit details
   */
  async getCollectionJobDetails(
    jobId: string
  ): Promise<ApiResponse<AdminCollectionJobItem>> {
    return apiClient.get<AdminCollectionJobItem>(
      API_ENDPOINTS.ADMIN.COLLECTION_JOB_DETAIL(jobId)
    );
  },

  /**
   * View discovery scheduler operational telemetry
   */
  async getSchedulerStatus(): Promise<ApiResponse<AdminSchedulerInfo>> {
    return apiClient.get<AdminSchedulerInfo>(API_ENDPOINTS.ADMIN.SCHEDULER);
  },

  /**
   * Manually trigger on-demand discovery run respecting distributed advisory lock
   */
  async triggerScheduler(
    source: string = 'nsp'
  ): Promise<ApiResponse<AdminSchedulerTriggerResponse>> {
    return apiClient.post<AdminSchedulerTriggerResponse>(
      `${API_ENDPOINTS.ADMIN.SCHEDULER_TRIGGER}?source=${encodeURIComponent(source)}`
    );
  },
};

export default adminService;
