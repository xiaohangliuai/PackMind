import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { format, addDays } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

// Configure notifications to show when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Store push token key
const PUSH_TOKEN_STORAGE_KEY = 'packmind_push_token';

/**
 * Helper function to check if user has premium access to notifications
 * @returns {Promise<boolean>} True if the user is premium, false otherwise
 */
export const checkPremiumNotificationAccess = async () => {
  try {
    // Get premium status from storage first for a quick check
    const isPremiumStr = await AsyncStorage.getItem('user_is_premium');
    const isPremium = isPremiumStr === 'true';
    
    if (!isPremium) {
      console.log('User is not premium, notifications restricted');
      Alert.alert(
        'Premium Feature',
        'Push notifications are a premium feature. Please upgrade to PackM!nd+ Premium to enable this feature.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

/**
 * Test notification - use this to quickly test if notifications are working
 */
export const sendTestNotification = async () => {
  try {
    // Check permissions first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted, cannot send test notification');
      throw new Error('Notification permission not granted');
    }
    
    console.log('Scheduling immediate test notification...');
    
    // Try to schedule for 2 seconds in the future
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "PackM!nd+:",
        body: "Don't forget to pack for \"Test Notification\"!",
        data: { test: true },
      },
      trigger: { seconds: 2 }, // Show after 2 seconds
    });
    
    console.log('Test notification scheduled with ID:', notificationId);
    
    // Get all scheduled notifications to verify it was actually scheduled
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Currently scheduled notifications count: ${scheduledNotifications.length}`);
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling test notification:', error);
    throw error;
  }
};

/**
 * Send a sequence of test notifications to verify functionality
 */
export const sendTestNotificationSequence = async () => {
  try {
    // Check permissions first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted, cannot send test notification');
      throw new Error('Notification permission not granted');
    }
    
    console.log('Scheduling sequence of test notifications...');
    
    // Immediate notification
    const immNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "PackM!nd+:",
        body: "Don't forget to pack for \"Immediate Test\"!",
        data: { test: true },
      },
      trigger: null, // null trigger means immediate delivery
    });
    
    console.log('Immediate test notification scheduled with ID:', immNotificationId);
    
    // Notification for 15 seconds later
    const delayedNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "PackM!nd+:",
        body: "Don't forget to pack for \"Delayed Test\"!",
        data: { test: true, delayed: true },
      },
      trigger: { seconds: 15 },
    });
    
    console.log('Delayed test notification scheduled with ID:', delayedNotificationId);
    
    // Get all scheduled notifications to verify they were added
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Currently scheduled notifications count: ${scheduledNotifications.length}`);
    
    return { immediate: immNotificationId, delayed: delayedNotificationId };
  } catch (error) {
    console.error('Error scheduling test notification sequence:', error);
    throw error;
  }
};

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
    // Ensure handler is set up at application startup
    console.log('Setting up notification handler...');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    // Request permission first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('Current notification permission status:', existingStatus);
    
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('Requesting notification permission...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: true,
          allowProvisional: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
      console.log('Permission request result:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission not granted for notifications');
      Alert.alert(
        'Notifications Disabled',
        'To receive packing reminders, please enable notifications in your device settings.',
        [{ text: 'OK' }]
      );
      return null;
    }

    console.log('Notification permission granted, getting token...');
    
    // Get project ID from app.json if available
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log('Project ID for push notifications:', projectId || 'Using default project ID');
    
    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    
    const token = tokenData.data;
    console.log('Push notification token received:', token);
    
    // Save token to persistent storage
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    
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
    console.log('Notification categories set up');
    
    // On Android, we need to set up notification channels
    if (Platform.OS === 'android') {
      console.log('Setting up Android notification channels...');
      
      // Main channel
      await Notifications.setNotificationChannelAsync('packing-reminders', {
        name: 'Packing Reminders',
        description: 'Reminders about your upcoming packing lists',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a6c13c',
        enableVibrate: true,
        showBadge: true,
      });
      
      // Daily reminders channel
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Reminders',
        description: 'Daily recurring reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        showBadge: true,
      });
      
      // Test channel
      await Notifications.setNotificationChannelAsync('test-notifications', {
        name: 'Test Notifications',
        description: 'For testing notification functionality',
        importance: Notifications.AndroidImportance.MAX,
      });
      
      console.log('Android notification channels created');
    }
    
    // Verify that notifications are working by checking if we can get scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`There are ${scheduledNotifications.length} scheduled notifications`);
    
    return token;
  } catch (error) {
    console.error('Error setting up notifications:', error);
    Alert.alert(
      'Notification Setup Error',
      'There was a problem setting up notifications. Some features may not work correctly.',
      [{ text: 'OK' }]
    );
    return null;
  }
};

