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

// Generate relative mock dates
const now = new Date();
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export const initialDefaultNotifications: NotificationItem[] = [
  // 1. Deadline Reminder (Today)
  {
    id: 'notif_deadline_01',
    type: 'DEADLINE_REMINDER',
    title: '⏰ Application Deadline Alert',
    message: 'National STEM Fellowship application window closes in 3 days on Sept 30. Complete your submission to ensure consideration.',
    createdAt: hoursAgo(2),
    isRead: false,
    scholarshipId: 'sch_stem_01',
    applicationId: 'app_stem_01',
    priority: 'high',
  },
  // 2. New Scholarship Alert (Today)
  {
    id: 'notif_match_02',
    type: 'NEW_SCHOLARSHIP',
    title: '🌟 New Matching Scholarship Added',
    message: 'Reliance Foundation Undergraduate Scholarship has been matched to your academic profile with a 94% eligibility score.',
    createdAt: hoursAgo(5),
    isRead: false,
    scholarshipId: 'sch_reliance_02',
    priority: 'normal',
  },
  // 3. Application Confirmation (Yesterday)
  {
    id: 'notif_applied_03',
    type: 'APPLICATION_CONFIRMATION',
    title: '📤 Application Dossier Submitted',
    message: 'Your application for National STEM Fellowship was successfully logged with the State Nodal Department.',
    createdAt: daysAgo(1),
    isRead: false,
    scholarshipId: 'sch_stem_01',
    applicationId: 'app_stem_01',
    priority: 'normal',
  },
  // 4. Missing Document Alert (Yesterday)
  {
    id: 'notif_doc_04',
    type: 'MISSING_DOCUMENT',
    title: '⚠️ Action Required: Missing Income Certificate',
    message: 'Reliance Foundation requires an Income Certificate (Below ₹6.0L) uploaded to your repository before final submission.',
    createdAt: daysAgo(1.5),
    isRead: false,
    scholarshipId: 'sch_reliance_02',
    applicationId: 'app_reliance_02',
    priority: 'high',
  },
  // 5. Result Notification (Earlier)
  {
    id: 'notif_result_05',
    type: 'RESULT',
    title: '🏆 Verification Result: Cleared',
    message: 'Your socio-economic and academic verification for National STEM Fellowship cleared stage 4 review.',
    createdAt: daysAgo(3),
    isRead: true,
    scholarshipId: 'sch_stem_01',
    applicationId: 'app_stem_01',
    priority: 'normal',
  },
  // 6. Interview Schedule Notification (Earlier)
  {
    id: 'notif_interview_06',
    type: 'INTERVIEW',
    title: '🎙️ Panel Interview Scheduled',
    message: 'Oxford Global Scholars Exchange Fellowship has scheduled your virtual panel interview assessment for next week.',
    createdAt: daysAgo(5),
    isRead: true,
    scholarshipId: 'sch_oxford_03',
    applicationId: 'app_oxford_03',
    priority: 'high',
  },
];

export const initialNotifications = initialDefaultNotifications;

const countUnread = (items: NotificationItem[]): number => {
  return items.filter((n) => !n.isRead).length;
};

const initialState: NotificationState = {
  items: initialDefaultNotifications,
  unreadCount: countUnread(initialDefaultNotifications),
  filterTab: 'all',
  isLoading: false,
  error: null,
  total: initialDefaultNotifications.length,
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
      const response = await notificationService.markAllAsRead();
      return response.data.updated_count;
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
      state.items = initialDefaultNotifications;
      state.unreadCount = countUnread(initialDefaultNotifications);
      state.filterTab = 'all';
      state.total = initialDefaultNotifications.length;
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
        state.unreadCount = countUnread(state.items);
      }
    });

    // Mark all read
    builder.addCase(markAllNotificationsReadThunk.fulfilled, (state) => {
      state.items.forEach((item) => {
        item.isRead = true;
      });
      state.unreadCount = 0;
    });

    // Delete
    builder.addCase(deleteNotificationThunk.fulfilled, (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.unreadCount = countUnread(state.items);
      state.total = state.items.length;
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
