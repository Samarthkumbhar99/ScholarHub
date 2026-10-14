import { apiClient, ApiResponse } from './api';
import { API_ENDPOINTS } from '../constants';
import { ApplicationStatus } from '../types/application';
import { BackendApplication } from '../utils/adapters';

export interface ApplicationListResponseData {
  items: BackendApplication[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApplicationCreatePayload {
  scholarship_id: string;
  status?: ApplicationStatus;
}

export interface ApplicationStatusUpdatePayload {
  status: ApplicationStatus;
}

export interface ApplicationDeleteResponseData {
  message: string;
  application_id: string;
}

export interface ListApplicationsParams {
  page?: number;
  page_size?: number;
  status?: ApplicationStatus;
  tab?: 'all' | 'active' | 'completed';
}

/**
 * Scholarship Application Tracker Service
 */
export const applicationService = {
  async listApplications(params?: ListApplicationsParams): Promise<ApiResponse<ApplicationListResponseData>> {
    return apiClient.get<ApplicationListResponseData>(
      API_ENDPOINTS.APPLICATIONS.LIST,
      params as Record<string, string | number | boolean | undefined>
    );
  },

  async getApplication(id: string): Promise<ApiResponse<BackendApplication>> {
    return apiClient.get<BackendApplication>(API_ENDPOINTS.APPLICATIONS.DETAIL(id));
  },

  async createApplication(payload: ApplicationCreatePayload): Promise<ApiResponse<BackendApplication>> {
    return apiClient.post<BackendApplication, ApplicationCreatePayload>(
      API_ENDPOINTS.APPLICATIONS.CREATE,
      payload
    );
  },

  async updateApplicationStatus(
    id: string,
    payload: ApplicationStatusUpdatePayload
  ): Promise<ApiResponse<BackendApplication>> {
    return apiClient.patch<BackendApplication, ApplicationStatusUpdatePayload>(
      API_ENDPOINTS.APPLICATIONS.STATUS(id),
      payload
    );
  },

  async deleteApplication(id: string): Promise<ApiResponse<ApplicationDeleteResponseData>> {
    return apiClient.delete<ApplicationDeleteResponseData>(API_ENDPOINTS.APPLICATIONS.DELETE(id));
  },
};

export default applicationService;
