import './global.css';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { View, Text, TouchableOpacity } from 'react-native';
import { store } from './src/store';
import { ShowcaseScreen, FoundationScreen } from './src/screens';

/**
 * ScholarHub Root Application Component
 * Sets up global Redux Provider and Safe Area context
 * Displays the UI Design System Showcase screen with easy toggle to Foundation screen
 */
export default function App() {
  const [currentView, setCurrentView] = useState<'showcase' | 'foundation'>('showcase');

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        
        {/* Top View Selector Bar */}
        <View className="bg-slate-900 pt-10 pb-2 px-4 flex-row items-center justify-between z-50">
          <View className="flex-row items-center">
            <Text className="text-white font-extrabold text-sm mr-2">ScholarHub</Text>
            <View className="bg-primary-600 px-2 py-0.5 rounded-full">
              <Text className="text-white text-[10px] font-bold">UI System</Text>
            </View>
          </View>
          <View className="flex-row bg-slate-800 p-1 rounded-xl">
            <TouchableOpacity
              onPress={() => setCurrentView('showcase')}
              className={`px-3 py-1 rounded-lg ${
                currentView === 'showcase' ? 'bg-primary-600' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  currentView === 'showcase' ? 'text-white' : 'text-slate-400'
                }`}
              >
                Component Showcase
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCurrentView('foundation')}
              className={`px-3 py-1 rounded-lg ${
                currentView === 'foundation' ? 'bg-primary-600' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  currentView === 'foundation' ? 'text-white' : 'text-slate-400'
                }`}
              >
                Foundation Status
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Screen */}
        {currentView === 'showcase' ? <ShowcaseScreen /> : <FoundationScreen />}
      </SafeAreaProvider>
    </Provider>
  );
}
