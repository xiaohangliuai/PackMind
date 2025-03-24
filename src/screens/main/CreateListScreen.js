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

// Activity types with emojis
const activityTypes = [
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'beach', label: 'Beach', emoji: '🏖️' },
  { id: 'camping', label: 'Camping', emoji: '🏕️' },
  { id: 'hiking', label: 'Hiking', emoji: '🥾' },
  { id: 'skiing', label: 'Skiing', emoji: '🎿' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'gym', label: 'Gym', emoji: '🏋️' },
  { id: 'other', label: 'Other', emoji: '📦' },
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
      Alert.alert('Error', 'Please enter a title for your packing list');
      return false;
    }
    
    if (!selectedActivity) {
      Alert.alert('Error', 'Please select an activity type');
      return false;
    }
    
    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item to your packing list');
      return false;
    }
    
    return true;
  };
  
  // Save packing list
  const handleSaveList = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (!user || !user.uid) {
        throw new Error('No authenticated user found');
      }
      
      // Debug information
      console.log('Creating list with user ID:', user.uid);
      console.log('Selected activity:', selectedActivity);
      
      const newList = {
        title: title.trim(),
        activity: selectedActivity.id,
        destination: destination.trim() || null,
        date: date, // This will be converted to Timestamp in the model
        items: items,
        userId: user.uid,
        sharedWith: [],
        // Add additional metadata to help with debugging
        createdBy: user.email || 'anonymous',
        clientTimestamp: new Date().toISOString()
      };
      
      // Debug - log the list being created
      console.log('Creating packing list:', JSON.stringify(newList));
      
      try {
        const docRef = await createPackingList(newList);
        console.log('List created successfully with ID:', docRef.id);
        
        Alert.alert(
          'Success',
          'Your packing list has been created!',
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      } catch (innerError) {
        console.error('Error in createPackingList:', innerError);
        
        // Special handling for permission-denied errors
        if (innerError.code === 'permission-denied') {
          Alert.alert(
            'Permission Error',
            'You do not have permission to create lists. This may be due to Firebase security rules. Please contact support.',
            [{ text: 'OK' }]
          );
        } else {
          throw innerError; // Rethrow for general error handling
        }
      }
    } catch (error) {
      console.error('Error creating packing list:', error);
      
      // More specific error message
      let errorMessage = 'Failed to create packing list. Please try again.';
      if (error.code) {
        errorMessage += ` (Error code: ${error.code})`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render item in the list
  const renderItem = (item, index) => {
    return (
      <View key={item.id} style={styles.itemContainer}>
        <ItemIcon type={item.type} size={20} />
        <Text style={styles.itemName}>{item.name}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.id)}
        >
          <Ionicons name="close-circle" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Packing List</Text>
          </View>
          
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>List Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Weekend Trip to the Beach"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
          </View>
          
          {/* Activity Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Activity Type</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activityTypeContainer}
            >
              {activityTypes.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityTypeButton,
                    selectedActivity?.id === activity.id && styles.selectedActivityButton,
                  ]}
                  onPress={() => setSelectedActivity(activity)}
                >
                  <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                  <Text style={[
                    styles.activityLabel,
                    selectedActivity?.id === activity.id && styles.selectedActivityLabel,
                  ]}>
                    {activity.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Destination Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Destination (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Malibu Beach"
              value={destination}
              onChangeText={setDestination}
            />
          </View>
          
          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={showDatePicker}>
              <Text style={styles.datePickerText}>
                {format(date, 'MMMM d, yyyy')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#777" />
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              onConfirm={handleConfirmDate}
              onCancel={hideDatePicker}
              date={date}
            />
          </View>
          
          {/* Items List */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedActivity
                ? `Suggested items for ${selectedActivity.label}`
                : 'Select an activity type to see suggested items'}
            </Text>
            
            {/* Add New Item */}
            <View style={styles.addItemContainer}>
              <TextInput
                style={styles.addItemInput}
                placeholder="Add a new item..."
                value={newItemName}
                onChangeText={setNewItemName}
                onSubmitEditing={handleAddItem}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddItem}
                disabled={!newItemName.trim()}
              >
                <Ionicons
                  name="add-circle"
                  size={24}
                  color={newItemName.trim() ? '#6E8B3D' : '#BDBDBD'}
                />
              </TouchableOpacity>
            </View>
            
            {/* Items List */}
            <View style={styles.itemsList}>
              {items.length > 0 ? (
                items.map(renderItem)
              ) : (
                <Text style={styles.emptyListText}>
                  {selectedActivity
                    ? 'No items added yet. Add some items to your list.'
                    : 'Select an activity type to see suggested items.'}
                </Text>
              )}
            </View>
          </View>
          
          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveList}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Create List</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  activityTypeContainer: {
    paddingVertical: 10,
  },
  activityTypeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    width: 80,
    height: 80,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
    padding: 10,
  },
  selectedActivityButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#6E8B3D',
  },
  activityEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  activityLabel: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  selectedActivityLabel: {
    color: '#6E8B3D',
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 15,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  itemsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 15,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginRight: 10,
  },
  addItemButton: {
    padding: 5,
  },
  itemsList: {
    marginTop: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  removeButton: {
    padding: 5,
  },
  emptyListText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    padding: 20,
  },
  saveButton: {
    backgroundColor: '#6E8B3D',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateListScreen;