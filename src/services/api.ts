import { API_ENDPOINTS } from '../constants';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
  raw?: unknown;
}

export type UnauthorizedCallback = () => void;

/**
 * Robust, production-grade HTTP Client layer for ScholarHub Mobile
 * Handles authorization tokens, JSON requests, multipart uploads, error parsing, and session expiry.
 */
class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private onUnauthorized: UnauthorizedCallback | null = null;

  constructor(baseUrl: string = API_ENDPOINTS.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public setUnauthorizedCallback(callback: UnauthorizedCallback | null) {
    this.onUnauthorized = callback;
  }

  private getHeaders(isMultipart: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private parseErrorDetail(errorData: unknown, statusCode: number): string {
    if (!errorData) {
      return `HTTP error ${statusCode}`;
    }

    if (typeof errorData === 'string') {
      return errorData;
    }

    if (typeof errorData === 'object' && errorData !== null) {
      const obj = errorData as Record<string, unknown>;

      // Standard FastAPI detail field
      if ('detail' in obj) {
        const detail = obj.detail;
        if (typeof detail === 'string') {
          return detail;
        }
        if (Array.isArray(detail)) {
          // FastAPI 422 validation errors array: [{ loc: [...], msg: "..." }]
          return detail
            .map((item) => {
              if (typeof item === 'object' && item !== null && 'msg' in item) {
                const loc = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : '';
                return loc ? `${loc}: ${item.msg}` : String(item.msg);
              }
              return JSON.stringify(item);
            })
            .join('; ');
        }
      }

      if ('message' in obj && typeof obj.message === 'string') {
        return obj.message;
      }
    }

    return `Request failed with status ${statusCode}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit,
    isMultipart: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = {
      ...this.getHeaders(isMultipart),
      ...((options.headers as Record<string, string>) || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const statusCode = response.status;

      // Handle 401 Unauthorized globally
      if (statusCode === 401) {
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
      }

      // Handle 204 No Content
      if (statusCode === 204) {
        return {
          data: {} as T,
          success: true,
          statusCode,
        };
      }

      // Parse JSON response body if present
      let responseData: unknown = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }
      } else {
        try {
          responseData = await response.text();
        } catch {
          responseData = null;
        }
      }

      if (!response.ok) {
        const errorMessage = this.parseErrorDetail(responseData, statusCode);
        const error: ApiError = {
          message: errorMessage,
          statusCode,
          raw: responseData,
        };
        throw error;
      }

      return {
        data: responseData as T,
        success: true,
        statusCode,
      };
    } catch (err: unknown) {
      if ((err as ApiError)?.message && (err as ApiError)?.statusCode) {
        throw err as ApiError;
      }

      // Network error or fetch abort
      const networkError: ApiError = {
        message:
          err instanceof Error
            ? err.message
            : 'Unable to connect to ScholarHub server. Please check your network connection.',
        statusCode: 0,
        raw: err,
      };
      throw networkError;
    }
  }

  public async get<T>(endpoint: string, queryParams?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    let finalEndpoint = endpoint;
    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        finalEndpoint += (endpoint.includes('?') ? '&' : '?') + queryString;
      }
    }

    return this.request<T>(finalEndpoint, {
      method: 'GET',
    });
  }

  public async post<T, B = unknown>(endpoint: string, body?: B): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T, B = unknown>(endpoint: string, body?: B): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T, B = unknown>(endpoint: string, body?: B): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  public async upload<T>(endpoint: string, formData: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method,
        body: formData,
      },
      true // isMultipart
    );
  }
}

export const apiClient = new ApiClient();
export default apiClient;
