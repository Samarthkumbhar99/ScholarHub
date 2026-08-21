/**
 * Notification Domain Types & Constants
 * ScholarHub Student Notification Center Architecture
 */

/**
 * 6 Official ScholarHub Notification Types
 */
export type NotificationType =
  | 'DEADLINE_REMINDER'
  | 'NEW_SCHOLARSHIP'
  | 'APPLICATION_CONFIRMATION'
  | 'MISSING_DOCUMENT'
  | 'RESULT'
  | 'INTERVIEW';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'DEADLINE_REMINDER',
  'NEW_SCHOLARSHIP',
  'APPLICATION_CONFIRMATION',
  'MISSING_DOCUMENT',
  'RESULT',
  'INTERVIEW',
];

/**
 * Filter tabs supported by Notification Center
 */
export type NotificationFilterTab = 'all' | 'unread';

/**
 * Strongly Typed Notification Item
 */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO date format (e.g. 2026-08-21T10:30:00.000Z)
  isRead: boolean;
  scholarshipId?: string;
  applicationId?: string;
  actionUrl?: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Notification Type Metadata for UI Styling & Badges
 */
export interface NotificationTypeMetadata {
  type: NotificationType;
  icon: string;
  categoryLabel: string;
  badgeVariant: 'warning' | 'primary' | 'info' | 'success' | 'neutral';
  actionPrompt: string;
}

export const NOTIFICATION_TYPE_METADATA: Record<
  NotificationType,
  NotificationTypeMetadata
> = {
  DEADLINE_REMINDER: {
    type: 'DEADLINE_REMINDER',
    icon: '⏰',
    categoryLabel: 'Deadline',
    badgeVariant: 'warning',
    actionPrompt: 'View Scholarship ➔',
  },
  NEW_SCHOLARSHIP: {
    type: 'NEW_SCHOLARSHIP',
    icon: '🌟',
    categoryLabel: 'New Match',
    badgeVariant: 'primary',
    actionPrompt: 'Explore Grant ➔',
  },
  APPLICATION_CONFIRMATION: {
    type: 'APPLICATION_CONFIRMATION',
    icon: '📤',
    categoryLabel: 'Submitted',
    badgeVariant: 'info',
    actionPrompt: 'View Tracker ➔',
  },
  MISSING_DOCUMENT: {
    type: 'MISSING_DOCUMENT',
    icon: '⚠️',
    categoryLabel: 'Action Required',
    badgeVariant: 'warning',
    actionPrompt: 'Review Requirements ➔',
  },
  RESULT: {
    type: 'RESULT',
    icon: '🏆',
    categoryLabel: 'Result',
    badgeVariant: 'success',
    actionPrompt: 'View Status ➔',
  },
  INTERVIEW: {
    type: 'INTERVIEW',
    icon: '🎙️',
    categoryLabel: 'Interview',
    badgeVariant: 'primary',
    actionPrompt: 'Open Tracker ➔',
  },
};
