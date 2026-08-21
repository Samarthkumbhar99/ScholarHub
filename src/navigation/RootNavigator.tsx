import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { SplashScreen } from '../screens/splash';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import {
  ScholarshipDetailsScreen,
  SavedScholarshipsScreen,
  CompareScholarshipsScreen,
} from '../screens/scholarships';
import { ApplicationDetailsScreen } from '../screens/applications';
import {
  EditProfileScreen,
  SettingsScreen,
  PrivacyPolicyScreen,
  TermsOfServiceScreen,
  HelpSupportScreen,
} from '../screens/profile';
import {
  StudyAbroadScreen,
  CountryDetailsScreen,
  UniversityDetailsScreen,
  CourseDetailsScreen,
} from '../screens/studyAbroad';
import { ShowcaseScreen } from '../screens/ShowcaseScreen';
import { FoundationScreen } from '../screens/FoundationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * RootNavigator
 * Top-level application navigator routing between Splash, Auth, Student stacks, and Modal screens
 */
export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {/* Splash Screen */}
      <Stack.Screen name="Splash" component={SplashScreen} />

      {/* Auth Stack (Login, Register) */}
      <Stack.Screen
        name="Auth"
        component={AuthNavigator}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Student Feature Tabs (Dashboard, Scholarships, Applications, Documents, Notifications, Profile) */}
      <Stack.Screen
        name="Student"
        component={StudentNavigator}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Full-Screen Scholarship Details View */}
      <Stack.Screen
        name="ScholarshipDetails"
        component={ScholarshipDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Saved Scholarships View */}
      <Stack.Screen
        name="SavedScholarships"
        component={SavedScholarshipsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Compare Scholarships Matrix View */}
      <Stack.Screen
        name="CompareScholarships"
        component={CompareScholarshipsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Application Details / 7-Stage Tracker View */}
      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Edit Profile View */}
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Settings View */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Privacy Policy View */}
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Terms of Service View */}
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Help & Support View */}
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Study Abroad Landing Screen */}
      <Stack.Screen
        name="StudyAbroad"
        component={StudyAbroadScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Study Abroad Country Details */}
      <Stack.Screen
        name="CountryDetails"
        component={CountryDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Study Abroad University Details */}
      <Stack.Screen
        name="UniversityDetails"
        component={UniversityDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Study Abroad Course Details */}
      <Stack.Screen
        name="CourseDetails"
        component={CourseDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      {/* Dev / Design System Showcase Screens */}
      <Stack.Screen name="Showcase" component={ShowcaseScreen} />
      <Stack.Screen name="Foundation" component={FoundationScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
