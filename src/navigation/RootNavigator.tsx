import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { SplashScreen } from '../screens/splash';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { ShowcaseScreen } from '../screens/ShowcaseScreen';
import { FoundationScreen } from '../screens/FoundationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * RootNavigator
 * Top-level application navigator routing between Splash, Auth, and Student stacks
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

      {/* Dev / Design System Showcase Screens */}
      <Stack.Screen name="Showcase" component={ShowcaseScreen} />
      <Stack.Screen name="Foundation" component={FoundationScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
