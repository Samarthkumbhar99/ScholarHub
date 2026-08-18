import { ScholarshipItem, ScholarshipFilterState } from '../types';

export const initialFilterState: ScholarshipFilterState = {
  searchQuery: '',
  type: 'all',
  status: 'all',
  funding: 'all',
  fieldOfStudy: 'all',
  minCGPA: undefined,
  maxFamilyIncome: undefined,
  sortBy: 'best_match',
};

/**
 * Filter and sort scholarship items based on user criteria
 */
export const filterScholarships = (
  items: ScholarshipItem[],
  filter: ScholarshipFilterState
): ScholarshipItem[] => {
  return items
    .filter((item) => {
      // 1. Search Query Filter (Matches title, provider, field of study, or tags)
      if (filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesProvider = item.provider.toLowerCase().includes(query);
        const matchesField = item.fieldsOfStudy.some((f) =>
          f.toLowerCase().includes(query)
        );
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));

        if (!matchesTitle && !matchesProvider && !matchesField && !matchesTags) {
          return false;
        }
      }

      // 2. Scholarship Type Filter (Government / Private / International)
      if (filter.type !== 'all' && item.type !== filter.type) {
        return false;
      }

      // 3. Status Filter (Open / Closing Soon)
      if (filter.status !== 'all') {
        if (filter.status === 'closing_soon') {
          if (item.daysLeft > 7 && item.status !== 'closing_soon') {
            return false;
          }
        } else if (filter.status === 'open') {
          if (item.status === 'closed') {
            return false;
          }
        }
      }

      // 4. Funding Type Filter (Fully Funded / Partially Funded)
      if (filter.funding !== 'all' && item.fundingType !== filter.funding) {
        return false;
      }

      // 5. Field of Study Filter
      if (filter.fieldOfStudy !== 'all') {
        if (!item.fieldsOfStudy.includes(filter.fieldOfStudy)) {
          return false;
        }
      }

      // 6. Minimum CGPA Requirement Filter
      if (filter.minCGPA !== undefined && item.minimumCGPA !== undefined) {
        // If student filters for a CGPA e.g. 7.5, scholarships requiring higher (e.g. 8.5) shouldn't match
        if (item.minimumCGPA > filter.minCGPA) {
          return false;
        }
      }

      // 7. Maximum Family Income Filter
      if (filter.maxFamilyIncome !== undefined && item.maximumFamilyIncome !== undefined) {
        // If scholarship has maximum income ceiling below student's income
        if (item.maximumFamilyIncome < filter.maxFamilyIncome) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // 8. Sorting logic
      switch (filter.sortBy) {
        case 'deadline_soon':
          return a.daysLeft - b.daysLeft;
        case 'highest_award':
          return b.numericAmount - a.numericAmount;
        case 'best_match':
        default:
          return b.matchScore - a.matchScore;
      }
    });
};

/**
 * Counts how many active non-default filters are set
 */
export const countActiveFilters = (filter: ScholarshipFilterState): number => {
  let count = 0;
  if (filter.type !== 'all') count++;
  if (filter.status !== 'all') count++;
  if (filter.funding !== 'all') count++;
  if (filter.fieldOfStudy !== 'all') count++;
  if (filter.minCGPA !== undefined) count++;
  if (filter.maxFamilyIncome !== undefined) count++;
  return count;
};
