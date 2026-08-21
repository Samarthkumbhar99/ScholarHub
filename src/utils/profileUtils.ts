/**
 * Profile Utilities, Validation & Completion Evaluation Engine
 * ScholarHub Student Profile Module
 */

import { UserProfile } from '../types/user';
import {
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
} from '../types/registration';

export interface SectionCompletionSummary {
  completed: boolean;
  completedCount: number;
  totalCount: number;
  title: string;
}

export interface ProfileCompletionResult {
  percentage: number;
  isComplete: boolean;
  completedCount: number;
  totalCount: number;
  sections: {
    personal: SectionCompletionSummary;
    academic: SectionCompletionSummary;
    category: SectionCompletionSummary;
    preferences: SectionCompletionSummary;
  };
}

/**
 * Format annual income into a clean Indian currency representation
 */
export const formatIncomeAmount = (income?: string | number): string => {
  if (!income) return 'Not Specified';
  const cleanStr = String(income).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanStr);
  if (isNaN(num)) return String(income);

  if (num >= 100000) {
    const inLakhs = num / 100000;
    return `₹ ${inLakhs.toFixed(inLakhs % 1 === 0 ? 0 : 2)} Lakhs / year`;
  }
  return `₹ ${num.toLocaleString('en-IN')} / year`;
};

/**
 * Calculate deterministic profile completion percentage across all 21 required registration fields
 */
export const calculateProfileCompletion = (
  profile?: UserProfile | null
): ProfileCompletionResult => {
  if (!profile) {
    return {
      percentage: 0,
      isComplete: false,
      completedCount: 0,
      totalCount: 21,
      sections: {
        personal: { completed: false, completedCount: 0, totalCount: 6, title: 'Personal Information' },
        academic: { completed: false, completedCount: 0, totalCount: 11, title: 'Academic & Location' },
        category: { completed: false, completedCount: 0, totalCount: 3, title: 'Category & Financial' },
        preferences: { completed: false, completedCount: 0, totalCount: 1, title: 'Preferences' },
      },
    };
  }

  const p = profile.personal || ({} as PersonalDetails);
  const a = profile.academic || ({} as AcademicDetails);
  const pr = profile.preferences || ({} as PreferencesDetails);

  // 1. Personal Fields (6 fields)
  let personalCount = 0;
  if (p.firstName?.trim()) personalCount++;
  if (p.lastName?.trim()) personalCount++;
  if (p.dateOfBirth?.trim()) personalCount++;
  if (p.gender?.trim()) personalCount++;
  if (p.email?.trim()) personalCount++;
  if (p.mobile?.trim()) personalCount++;

  // 2. Academic Fields (11 fields)
  let academicCount = 0;
  if (a.country?.trim()) academicCount++;
  if (a.state?.trim()) academicCount++;
  if (a.district?.trim()) academicCount++;
  if (a.city?.trim()) academicCount++;
  if (a.course?.trim()) academicCount++;
  if (a.branch?.trim()) academicCount++;
  if (a.currentYear?.trim()) academicCount++;
  if (a.university?.trim()) academicCount++;
  if (a.college?.trim()) academicCount++;
  if (a.cgpa?.trim() && !isNaN(parseFloat(a.cgpa))) academicCount++;
  if (a.previousPercentage?.trim() && !isNaN(parseFloat(a.previousPercentage))) academicCount++;

  // 3. Category & Financial Fields (3 fields)
  let categoryCount = 0;
  if (pr.reservationCategory) categoryCount++;
  if (pr.specialCategories && pr.specialCategories.length > 0) categoryCount++;
  if (pr.familyIncome?.trim()) categoryCount++;

  // 4. Preferences Fields (1 field)
  let preferencesCount = 0;
  if (pr.studyPreference) preferencesCount++;

  const totalRequired = 6 + 11 + 3 + 1; // 21 fields
  const totalCompleted = personalCount + academicCount + categoryCount + preferencesCount;
  const percentage = Math.round((totalCompleted / totalRequired) * 100);

  return {
    percentage,
    isComplete: percentage === 100,
    completedCount: totalCompleted,
    totalCount: totalRequired,
    sections: {
      personal: {
        completed: personalCount === 6,
        completedCount: personalCount,
        totalCount: 6,
        title: 'Personal Information',
      },
      academic: {
        completed: academicCount === 11,
        completedCount: academicCount,
        totalCount: 11,
        title: 'Academic & Location',
      },
      category: {
        completed: categoryCount === 3,
        completedCount: categoryCount,
        totalCount: 3,
        title: 'Category & Financial',
      },
      preferences: {
        completed: preferencesCount === 1,
        completedCount: preferencesCount,
        totalCount: 1,
        title: 'Study Preferences',
      },
    },
  };
};

