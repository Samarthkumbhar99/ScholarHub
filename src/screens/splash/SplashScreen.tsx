import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { colors } from '../../theme';
import { APP_CONFIG } from '../../constants';

type SplashNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

/**
 * ScholarHubLogo
 * Modular placeholder for ScholarHub branding logo.
 * Easily swappable with an <Image source={require('...')} /> when official asset is ready.
 */
const ScholarHubLogo: React.FC = () => {
  return (
    <View className="h-24 w-24 rounded-3xl bg-primary-600 items-center justify-center mb-5 shadow-lg shadow-blue-500/30 border border-blue-400/20">
      <Text className="text-white text-5xl">🎓</Text>
    </View>
  );
};

/**
 * SplashScreen
 * Application entry screen with 2.5s delay before routing to Login
 */
export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNavigationProp>();

  useEffect(() => {
    // 2.5 second delay before navigating to the Login screen
    const timer = setTimeout(() => {
      navigation.replace('Auth');
    }, 2500);

    // Clean up timer on unmount to prevent memory leaks
    return () => {
      clearTimeout(timer);
    };
  }, [navigation]);

  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      {/* Centered Brand Content */}
      <View className="items-center">
        {/* ScholarHub Logo Component */}
        <ScholarHubLogo />

        {/* Application Name */}
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight text-center">
          {APP_CONFIG.APP_NAME}
        </Text>

        {/* Official Tagline */}
        <Text className="text-xs font-semibold text-primary-700 mt-2 text-center tracking-wide px-4">
          {APP_CONFIG.TAGLINE}
        </Text>

        {/* Subtle Loading Indicator */}
        <View className="mt-8 flex-row items-center justify-center">
          <ActivityIndicator size="small" color={colors.primary[600]} />
        </View>
      </View>
    </View>
  );
};

export default SplashScreen;
