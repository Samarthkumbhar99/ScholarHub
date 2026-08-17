import './global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { FoundationScreen } from './src/screens';

/**
 * ScholarHub Root Application Component
 * Sets up global Redux Provider and Safe Area context
 */
export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <FoundationScreen />
      </SafeAreaProvider>
    </Provider>
  );
}
