/**
 * Notification Utilities & Date Grouping Helpers
 * ScholarHub Student Notification Center
 */

import { NotificationItem } from '../types/notification';
import { formatDate } from './formatters';

/**
 * Format an ISO date string into a friendly relative or calendar timestamp
 * e.g. 'Just now', '10 min ago', '2 hours ago', 'Yesterday', '3 days ago', 'Aug 15, 2026'
 */
export const formatRelativeTime = (isoDateString: string): string => {
  if (!isoDateString) return '';

  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return isoDateString;

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  }
  if (diffInMinutes === 1) {
    return '1 min ago';
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes} mins ago`;
  }
  if (diffInHours === 1) {
    return '1 hour ago';
  }
  if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  }
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  return formatDate(isoDateString);
};

export interface NotificationDateGroup {
  title: 'Today' | 'Yesterday' | 'Earlier';
  data: NotificationItem[];
}

/**
 * Group a list of notifications into calendar buckets: Today, Yesterday, Earlier
 */
export const groupNotificationsByDate = (
  notifications: NotificationItem[]
): NotificationDateGroup[] => {
  const todayItems: NotificationItem[] = [];
  const yesterdayItems: NotificationItem[] = [];
  const earlierItems: NotificationItem[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  notifications.forEach((item) => {
    const itemDate = new Date(item.createdAt).getTime();

    if (isNaN(itemDate)) {
      earlierItems.push(item);
    } else if (itemDate >= todayStart) {
      todayItems.push(item);
    } else if (itemDate >= yesterdayStart) {
      yesterdayItems.push(item);
    } else {
      earlierItems.push(item);
    }
  });

  const groups: NotificationDateGroup[] = [];

  if (todayItems.length > 0) {
    groups.push({ title: 'Today', data: todayItems });
  }
  if (yesterdayItems.length > 0) {
    groups.push({ title: 'Yesterday', data: yesterdayItems });
  }
  if (earlierItems.length > 0) {
    groups.push({ title: 'Earlier', data: earlierItems });
  }

  return groups;
};
