/**
 * Scholarship Domain Types
 * Canonical Model for ScholarHub Scholarships System
 */
export type ScholarshipCategory =
  | 'merit'
  | 'need_based'
  | 'study_abroad'
  | 'stem'
  | 'arts'
  | 'athletic'
  | 'minority'
  | 'general';

export type FundingType =
  | 'full_ride'
  | 'partial'
  | 'tuition_only'
  | 'one_time_grant'
  | 'fully_funded'
  | 'partially_funded';

export type ScholarshipType = 'all' | 'government' | 'private' | 'international';

export type ScholarshipStatus = 'all' | 'open' | 'closing_soon' | 'closed';

export interface Scholarship {
  id: string;
  title: string;
  name?: string; // Canonical alias for title
  provider: string;
  description: string;
  awardAmount: string;
  numericAmount: number;
  amount?: number; // Canonical alias for numericAmount
  currency?: string;
  deadline: string;
  daysLeft: number;
  type: 'government' | 'private' | 'international';
  category?: ScholarshipCategory;
  fundingType: 'fully_funded' | 'partially_funded';
  fieldsOfStudy: string[];
  eligibleCourses?: string[];
  eligibleCategories?: string[];
  eligibleStates?: string[];
  eligibleCountries?: string[];
  minimumCGPA?: number;
  minimumGpa?: number; // Canonical alias for minimumCGPA
  maximumFamilyIncome?: number; // in INR
  status: 'open' | 'closing_soon' | 'closed';
  matchScore: number;
  tags: string[];
  featured?: boolean;
  benefits?: string[];
  requiredDocuments?: string[];
  selectionProcess?: string[];
  officialWebsite?: string;
}

export type ScholarshipItem = Scholarship;

export interface ScholarshipFilter {
  category?: ScholarshipCategory;
  fundingType?: FundingType;
  minAmount?: number;
  maxAmount?: number;
  country?: string;
  searchQuery?: string;
}

