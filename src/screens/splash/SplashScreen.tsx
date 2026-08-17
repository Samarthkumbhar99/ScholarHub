import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppSelector } from '../../hooks';
import { PrimaryButton } from '../../components/buttons';
import { colors } from '../../theme';
import { APP_CONFIG } from '../../constants';

type SplashNavProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNavProp>();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigation.replace('Student');
      } else {
        navigation.replace('Auth');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigation]);

  return (
    <View className="flex-1 bg-slate-900 items-center justify-between p-6 py-16">
      <View />

      {/* Center Branding */}
      <View className="items-center">
        {/* Animated Brand Emblem */}
        <View className="h-24 w-24 rounded-3xl bg-primary-600 items-center justify-center mb-6 shadow-xl shadow-blue-500/40 border border-blue-400/30">
          <Text className="text-white text-5xl">🎓</Text>
        </View>

        <Text className="text-4xl font-extrabold text-white tracking-tight text-center">
          {APP_CONFIG.APP_NAME}
        </Text>

        <Text className="text-sm font-semibold text-blue-300 mt-2 text-center tracking-wide px-4">
          {APP_CONFIG.TAGLINE}
        </Text>

        {/* Pulsing Loading Spinner */}
        <View className="mt-10 flex-row items-center bg-slate-800/80 border border-slate-700/60 px-4 py-2 rounded-full">
          <ActivityIndicator size="small" color={colors.primary[400]} />
          <Text className="text-xs font-medium text-slate-300 ml-2.5">
            Initializing secure portal...
          </Text>
        </View>
      </View>

      {/* Direct Action Fallback */}
      <View className="w-full max-w-xs">
        <PrimaryButton
          title="Get Started →"
          fullWidth
          onPress={() => {
            if (isAuthenticated) {
              navigation.replace('Student');
            } else {
              navigation.replace('Auth');
            }
          }}
        />
        <Text className="text-[11px] text-slate-500 text-center mt-3 font-medium">
          Verified Student & Scholarship Ecosystem
        </Text>
      </View>
    </View>
  );
};

export default SplashScreen;
