/**
 * Study Abroad Domain Models & Search Interfaces
 * ScholarHub International University & Scholarship Programs
 */

export type DegreeLevel = 'Bachelor' | 'Master' | 'Doctorate' | 'Diploma';

export interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
  description: string;
  popularCourses: string[];
  universityCount: number;
  tuitionSummary: string;
  livingCostSummary: string;
  scholarshipCount: number;
  visaSummary: string;
  postStudyWorkVisa: string;
  intakes: string[];
  languageRequirements: string;
}

export interface University {
  id: string;
  name: string;
  countryId: string;
  countryName: string;
  city: string;
  ranking: string;
  logoEmoji: string;
  description: string;
  tuition: string;
  livingCost: string;
  popularCourses: string[];
  courseIds: string[];
  scholarshipIds: string[];
  applicationRequirements: string[];
  officialWebsite?: string;
  acceptanceRate?: string;
  internationalStudentsPercentage?: string;
}

export interface Course {
  id: string;
  name: string;
  universityId: string;
  universityName: string;
  countryName: string;
  degreeLevel: DegreeLevel;
  duration: string;
  tuition: string;
  description: string;
  applicationRequirements: string[];
  fieldsOfStudy: string[];
  intakeSeason?: string;
  languageRequirement?: string;
}

export interface StudyAbroadSearchResults {
  countries: Country[];
  universities: University[];
  courses: Course[];
  totalCount: number;
}
