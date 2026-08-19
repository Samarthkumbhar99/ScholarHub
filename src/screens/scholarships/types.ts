/**
 * Scholarship Discovery & Filter Domain Types
 */

export type ScholarshipType = 'all' | 'government' | 'private' | 'international';

export type ScholarshipStatus = 'all' | 'open' | 'closing_soon';

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
 * Complete Scholarship Item Model
 */
export interface ScholarshipItem {
  id: string;
  title: string;
  provider: string;
  description: string;
  awardAmount: string;
  numericAmount: number;
  deadline: string;
  daysLeft: number;
  type: 'government' | 'private' | 'international';
  fundingType: 'fully_funded' | 'partially_funded';
  fieldsOfStudy: string[];
  eligibleCourses: string[];
  eligibleCategories: string[];
  minimumCGPA?: number;
  maximumFamilyIncome?: number; // in INR
  status: 'open' | 'closing_soon' | 'closed';
  matchScore: number;
  tags: string[];
  officialWebsite?: string;
  featured?: boolean;
  benefits?: string[];
  requiredDocuments?: string[];
  selectionProcess?: string[];
  eligibleStates?: string[];
  eligibleCountries?: string[];
}

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
