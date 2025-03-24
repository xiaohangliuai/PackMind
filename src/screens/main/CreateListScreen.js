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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../../context/AuthContext';
import { createPackingList } from '../../models/firestoreModels';
import ItemIcon from '../../components/ItemIcon';
import { v4 as uuidv4 } from 'uuid';
import firebase from '../../firebase/firebaseConfig';

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

const CreateListScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
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
  
  // Date picker handlers
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };
  
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };
  
  const handleConfirmDate = (selectedDate) => {
    setDate(selectedDate);
    hideDatePicker();
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
      Alert.alert('Error', 'Please fill in all required fields: title, activity, and date.');
      setIsLoading(false);
      return;
    }

    try {
      const user = firebase.auth().currentUser;
      
      // Create the new packing list
      const newPackingList = {
        title: title.trim(),
        activity: selectedActivity,
        destination: destination.trim(),
        date: date,
        items: items.map(item => ({ ...item, id: item.id || uuidv4() })),
        completed: false,
        userId: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Save to Firestore
      await firebase.firestore().collection('packingLists').add(newPackingList);
      
      Alert.alert('Success', 'Your packing list has been created!');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating packing list:', error);
      Alert.alert('Error', 'There was a problem creating your packing list. Please try again.');
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
            placeholder="Where am I going..."
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
          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="Where are you going?"
            value={destination}
            onChangeText={setDestination}
            placeholderTextColor="#A0A0A0"
          />
          
          {/* Date */}
          <Text style={styles.label}>Date & Time</Text>
          <TouchableOpacity style={styles.dateButton} onPress={showDatePicker}>
            <Text style={styles.dateText}>{format(date, 'MMMM d, yyyy h:mm a')}</Text>
            <Ionicons name="calendar-outline" size={22} color="#4a4a4a" />
          </TouchableOpacity>
          
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="datetime"
            date={date}
            onConfirm={handleConfirmDate}
            onCancel={hideDatePicker}
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
    borderColor: '#6E8B3D',
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
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#6E8B3D',
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
    backgroundColor: '#6E8B3D',
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