/**
 * Schedule multiple future occurrences of a daily notification
 * This works around the iOS bug with recurring notifications
 * @param {string} listId - ID of the packing list
 * @param {string} title - Title for the notification
 * @param {string} body - Body of the notification
 * @param {Date} baseDate - Base date/time for the notification
 * @param {number} daysToSchedule - How many occurrences to schedule
 * @returns {Promise<string[]>} Array of notification IDs
 */
const scheduleDailyOccurrences = async (listId, title, body, baseDate, daysToSchedule = 7) => {
  try {
    console.log(`Scheduling ${daysToSchedule} individual daily occurrences instead of using repeating trigger`);
    const notificationIds = [];
    
    // Set up notifications for the specified number of days
    for (let i = 0; i < daysToSchedule; i++) {
      // Clone base date and add i days
      const notificationDate = new Date(baseDate);
      notificationDate.setDate(notificationDate.getDate() + i);
      
      // Set the time components
      notificationDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
      
      // Only schedule if it's in the future
      if (notificationDate > new Date()) {
        console.log(`Scheduling occurrence ${i+1}/${daysToSchedule} for ${format(notificationDate, 'PPpp')}`);
        
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `PackM!nd+:`,
              body: `Don't forget to pack for "${title}"!`,
              data: { 
                listId, 
                isRecurringWorkaround: true,
                dayIndex: i,
                baseTime: baseDate.toISOString() 
              },
              sound: true,
            },
            trigger: notificationDate,
          });
          
          notificationIds.push(id);
          console.log(`Scheduled occurrence ${i+1} with ID: ${id}`);
        } catch (err) {
          console.error(`Failed to schedule occurrence ${i+1}:`, err);
        }
      }
    }
    
    // Verify the notifications actually got scheduled
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Count how many of our notifications are actually scheduled
    let scheduledCount = 0;
    for (const id of notificationIds) {
      if (allNotifications.some(n => n.identifier === id)) {
        scheduledCount++;
      }
    }
    
    console.log(`Successfully scheduled ${scheduledCount}/${notificationIds.length} occurrences`);
    
    // Set up a special notification to refresh these occurrences in the future
    const refreshDate = new Date();
    refreshDate.setDate(refreshDate.getDate() + Math.floor(daysToSchedule / 2)); // Refresh halfway through
    
    const refreshId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "PackM!nd+: Updating Reminders",
        body: "We're refreshing your daily packing reminders",
        data: { 
          isRefreshTrigger: true,
          listId,
          title,
          body,
          baseTime: baseDate.toISOString()
        },
      },
      trigger: refreshDate,
    });
    
    console.log(`Scheduled refresh trigger for ${format(refreshDate, 'PPpp')} with ID: ${refreshId}`);
    
    // Save all notification IDs for this list, including the refresh trigger
    await storeNotificationIds(listId, [...notificationIds, refreshId]);
    
    return notificationIds;
  } catch (error) {
    console.error('Error scheduling daily occurrences:', error);
    throw error;
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
    // Check if user has premium access to notifications
    const hasPremiumAccess = await checkPremiumNotificationAccess();
    if (!hasPremiumAccess) {
      console.log('Premium access check failed, cannot schedule notification');
      return null;
    }

    // First check if notifications are permitted
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted, cannot schedule notification');
      throw new Error('Notification permission not granted');
    }
    
    // Format the notification body
    const formattedBody = body || `Time to pack your ${title} list!`;
    
    // Debug log
    console.log(`Scheduling notification for ${title} at ${date.toISOString()}`);
    console.log('Recurrence type:', recurrence?.type || 'none');
    
    // Store notification metadata for recovery
    const notificationMeta = {
      listId,
      title,
      body: formattedBody,
      date: date.toISOString(),
      recurrence
    };
    
    await storeNotificationMetadata(listId, notificationMeta);
    
    // Check if notifications are disabled
    if (recurrence.notificationType === 'none') {
      console.log('Notifications disabled for this list');
      return null;
    }
    
    // Clear existing notifications for this list
    await cancelPackingReminders(listId);
    console.log(`Cleared existing notifications for list ${listId}`);
    
    // ONE-TIME NOTIFICATION
    if (recurrence.notificationType === 'one-time') {
      console.log('Scheduling one-time notification');
      
      // For past dates, set a notification 30 seconds in the future
      let triggerDate = new Date(date);
      const now = new Date();
      
      if (triggerDate <= now) {
        console.log('Date is in the past, setting notification to 30 seconds from now');
        triggerDate = new Date(now.getTime() + 30 * 1000);
      }
      
      try {
        // Schedule the one-time notification
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `PackM!nd+:`,
            body: `Don't forget to pack for "${title}"!`,
            data: { listId },
            sound: true,
          },
          trigger: triggerDate,
        });
        
        console.log(`Scheduled one-time notification: ${notificationId} for ${format(triggerDate, 'PPpp')}`);
        
        // Store the notification ID
        await storeNotificationIds(listId, [notificationId]);
        
        // Don't schedule a test notification anymore
        console.log('One-time notification set - it will trigger at the scheduled time');
        
        return notificationId;
      } catch (error) {
        console.error('Error scheduling one-time notification:', error);
        throw error;
      }
    }
    
    // RECURRING NOTIFICATIONS
    console.log('Scheduling recurring notification with type:', recurrence.type);
    
    // Handle different recurrence types
    switch (recurrence.type) {
      case 'daily': {
        console.log('Using iOS-compatible workaround for daily notifications');
        
        // Use multiple individual notifications instead of a repeating one
        const notificationIds = await scheduleDailyOccurrences(
          listId,
          title,
          formattedBody,
          date,
          14 // Schedule 14 days of occurrences
        );
        
        if (notificationIds.length > 0) {
          console.log(`Scheduled ${notificationIds.length} daily occurrences instead of using recurring API`);
          
          // No test notification for recurring
          console.log('Daily notifications set - they will trigger at the scheduled times');
          
          return notificationIds[0]; // Return first ID
        } else {
          throw new Error('Failed to schedule any daily occurrences');
        }
      }
        
      case 'weekly': {
        if (!recurrence.days || recurrence.days.length === 0) {
          console.error('No days specified for weekly recurrence');
          throw new Error('No days specified for weekly recurrence');
        }
        
        console.log(`Weekly recurrence with ${recurrence.days.length} days:`, recurrence.days);
        
        // For each selected day of the week, schedule notifications for the next 4 occurrences
        const allNotificationIds = [];
        const now = new Date();
        
        for (const weekday of recurrence.days) {
          console.log(`Setting up notifications for weekday ${weekday + 1}`);
          
          // Find the next occurrence of this weekday
          const targetDate = new Date(date);
          const currentDay = targetDate.getDay();
          const daysToAdd = (weekday - currentDay + 7) % 7;
          
          targetDate.setDate(targetDate.getDate() + daysToAdd);
          targetDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
          
          // If it's in the past, move to next week
          if (targetDate <= now) {
            targetDate.setDate(targetDate.getDate() + 7);
          }
          
          // Schedule 4 occurrences of this weekday
          for (let i = 0; i < 4; i++) {
            const occurrenceDate = new Date(targetDate);
            occurrenceDate.setDate(occurrenceDate.getDate() + (i * 7));
            
            try {
              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `PackM!nd+:`,
                  body: `Don't forget to pack for "${title}"!`,
                  data: { 
                    listId, 
                    isWeeklyWorkaround: true,
                    weekday,
                    baseTime: date.toISOString(),
                    occurrenceIndex: i
                  },
                  sound: true,
                },
                trigger: occurrenceDate,
              });
              
              allNotificationIds.push(notificationId);
              console.log(`Scheduled weekly occurrence for weekday ${weekday + 1}, occurrence ${i+1}, ID: ${notificationId}, date: ${format(occurrenceDate, 'PPpp')}`);
            } catch (err) {
              console.error(`Failed to schedule weekly occurrence for day ${weekday}:`, err);
            }
          }
        }
        
        // Set up a refresh trigger for 2 weeks from now
        const refreshDate = new Date();
        refreshDate.setDate(refreshDate.getDate() + 14);
        
        const refreshId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "PackM!nd+: Updating Reminders",
            body: "We're refreshing your weekly packing reminders",
            data: { 
              isWeeklyRefreshTrigger: true,
              listId,
              title,
              body: formattedBody,
              baseTime: date.toISOString(),
              weekdays: recurrence.days
            },
          },
          trigger: refreshDate,
        });
        
        allNotificationIds.push(refreshId);
        console.log(`Scheduled weekly refresh trigger for ${format(refreshDate, 'PPpp')}`);
        
        // Store all notification IDs
        await storeNotificationIds(listId, allNotificationIds);
        
        console.log('Weekly notifications set using individual occurrences');
        
        return allNotificationIds[0] || null;
      }
        
      case 'monthly': {
        console.log('Monthly recurrence');
        
        // Schedule occurrences for the next 3 months
        const notificationIds = [];
        const targetDay = date.getDate();
        const targetHour = date.getHours();
        const targetMinute = date.getMinutes();
        
        for (let i = 0; i < 3; i++) {
          // Start with current month and year
          const now = new Date();
          const year = now.getFullYear();
          // Current month plus i, to schedule i months ahead
          let month = now.getMonth() + i;
          
          // Adjust for year overflow
          if (month > 11) {
            month = month % 12;
            year += Math.floor((now.getMonth() + i) / 12);
          }
          
          // Create date for this occurrence
          const occurrenceDate = new Date(year, month, targetDay, targetHour, targetMinute, 0, 0);
          
          // If the day doesn't exist in this month (e.g., Feb 30), it will roll over
          // to the next month. Check and adjust by going to the last day of the intended month.
          if (occurrenceDate.getMonth() !== month) {
            // Go back to the last day of the intended month
            occurrenceDate.setDate(0);
          }
          
          // Only schedule if it's in the future
          if (occurrenceDate > new Date()) {
            try {
              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `PackM!nd+:`,
                  body: `Don't forget to pack for "${title}"!`,
                  data: { 
                    listId, 
                    isMonthlyWorkaround: true,
                    targetDay,
                    baseTime: date.toISOString(),
                    occurrenceIndex: i
                  },
                  sound: true,
                },
                trigger: occurrenceDate,
              });
              
              notificationIds.push(notificationId);
              console.log(`Scheduled monthly occurrence for ${format(occurrenceDate, 'PPpp')}, ID: ${notificationId}`);
            } catch (err) {
              console.error(`Failed to schedule monthly occurrence for month ${month}:`, err);
            }
          }
        }
        
        // Set up a refresh trigger for 1.5 months from now
        const refreshDate = new Date();
        refreshDate.setDate(refreshDate.getDate() + 45);
        
        const refreshId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "PackM!nd+: Updating Reminders",
            body: "We're refreshing your monthly packing reminders",
            data: { 
              isMonthlyRefreshTrigger: true,
              listId,
              title,
              body: formattedBody,
              baseTime: date.toISOString(),
              targetDay: date.getDate()
            },
          },
          trigger: refreshDate,
        });
        
        notificationIds.push(refreshId);
        
        // Store all notification IDs
        await storeNotificationIds(listId, notificationIds);
        
        console.log('Monthly notifications set using individual occurrences');
        
        return notificationIds[0] || null;
      }
        
      default:
        console.error('Unknown recurrence type:', recurrence.type);
        throw new Error(`Unsupported recurrence type: ${recurrence.type}`);
    }
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

