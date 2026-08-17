import { apiClient, ApiResponse } from './api';
import { API_ENDPOINTS } from '../constants';
import { UserProfile } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponseData {
  user: UserProfile;
  token: string;
}

/**
 * Authentication Service interface scaffold
 */
export const authService = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponseData>> {
    return apiClient.post<AuthResponseData, LoginCredentials>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
  },

  async register(payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> {
    return apiClient.post<AuthResponseData, RegisterPayload>(
      API_ENDPOINTS.AUTH.REGISTER,
      payload
    );
  },

  async logout(): Promise<void> {
    apiClient.setAuthToken(null);
  },
};

export default authService;
