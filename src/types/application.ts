/**
 * Application & Document Domain Types
 * ScholarHub 7-Stage Official Lifecycle
 */

export type ApplicationStatus =
  | 'SAVED'
  | 'PREPARING_DOCUMENTS'
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'SCHOLARSHIP_RECEIVED';

export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  'SAVED',
  'PREPARING_DOCUMENTS',
  'APPLIED',
  'UNDER_REVIEW',
  'INTERVIEW',
  'SELECTED',
  'SCHOLARSHIP_RECEIVED',
];

export interface StatusMetadata {
  label: string;
  stageIndex: number; // 1 to 7
  shortDescription: string;
  badgeVariant: 'neutral' | 'primary' | 'warning' | 'info' | 'success';
  stageIcon: string;
}

export const APPLICATION_STATUS_DETAILS: Record<ApplicationStatus, StatusMetadata> = {
  SAVED: {
    label: 'Saved',
    stageIndex: 1,
    shortDescription: 'Scholarship bookmarked to application tracker',
    badgeVariant: 'neutral',
    stageIcon: '🔖',
  },
  PREPARING_DOCUMENTS: {
    label: 'Preparing Documents',
    stageIndex: 2,
    shortDescription: 'Gathering transcripts, certificates, and ID proofs',
    badgeVariant: 'warning',
    stageIcon: '📄',
  },
  APPLIED: {
    label: 'Applied',
    stageIndex: 3,
    shortDescription: 'Application dossier submitted to scholarship committee',
    badgeVariant: 'primary',
    stageIcon: '📤',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    stageIndex: 4,
    shortDescription: 'Academic screening and socio-economic verification in progress',
    badgeVariant: 'info',
    stageIcon: '🔍',
  },
  INTERVIEW: {
    label: 'Interview',
    stageIndex: 5,
    shortDescription: 'Candidate shortlisted for panel interview / assessment',
    badgeVariant: 'warning',
    stageIcon: '🎙️',
  },
  SELECTED: {
    label: 'Selected',
    stageIndex: 6,
    shortDescription: 'Final candidate award selection confirmed',
    badgeVariant: 'success',
    stageIcon: '🏆',
  },
  SCHOLARSHIP_RECEIVED: {
    label: 'Scholarship Received',
    stageIndex: 7,
    shortDescription: 'Disbursement executed directly to bank account via DBT',
    badgeVariant: 'success',
    stageIcon: '🎉',
  },
};

/**
 * Helper to get 1-indexed stage index (1..7)
 */
export const getStageIndex = (status: ApplicationStatus): number => {
  const idx = APPLICATION_STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx + 1 : 1;
};

/**
 * Helper to get progress percentage
 */
export const getProgressPercentage = (status: ApplicationStatus): number => {
  const stage = getStageIndex(status);
  return Math.round((stage / 7) * 100);
};

/**
 * Helper to get next sequential status (or null if already completed)
 */
export const getNextStatus = (status: ApplicationStatus): ApplicationStatus | null => {
  const idx = APPLICATION_STATUS_ORDER.indexOf(status);
  if (idx >= 0 && idx < APPLICATION_STATUS_ORDER.length - 1) {
    return APPLICATION_STATUS_ORDER[idx + 1];
  }
  return null;
};

/**
 * Active statuses (Stages 1 through 5)
 */
export const isActiveStatus = (status: ApplicationStatus): boolean => {
  const stage = getStageIndex(status);
  return stage <= 5;
};

/**
 * Completed statuses (Stages 6 and 7: Selected, Scholarship Received)
 */
export const isCompletedStatus = (status: ApplicationStatus): boolean => {
  const stage = getStageIndex(status);
  return stage >= 6;
};

/**
 * Complete Application Item Model
 */
export interface ApplicationItem {
  id: string;
  scholarshipId: string;
  scholarshipTitle: string;
  provider: string;
  awardAmount: string;
  deadline: string;
  status: ApplicationStatus;
  matchScore?: number;
  appliedDate?: string;
  lastUpdatedDate: string;
  requiredDocuments: string[];
  notes?: string;
}

import { DocumentType, DocumentItem } from './document';

// Re-export for convenience
export type { DocumentType, DocumentItem };

