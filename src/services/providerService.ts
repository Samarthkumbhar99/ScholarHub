import { apiClient } from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { ProviderProfile } from '../types/user';

export interface ProviderScholarshipItem {
  id: string;
  name: string;
  provider: string;
  amount: number | string;
  currency: string;
  deadline: string;
  description: string;
  eligibility?: string;
  benefits?: string[];
  selection_process?: string[];
  official_website?: string;
  review_status: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'LEGACY';
  is_verified: boolean;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderScholarshipListResponse {
  items: ProviderScholarshipItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProviderScholarshipCreatePayload {
  name: string;
  description: string;
  amount: number;
  currency?: string;
  deadline: string;
  eligibility?: string;
  benefits?: string[];
  selection_process?: string[];
  official_website?: string;
}

export interface ProviderScholarshipUpdatePayload {
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  deadline?: string;
  eligibility?: string;
  benefits?: string[];
  selection_process?: string[];
  official_website?: string;
}

export interface ProviderProfileUpdatePayload {
  organization_name?: string;
  contact_person?: string;
  website?: string;
  phone?: string;
  description?: string;
}

export interface ProviderApplyPayload {
  organization_name: string;
  contact_person?: string;
  website?: string;
  phone?: string;
  description?: string;
}

export const providerService = {
  /**
   * Fetch authenticated provider organization profile
   */
  async getProfile() {
    return apiClient.get<ProviderProfile>(API_ENDPOINTS.PROVIDER.PROFILE);
  },

  /**
   * Update provider organization details
   */
  async updateProfile(payload: ProviderProfileUpdatePayload) {
    return apiClient.put<ProviderProfile>(API_ENDPOINTS.PROVIDER.PROFILE, payload);
  },

  /**
   * Apply for provider role as an authenticated user
   */
  async apply(payload: ProviderApplyPayload) {
    return apiClient.post<ProviderProfile>(API_ENDPOINTS.PROVIDER.APPLY, payload);
  },

  /**
   * List scholarships submitted by this provider
   */
  async getSubmittedScholarships(page: number = 1, pageSize: number = 20) {
    return apiClient.get<ProviderScholarshipListResponse>(
      `${API_ENDPOINTS.PROVIDER.SCHOLARSHIPS}?page=${page}&page_size=${pageSize}`
    );
  },

  /**
   * Get single submitted scholarship detail
   */
  async getSubmittedScholarship(id: string) {
    return apiClient.get<ProviderScholarshipItem>(
      API_ENDPOINTS.PROVIDER.SCHOLARSHIP_DETAIL(id)
    );
  },

  /**
   * Submit new scholarship for administrative review
   */
  async submitScholarship(payload: ProviderScholarshipCreatePayload) {
    return apiClient.post<ProviderScholarshipItem>(
      API_ENDPOINTS.PROVIDER.SCHOLARSHIPS,
      payload
    );
  },

  /**
   * Update an existing scholarship submission
   */
  async updateScholarship(id: string, payload: ProviderScholarshipUpdatePayload) {
    return apiClient.put<ProviderScholarshipItem>(
      API_ENDPOINTS.PROVIDER.SCHOLARSHIP_DETAIL(id),
      payload
    );
  },

  /**
   * Delete a scholarship submission
   */
  async deleteScholarship(id: string) {
    return apiClient.delete(API_ENDPOINTS.PROVIDER.SCHOLARSHIP_DETAIL(id));
  },
};

export default providerService;
