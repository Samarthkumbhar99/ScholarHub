import { apiClient, ApiResponse } from './api';
import { API_ENDPOINTS } from '../constants';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface TokenResponseData {
  access_token: string;
  token_type: string;
}

export interface BackendUserResponse {
  id: string;
  email: string;
  role?: string;
  provider_profile?: {
    id: string;
    organization_name: string;
    contact_person?: string;
    website?: string;
    phone?: string;
    description?: string;
    is_approved: boolean;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Authentication Service
 * Handles user registration, login, JWT token management, session retrieval, and logout.
 */
export const authService = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<TokenResponseData>> {
    const response = await apiClient.post<TokenResponseData, LoginCredentials>(
      API_ENDPOINTS.AUTH.LOGIN,
      {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      }
    );

    if (response.data?.access_token) {
      apiClient.setAuthToken(response.data.access_token);
    }

    return response;
  },

  async register(payload: RegisterPayload): Promise<ApiResponse<BackendUserResponse>> {
    return apiClient.post<BackendUserResponse, RegisterPayload>(
      API_ENDPOINTS.AUTH.REGISTER,
      {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      }
    );
  },

  async getMe(): Promise<ApiResponse<BackendUserResponse>> {
    return apiClient.get<BackendUserResponse>(API_ENDPOINTS.AUTH.ME);
  },

  async logout(): Promise<void> {
    apiClient.setAuthToken(null);
  },
};

export default authService;
