import React, { useEffect, useRef } from 'react';
import { View, StatusBar, AppState, Platform, Alert } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './context/AuthContext';
import { PremiumProvider } from './context/PremiumContext';
import RootNavigator from './navigation/RootNavigator';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { 
  registerForPushNotifications, 
  handleNotificationResponse,
  verifyAndRestoreNotifications,
  handleNotificationAction,
  sendTestNotification
} from './services/NotificationService';
import { COLORS, THEME } from './constants/theme';
import Constants from 'expo-constants';

// Custom theme to match app brand colors
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: THEME.PRIMARY,
    background: THEME.BACKGROUND.SECONDARY,
    card: THEME.BACKGROUND.PRIMARY,
    text: THEME.TEXT.PRIMARY,
    border: THEME.UI.BORDER,
    notification: COLORS.ERROR,
  },
};

// Configure notifications to always show alerts even when app is in foreground
// Do this outside of any component to ensure it's set up before any notifications are received
Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log('Notification received, deciding how to handle it');
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export default function App() {
  const navigationRef = useRef(null);
  const notificationResponseListener = useRef();
  const notificationReceivedListener = useRef();
  const appState = useRef(AppState.currentState);

  // Set up notifications on app start
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        console.log('Setting up notifications...');
        
        // Register for push notifications
        const token = await registerForPushNotifications();
        console.log('Push notification setup completed:', token ? 'success' : 'failed');
        
        // Check if debug test notifications are enabled
        if (__DEV__) {
          try {
            // Check if we have permission first
            const { status } = await Notifications.getPermissionsAsync();
            if (status === 'granted') {
              console.log('Sending test notification in 5 seconds...');
              setTimeout(async () => {
                try {
                  const notificationId = await sendTestNotification();
                  console.log('Debug notification sent successfully:', notificationId);
                } catch (err) {
                  console.error('Test notification failed:', err);
                }
              }, 5000);
            } else {
              console.log('Cannot send test notification - permission not granted');
            }
          } catch (err) {
            console.error('Error in test notification setup:', err);
          }
        }
      
        // Verify and restore any missed notifications (e.g. after device restart)
        await verifyAndRestoreNotifications();
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };
    
    setupNotifications();

    // Handler for when app is opened by notification (foreground and background)
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      handleNotificationResponse(response, {
        navigate: (screen, params) => {
          if (navigationRef.current) {
            navigationRef.current.navigate(screen, params);
          }
        }
      });
    });
    
    // Handle notification actions directly
    const actionSubscription = Notifications.addNotificationDismissedListener(response => {
      console.log('Notification dismissed:', response);
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        handleNotificationAction(response.actionIdentifier, response.notification);
      }
    });
    
    // Listen for notifications received while app is in foreground
    notificationReceivedListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // You could show a custom in-app alert here if you want
    });
    
    // Handle app state changes (background/foreground)
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      // When app comes to foreground from background
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        // Verify notifications are set up correctly
        verifyAndRestoreNotifications();
      }
      
      appState.current = nextAppState;
    });

    // Clean up listeners on unmount
    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(notificationResponseListener.current);
      }
      if (notificationReceivedListener.current) {
        Notifications.removeNotificationSubscription(notificationReceivedListener.current);
      }
      actionSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PremiumProvider>
          <PaperProvider theme={{
            colors: {
              primary: THEME.PRIMARY,
              accent: THEME.ACCENT,
            }
          }}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <NavigationContainer ref={navigationRef} theme={theme}>
              <RootNavigator />
            </NavigationContainer>
          </PaperProvider>
        </PremiumProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
} 