/**
 * Store notification metadata for recovery purposes
 */
const storeNotificationMetadata = async (listId, metadata) => {
  try {
    const key = `notification_meta_${listId}`;
    await AsyncStorage.setItem(key, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error storing notification metadata:', error);
  }
};

/**
 * Store notification IDs for a list
 */
const storeNotificationIds = async (listId, notificationIds) => {
  try {
    const key = `notification_ids_${listId}`;
    await AsyncStorage.setItem(key, JSON.stringify(notificationIds));
  } catch (error) {
    console.error('Error storing notification IDs:', error);
  }
};

/**
 * Get stored notification IDs for a list
 */
const getStoredNotificationIds = async (listId) => {
  try {
    const key = `notification_ids_${listId}`;
    const ids = await AsyncStorage.getItem(key);
    return ids ? JSON.parse(ids) : [];
  } catch (error) {
    console.error('Error getting notification IDs:', error);
    return [];
  }
};

/**
 * Cancel all scheduled notifications for a specific packing list
 * @param {string} listId - ID of the packing list
 */
export const cancelPackingReminders = async (listId) => {
  try {
    // Get stored notification IDs for this list
    const storedIds = await getStoredNotificationIds(listId);
    
    // Cancel each notification by ID from storage
    for (const id of storedIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    
    // As a fallback, also check all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Filter notifications for this list
    const listNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.listId === listId
    );
    
    // Cancel each notification
    for (const notification of listNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    // Clear stored notification IDs and metadata
    await AsyncStorage.removeItem(`notification_ids_${listId}`);
    await AsyncStorage.removeItem(`notification_meta_${listId}`);
    
    console.log(`Cancelled notifications for list ${listId}`);
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
export const handleNotificationResponse = async (response, navigation) => {
  try {
    // Extract data from the notification
    const notificationData = response.notification.request.content.data;
    const listId = notificationData?.listId;
    
    console.log('Handling notification response with data:', JSON.stringify(notificationData));
    
    // Handle various types of notifications
    if (notificationData?.isRefreshTrigger) {
      // This is a refresh trigger for daily notifications
      console.log('Handling refresh trigger for daily notifications');
      
      const baseTime = new Date(notificationData.baseTime);
      const title = notificationData.title;
      const body = notificationData.body;
      
      // Schedule more occurrences
      await scheduleDailyOccurrences(listId, title, body, baseTime, 14);
      
      // This is a silent refresh, no need to navigate
      return;
    }
    
    if (notificationData?.isWeeklyRefreshTrigger) {
      // This is a refresh trigger for weekly notifications
      console.log('Handling refresh trigger for weekly notifications');
      
      const baseTime = new Date(notificationData.baseTime);
      const title = notificationData.title;
      const body = notificationData.body;
      const weekdays = notificationData.weekdays;
      
      // Clear existing notifications first
      await cancelPackingReminders(listId);
      
      // Schedule new occurrences for each weekday
      const allNotificationIds = [];
      const now = new Date();
      
      for (const weekday of weekdays) {
        // Find the next occurrence of this weekday
        const targetDate = new Date(baseTime);
        const currentDay = now.getDay();
        const daysToAdd = (weekday - currentDay + 7) % 7;
        
        targetDate.setDate(now.getDate() + daysToAdd);
        targetDate.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);
        
        // Schedule 4 occurrences of this weekday
        for (let i = 0; i < 4; i++) {
          const occurrenceDate = new Date(targetDate);
          occurrenceDate.setDate(occurrenceDate.getDate() + (i * 7));
          
          if (occurrenceDate > now) {
            try {
              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `PackM!nd+:`,
                  body: `Don't forget to pack for "${title}"!`,
                  data: { 
                    listId, 
                    isWeeklyWorkaround: true,
                    weekday,
                    baseTime: baseTime.toISOString(),
                    occurrenceIndex: i
                  },
                  sound: true,
                },
                trigger: occurrenceDate,
              });
              
              allNotificationIds.push(notificationId);
              console.log(`Refreshed weekly occurrence for day ${weekday}, occurrence ${i+1}`);
            } catch (err) {
              console.error(`Failed to refresh weekly occurrence:`, err);
            }
          }
        }
      }
      
      // Set up a new refresh trigger in 2 weeks
      const refreshDate = new Date();
      refreshDate.setDate(refreshDate.getDate() + 14);
      
      const refreshId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "PackM!nd+: Updating Reminders",
          body: "We're refreshing your weekly packing reminders",
          data: { 
            isWeeklyRefreshTrigger: true,
            listId,
            title,
            body,
            baseTime: baseTime.toISOString(),
            weekdays
          },
        },
        trigger: refreshDate,
      });
      
      allNotificationIds.push(refreshId);
      
      // Store all notification IDs
      await storeNotificationIds(listId, allNotificationIds);
      
      console.log('Weekly notifications refreshed successfully');
      
      // This is a silent refresh, no need to navigate
      return;
    }
    
    if (notificationData?.isMonthlyRefreshTrigger) {
      // This is a refresh trigger for monthly notifications
      console.log('Handling refresh trigger for monthly notifications');
      
      const baseTime = new Date(notificationData.baseTime);
      const title = notificationData.title;
      const body = notificationData.body;
      const targetDay = notificationData.targetDay;
      
      // Clear existing notifications
      await cancelPackingReminders(listId);
      
      // Schedule new occurrences for the next 3 months
      const notificationIds = [];
      const targetHour = baseTime.getHours();
      const targetMinute = baseTime.getMinutes();
      
      for (let i = 0; i < 3; i++) {
        // Start with current month and year
        const now = new Date();
        const year = now.getFullYear();
        // Current month plus i, to schedule i months ahead
        let month = now.getMonth() + i;
        
        // Adjust for year overflow
        if (month > 11) {
          month = month % 12;
          year += Math.floor((now.getMonth() + i) / 12);
        }
        
        // Create date for this occurrence
        const occurrenceDate = new Date(year, month, targetDay, targetHour, targetMinute, 0, 0);
        
        // If the day doesn't exist in this month (e.g., Feb 30), it will roll over
        // to the next month. Check and adjust by going to the last day of the intended month.
        if (occurrenceDate.getMonth() !== month) {
          // Go back to the last day of the intended month
          occurrenceDate.setDate(0);
        }
        
        // Only schedule if it's in the future
        if (occurrenceDate > new Date()) {
          try {
            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `PackM!nd+:`,
                body: `Don't forget to pack for "${title}"!`,
                data: { 
                  listId, 
                  isMonthlyWorkaround: true,
                  targetDay,
                  baseTime: baseTime.toISOString(),
                  occurrenceIndex: i
                },
                sound: true,
              },
              trigger: occurrenceDate,
            });
            
            notificationIds.push(notificationId);
            console.log(`Refreshed monthly occurrence for ${format(occurrenceDate, 'PPpp')}`);
          } catch (err) {
            console.error(`Failed to refresh monthly occurrence:`, err);
          }
        }
      }
      
      // Set up a new refresh trigger for 1.5 months from now
      const refreshDate = new Date();
      refreshDate.setDate(refreshDate.getDate() + 45);
      
      const refreshId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "PackM!nd+: Updating Reminders",
          body: "We're refreshing your monthly packing reminders",
          data: { 
            isMonthlyRefreshTrigger: true,
            listId,
            title,
            body,
            baseTime: baseTime.toISOString(),
            targetDay
          },
        },
        trigger: refreshDate,
      });
      
      notificationIds.push(refreshId);
      
      // Store all notification IDs
      await storeNotificationIds(listId, notificationIds);
      
      console.log('Monthly notifications refreshed successfully');
      
      // This is a silent refresh, no need to navigate
      return;
    }
    
    // Check if this is an intermediate notification for a distant future notification
    const isIntermediate = notificationData?.isIntermediate;
    
    if (isIntermediate) {
      // Reschedule the final notification
      const finalDate = new Date(notificationData.finalDate);
      const title = notificationData.title;
      const body = notificationData.body;
      
      // Schedule the final notification
      Notifications.scheduleNotificationAsync({
        content: {
          title: `PackM!nd+:`,
          body: `Don't forget to pack for "${title}"!`,
          data: { listId },
          categoryIdentifier: 'PACKING_REMINDER',
        },
        trigger: finalDate,
      });
    }
    
    // For normal notifications, navigate to the list details screen
    if (listId && !notificationData.isTest && !notificationData.isRefreshTrigger && 
        !notificationData.isWeeklyRefreshTrigger && !notificationData.isMonthlyRefreshTrigger) {
      // Navigate to the list details screen
      navigation.navigate('ListDetails', { listId });
    }
  } catch (error) {
    console.error('Error handling notification response:', error);
  }
};

