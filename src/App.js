import React, { useEffect, useRef } from 'react';
import { View, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerForPushNotifications } from './services/NotificationService';

// Custom theme to match app brand colors
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#a6c13c',
    background: '#F8F8F8',
  },
};

export default function App() {
  const navigationRef = useRef(null);
  const notificationResponseListener = useRef();

  // Set up notifications on app start
  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Handler for when app is opened by notification
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Extract the list ID from the notification data
      const listId = response.notification.request.content.data?.listId;
      
      if (listId && navigationRef.current) {
        // Navigate to the list details screen when app is opened from notification
        navigationRef.current.navigate('ListDetails', { listId });
      }
    });

    // Clean up listeners on unmount
    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(notificationResponseListener.current);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          <NavigationContainer ref={navigationRef} theme={theme}>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
} 