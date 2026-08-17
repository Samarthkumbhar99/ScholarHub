/**
 * Scholarship Domain Types
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

export type FundingType = 'full_ride' | 'partial' | 'tuition_only' | 'one_time_grant';

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  description: string;
  amount: number;
  currency: string;
  deadline: string;
  category: ScholarshipCategory;
  fundingType: FundingType;
  eligibleCountries: string[];
  minimumGpa?: number;
  matchScore?: number;
  featured?: boolean;
}

export interface ScholarshipFilter {
  category?: ScholarshipCategory;
  fundingType?: FundingType;
  minAmount?: number;
  maxAmount?: number;
  country?: string;
  searchQuery?: string;
}
