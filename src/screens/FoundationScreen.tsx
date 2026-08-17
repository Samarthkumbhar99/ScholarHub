import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../hooks';
import { showNotification, clearNotification } from '../store/slices/uiSlice';
import { AppButton } from '../components/buttons';
import { AppCard } from '../components/cards';
import { AppTextInput } from '../components/inputs';
import { APP_CONFIG } from '../constants';

export const FoundationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { foundationStatus, globalNotification } = useAppSelector((state) => state.ui);

  const [testInput, setTestInput] = useState('');
  const [isSimulatingLoad, setIsSimulatingLoad] = useState(false);

  const handleTestState = () => {
    setIsSimulatingLoad(true);
    setTimeout(() => {
      setIsSimulatingLoad(false);
      dispatch(
        showNotification({
          message: 'Redux Toolkit + NativeWind state dispatch verified successfully!',
          type: 'success',
        })
      );
    }, 800);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header Banner */}
        <View className="items-center mb-6 pt-4">
          <View className="h-16 w-16 rounded-2xl bg-blue-700 items-center justify-center mb-3 shadow-md shadow-blue-500/20">
            <Text className="text-white text-2xl font-black">🎓</Text>
          </View>
          <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {APP_CONFIG.APP_NAME}
          </Text>
          <Text className="text-sm font-semibold text-blue-700 mt-1 tracking-wide text-center px-4">
            {APP_CONFIG.TAGLINE}
          </Text>

          <View className="mt-3 inline-flex flex-row items-center px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300">
            <View className="h-2 w-2 rounded-full bg-emerald-600 mr-2" />
            <Text className="text-xs font-bold text-emerald-800">
              Frontend foundation is working.
            </Text>
          </View>
        </View>

        {/* Global Notification Banner if triggered */}
        {globalNotification && (
          <View className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex-row items-center justify-between">
            <Text className="flex-1 text-xs font-semibold text-emerald-900 mr-2">
              {globalNotification.message}
            </Text>
            <AppButton
              title="Dismiss"
              variant="ghost"
              size="sm"
              onPress={() => dispatch(clearNotification())}
              textClassName="text-emerald-800 text-xs font-bold"
            />
          </View>
        )}

        {/* System Stack Verification Card */}
        <AppCard variant="elevated" className="mb-5 border border-slate-200">
          <Text className="text-base font-bold text-slate-900 mb-3">
            Active Foundation Stack
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
              <View className="flex-row items-center">
                <Text className="text-base mr-2">⚡</Text>
                <Text className="text-sm font-medium text-slate-700">React Native</Text>
              </View>
              <Text className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Active
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
              <View className="flex-row items-center">
                <Text className="text-base mr-2">🛡️</Text>
                <Text className="text-sm font-medium text-slate-700">TypeScript (Strict)</Text>
              </View>
              <Text className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Strict Mode
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
              <View className="flex-row items-center">
                <Text className="text-base mr-2">🎨</Text>
                <Text className="text-sm font-medium text-slate-700">NativeWind / Tailwind</Text>
              </View>
              <Text className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Ready
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center">
                <Text className="text-base mr-2">🔄</Text>
                <Text className="text-sm font-medium text-slate-700">Redux Toolkit Store</Text>
              </View>
              <Text className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Configured
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Foundation Architecture Directory Verification */}
        <AppCard variant="outlined" className="mb-5">
          <Text className="text-base font-bold text-slate-900 mb-2">
            Scalable `src/` Architecture
          </Text>
          <Text className="text-xs text-slate-500 mb-3">
            Modular layers initialized for future module development:
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {[
              'components',
              'screens',
              'navigation',
              'store',
              'services',
              'hooks',
              'utils',
              'constants',
              'types',
              'theme',
            ].map((layer) => (
              <View
                key={layer}
                className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg"
              >
                <Text className="text-xs font-mono font-medium text-slate-700">
                  src/{layer}/
                </Text>
              </View>
            ))}
          </View>
        </AppCard>

        {/* Reusable UI Components Test Section */}
        <AppCard variant="elevated" className="mb-5">
          <Text className="text-base font-bold text-slate-900 mb-3">
            Component Library Verification
          </Text>

          <AppTextInput
            label="Interactive Input Test"
            placeholder="Type sample text here..."
            value={testInput}
            onChangeText={setTestInput}
            helperText="Validates NativeWind styled AppTextInput component."
          />

          <View className="flex-row space-x-3 mt-1">
            <View className="flex-1 mr-2">
              <AppButton
                title="Test Redux Action"
                variant="primary"
                isLoading={isSimulatingLoad}
                onPress={handleTestState}
              />
            </View>
            <View className="flex-1 ml-2">
              <AppButton
                title="Secondary Button"
                variant="secondary"
                onPress={() =>
                  dispatch(
                    showNotification({
                      message: 'Secondary action clicked.',
                      type: 'info',
                    })
                  )
                }
              />
            </View>
          </View>
        </AppCard>

        {/* Next Modules Footer Note */}
        <View className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <Text className="text-xs font-semibold text-blue-900 mb-1">
            Ready for Next Modules
          </Text>
          <Text className="text-xs text-blue-700 leading-relaxed">
            The foundation is configured cleanly without premature authentication or feature
            implementations. Upcoming modules can be added module-by-module.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FoundationScreen;
