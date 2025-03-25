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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { createPackingList } from '../../models/firestoreModels';
import ItemIcon from '../../components/ItemIcon';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import { v4 as uuidv4 } from 'uuid';
import firebase from '../../firebase/firebaseConfig';
import * as NotificationService from '../../services/NotificationService';
import { COLORS, THEME } from '../../constants/theme';

// Activity types with emojis
const activityTypes = [
  { id: 'other', label: 'Custom', emoji: '📦' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'beach', label: 'Beach', emoji: '🏖️' },
  { id: 'camping', label: 'Camping', emoji: '🏕️' },
  { id: 'hiking', label: 'Hiking', emoji: '🥾' },
  { id: 'skiing', label: 'Skiing', emoji: '🎿' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'gym', label: 'Gym', emoji: '🏋️' },
];

// Template items for each activity type
const activityTemplates = {
  travel: [
    { id: '1', name: 'Passport', type: 'passport', checked: false },
    { id: '2', name: 'Phone Charger', type: 'charger', checked: false },
    { id: '3', name: 'Toiletries', type: 'toothbrush', checked: false },
    { id: '4', name: 'T-shirts', type: 'shirt', checked: false },
    { id: '5', name: 'Pants', type: 'pants', checked: false },
    { id: '6', name: 'Socks', type: 'socks', checked: false },
    { id: '7', name: 'Underwear', type: 'underwear', checked: false },
  ],
  beach: [
    { id: '1', name: 'Swimwear', type: 'swimwear', checked: false },
    { id: '2', name: 'Sunscreen', type: 'default', checked: false },
    { id: '3', name: 'Sunglasses', type: 'sunglasses', checked: false },
    { id: '4', name: 'Beach Towel', type: 'towel', checked: false },
    { id: '5', name: 'Sandals', type: 'sandals', checked: false },
  ],
  camping: [
    { id: '1', name: 'Tent', type: 'tent', checked: false },
    { id: '2', name: 'Sleeping Bag', type: 'sleepingBag', checked: false },
    { id: '3', name: 'Flashlight', type: 'default', checked: false },
    { id: '4', name: 'First Aid Kit', type: 'medicine', checked: false },
    { id: '5', name: 'Water Bottle', type: 'water', checked: false },
  ],
  hiking: [
    { id: '1', name: 'Hiking Boots', type: 'hikingBoots', checked: false },
    { id: '2', name: 'Water Bottle', type: 'water', checked: false },
    { id: '3', name: 'Hat', type: 'hat', checked: false },
    { id: '4', name: 'Backpack', type: 'default', checked: false },
    { id: '5', name: 'Snacks', type: 'snacks', checked: false },
  ],
  skiing: [
    { id: '1', name: 'Ski Jacket', type: 'jacket', checked: false },
    { id: '2', name: 'Ski Pants', type: 'pants', checked: false },
    { id: '3', name: 'Gloves', type: 'gloves', checked: false },
    { id: '4', name: 'Ski Goggles', type: 'sunglasses', checked: false },
    { id: '5', name: 'Thermal Underwear', type: 'underwear', checked: false },
  ],
  business: [
    { id: '1', name: 'Laptop', type: 'laptop', checked: false },
    { id: '2', name: 'Charger', type: 'charger', checked: false },
    { id: '3', name: 'Business Cards', type: 'id', checked: false },
    { id: '4', name: 'Dress Shoes', type: 'shoes', checked: false },
    { id: '5', name: 'Formal Clothes', type: 'shirt', checked: false },
  ],
  gym: [
    { id: '1', name: 'Gym Shoes', type: 'shoes', checked: false },
    { id: '2', name: 'Water Bottle', type: 'water', checked: false },
    { id: '3', name: 'Workout Clothes', type: 'shirt', checked: false },
    { id: '4', name: 'Towel', type: 'towel', checked: false },
    { id: '5', name: 'Headphones', type: 'headphones', checked: false },
  ],
  other: [],
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CreateListScreen = ({ navigation }) => {
  const { user } = useAuth();
  
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
    setDateTimePickerVisible(true);
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
  
  // Save packing list
  const handleSaveList = async () => {
    setIsLoading(true);
    // Validate the form fields
    if (!title.trim() || !selectedActivity || !date) {
      Alert.alert('', 'Please fill in all required fields: title, activity, and date.');
      setIsLoading(false);
      return;
    }

    try {
      const user = firebase.auth().currentUser;
      
      // Create the new packing list
      const newPackingList = {
        title: title.trim(),
        activity: selectedActivity.id,
        destination: destination.trim(),
        date: date,
        recurrence: recurrence,
        items: items.map(item => ({ ...item, id: item.id || uuidv4() })),
        completed: false,
        userId: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Save to Firestore
      const docRef = await firebase.firestore().collection('packingLists').add(newPackingList);
      
      // Schedule notifications if recurrence is set
      if (recurrence && recurrence.type !== 'none') {
        try {
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
        } catch (notifError) {
          console.error('Error scheduling notification:', notifError);
          // Continue without notification if there's an error
        }
      }
      
      // No success alert
      navigation.goBack();
    } catch (error) {
      console.error('Error creating packing list:', error);
      Alert.alert('', 'There was a problem creating your packing list. Please try again.');
    } finally {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Create Packing List</Text>
          
          {/* List Title */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe your packing list..."
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#A0A0A0"
          />
          
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
                  <Text style={styles.activityLabel}>{activity.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          {/* Destination */}
          <Text style={styles.label}>Destination (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Where are you going?"
            value={destination}
            onChangeText={setDestination}
            placeholderTextColor="#A0A0A0"
          />
          
          {/* Date & Time */}
          <Text style={styles.label}>Date & Time</Text>
          <TouchableOpacity style={styles.dateButton} onPress={showDateTimePicker}>
            <View style={styles.dateTimeContent}>
              <View style={styles.dateTimeMain}>
                <Ionicons name="calendar-outline" size={22} color="#666" style={styles.dateIcon} />
                <Text style={styles.dateText}>{format(date, 'MMM d, h:mm a')}</Text>
              </View>
              {formatRecurrence(recurrence) && (
                <View style={styles.recurrenceContainer}>
                  <Ionicons name="repeat" size={16} color={THEME.PRIMARY} />
                  <Text style={styles.recurrenceText}>{formatRecurrence(recurrence)}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={22} color="#666" />
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
            <TextInput
              style={styles.addItemInput}
              placeholder="Add an item..."
              value={newItemName}
              onChangeText={setNewItemName}
              placeholderTextColor="#A0A0A0"
              onSubmitEditing={handleAddItem}
            />
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddItem}
            >
              <Ionicons name="add" size={22} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Items list */}
          <View style={styles.itemsList}>
            {items.map((item, index) => renderItem(item, index))}
          </View>
          
          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveList}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Create Packing List</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
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
    height: 80,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
  },
  activityTypeSelected: {
    borderWidth: 2,
    borderColor: THEME.PRIMARY,
  },
  activityEmoji: {
    fontSize: 28,
    marginBottom: 5,
  },
  activityLabel: {
    fontSize: 12,
    color: '#4a4a4a',
  },
  dateButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#333',
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
    color: THEME.PRIMARY,
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
    borderBottomColor: '#F0F0F0',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginRight: 10,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  addItemContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 8,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsList: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
});

export default CreateListScreen;