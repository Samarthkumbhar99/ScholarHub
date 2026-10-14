import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { colors } from '../../theme';
import { APP_CONFIG } from '../../constants';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { restoreSessionThunk } from '../../store/slices/authSlice';

type SplashNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

/**
 * ScholarHubLogo
 * Branding logo for splash presentation.
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
 * Application bootstrap entry verifying authenticated session before routing
 */
export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNavigationProp>();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    let isMounted = true;

    const bootstrapApp = async () => {
      // Minimum splash visual delay for smooth transition
      const timerPromise = new Promise((resolve) => setTimeout(resolve, 1500));

      let restoredUser = user;
      // Attempt to restore authenticated session
      try {
        const res = await dispatch(restoreSessionThunk()).unwrap();
        restoredUser = res.user;
      } catch {
        // No active or valid session
      }

      await timerPromise;

      if (isMounted) {
        if (restoredUser || isAuthenticated) {
          const role = (restoredUser?.role || user?.role || 'student').toLowerCase();
          if (role === 'admin') {
            navigation.replace('AdminDashboard');
          } else if (role === 'provider') {
            navigation.replace('ProviderDashboard');
          } else {
            navigation.replace('Student');
          }
        } else {
          navigation.replace('Auth');
        }
      }
    };

    bootstrapApp();

    return () => {
      isMounted = false;
    };
  }, [navigation, dispatch, isAuthenticated]);

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
