import { NavigatorScreenParams } from '@react-navigation/native';

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
  Showcase: undefined;
  Foundation: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
