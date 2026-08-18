import { DashboardData } from '../types';

/**
 * Mock Dashboard Data
 * Centralized, typed mock dataset ready to be swapped with FastAPI endpoints
 */
export const MOCK_DASHBOARD_DATA: DashboardData = {
  stats: {
    eligible: 24,
    saved: 4,
    applied: 2,
    closingSoon: 3,
    resultsDeclared: 1,
    recommended: 8,
  },
  matchSummary: {
    matchScore: 94,
    eligibleCount: 24,
    headline: '94% Match',
    subtext: 'You are eligible for 24 high-value scholarship programs matching your GPA and academic profile.',
    matchedMajor: 'Computer Science & Engineering',
  },
  urgentDeadline: {
    id: 'sch_stem_urgent',
    title: 'National STEM Fellowship',
    provider: 'Department of Science & Higher Education',
    awardValue: '₹12,000 / year',
    deadlineDate: 'Sept 30, 2026',
    daysLeft: 3,
    tag: 'STEM Merit Grant',
  },
  quickAccessItems: [
    // Discover
    {
      id: 'qa_scholarships',
      title: 'Scholarship Directory',
      subtitle: 'Filter government, merit & international grants',
      icon: '🔍',
      badge: '24 New',
      targetTab: 'Scholarships',
      category: 'discover',
    },
    // Manage
    {
      id: 'qa_applications',
      title: 'Application Tracker',
      subtitle: 'Track active submissions and review stages',
      icon: '📝',
      badge: '2 Active',
      targetTab: 'Applications',
      category: 'manage',
    },
    {
      id: 'qa_documents',
      title: 'Document Repository',
      subtitle: 'Transcripts, identity proofs & certificates',
      icon: '📁',
      targetTab: 'Documents',
      category: 'manage',
    },
    // Support & Settings
    {
      id: 'qa_notifications',
      title: 'Notification Center',
      subtitle: 'Deadlines, status alerts & updates',
      icon: '🔔',
      badge: '2 Unread',
      targetTab: 'Notifications',
      category: 'support',
    },
    {
      id: 'qa_profile',
      title: 'Profile & Academic Settings',
      subtitle: 'Manage credentials, scores & preferences',
      icon: '👤',
      targetTab: 'Profile',
      category: 'support',
    },
  ],
};