/**
 * Verify and restore any missed notifications after device restart
 * Call this on app startup to ensure all scheduled notifications are properly set up
 */
export const verifyAndRestoreNotifications = async () => {
  try {
    // Find all notification metadata keys in AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const metaKeys = keys.filter(key => key.startsWith('notification_meta_'));
    
    // For each metadata key, verify and restore if needed
    for (const key of metaKeys) {
      const listId = key.replace('notification_meta_', '');
      const metaJson = await AsyncStorage.getItem(key);
      
      if (metaJson) {
        const meta = JSON.parse(metaJson);
        
        // Check if there are existing notifications for this list
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const hasNotification = scheduledNotifications.some(
          notification => notification.content.data?.listId === listId
        );
        
        // If no notification exists for this list, reschedule it
        if (!hasNotification && meta.recurrence && meta.recurrence.type !== 'none') {
          console.log(`Restoring notification for list ${listId}`);
          await schedulePackingReminder(
            listId,
            meta.title,
            meta.body,
            new Date(meta.date),
            meta.recurrence
          );
        }
      }
    }
    
    console.log('Notification verification and restoration complete');
  } catch (error) {
    console.error('Error verifying notifications:', error);
  }
};

/**
 * Handle notification actions (for interactive notifications)
 */
export const handleNotificationAction = async (actionId, notification) => {
  try {
    const listId = notification.request.content.data?.listId;
    
    if (!listId) return;
    
    switch (actionId) {
      case 'MARK_PACKED':
        // This would be implemented elsewhere in the app
        // You could use a function to mark all items as packed
        console.log('Mark as packed action triggered for list', listId);
        break;
        
      case 'SNOOZE':
        // Reschedule the notification for later (e.g., 1 hour later)
        const later = new Date();
        later.setHours(later.getHours() + 1);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.request.content.title,
            body: notification.request.content.body,
            data: notification.request.content.data,
          },
          trigger: later,
        });
        
        console.log('Snoozed notification for list', listId);
        break;
    }
  } catch (error) {
    console.error('Error handling notification action:', error);
  }
};

