import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  NotificationItem,
  NotificationFilterTab,
} from '../../types/notification';
import {
  notificationService,
  ListNotificationsParams,
} from '../../services/notificationService';
import { mapBackendNotificationToFrontend } from '../../utils/adapters';

export interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  filterTab: NotificationFilterTab;
  isLoading: boolean;
  error: string | null;
  total: number;
}

const countUnread = (items: NotificationItem[]): number => {
  return items.filter((n) => !n.isRead).length;
};

// Initial state starts empty until fetched from live FastAPI backend
const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  filterTab: 'all',
  isLoading: false,
  error: null,
  total: 0,
};

// ==============================================================================
// ASYNC THUNKS
// ==============================================================================

export const fetchNotificationsThunk = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: ListNotificationsParams | undefined, { rejectWithValue }) => {
    try {
      const response = await notificationService.listNotifications(params);
      const items = (response.data.items || []).map((n) =>
        mapBackendNotificationToFrontend(n)
      );
      return {
        items,
        total: response.data.total,
        unreadCount: response.data.unread_count,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch notifications');
    }
  }
);

export const fetchUnreadCountThunk = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getUnreadCount();
      return response.data.unread_count;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch unread count');
    }
  }
);

export const markNotificationReadThunk = createAsyncThunk(
  'notifications/markNotificationRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await notificationService.markAsRead(notificationId);
      return notificationId;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllNotificationsReadThunk = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.markAllAsRead();
      return true;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to mark all as read');
    }
  }
);

export const deleteNotificationThunk = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await notificationService.deleteNotification(notificationId);
      return notificationId;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to delete notification');
    }
  }
);

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<NotificationItem[]>) => {
      state.items = action.payload;
      state.unreadCount = countUnread(action.payload);
      state.total = action.payload.length;
      state.isLoading = false;
      state.error = null;
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const notif = state.items.find((item) => item.id === id);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadCount = countUnread(state.items);
      }
    },
    markAllNotificationsRead: (state) => {
      state.items.forEach((item) => {
        item.isRead = true;
      });
      state.unreadCount = 0;
    },
    setNotificationFilterTab: (
      state,
      action: PayloadAction<NotificationFilterTab>
    ) => {
      state.filterTab = action.payload;
    },
    addNotification: (state, action: PayloadAction<NotificationItem>) => {
      state.items.unshift(action.payload);
      state.unreadCount = countUnread(state.items);
      state.total += 1;
    },
    deleteNotification: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.unreadCount = countUnread(state.items);
      state.total = state.items.length;
    },
    resetNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.filterTab = 'all';
      state.total = 0;
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchNotificationsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotificationsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.unreadCount = action.payload.unreadCount;
        state.error = null;
      })
      .addCase(fetchNotificationsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Unread count
    builder.addCase(fetchUnreadCountThunk.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });

    // Mark single read
    builder.addCase(markNotificationReadThunk.fulfilled, (state, action) => {
      const notif = state.items.find((item) => item.id === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });

    // Mark all read
    builder.addCase(markAllNotificationsReadThunk.fulfilled, (state) => {
      state.items.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    });

    // Delete
    builder.addCase(deleteNotificationThunk.fulfilled, (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.unreadCount = countUnread(state.items);
      state.total = Math.max(0, state.total - 1);
    });
  },
});

export const {
  setNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setNotificationFilterTab,
  addNotification,
  deleteNotification,
  resetNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
