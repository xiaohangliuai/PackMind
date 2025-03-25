import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { format } from 'date-fns';

// Configure notifications to show when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications
 * @returns {Promise<string|null>} The notification token or null if not available
 */
export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Push notifications are not available on emulators/simulators');
    return null;
  }

  try {
    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission not granted for notifications');
      return null;
    }
    
    // Get push token
    const token = await Notifications.getExpoPushTokenAsync();
    
    // Set up notification categories/actions
    await Notifications.setNotificationCategoryAsync('PACKING_REMINDER', [
      {
        identifier: 'MARK_PACKED',
        buttonTitle: 'Mark as Packed',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'SNOOZE',
        buttonTitle: 'Remind me later',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);
    
    // On Android, we need to set up a notification channel
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('packing-reminders', {
        name: 'Packing Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a6c13c',
      });
    }
    
    return token;
  } catch (error) {
    console.error('Error setting up notifications:', error);
    return null;
  }
};

/**
 * Schedule a local notification for a packing list
 * @param {string} listId - ID of the packing list
 * @param {string} title - Title of the notification
 * @param {string} body - Body text of the notification
 * @param {Date} date - Date when the notification should trigger
 * @param {Object} recurrence - Recurrence settings
 * @returns {Promise<string>} The notification identifier
 */
export const schedulePackingReminder = async (listId, title, body, date, recurrence) => {
  try {
    // Format the notification body
    const formattedBody = body || `Time to pack your ${title} list!`;
    
    // Default trigger is the specified date
    let trigger = date;
    
    // Handle recurrence
    if (recurrence && recurrence.type !== 'none') {
      switch (recurrence.type) {
        case 'daily':
          trigger = {
            hour: date.getHours(),
            minute: date.getMinutes(),
            repeats: true,
          };
          break;
        case 'weekly':
          if (recurrence.days && recurrence.days.length > 0) {
            // For weekly recurrence, we schedule multiple notifications
            const notificationIds = [];
            
            for (const weekday of recurrence.days) {
              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `Packing Reminder: ${title}`,
                  body: formattedBody,
                  data: { listId },
                  categoryIdentifier: 'PACKING_REMINDER',
                },
                trigger: {
                  weekday: weekday + 1, // Expo uses 1-7 for weekdays
                  hour: date.getHours(),
                  minute: date.getMinutes(),
                  repeats: true,
                },
              });
              notificationIds.push(notificationId);
            }
            
            // Return the first notification ID
            return notificationIds[0];
          }
          break;
        case 'monthly':
          trigger = {
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            repeats: true,
          };
          break;
      }
    }
    
    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Packing Reminder: ${title}`,
        body: formattedBody,
        data: { listId },
        categoryIdentifier: 'PACKING_REMINDER',
      },
      trigger,
    });
    
    console.log(`Scheduled notification: ${notificationId} for ${format(date, 'PPpp')}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

/**
 * Cancel all scheduled notifications for a specific packing list
 * @param {string} listId - ID of the packing list
 */
export const cancelPackingReminders = async (listId) => {
  try {
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Filter notifications for this list
    const listNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.listId === listId
    );
    
    // Cancel each notification
    for (const notification of listNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    console.log(`Cancelled ${listNotifications.length} notifications for list ${listId}`);
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
};

/**
 * Update existing notifications for a packing list
 * @param {string} listId - ID of the packing list
 * @param {string} title - New title
 * @param {Date} date - New date
 * @param {Object} recurrence - New recurrence settings
 */
export const updatePackingReminders = async (listId, title, date, recurrence) => {
  try {
    // Cancel existing notifications
    await cancelPackingReminders(listId);
    
    // Schedule new notifications
    return await schedulePackingReminder(listId, title, null, date, recurrence);
  } catch (error) {
    console.error('Error updating notifications:', error);
  }
};

/**
 * Handle notification response (when user taps a notification)
 * @param {Function} navigation - Navigation function to open the list
 */
export const handleNotificationResponse = (response, navigation) => {
  // Extract the list ID from the notification data
  const listId = response.notification.request.content.data?.listId;
  
  if (listId) {
    // Navigate to the list details screen
    navigation.navigate('ListDetails', { listId });
  }
};

export default {
  registerForPushNotifications,
  schedulePackingReminder,
  cancelPackingReminders,
  updatePackingReminders,
  handleNotificationResponse,
}; 