/**
 * Verify that a notification exists and log its details
 * @param {string} notificationId - ID of the notification to verify
 */
export const verifyNotification = async (notificationId) => {
  try {
    console.log(`Verifying notification with ID: ${notificationId}`);
    
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find the specific notification
    const notification = scheduledNotifications.find(
      notification => notification.identifier === notificationId
    );
    
    if (notification) {
      console.log('Notification exists with the following details:');
      console.log('Title:', notification.content.title);
      console.log('Body:', notification.content.body);
      console.log('Trigger:', JSON.stringify(notification.trigger));
      
      // Check if it's a recurring notification
      const isRecurring = notification.trigger.repeats === true;
      console.log('Is recurring:', isRecurring);
      
      return {
        exists: true,
        details: notification
      };
    } else {
      console.log(`Notification with ID ${notificationId} not found!`);
      console.log('Currently scheduled notifications:', scheduledNotifications.length);
      return {
        exists: false
      };
    }
  } catch (error) {
    console.error('Error verifying notification:', error);
    return {
      exists: false,
      error: error.message
    };
  }
};

/**
 * List all scheduled notifications with detailed information
 * Useful for debugging notification issues
 */
export const listAllScheduledNotifications = async () => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    console.log(`===== SCHEDULED NOTIFICATIONS (${scheduledNotifications.length}) =====`);
    
    if (scheduledNotifications.length === 0) {
      console.log('No scheduled notifications found');
      return [];
    }
    
    // Group notifications by type (recurring vs one-time)
    const recurring = [];
    const oneTime = [];
    
    scheduledNotifications.forEach(notification => {
      const isRecurring = notification.trigger && notification.trigger.repeats === true;
      if (isRecurring) {
        recurring.push(notification);
      } else {
        oneTime.push(notification);
      }
    });
    
    console.log(`Recurring notifications: ${recurring.length}`);
    console.log(`One-time notifications: ${oneTime.length}`);
    
    // List all notifications with details
    scheduledNotifications.forEach((notification, index) => {
      console.log(`\n--- Notification #${index + 1} ---`);
      console.log('ID:', notification.identifier);
      console.log('Title:', notification.content.title);
      console.log('Body:', notification.content.body);
      console.log('Data:', JSON.stringify(notification.content.data));
      
      const trigger = notification.trigger;
      console.log('Trigger:', JSON.stringify(trigger));
      
      // Determine notification type and next trigger time
      if (trigger) {
        if (trigger.repeats === true) {
          // Recurring notification
          let type = 'Unknown recurring';
          if (trigger.hour !== undefined && trigger.minute !== undefined) {
            if (trigger.weekday !== undefined) {
              type = `Weekly on day ${trigger.weekday}`;
            } else if (trigger.day !== undefined) {
              type = `Monthly on day ${trigger.day}`;
            } else {
              type = 'Daily';
            }
          }
          console.log('Type:', type);
          console.log('Recurring at:', trigger.hour + ':' + trigger.minute);
        } else if (trigger.seconds !== undefined) {
          // Seconds-based trigger
          console.log('Type: Delayed by seconds');
          console.log('Delay:', trigger.seconds + ' seconds');
          const triggerTime = new Date(new Date().getTime() + trigger.seconds * 1000);
          console.log('Expected trigger at:', format(triggerTime, 'MMM d, h:mm:ss a'));
        } else if (trigger.date || trigger.getTime) {
          // Date-based trigger
          console.log('Type: One-time at date');
          const triggerDate = trigger.date ? new Date(trigger.date) : new Date(trigger);
          console.log('Scheduled for:', format(triggerDate, 'MMM d, h:mm:ss a'));
        }
      } else {
        console.log('Type: Immediate (no trigger)');
      }
    });
    
    return scheduledNotifications;
  } catch (error) {
    console.error('Error listing notifications:', error);
    return [];
  }
};

