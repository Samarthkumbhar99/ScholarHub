import { NavigatorScreenParams, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * Authentication Stack Routes
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/**
 * Student Main Tab / Feature Routes
 */
export type StudentTabParamList = {
  Dashboard: undefined;
  Scholarships: undefined;
  Applications: undefined;
  Documents: undefined;
  Notifications: undefined;
  Profile: undefined;
};

/**
 * Root Stack Routes for the Application
 */
export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Student: NavigatorScreenParams<StudentTabParamList> | undefined;
  ScholarshipDetails: { scholarshipId: string };
  SavedScholarships: undefined;
  CompareScholarships: undefined;
  ApplicationDetails: { applicationId: string };
  EditProfile: { section?: 'personal' | 'academic' | 'category' | 'preferences' } | undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  HelpSupport: undefined;
  StudyAbroad: undefined;
  CountryDetails: { countryId: string };
  UniversityDetails: { universityId: string };
  CourseDetails: { courseId: string };
  Showcase: undefined;
  Foundation: undefined;
};

/**
 * Composite Navigation Prop for Student Tab Screens
 * Allows tab screens to navigate seamlessly to both sister tabs and parent root stack screens.
 */
export type StudentTabScreenNavigationProp<T extends keyof StudentTabParamList> =
  CompositeNavigationProp<
    BottomTabNavigationProp<StudentTabParamList, T>,
    NativeStackNavigationProp<RootStackParamList>
  >;

/**
 * Root Stack Screen Navigation Prop
 */
export type RootStackScreenNavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

