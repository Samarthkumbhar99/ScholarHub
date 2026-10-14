import { apiClient, ApiResponse } from './api';
import { API_ENDPOINTS } from '../constants';
import { BackendScholarship } from '../utils/adapters';

export interface ScholarshipListResponseData {
  items: BackendScholarship[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ScholarshipRequirementData {
  id: string;
  scholarship_id: string;
  name: string;
  description?: string;
  required: boolean;
  document_type?: string;
}

export interface MatchCriteriaResult {
  criteria: string;
  matched: boolean;
  explanation: string;
}

export interface ScholarshipMatchData {
  match_score: number;
  match_level: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW';
  summary: string;
  matched_criteria: MatchCriteriaResult[];
  potential_issues: string[];
  recommendations: string[];
  is_ai_generated: boolean;
}

export interface MatchRecommendationItem {
  scholarship: BackendScholarship;
  match: ScholarshipMatchData;
}

export interface ScholarshipRecommendationResponseData {
  items: MatchRecommendationItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SavedStatusData {
  scholarship_id: string;
  saved: boolean;
}

export interface CompareResponseData {
  items: BackendScholarship[];
  count: number;
}

export interface ListScholarshipsParams {
  page?: number;
  page_size?: number;
  q?: string;
  provider?: string;
  min_amount?: number;
  max_amount?: number;
  deadline_from?: string;
  deadline_to?: string;
  sort_by?: 'deadline_asc' | 'deadline_desc' | 'amount_asc' | 'amount_desc' | 'name_asc' | 'name_desc';
}

/**
 * Scholarship Discovery & AI Matching Service
 */
export const scholarshipService = {
  async listScholarships(params?: ListScholarshipsParams): Promise<ApiResponse<ScholarshipListResponseData>> {
    return apiClient.get<ScholarshipListResponseData>(
      API_ENDPOINTS.SCHOLARSHIPS.LIST,
      params as Record<string, string | number | boolean | undefined>
    );
  },

  async getScholarshipDetails(id: string): Promise<ApiResponse<BackendScholarship>> {
    return apiClient.get<BackendScholarship>(API_ENDPOINTS.SCHOLARSHIPS.DETAIL(id));
  },

  async getScholarshipRequirements(id: string): Promise<ApiResponse<ScholarshipRequirementData[]>> {
    return apiClient.get<ScholarshipRequirementData[]>(API_ENDPOINTS.SCHOLARSHIPS.REQUIREMENTS(id));
  },

  async matchScholarship(id: string): Promise<ApiResponse<ScholarshipMatchData>> {
    return apiClient.get<ScholarshipMatchData>(API_ENDPOINTS.SCHOLARSHIPS.MATCH(id));
  },

  async saveScholarship(id: string): Promise<ApiResponse<SavedStatusData>> {
    return apiClient.post<SavedStatusData>(API_ENDPOINTS.SCHOLARSHIPS.SAVE(id));
  },

  async unsaveScholarship(id: string): Promise<ApiResponse<SavedStatusData>> {
    return apiClient.delete<SavedStatusData>(API_ENDPOINTS.SCHOLARSHIPS.SAVE(id));
  },

  async checkSavedStatus(id: string): Promise<ApiResponse<SavedStatusData>> {
    return apiClient.get<SavedStatusData>(API_ENDPOINTS.SCHOLARSHIPS.SAVED_STATUS(id));
  },

  async getSavedScholarships(page: number = 1, pageSize: number = 50): Promise<ApiResponse<ScholarshipListResponseData>> {
    return apiClient.get<ScholarshipListResponseData>(API_ENDPOINTS.SCHOLARSHIPS.SAVED_LIST, {
      page,
      page_size: pageSize,
    });
  },

  async compareScholarships(ids: string[]): Promise<ApiResponse<CompareResponseData>> {
    return apiClient.get<CompareResponseData>(API_ENDPOINTS.SCHOLARSHIPS.COMPARE(ids));
  },

  async getRecommendations(page: number = 1, pageSize: number = 10, minScore?: number): Promise<ApiResponse<ScholarshipRecommendationResponseData>> {
    return apiClient.get<ScholarshipRecommendationResponseData>(API_ENDPOINTS.SCHOLARSHIPS.RECOMMENDATIONS, {
      page,
      page_size: pageSize,
      min_score: minScore,
    });
  },
};

export default scholarshipService;
