import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { PremiumProvider } from './src/context/PremiumContext';
import AppNavigation from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <PremiumProvider>
          <AppNavigation />
        </PremiumProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}