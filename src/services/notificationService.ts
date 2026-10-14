import { apiClient, ApiResponse } from './api';
import { API_ENDPOINTS } from '../constants';
import { BackendNotification } from '../utils/adapters';

export interface NotificationListResponseData {
  items: BackendNotification[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UnreadCountResponseData {
  unread_count: number;
}

export interface MarkAllReadResponseData {
  message: string;
  updated_count: number;
}

export interface NotificationDeleteResponseData {
  message: string;
  id: string;
}

export interface ListNotificationsParams {
  filter?: 'all' | 'unread';
  is_read?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Notification Center Service
 */
export const notificationService = {
  async listNotifications(params?: ListNotificationsParams): Promise<ApiResponse<NotificationListResponseData>> {
    return apiClient.get<NotificationListResponseData>(
      API_ENDPOINTS.NOTIFICATIONS.LIST,
      params as Record<string, string | number | boolean | undefined>
    );
  },

  async getUnreadCount(): Promise<ApiResponse<UnreadCountResponseData>> {
    return apiClient.get<UnreadCountResponseData>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
  },

  async getNotification(id: string): Promise<ApiResponse<BackendNotification>> {
    return apiClient.get<BackendNotification>(API_ENDPOINTS.NOTIFICATIONS.DETAIL(id));
  },

  async markAsRead(id: string): Promise<ApiResponse<BackendNotification>> {
    return apiClient.patch<BackendNotification>(API_ENDPOINTS.NOTIFICATIONS.READ(id));
  },

  async markAllAsRead(): Promise<ApiResponse<MarkAllReadResponseData>> {
    return apiClient.patch<MarkAllReadResponseData>(API_ENDPOINTS.NOTIFICATIONS.READ_ALL);
  },

  async deleteNotification(id: string): Promise<ApiResponse<NotificationDeleteResponseData>> {
    return apiClient.delete<NotificationDeleteResponseData>(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
  },
};

export default notificationService;
