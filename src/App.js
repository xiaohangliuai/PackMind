import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { View, ActivityIndicator, Text, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import MainNavigator
import MainNavigator from './navigation';

// Ignore warnings for development
LogBox.ignoreLogs([
  'Unsupported top level event type "topInsetsChange"',
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Couldn\'t register the navigator',
]);

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// App Loading Component
const AppLoading = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#6E8B3D" />
    <Text style={{ marginTop: 20 }}>Loading...</Text>
  </View>
);

// The main app component with NavigationContainer
const App = () => {
  // Set up notification permissions
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (error) {
        console.log('Error requesting notification permissions:', error);
      }
    };
    
    setupNotifications();
  }, []);
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <MainNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App; 