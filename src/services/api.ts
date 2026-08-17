import { API_ENDPOINTS } from '../constants';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

/**
 * Scalable HTTP Client layer for ScholarHub Mobile
 * Prepared for future API integration
 */
class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_ENDPOINTS.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  public async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    // Scaffold implementation ready for backend connection
    return {
      data: {} as T,
      success: true,
      message: `GET request to ${endpoint} ready for backend integration`,
    };
  }

  public async post<T, B = unknown>(endpoint: string, body?: B): Promise<ApiResponse<T>> {
    // Scaffold implementation ready for backend connection
    return {
      data: {} as T,
      success: true,
      message: `POST request to ${endpoint} ready for backend integration`,
    };
  }
}

export const apiClient = new ApiClient();
export default apiClient;