/**
 * Validate Personal Details fields
 */
export const validatePersonalDetails = (
  personal: PersonalDetails
): Partial<Record<keyof PersonalDetails, string>> => {
  const errors: Partial<Record<keyof PersonalDetails, string>> = {};

  if (!personal.firstName?.trim()) {
    errors.firstName = 'First name is required';
  }
  if (!personal.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  }
  if (!personal.dateOfBirth?.trim()) {
    errors.dateOfBirth = 'Date of birth is required';
  }
  if (!personal.gender) {
    errors.gender = 'Please select your gender';
  }
  if (!personal.email?.trim()) {
    errors.email = 'Email address is required';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personal.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
  }
  if (!personal.mobile?.trim()) {
    errors.mobile = 'Mobile number is required';
  } else {
    const cleaned = personal.mobile.replace(/[\s\-\+]/g, '');
    if (cleaned.length < 10 || !/^\d+$/.test(cleaned)) {
      errors.mobile = 'Please enter a valid 10-digit mobile number';
    }
  }

  return errors;
};

/**
 * Validate Academic & Address Details fields
 */
export const validateAcademicDetails = (
  academic: AcademicDetails
): Partial<Record<keyof AcademicDetails, string>> => {
  const errors: Partial<Record<keyof AcademicDetails, string>> = {};

  if (!academic.country?.trim()) errors.country = 'Country is required';
  if (!academic.state?.trim()) errors.state = 'State is required';
  if (!academic.district?.trim()) errors.district = 'District is required';
  if (!academic.city?.trim()) errors.city = 'City / Town is required';
  if (!academic.course) errors.course = 'Course / Degree is required';
  if (!academic.branch) errors.branch = 'Branch / Specialization is required';
  if (!academic.currentYear) errors.currentYear = 'Current academic year is required';
  if (!academic.university?.trim()) errors.university = 'University / Board name is required';
  if (!academic.college?.trim()) errors.college = 'College / Institute name is required';

  if (!academic.cgpa?.trim()) {
    errors.cgpa = 'CGPA is required';
  } else {
    const numCgpa = parseFloat(academic.cgpa);
    if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
      errors.cgpa = 'Enter valid CGPA between 0.00 and 10.00';
    }
  }

  if (!academic.previousPercentage?.trim()) {
    errors.previousPercentage = 'Previous percentage is required';
  } else {
    const numPct = parseFloat(academic.previousPercentage);
    if (isNaN(numPct) || numPct < 0 || numPct > 100) {
      errors.previousPercentage = 'Enter valid percentage between 0 and 100%';
    }
  }

  return errors;
};

/**
 * Validate Category & Preferences fields
 */
export const validatePreferencesDetails = (
  preferences: PreferencesDetails
): Partial<Record<keyof PreferencesDetails, string>> => {
  const errors: Partial<Record<keyof PreferencesDetails, string>> = {};

  if (!preferences.reservationCategory) {
    errors.reservationCategory = 'Reservation category is required';
  }
  if (!preferences.specialCategories || preferences.specialCategories.length === 0) {
    errors.specialCategories = "Please select at least one option or 'None'";
  }
  if (!preferences.familyIncome?.trim()) {
    errors.familyIncome = 'Annual family income is required';
  } else {
    const numIncome = parseFloat(preferences.familyIncome.replace(/,/g, ''));
    if (isNaN(numIncome) || numIncome < 0) {
      errors.familyIncome = 'Please enter a valid numeric income amount';
    }
  }
  if (!preferences.studyPreference) {
    errors.studyPreference = 'Please select your study preference';
  }

  return errors;
};
