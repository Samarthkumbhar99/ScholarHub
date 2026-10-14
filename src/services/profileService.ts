import { apiClient, ApiResponse } from './api';
import { API_ENDPOINTS } from '../constants';
import { BackendCombinedProfile } from '../utils/adapters';

export interface PersonalProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string; // YYYY-MM-DD
  gender?: string;
  mobile?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
}

export interface AcademicProfileUpdatePayload {
  course?: string;
  branch?: string;
  current_year?: string;
  university?: string;
  college?: string;
  cgpa?: number;
  previous_percentage?: number;
}

export interface FinancialPreferencesUpdatePayload {
  reservation_category?: string;
  special_categories?: string[];
  family_income?: number;
  study_preference?: 'INDIA' | 'ABROAD' | 'BOTH';
}

/**
 * Profile Service
 * Manages personal, academic, and financial preferences profiles against FastAPI backend.
 */
export const profileService = {
  async getCombinedProfile(): Promise<ApiResponse<BackendCombinedProfile>> {
    return apiClient.get<BackendCombinedProfile>(API_ENDPOINTS.PROFILE.ME);
  },

  async getPersonalProfile(): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.PROFILE.PERSONAL);
  },

  async updatePersonalProfile(payload: PersonalProfileUpdatePayload): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.PROFILE.PERSONAL, payload);
  },

  async getAcademicProfile(): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.PROFILE.ACADEMIC);
  },

  async updateAcademicProfile(payload: AcademicProfileUpdatePayload): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.PROFILE.ACADEMIC, payload);
  },

  async getFinancialPreferences(): Promise<ApiResponse<any>> {
    return apiClient.get(API_ENDPOINTS.PROFILE.PREFERENCES);
  },

  async updateFinancialPreferences(payload: FinancialPreferencesUpdatePayload): Promise<ApiResponse<any>> {
    return apiClient.put(API_ENDPOINTS.PROFILE.PREFERENCES, payload);
  },
};

export default profileService;