/**
 * Special test function for daily notifications using different approaches based on platform
 * This should help us diagnose why notifications aren't triggering correctly
 */
export const testDailyNotification = async () => {
  try {
    console.log('Starting platform-specific daily notification test with individual occurrences');
    
    // Check permissions
    const permStatus = await Notifications.getPermissionsAsync();
    if (permStatus.status !== 'granted') {
      console.log('Notification permissions not granted');
      return { success: false, error: 'Permissions not granted' };
    }
    
    // Get the current time
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    // Calculate a test time 2 minutes from now
    const testTime = new Date(now.getTime() + 2 * 60 * 1000);
    const hour = testTime.getHours();
    const minute = testTime.getMinutes();
    
    // Set up daily notifications for the next 5 days
    const daysToSchedule = 5;
    console.log(`Setting up ${daysToSchedule} daily occurrences starting at ${hour}:${minute}`);
    
    const notificationIds = [];
    
    // Schedule individual occurrences
    for (let i = 0; i < daysToSchedule; i++) {
      // Create date for this occurrence
      const occurrenceDate = new Date(testTime);
      occurrenceDate.setDate(occurrenceDate.getDate() + i);
      
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `PackM!nd+:`,
            body: `Don't forget to pack for "Daily Test (Day ${i+1})"!`,
            data: { 
              isTestDailyOccurrence: true,
              occurrenceIndex: i 
            },
            sound: true,
          },
          trigger: occurrenceDate,
        });
        
        notificationIds.push(id);
        console.log(`Scheduled test occurrence ${i+1} for ${format(occurrenceDate, 'PPpp')}, ID: ${id}`);
      } catch (err) {
        console.error(`Failed to schedule test occurrence ${i+1}:`, err);
      }
    }
    
    // Verify the notifications were scheduled
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Total scheduled notifications: ${allNotifications.length}`);
    
    // Count how many of our test notifications are found
    let scheduledCount = 0;
    for (const id of notificationIds) {
      if (allNotifications.some(n => n.identifier === id)) {
        scheduledCount++;
      }
    }
    
    if (scheduledCount > 0) {
      console.log(`✅ Successfully scheduled ${scheduledCount}/${notificationIds.length} test occurrences`);
      
      return { 
        success: true, 
        ids: notificationIds,
        scheduledCount,
        scheduledTime: `${hour}:${minute}`,
        nextOccurrence: format(testTime, 'PPpp')
      };
    } else {
      console.log('❌ Failed to schedule any test occurrences!');
      return { success: false, error: 'No notifications could be scheduled' };
    }
  } catch (error) {
    console.error('Error in test daily notification:', error);
    return { success: false, error: error.message };
  }
};

export default {
  registerForPushNotifications,
  schedulePackingReminder,
  cancelPackingReminders,
  updatePackingReminders,
  handleNotificationResponse,
  verifyAndRestoreNotifications,
  handleNotificationAction,
  sendTestNotification,
  sendTestNotificationSequence,
  verifyNotification,
  listAllScheduledNotifications,
  testDailyNotification,
}; 