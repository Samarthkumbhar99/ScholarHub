import { Country, University, Course, StudyAbroadSearchResults } from '../types/studyAbroad';
import {
  MOCK_COUNTRIES,
  MOCK_UNIVERSITIES,
  MOCK_COURSES,
} from '../screens/studyAbroad/data/mockStudyAbroad';
import { MOCK_SCHOLARSHIPS } from '../screens/scholarships/data/mockScholarships';
import { ScholarshipItem } from '../screens/scholarships/types';

/**
 * Filter and search across Countries, Universities, and Courses
 */
export const searchStudyAbroad = (
  query: string,
  countries: Country[] = MOCK_COUNTRIES,
  universities: University[] = MOCK_UNIVERSITIES,
  courses: Course[] = MOCK_COURSES
): StudyAbroadSearchResults => {
  const q = query.trim().toLowerCase();

  if (!q) {
    return {
      countries,
      universities,
      courses,
      totalCount: countries.length + universities.length + courses.length,
    };
  }

  // 1. Match Countries
  const matchedCountries = countries.filter((c) => {
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.popularCourses.some((course) => course.toLowerCase().includes(q))
    );
  });

  // 2. Match Universities
  const matchedUniversities = universities.filter((u) => {
    return (
      u.name.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q) ||
      u.countryName.toLowerCase().includes(q) ||
      u.description.toLowerCase().includes(q) ||
      u.popularCourses.some((course) => course.toLowerCase().includes(q))
    );
  });

  // 3. Match Courses
  const matchedCourses = courses.filter((crs) => {
    return (
      crs.name.toLowerCase().includes(q) ||
      crs.universityName.toLowerCase().includes(q) ||
      crs.countryName.toLowerCase().includes(q) ||
      crs.degreeLevel.toLowerCase().includes(q) ||
      crs.description.toLowerCase().includes(q) ||
      crs.fieldsOfStudy.some((field) => field.toLowerCase().includes(q))
    );
  });

  const totalCount = matchedCountries.length + matchedUniversities.length + matchedCourses.length;

  return {
    countries: matchedCountries,
    universities: matchedUniversities,
    courses: matchedCourses,
    totalCount,
  };
};

/**
 * Get Country by ID
 */
export const getCountryById = (
  countryId: string,
  countries: Country[] = MOCK_COUNTRIES
): Country | undefined => {
  return countries.find((c) => c.id.toLowerCase() === countryId.toLowerCase());
};

/**
 * Get Universities for a given Country ID
 */
export const getUniversitiesByCountry = (
  countryId: string,
  universities: University[] = MOCK_UNIVERSITIES
): University[] => {
  return universities.filter((u) => u.countryId.toLowerCase() === countryId.toLowerCase());
};

/**
 * Get University by ID
 */
export const getUniversityById = (
  universityId: string,
  universities: University[] = MOCK_UNIVERSITIES
): University | undefined => {
  return universities.find((u) => u.id.toLowerCase() === universityId.toLowerCase());
};

/**
 * Get Courses for a given University ID
 */
export const getCoursesByUniversity = (
  universityId: string,
  courses: Course[] = MOCK_COURSES
): Course[] => {
  return courses.filter((c) => c.universityId.toLowerCase() === universityId.toLowerCase());
};

/**
 * Get Course by ID
 */
export const getCourseById = (
  courseId: string,
  courses: Course[] = MOCK_COURSES
): Course | undefined => {
  return courses.find((c) => c.id.toLowerCase() === courseId.toLowerCase());
};

/**
 * Get linked Scholarship objects for a given University
 */
export const getScholarshipsForUniversity = (
  university: University,
  scholarships: ScholarshipItem[] = MOCK_SCHOLARSHIPS
): ScholarshipItem[] => {
  if (!university.scholarshipIds || university.scholarshipIds.length === 0) {
    return [];
  }
  return university.scholarshipIds
    .map((schId) => scholarships.find((s) => s.id === schId))
    .filter((s): s is ScholarshipItem => Boolean(s));
};
