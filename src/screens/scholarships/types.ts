/**
 * Scholarship Discovery & Filter Domain Types
 */
import {
  Scholarship,
  ScholarshipItem,
  ScholarshipType,
  ScholarshipStatus,
} from '../../types/scholarship';

export type { Scholarship, ScholarshipItem, ScholarshipType, ScholarshipStatus };

export type FundingFilterType = 'all' | 'fully_funded' | 'partially_funded';

export type FieldOfStudy =
  | 'all'
  | 'Computer Science'
  | 'Engineering'
  | 'Medicine'
  | 'Business'
  | 'Arts'
  | 'Science';

export type SortOption = 'best_match' | 'deadline_soon' | 'highest_award';

/**
 * Filter Criteria State
 */
export interface ScholarshipFilterState {
  searchQuery: string;
  type: ScholarshipType;
  status: ScholarshipStatus;
  funding: FundingFilterType;
  fieldOfStudy: FieldOfStudy;
  minCGPA?: number;
  maxFamilyIncome?: number; // in INR
  sortBy: SortOption;
}

