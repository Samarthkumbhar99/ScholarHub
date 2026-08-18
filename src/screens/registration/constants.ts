import { SelectOption } from '../../components/inputs';
import { ReservationCategory, SpecialCategory, StudyPreference } from '../../types';

/**
 * Step 1: Gender Options
 */
export const GENDER_OPTIONS: SelectOption[] = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other / Non-Binary', value: 'Other' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
];

/**
 * Step 2: Country Options
 */
export const COUNTRY_OPTIONS: SelectOption[] = [
  { label: 'India', value: 'India' },
  { label: 'United States', value: 'United States' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'Canada', value: 'Canada' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Germany', value: 'Germany' },
  { label: 'Singapore', value: 'Singapore' },
  { label: 'United Arab Emirates', value: 'United Arab Emirates' },
];

/**
 * Step 2: Indian State Options (Prototype)
 */
export const STATE_OPTIONS: SelectOption[] = [
  { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
  { label: 'Delhi (NCT)', value: 'Delhi' },
  { label: 'Gujarat', value: 'Gujarat' },
  { label: 'Karnataka', value: 'Karnataka' },
  { label: 'Kerala', value: 'Kerala' },
  { label: 'Madhya Pradesh', value: 'Madhya Pradesh' },
  { label: 'Maharashtra', value: 'Maharashtra' },
  { label: 'Punjab', value: 'Punjab' },
  { label: 'Rajasthan', value: 'Rajasthan' },
  { label: 'Tamil Nadu', value: 'Tamil Nadu' },
  { label: 'Telangana', value: 'Telangana' },
  { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
  { label: 'West Bengal', value: 'West Bengal' },
];

/**
 * Step 2: Academic Course Options
 */
export const COURSE_OPTIONS: SelectOption[] = [
  { label: 'B.Tech / B.E. (Bachelor of Technology / Engineering)', value: 'B.Tech' },
  { label: 'B.Sc (Bachelor of Science)', value: 'B.Sc' },
  { label: 'B.Com (Bachelor of Commerce)', value: 'B.Com' },
  { label: 'B.A. (Bachelor of Arts)', value: 'B.A.' },
  { label: 'BBA / BMS (Management Studies)', value: 'BBA' },
  { label: 'MBBS / BDS (Medical Sciences)', value: 'MBBS' },
  { label: 'M.Tech / M.E. (Master of Technology)', value: 'M.Tech' },
  { label: 'M.Sc (Master of Science)', value: 'M.Sc' },
  { label: 'MBA (Master of Business Administration)', value: 'MBA' },
  { label: 'Ph.D. / Doctoral Research', value: 'Ph.D.' },
];

/**
 * Step 2: Academic Branch / Specialization Options
 */
export const BRANCH_OPTIONS: SelectOption[] = [
  { label: 'Computer Science & Engineering', value: 'Computer Science' },
  { label: 'Information Technology', value: 'Information Technology' },
  { label: 'Artificial Intelligence & Data Science', value: 'AI & Data Science' },
  { label: 'Electronics & Communication Engineering', value: 'Electronics & Communication' },
  { label: 'Electrical & Electronics Engineering', value: 'Electrical Engineering' },
  { label: 'Mechanical Engineering', value: 'Mechanical Engineering' },
  { label: 'Civil Engineering', value: 'Civil Engineering' },
  { label: 'Biotechnology & Bioinformatics', value: 'Biotechnology' },
  { label: 'Chemical Engineering', value: 'Chemical Engineering' },
  { label: 'Commerce, Finance & Accounting', value: 'Commerce & Finance' },
  { label: 'Humanities & Social Sciences', value: 'Humanities' },
];

/**
 * Step 2: Current Academic Year
 */
export const CURRENT_YEAR_OPTIONS: SelectOption[] = [
  { label: '1st Year (Freshman / Entry Level)', value: '1st Year' },
  { label: '2nd Year (Sophomore)', value: '2nd Year' },
  { label: '3rd Year (Junior)', value: '3rd Year' },
  { label: '4th Year (Senior)', value: '4th Year' },
  { label: 'Final Year / Post-Graduate Year', value: 'Final Year' },
];

/**
 * Step 3: Reservation Categories
 */
export const RESERVATION_CATEGORIES: { label: string; value: ReservationCategory; description: string }[] = [
  { label: 'General', value: 'General', description: 'Open Merit Category' },
  { label: 'OBC', value: 'OBC', description: 'Other Backward Classes (NCL/CL)' },
  { label: 'SC', value: 'SC', description: 'Scheduled Castes' },
  { label: 'ST', value: 'ST', description: 'Scheduled Tribes' },
  { label: 'EWS', value: 'EWS', description: 'Economically Weaker Section' },
];

/**
 * Step 3: Special Categories
 */
export const SPECIAL_CATEGORIES: { label: string; value: SpecialCategory; icon: string }[] = [
  { label: 'Minority Community', value: 'Minority', icon: '🕊️' },
  { label: 'Person with Disability (PwD)', value: 'Disability', icon: '♿' },
  { label: 'Defence / Armed Forces Dependent', value: 'Defence', icon: '🎖️' },
  { label: 'None of the above', value: 'None', icon: '🚫' },
];

/**
 * Step 3: Study Preferences
 */
export const STUDY_PREFERENCES: { label: string; value: StudyPreference; description: string; icon: string }[] = [
  { label: 'India', value: 'India', description: 'Domestic colleges & institutions', icon: '🇮🇳' },
  { label: 'Abroad', value: 'Abroad', description: 'International study programs', icon: '✈️' },
  { label: 'Both', value: 'Both', description: 'Explore all opportunities', icon: '🌍' },
];
