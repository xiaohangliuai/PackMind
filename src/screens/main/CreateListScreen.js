// src/screens/main/CreateListScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { usePremium } from '../../context/PremiumContext';
import { createPackingList } from '../../models/firestoreModels';
import ItemIcon from '../../components/ItemIcon';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import { v4 as uuidv4 } from 'uuid';
import firebase from '../../firebase/firebaseConfig';
import * as NotificationService from '../../services/NotificationService';
import { COLORS, THEME, TYPOGRAPHY, GRADIENTS } from '../../constants/theme';
import { useActivityTracker } from '../../hooks/useActivityTracker';

// Activity types with emojis
const activityTypes = [
  { id: 'other', label: 'Custom', emoji: '📝' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'travel', label: 'Traveling', emoji: '✈️' },
  { id: 'snowboarding', label: 'Snowboarding', emoji: '🏂' },
  { id: 'beach', label: 'Beach', emoji: '🏖️' },
  { id: 'hiking', label: 'Hiking', emoji: '🥾' },
  { id: 'camping', label: 'Camping', emoji: '⛺' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊‍♂️' },
  { id: 'cycling', label: 'Cycling', emoji: '🚴‍♀️' },
  { id: 'rockclimbing', label: 'Rock Climbing', emoji: '🧗‍♀️' },
  { id: 'fishing', label: 'Fishing', emoji: '🎣' },
  { id: 'yoga', label: 'Yoga', emoji: '🧘‍♀️' },
];

// Template items for each activity type
const activityTemplates = {
  grocery: [
    { id: '1', name: 'Reusable Shopping Bag', type: 'shoppingBag', checked: false },
    { id: '2', name: 'Eggs', type: 'eggs', checked: false },
    { id: '3', name: 'Steak', type: 'steak', checked: false },
    { id: '4', name: 'Chicken Breast', type: 'chickenBreast', checked: false },
    { id: '5', name: 'Bacon', type: 'bacon', checked: false },
    { id: '6', name: 'Milk', type: 'milk', checked: false },
    { id: '7', name: 'Vegetables', type: 'vegetables', checked: false },
    { id: '8', name: 'Tissues', type: 'tissues', checked: false },
    { id: '9', name: 'Bread', type: 'bread', checked: false },
    { id: '10', name: 'Cheese', type: 'cheese', checked: false },
    { id: '11', name: 'Fruits', type: 'fruits', checked: false },
  ],
  travel: [
    { id: '1', name: 'ID Card/Passport', type: 'passport', checked: false },
    { id: '2', name: 'Headphones', type: 'headphones', checked: false },
    { id: '3', name: 'Wallet/Credit/Debit Cards', type: 'wallet', checked: false },
    { id: '4', name: 'Phone Charger', type: 'charger', checked: false },
    { id: '5', name: 'Toiletries', type: 'toiletries', checked: false },
    { id: '6', name: 'Towels', type: 'towel', checked: false },
    { id: '7', name: 'T-shirts', type: 'shirt', checked: false },
    { id: '8', name: 'Pants', type: 'pants', checked: false },
    { id: '9', name: 'Socks', type: 'socks', checked: false },
    { id: '10', name: 'Underwear', type: 'underwear', checked: false },
    { id: '11', name: 'Bra', type: 'bra', checked: false },
    { id: '12', name: 'Sunglasses', type: 'sunglasses', checked: false },
    { id: '13', name: 'Power Bank', type: 'powerBank', checked: false },
  ],
  snowboarding: [
    { id: '1', name: 'Snowboard', type: 'snowboard', checked: false },
    { id: '2', name: 'Helmet', type: 'helmet', checked: false },
    { id: '3', name: 'Goggles', type: 'goggles', checked: false },
    { id: '4', name: 'Ski Mask', type: 'skiMask', checked: false },
    { id: '5', name: 'Snowboarding Jacket', type: 'jacket', checked: false },
    { id: '6', name: 'Snowboarding Gloves', type: 'gloves', checked: false },
    { id: '7', name: 'Snowboarding Pants', type: 'pants', checked: false },
    { id: '8', name: 'Snowboarding Socks', type: 'socks', checked: false },
    { id: '9', name: 'Snowboarding Boots', type: 'boots', checked: false },
    { id: '10', name: 'Body Protection', type: 'bodyProtection', checked: false },
    { id: '11', name: 'Lift Ticket/Season Pass', type: 'tickets', checked: false },
    { id: '12', name: 'Energy Snacks', type: 'snacks', checked: false },
  ],
  beach: [
    { id: '1', name: 'Swimsuit', type: 'swimwear', checked: false },
    { id: '2', name: 'Sunscreen', type: 'sunscreen', checked: false },
    { id: '3', name: 'Sunglasses', type: 'sunglasses', checked: false },
    { id: '4', name: 'Hat', type: 'hat', checked: false },
    { id: '5', name: 'Beach Towel', type: 'towel', checked: false },
    { id: '6', name: 'Water', type: 'water', checked: false },
    { id: '7', name: 'Snacks', type: 'snacks', checked: false },
    { id: '8', name: 'Flip-flops', type: 'sandals', checked: false },
  ],
  hiking: [
    { id: '1', name: 'Hiking Boots', type: 'hikingBoots', checked: false },
    { id: '2', name: 'Hat', type: 'hat', checked: false },
    { id: '3', name: 'Sunglasses', type: 'sunglasses', checked: false },
    { id: '4', name: 'Sunscreen', type: 'sunscreen', checked: false },
    { id: '5', name: 'Water', type: 'water', checked: false },
    { id: '6', name: 'First Aid Kit', type: 'firstAid', checked: false },
    { id: '7', name: 'Snacks', type: 'snacks', checked: false },
  ],
  camping: [
    { id: '1', name: 'Tent', type: 'tent', checked: false },
    { id: '2', name: 'Sleeping Bag', type: 'sleepingBag', checked: false },
    { id: '3', name: 'Sleeping Pad', type: 'sleepingPad', checked: false },
    { id: '4', name: 'Flashlight', type: 'flashlight', checked: false },
    { id: '5', name: 'First Aid Kit', type: 'firstAid', checked: false },
    { id: '6', name: 'Bug Spray', type: 'bugSpray', checked: false },
    { id: '7', name: 'Water', type: 'water', checked: false },
    { id: '8', name: 'Lighter', type: 'lighter', checked: false },
  ],
  swimming: [
    { id: '1', name: 'Swimsuit', type: 'swimwear', checked: false },
    { id: '2', name: 'Swim Cap', type: 'swimCap', checked: false },
    { id: '3', name: 'Goggles', type: 'goggles', checked: false },
    { id: '4', name: 'Towel', type: 'towel', checked: false },
    { id: '5', name: 'Sunscreen', type: 'sunscreen', checked: false },
    { id: '6', name: 'Water Shoes', type: 'waterShoes', checked: false },
    { id: '7', name: 'Water', type: 'water', checked: false },
    { id: '8', name: 'Sunglasses', type: 'sunglasses', checked: false },
  ],
  cycling: [
    { id: '1', name: 'Helmet', type: 'helmet', checked: false },
    { id: '2', name: 'Sunglasses', type: 'sunglasses', checked: false },
    { id: '3', name: 'Bicycle', type: 'bicycle', checked: false },
    { id: '4', name: 'Cycling Shoes', type: 'cyclingShoes', checked: false },
    { id: '5', name: 'Gloves', type: 'gloves', checked: false },
    { id: '6', name: 'Water', type: 'water', checked: false },
    { id: '7', name: 'Bike Lock', type: 'bikeLock', checked: false },
  ],
  rockclimbing: [
    { id: '1', name: 'Climbing Shoes', type: 'climbingShoes', checked: false },
    { id: '2', name: 'Rope', type: 'rope', checked: false },
    { id: '3', name: 'Carabiners', type: 'carabiners', checked: false },
    { id: '4', name: 'Climbing Chalk', type: 'chalk', checked: false },
    { id: '5', name: 'Helmet', type: 'helmet', checked: false },
    { id: '6', name: 'Harness', type: 'harness', checked: false },
    { id: '7', name: 'Water', type: 'water', checked: false },
    { id: '8', name: 'Energy Snacks', type: 'snacks', checked: false },
    { id: '9', name: 'First Aid Kit', type: 'firstAid', checked: false },
    { id: '10', name: 'Climbing Bag', type: 'climbingBag', checked: false },
  ],
  fishing: [
    { id: '1', name: 'Fishing Rod', type: 'fishingRod', checked: false },
    { id: '2', name: 'Hooks', type: 'hooks', checked: false },
    { id: '3', name: 'Lures', type: 'lures', checked: false },
    { id: '4', name: 'Fishing Line', type: 'fishingLine', checked: false },
    { id: '5', name: 'Portable Chair', type: 'chair', checked: false },
    { id: '6', name: 'Hat', type: 'hat', checked: false },
    { id: '7', name: 'Sunglasses', type: 'sunglasses', checked: false },
    { id: '8', name: 'Tackle Box', type: 'tackleBox', checked: false },
    { id: '9', name: 'Sunscreen', type: 'sunscreen', checked: false },
    { id: '10', name: 'Water', type: 'water', checked: false },
  ],
  yoga: [
    { id: '1', name: 'Yoga Mat', type: 'yogaMat', checked: false },
    { id: '2', name: 'Comfortable Top', type: 'shirt', checked: false },
    { id: '3', name: 'Yoga Pants', type: 'pants', checked: false },
    { id: '4', name: 'Grip Socks', type: 'socks', checked: false },
    { id: '5', name: 'Small Towel', type: 'towel', checked: false },
    { id: '6', name: 'Water', type: 'water', checked: false },
    { id: '7', name: 'Yoga Bag', type: 'yogaBag', checked: false },
    { id: '8', name: 'Mat Cleaner', type: 'matCleaner', checked: false },
    { id: '9', name: 'Yoga Blanket', type: 'blanket', checked: false },
  ],
  other: [],
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CreateListScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  
  // Try to get premium context - use try/catch to prevent errors during initialization
  let isPremium = false;
  let limits = { MAX_LISTS: 3 };
  let canCreateMoreLists = async () => true;
  let subscriptionType = 'trial'; // Assuming a default subscription type
  try {
    const premiumContext = usePremium();
    isPremium = premiumContext.isPremium;
    limits = premiumContext.limits;
    canCreateMoreLists = premiumContext.canCreateMoreLists;
    subscriptionType = premiumContext.subscriptionType;
  } catch (error) {
    console.log('Premium context not yet available, using defaults');
  }
  
  // Track user activity for guest users
  useActivityTracker();
  
  // Form state
  const [title, setTitle] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date());
  const [isDateTimePickerVisible, setDateTimePickerVisible] = useState(false);
  const [recurrence, setRecurrence] = useState({ type: 'none', interval: 1, days: [] });
  const [newItemName, setNewItemName] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Set template items when activity changes
  useEffect(() => {
    if (selectedActivity) {
      // Create deep copy of template items with new IDs
      const templateItems = activityTemplates[selectedActivity.id].map(item => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9), // Generate unique ID
      }));
      
      setItems(templateItems);
    } else {
      setItems([]);
    }
  }, [selectedActivity]);
  
  // Date time picker handlers
  const showDateTimePicker = () => {
    try {
      // Check if user has premium access (includes both premium and trial users)
      if (!isPremium && subscriptionType !== 'trial') {
        Alert.alert(
          'Premium Feature',
          'Notifications are a premium feature. Please upgrade to PackMind+ Premium to enable reminders for your packing lists.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'View Premium', 
              onPress: () => navigation.navigate('Premium')
            }
          ]
        );
        return;
      }
      
      setDateTimePickerVisible(true);
    } catch (error) {
      console.log('Error in showDateTimePicker:', error);
      // Default to showing picker if premium context fails
      setDateTimePickerVisible(true);
    }
  };
  
  const hideDateTimePicker = () => {
    setDateTimePickerVisible(false);
  };
  
  const handleSaveDateTime = (selectedDate, reminderRecurrence) => {
    setDate(selectedDate);
    setRecurrence(reminderRecurrence);
  };
  
  // Add new item to the list
  const handleAddItem = () => {
    if (!newItemName.trim()) {
      return;
    }
    
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      type: 'default', // Default icon
      checked: false,
    };
    
    setItems([...items, newItem]);
    setNewItemName('');
  };
  
  // Remove item from the list
  const handleRemoveItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
  };
  
  // Change item type (icon)
  const handleChangeItemType = (itemId, newType) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return { ...item, type: newType };
      }
      return item;
    }));
  };
  
  // Validate form before saving
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert(
        '',
        'Please enter a description for your packing list'
      );
      return false;
    }
    
    if (!selectedActivity) {
      Alert.alert(
        '',
        'Please select an activity type'
      );
      return false;
    }
    
    if (items.length === 0) {
      Alert.alert(
        '',
        'Please add at least one item to your packing list'
      );
      return false;
    }
    
    return true;
  };
  
  // Save packing list with premium check
  const handleSaveList = async () => {
    try {
      setIsLoading(true);
      // Validate the form fields
      if (!title.trim() || !selectedActivity || !date) {
        Alert.alert('', 'Please fill in all required fields: title, activity, and date.');
        setIsLoading(false);
        return;
      }

      try {
        const user = firebase.auth().currentUser;
        
        // Check list limit for all users
        // Allow both premium users and trial users to have unlimited lists
        if (!isPremium && subscriptionType !== 'trial') {
          // Get current count of user's packing lists
          const snapshot = await firebase.firestore()
            .collection('packingLists')
            .where('userId', '==', user.uid)
            .get();
            
          const currentListCount = snapshot.docs.length;
          
          // If reached limit, show premium upgrade prompt
          if (currentListCount >= limits.MAX_LISTS) {
            Alert.alert(
              'List Limit Reached',
              `You've reached the maximum of ${limits.MAX_LISTS} lists on the free plan. ${
                user.isAnonymous 
                  ? 'Create an account and upgrade to Premium for unlimited lists.' 
                  : 'Upgrade to Premium for unlimited lists.'
              }`,
              [
                { text: 'Not Now', style: 'cancel' },
                { 
                  text: 'View Premium', 
                  onPress: () => {
                    setIsLoading(false);
                    navigation.navigate('Premium');
                  }
                }
              ]
            );
            setIsLoading(false);
            return;
          }
        }

        // Check premium status for notification settings
        // Allow both premium and trial users to have notification access
        const hasNotificationAccess = isPremium || subscriptionType === 'trial';
        
        // If user is trying to use notifications but isn't premium or trial
        if (!hasNotificationAccess && 
            recurrence && 
            recurrence.notificationsEnabled) {
          
          // Show premium upgrade prompt
          Alert.alert(
            'Premium Feature',
            'Notifications are a premium feature. Please upgrade to PackMind+ Premium to enable reminders for your packing lists.',
            [
              { text: 'Not Now', style: 'cancel' },
              { 
                text: 'View Premium', 
                onPress: () => {
                  setIsLoading(false);
                  navigation.navigate('Premium');
                  return;
                }
              }
            ]
          );
          setIsLoading(false);
          return;
        }
        
        // If user is not premium, disable notifications entirely
        const finalRecurrence = hasNotificationAccess ? recurrence : {
          ...recurrence,
          notificationsEnabled: false,
          notificationType: 'none'
        };
        
        // Create the new packing list
        const newPackingList = {
          title: title.trim(),
          activity: selectedActivity.id,
          destination: destination.trim(),
          date: date,
          recurrence: finalRecurrence,
          items: items.map(item => ({ ...item, id: item.id || uuidv4() })),
          completed: false,
          userId: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore
        const docRef = await firebase.firestore().collection('packingLists').add(newPackingList);
        
        // Schedule notifications if recurrence is set and notifications are enabled
        const shouldScheduleNotification = recurrence && 
                                          (recurrence.notificationsEnabled === true) && 
                                          (recurrence.notificationType === 'one-time' || recurrence.notificationType === 'recurring');

        console.log('Should schedule notification:', shouldScheduleNotification);
        console.log('Recurrence details:', recurrence);
        console.log('Notification type:', recurrence?.notificationType);

        if (shouldScheduleNotification) {
          try {
            console.log('Attempting to schedule notification for:', title.trim());
            const notificationId = await NotificationService.schedulePackingReminder(
              docRef.id,
              title.trim(),
              destination ? `Don't forget to pack for ${destination}!` : null,
              date,
              recurrence
            );
            
            // Update the document with the notification ID
            await docRef.update({
              notificationId: notificationId
            });
            
            console.log('Notification scheduled with ID:', notificationId);
            
            // Verify the notification is scheduled correctly
            await NotificationService.verifyNotification(notificationId);
            
            // List all scheduled notifications for debugging
            await NotificationService.listAllScheduledNotifications();
            
            // Show explanation for recurring notifications
            if (recurrence.type !== 'none' && recurrence.notificationType === 'recurring') {
              let message = '';
              const timeStr = format(date, 'h:mm a');
              
              switch (recurrence.type) {
                case 'daily':
                  message = `Daily reminder set for ${timeStr}.\n\nWe've scheduled the next 14 daily occurrences for you.`;
                  break;
                case 'weekly':
                  const days = recurrence.days.map(day => WEEKDAYS[day]).join(', ');
                  message = `Weekly reminder set for ${days} at ${timeStr}.\n\nWe've scheduled the next 4 weeks of occurrences for you.`;
                  break;
                case 'monthly':
                  message = `Monthly reminder set for day ${date.getDate()} at ${timeStr}.\n\nWe've scheduled the next 3 monthly occurrences for you.`;
                  break;
              }
              
              Alert.alert(
                'Recurring Reminder Set',
                `${message}`,
                [{ text: 'OK' }]
              );
            }
          } catch (notifError) {
            console.error('Error scheduling notification:', notifError);
            // Continue without notification if there's an error
          }
        } else {
          console.log('No notifications scheduled: recurrence type is none or notifications are disabled');
        }
        
        // No success alert
        navigation.goBack();
      } catch (error) {
        console.error('Error in premium check:', error);
        
        // Fallback to non-premium behavior if there's an error
        const finalRecurrence = {
          ...recurrence,
          notificationsEnabled: false,
          notificationType: 'none'
        };
        
        // Create the new packing list
        const newPackingList = {
          title: title.trim(),
          activity: selectedActivity.id,
          destination: destination.trim(),
          date: date,
          recurrence: finalRecurrence,
          items: items.map(item => ({ ...item, id: item.id || uuidv4() })),
          completed: false,
          userId: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore
        const docRef = await firebase.firestore().collection('packingLists').add(newPackingList);
        
        // Schedule notifications if recurrence is set and notifications are enabled
        const shouldScheduleNotification = recurrence && 
                                          (recurrence.notificationsEnabled === true) && 
                                          (recurrence.notificationType === 'one-time' || recurrence.notificationType === 'recurring');

        console.log('Should schedule notification:', shouldScheduleNotification);
        console.log('Recurrence details:', recurrence);
        console.log('Notification type:', recurrence?.notificationType);

        if (shouldScheduleNotification) {
          try {
            console.log('Attempting to schedule notification for:', title.trim());
            const notificationId = await NotificationService.schedulePackingReminder(
              docRef.id,
              title.trim(),
              destination ? `Don't forget to pack for ${destination}!` : null,
              date,
              recurrence
            );
            
            // Update the document with the notification ID
            await docRef.update({
              notificationId: notificationId
            });
            
            console.log('Notification scheduled with ID:', notificationId);
            
            // Verify the notification is scheduled correctly
            await NotificationService.verifyNotification(notificationId);
            
            // List all scheduled notifications for debugging
            await NotificationService.listAllScheduledNotifications();
            
            // Show explanation for recurring notifications
            if (recurrence.type !== 'none' && recurrence.notificationType === 'recurring') {
              let message = '';
              const timeStr = format(date, 'h:mm a');
              
              switch (recurrence.type) {
                case 'daily':
                  message = `Daily reminder set for ${timeStr}.\n\nWe've scheduled the next 14 daily occurrences for you.`;
                  break;
                case 'weekly':
                  const days = recurrence.days.map(day => WEEKDAYS[day]).join(', ');
                  message = `Weekly reminder set for ${days} at ${timeStr}.\n\nWe've scheduled the next 4 weeks of occurrences for you.`;
                  break;
                case 'monthly':
                  message = `Monthly reminder set for day ${date.getDate()} at ${timeStr}.\n\nWe've scheduled the next 3 monthly occurrences for you.`;
                  break;
              }
              
              Alert.alert(
                'Recurring Reminder Set',
                `${message}`,
                [{ text: 'OK' }]
              );
            }
          } catch (notifError) {
            console.error('Error scheduling notification:', notifError);
            // Continue without notification if there's an error
          }
        } else {
          console.log('No notifications scheduled: recurrence type is none or notifications are disabled');
        }
        
        // No success alert
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error in handleSaveList:', error);
      Alert.alert('', 'There was a problem creating your packing list. Please try again.');
      setIsLoading(false);
    }
  };

  // Render an item in the list
  const renderItem = (item, index) => {
    return (
      <View key={item.id} style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <TouchableOpacity 
            style={styles.itemIconContainer}
            onPress={() => item.type === 'default' ? null : handleChangeItemType(item.id, 'default')}
            onLongPress={() => handleChangeItemType(item.id, item.type === 'default' ? 'shirt' : 'default')}
          >
            <ItemIcon type={item.type} size={24} />
          </TouchableOpacity>
          <Text style={styles.itemText}>{item.name}</Text>
        </View>
        <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
          <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    );
  };

  // Format the recurrence text
  const formatRecurrence = (recurrence) => {
    if (!recurrence || recurrence.type === 'none') {
      return null;
    }
    
    switch (recurrence.type) {
      case 'daily':
        return 'Repeats daily';
      case 'weekly':
        if (recurrence.days && recurrence.days.length > 0) {
          // Sort days to display in order from Sunday to Saturday
          const selectedDays = recurrence.days
            .sort((a, b) => a - b)
            .map(index => WEEKDAYS[index]);
            
          // Different formatting based on number of selected days
          if (selectedDays.length === 1) {
            return `Every ${selectedDays[0]}`;
          } else if (selectedDays.length === 7) {
            return 'Every day';
          } else if (selectedDays.length <= 3) {
            return `Every ${selectedDays.join(', ')}`;
          } else {
            return `${selectedDays.length} days weekly`;
          }
        }
        return 'Repeats weekly';
      case 'monthly':
        return 'Repeats monthly';
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
      
      {/* Background patterns */}
      <View style={styles.backgroundPatterns}>
        <View style={styles.circlePattern1} />
        <View style={styles.circlePattern2} />
        <View style={styles.circlePattern3} />
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={THEME.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Create Packing List</Text>
          <View style={{width: 40}} />
        </View>
        
        <ScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* List Title */}
          <Text style={styles.label}>Description</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Describe your packing list..."
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={THEME.TEXT.TERTIARY}
            />
          </View>
          
          {/* Activity Type */}
          <Text style={styles.label}>Activity Type</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activityScroll}
          >
            <View style={styles.activityGrid}>
              {activityTypes.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityTypeButton,
                    selectedActivity?.id === activity.id && styles.activityTypeSelected,
                  ]}
                  onPress={() => setSelectedActivity(activity)}
                >
                  <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                  <Text style={[
                    styles.activityLabel,
                    selectedActivity?.id === activity.id && styles.activityLabelSelected
                  ]}>{activity.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          {/* Destination */}
          <Text style={styles.label}>Destination (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Where are you going?"
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor={THEME.TEXT.TERTIARY}
            />
          </View>
          
          {/* Date & Time */}
          <Text style={styles.label}>Date & Time</Text>
          <TouchableOpacity 
            style={styles.dateButton} 
            onPress={showDateTimePicker}
          >
            <View style={styles.dateTimeContent}>
              <View style={styles.dateTimeMain}>
                <Ionicons name="calendar-outline" size={22} color={COLORS.INDIGO} style={styles.dateIcon} />
                <Text style={styles.dateText}>{format(date, 'MMM d, h:mm a')}</Text>
              </View>
              {formatRecurrence(recurrence) && (
                <View style={styles.recurrenceContainer}>
                  <Ionicons name="repeat" size={16} color={COLORS.INDIGO} />
                  <Text style={styles.recurrenceText}>{formatRecurrence(recurrence)}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.INDIGO} />
          </TouchableOpacity>
          
          <CustomDateTimePicker
            isVisible={isDateTimePickerVisible}
            onClose={hideDateTimePicker}
            onSave={handleSaveDateTime}
            initialDate={date}
            initialRecurrence={recurrence}
          />
          
          {/* Items */}
          <Text style={styles.label}>Items</Text>
          <Text style={styles.suggestionText}>
            Select an activity type to see suggested items
          </Text>
          
          {/* Add new item */}
          <View style={styles.addItemContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.addItemInput}
                placeholder="Add an item..."
                value={newItemName}
                onChangeText={setNewItemName}
                placeholderTextColor={THEME.TEXT.TERTIARY}
                onSubmitEditing={handleAddItem}
              />
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddItem}
            >
              <LinearGradient
                colors={GRADIENTS.PRIMARY}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={22} color={COLORS.WHITE} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Items list */}
          <View style={styles.itemsList}>
            {items.map((item, index) => renderItem(item, index))}
          </View>
          
          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButtonContainer}
            onPress={handleSaveList}
            disabled={isLoading}
          >
            <LinearGradient
              colors={GRADIENTS.PRIMARY}
              style={styles.saveButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.WHITE} />
              ) : (
                <Text style={styles.saveButtonText}>Create Packing List</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  backgroundPatterns: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    opacity: 0.5,
  },
  circlePattern1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.LAVENDER,
    opacity: 0.3,
  },
  circlePattern2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.INDIGO,
    opacity: 0.2,
  },
  circlePattern3: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.ROYAL,
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.RADIUS.ROUND,
    backgroundColor: COLORS.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.SHADOWS.SMALL,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    ...TYPOGRAPHY.HEADING_2,
    color: THEME.TEXT.PRIMARY,
  },
  label: {
    ...TYPOGRAPHY.BODY_1,
    fontWeight: '600',
    color: THEME.TEXT.PRIMARY,
    marginTop: 20,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    borderRadius: THEME.RADIUS.MEDIUM,
    ...THEME.SHADOWS.SMALL,
  },
  input: {
    padding: 12,
    fontSize: 16,
    color: THEME.TEXT.PRIMARY,
  },
  activityScroll: {
    marginBottom: 10,
  },
  activityGrid: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingRight: 20,
  },
  activityTypeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    width: 80,
    height: 90,
    borderRadius: THEME.RADIUS.LARGE,
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    ...THEME.SHADOWS.SMALL,
  },
  activityTypeSelected: {
    backgroundColor: COLORS.LAVENDER_15,
    borderWidth: 2,
    borderColor: COLORS.INDIGO,
  },
  activityEmoji: {
    fontSize: 28,
    marginBottom: 5,
  },
  activityLabel: {
    fontSize: 12,
    color: THEME.TEXT.SECONDARY,
  },
  activityLabelSelected: {
    color: COLORS.INDIGO,
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    borderRadius: THEME.RADIUS.MEDIUM,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...THEME.SHADOWS.SMALL,
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    color: THEME.TEXT.PRIMARY,
    fontWeight: '500',
  },
  recurrenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 30,
  },
  recurrenceText: {
    fontSize: 14,
    color: COLORS.INDIGO,
    fontWeight: '500',
    marginLeft: 6,
    flexShrink: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.UI.DIVIDER,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.LAVENDER_15,
    borderRadius: THEME.RADIUS.MEDIUM,
    marginRight: 10,
  },
  itemText: {
    fontSize: 16,
    color: THEME.TEXT.PRIMARY,
    flex: 1,
  },
  addItemContainer: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  addItemInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: THEME.TEXT.PRIMARY,
  },
  addButton: {
    marginLeft: 10,
    ...THEME.SHADOWS.SMALL,
  },
  addButtonGradient: {
    width: 45,
    height: 45,
    borderRadius: THEME.RADIUS.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsList: {
    marginTop: 10,
  },
  saveButtonContainer: {
    marginTop: 30,
    marginBottom: 20,
    ...THEME.SHADOWS.MEDIUM,
  },
  saveButton: {
    borderRadius: THEME.RADIUS.MEDIUM,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.WHITE,
    ...TYPOGRAPHY.BUTTON,
  },
  suggestionText: {
    color: THEME.TEXT.TERTIARY,
    fontSize: 14,
    marginBottom: 10,
  },
});

export default CreateListScreen;