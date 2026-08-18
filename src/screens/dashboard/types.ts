import { StudentTabParamList } from '../../types/navigation';

/**
 * Dashboard Summary Statistics
 * Represents the 6 key metrics defined by ScholarHub
 */
export interface DashboardStats {
  eligible: number;
  saved: number;
  applied: number;
  closingSoon: number;
  resultsDeclared: number;
  recommended: number;
}

/**
 * Profile Match Score & Eligibility Summary
 */
export interface ProfileMatchSummary {
  matchScore: number;
  eligibleCount: number;
  headline: string;
  subtext: string;
  matchedMajor: string;
}

/**
 * Urgent Closing-Soon Scholarship Item
 */
export interface UrgentDeadlineItem {
  id: string;
  title: string;
  provider: string;
  awardValue: string;
  deadlineDate: string;
  daysLeft: number;
  tag: string;
}

/**
 * Quick Access Hub Item
 */
export interface QuickAccessItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  targetTab: keyof StudentTabParamList;
  category: 'discover' | 'manage' | 'support';
}

/**
 * Complete Dashboard Data Model (ready for FastAPI integration)
 */
export interface DashboardData {
  stats: DashboardStats;
  matchSummary: ProfileMatchSummary;
  urgentDeadline: UrgentDeadlineItem;
  quickAccessItems: QuickAccessItem[];
}
