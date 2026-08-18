/**
 * Registration Types for ScholarHub Student Registration Flow
 */

export type GenderOption = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export type ReservationCategory = 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';

export type SpecialCategory = 'Minority' | 'Disability' | 'Defence' | 'None';

export type StudyPreference = 'India' | 'Abroad' | 'Both';

/**
 * Step 1: Personal & Contact Details
 */
export interface PersonalDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  mobile: string;
}

/**
 * Step 2: Address & Academic Information
 */
export interface AcademicDetails {
  country: string;
  state: string;
  district: string;
  city: string;
  course: string;
  branch: string;
  currentYear: string;
  university: string;
  college: string;
  cgpa: string;
  previousPercentage: string;
}

/**
 * Step 3: Category & Preferences
 */
export interface PreferencesDetails {
  reservationCategory: ReservationCategory | '';
  specialCategories: SpecialCategory[];
  familyIncome: string;
  studyPreference: StudyPreference | '';
}

/**
 * Complete Registration Form State
 */
export interface RegistrationFormState {
  personal: PersonalDetails;
  academic: AcademicDetails;
  preferences: PreferencesDetails;
}

/**
 * Step-by-Step Inline Validation Errors
 */
export interface RegistrationErrors {
  personal: Partial<Record<keyof PersonalDetails, string>>;
  academic: Partial<Record<keyof AcademicDetails, string>>;
  preferences: Partial<Record<keyof PreferencesDetails, string>>;
}

export type RegistrationStep = 1 | 2 | 3;
