// src/screens/main/ListDetailsScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { getPackingList, updatePackingList, deletePackingList } from '../../models/firestoreModels';
import ItemIcon from '../../components/ItemIcon';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import firebase from '../../firebase/firebaseConfig';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ListDetailsScreen = ({ route, navigation }) => {
  const { listId } = route.params;
  const { user } = useAuth();
  
  // State
  const [packingList, setPackingList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState(null); // New state for temporary activity selection
  const [isDateTimePickerVisible, setDateTimePickerVisible] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [recurrence, setRecurrence] = useState(
    packingList?.recurrence || { type: 'none', interval: 1, days: [] }
  );
  
  // Fetch packing list data
  const fetchPackingList = async () => {
    setIsLoading(true);
    try {
      const list = await getPackingList(listId);
      
      if (!list) {
        Alert.alert('Error', 'List not found');
        navigation.goBack();
        return;
      }
      
      setPackingList(list);
      setTitle(list.title);
      setDestination(list.destination || '');
      setSelectedActivity(list.activity); // Initialize selected activity from list
      
      // Safely set the date from the list
      if (list.date) {
        try {
          // Handle both Firestore Timestamp objects and Date objects
          if (list.date.toDate) {
            setDate(list.date.toDate());
          } else {
            setDate(new Date(list.date));
          }
        } catch (error) {
          console.error('Error converting date:', error);
          setDate(new Date()); // Fallback to current date if conversion fails
        }
      } else {
        setDate(new Date());
      }
      
      setRecurrence(list.recurrence || { type: 'none', interval: 1, days: [] });
      
      setIsOwner(list.userId === user.uid);
      
    } catch (error) {
      console.error('Error fetching packing list:', error);
      Alert.alert('Error', 'Failed to load packing list');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset edit states when leaving edit mode
  const resetEditStates = () => {
    setTitle(packingList.title);
    setDestination(packingList.destination || '');
    setSelectedActivity(packingList.activity);
    setDate(packingList.date.toDate ? new Date(packingList.date.toDate()) : new Date(packingList.date));
    setRecurrence(packingList.recurrence || { type: 'none', interval: 1, days: [] });
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchPackingList();
  }, [listId]);
  
  // Handle toggling item checked state
  const handleToggleChecked = async (itemId) => {
    if (!packingList) return;
    
    const updatedItems = packingList.items.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    
    try {
      // Include updatedAt timestamp to ensure the list moves to the top on home screen
      const updates = { 
        items: updatedItems,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await updatePackingList(listId, updates);
      
      setPackingList(prevList => ({
        ...prevList,
        items: updatedItems,
        updatedAt: new Date() // Use local date as a temporary value until Firestore updates
      }));
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };
  
  // Handle reordering items
  const handleReorderItems = async ({ data }) => {
    if (!packingList) return;
    
    try {
      // Create a copy of the data to avoid modifying shared values
      const reorderedItems = [...data];
      
      // Update Firestore with the new order and timestamp
      const updates = { 
        items: reorderedItems,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await updatePackingList(listId, updates);
      
      // Update local state with functional update
      setPackingList(prevList => ({
        ...prevList,
        items: reorderedItems,
        updatedAt: new Date()
      }));
    } catch (error) {
      console.error('Error reordering items:', error);
      Alert.alert('Error', 'Failed to reorder items');
    }
  };
  
  // Handle deleting an item
  const handleDeleteItem = async (itemId) => {
    if (!packingList) return;
    
    const updatedItems = packingList.items.filter(item => item.id !== itemId);
    
    try {
      const updates = { 
        items: updatedItems,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await updatePackingList(listId, updates);
      
      setPackingList(prevList => ({
        ...prevList,
        items: updatedItems,
        updatedAt: new Date()
      }));
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  };
  
  // Handle adding a new item
  const handleAddItem = async () => {
    if (!packingList || !newItemText.trim()) return;
    
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemText.trim(),
      type: 'default',
      checked: false
    };
    
    const updatedItems = [...packingList.items, newItem];
    
    try {
      const updates = { 
        items: updatedItems,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await updatePackingList(listId, updates);
      
      setPackingList(prevList => ({
        ...prevList,
        items: updatedItems,
        updatedAt: new Date()
      }));
      setNewItemText('');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };
  
  // Add item suggestion based on activity type
  const getSuggestedItems = () => {
    const suggestions = {
      travel: ['Passport', 'Travel adapter', 'Headphones', 'Phone charger'],
      beach: ['Swimsuit', 'Sunscreen', 'Beach towel', 'Sunglasses'],
      camping: ['Tent', 'Sleeping bag', 'Flashlight', 'First aid kit'],
      hiking: ['Hiking boots', 'Water bottle', 'Backpack', 'Trail mix'],
      skiing: ['Ski jacket', 'Ski pants', 'Gloves', 'Ski goggles'],
      default: ['Clothing', 'Toiletries', 'Electronics', 'Documents']
    };
    
    return suggestions[packingList?.activity || 'default'] || suggestions.default;
  };
  
  // Add suggested item
  const handleAddSuggestedItem = async (itemName) => {
    if (!packingList) return;
    
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: itemName,
      type: 'default',
      checked: false
    };
    
    const updatedItems = [...packingList.items, newItem];
    
    try {
      const updates = { 
        items: updatedItems,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await updatePackingList(listId, updates);
      
      setPackingList(prevList => ({
        ...prevList,
        items: updatedItems,
        updatedAt: new Date()
      }));
    } catch (error) {
      console.error('Error adding suggested item:', error);
      Alert.alert('Error', 'Failed to add suggested item');
    }
  };
  
  // Date picker handlers
  const showDateTimePicker = () => {
    setDateTimePickerVisible(true);
  };
  
  const hideDateTimePicker = () => {
    setDateTimePickerVisible(false);
  };
  
  const handleSaveDateTime = (selectedDate, reminderRecurrence) => {
    setDate(selectedDate);
    setRecurrence(reminderRecurrence);
    hideDateTimePicker();
  };
  
  // Format the recurrence text like in CreateListScreen
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
  
  // Handle saving edits
  const handleSaveEdits = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create the updates object without modifying the original packingList
      const updates = {
        title: title.trim(),
        activity: selectedActivity,
        destination: destination.trim(),
        date: date,
        recurrence: recurrence,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Get a reference to the document
      const listRef = firebase.firestore().collection('packingLists').doc(listId);
      
      // Update the document
      await listRef.update(updates);
      
      // Update local state (keeping the id)
      setPackingList({
        ...packingList,
        ...updates,
        id: listId, // Ensure ID is preserved
        updatedAt: new Date() // Temporary local value until Firestore updates
      });
      
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating packing list:', error);
      Alert.alert('Error', 'There was a problem updating your packing list. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle deleting the list
  const handleDeleteList = () => {
    Alert.alert(
      'Delete List',
      'Are you sure you want to delete this list? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the list
              await deletePackingList(listId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', 'Failed to delete list');
            }
          }
        }
      ]
    );
  };
  
  // Handle sharing the list
  const handleShareList = async () => {
    if (!packingList) return;
    
    try {
      const itemsList = packingList.items
        .map(item => `- ${item.name}`)
        .join('\n');
      
      const message = `Check out my packing list for ${packingList.title}!\n\n${itemsList}\n\nCreated with PackMind`;
      
      await Share.share({
        message,
        title: packingList.title
      });
    } catch (error) {
      console.error('Error sharing list:', error);
      Alert.alert('Error', 'Failed to share list');
    }
  };
  
  // Calculate progress
  const calculateProgress = () => {
    if (!packingList?.items || packingList.items.length === 0) return 0;
    
    const checkedItems = packingList.items.filter(item => item.checked);
    return (checkedItems.length / packingList.items.length) * 100;
  };
  
  // Calculate sorted items with unchecked items at the top
  const sortedItems = useMemo(() => {
    if (!packingList?.items) return [];
    
    return [...packingList.items].sort((a, b) => {
      if (a.checked && !b.checked) return 1;
      if (!a.checked && b.checked) return -1;
      return 0;
    });
  }, [packingList?.items]);
  
  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6E8B3D" />
      </SafeAreaView>
    );
  }
  
  // Get activity emoji
  const getActivityEmoji = (activity) => {
    const emojis = {
      travel: '✈️',
      camping: '🏕️',
      hiking: '🥾',
      beach: '🏖️',
      skiing: '🎿',
      business: '💼',
      gym: '🏋️',
      default: '📦',
    };
    
    return emojis[activity] || emojis.default;
  };
  
  // Custom Draggable Item Component
  const DraggableItem = ({ item, onToggleChecked, onDeleteItem, drag, isActive }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(item.name);
    const [isPressing, setIsPressing] = useState(false);
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    // Update scale based on isPressing state
    useEffect(() => {
      scale.value = withSpring(isPressing ? 0.95 : 1);
    }, [isPressing, scale]);

    const onPressIn = () => {
      setIsPressing(true);
    };
    
    const onPressOut = () => {
      setIsPressing(false);
    };
    
    const handleDrag = () => {
      onPressIn();
      drag();
    };
    
    const startEdit = () => {
      setEditText(item.name);
      setIsEditing(true);
    };
    
    // Change item type/icon
    const handleChangeItemType = async (newType) => {
      try {
        // Clone the packingList to avoid modifying the shared value
        const updatedItems = packingList.items.map(i => 
          i.id === item.id ? { ...i, type: newType } : i
        );
        
        const updates = { 
          items: updatedItems,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await updatePackingList(listId, updates);
        
        setPackingList(prevList => ({
          ...prevList,
          items: updatedItems,
          updatedAt: new Date()
        }));
      } catch (error) {
        console.error('Error updating item type:', error);
        Alert.alert('Error', 'Failed to update item type');
      }
    };
    
    const saveEdit = async () => {
      if (!editText.trim()) {
        setEditText(item.name);
        setIsEditing(false);
        return;
      }
      
      if (editText !== item.name) {
        try {
          // Clone the packingList to avoid modifying the shared value
          const updatedItems = packingList.items.map(i => 
            i.id === item.id ? { ...i, name: editText.trim() } : i
          );
          
          const updates = { 
            items: updatedItems,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          await updatePackingList(listId, updates);
          
          setPackingList(prevList => ({
            ...prevList,
            items: updatedItems,
            updatedAt: new Date()
          }));
        } catch (error) {
          console.error('Error updating item name:', error);
          Alert.alert('Error', 'Failed to update item name');
        }
      }
      
      setIsEditing(false);
    };

    return (
      <Animated.View 
        style={[
          styles.itemContainer, 
          isActive && styles.itemActiveContainer,
          animatedStyle
        ]}
      >
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => onToggleChecked(item.id)}
        >
          <View style={[
            styles.checkbox,
            item.checked && styles.checkboxChecked
          ]}>
            {item.checked && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.itemIconContainer}
          onPress={() => item.type === 'default' ? null : handleChangeItemType('default')}
          onLongPress={() => handleChangeItemType(item.type === 'default' ? 'shirt' : 'default')}
        >
          <ItemIcon type={item.type || 'default'} size={24} />
        </TouchableOpacity>
          
        {isEditing ? (
          <TextInput
            style={styles.itemNameInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onBlur={saveEdit}
            onSubmitEditing={saveEdit}
          />
        ) : (
          <TouchableOpacity 
            style={styles.itemNameContainer}
            onPress={startEdit}
            onLongPress={startEdit}
          >
            <Text style={[
              styles.itemName,
              item.checked && styles.itemNameChecked
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
          
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDeleteItem(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF5252" />
          </TouchableOpacity>
            
          <TouchableOpacity
            style={styles.dragHandle}
            onPressIn={handleDrag}
            onPressOut={onPressOut}
          >
            <Ionicons name="reorder-three-outline" size={22} color="#777" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };
  
  // Edit Mode Section
  const renderEditMode = () => {
    return (
      <>
        <View style={styles.editSection}>
          <Text style={styles.editLabel}>Description</Text>
          <TextInput
            style={styles.editInput}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Weekend Trip to the Beach"
            maxLength={50}
          />
          
          <Text style={styles.editLabel}>Activity Type</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activityScroll}
          >
            <View style={styles.activityGrid}>
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  selectedActivity === 'other' && styles.activityTypeSelected
                ]}
                onPress={() => setSelectedActivity('other')}
              >
                <Text style={styles.activityIcon}>📦</Text>
                <Text style={styles.activityLabel}>Custom</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  selectedActivity === 'travel' && styles.activityTypeSelected
                ]}
                onPress={() => setSelectedActivity('travel')}
              >
                <Text style={styles.activityIcon}>✈️</Text>
                <Text style={styles.activityLabel}>Travel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  selectedActivity === 'beach' && styles.activityTypeSelected
                ]}
                onPress={() => setSelectedActivity('beach')}
              >
                <Text style={styles.activityIcon}>🏖️</Text>
                <Text style={styles.activityLabel}>Beach</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  selectedActivity === 'camping' && styles.activityTypeSelected
                ]}
                onPress={() => setSelectedActivity('camping')}
              >
                <Text style={styles.activityIcon}>🏕️</Text>
                <Text style={styles.activityLabel}>Camping</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  selectedActivity === 'hiking' && styles.activityTypeSelected
                ]}
                onPress={() => setSelectedActivity('hiking')}
              >
                <Text style={styles.activityIcon}>🥾</Text>
                <Text style={styles.activityLabel}>Hiking</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  selectedActivity === 'skiing' && styles.activityTypeSelected
                ]}
                onPress={() => setSelectedActivity('skiing')}
              >
                <Text style={styles.activityIcon}>🎿</Text>
                <Text style={styles.activityLabel}>Skiing</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  selectedActivity === 'business' && styles.activityTypeSelected
                ]}
                onPress={() => setSelectedActivity('business')}
              >
                <Text style={styles.activityIcon}>💼</Text>
                <Text style={styles.activityLabel}>Business</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  selectedActivity === 'gym' && styles.activityTypeSelected
                ]}
                onPress={() => setSelectedActivity('gym')}
              >
                <Text style={styles.activityIcon}>🏋️</Text>
                <Text style={styles.activityLabel}>Gym</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          <Text style={styles.editLabel}>Destination (Optional)</Text>
          <TextInput
            style={styles.editInput}
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g., Malibu Beach"
          />
          
          <Text style={styles.editLabel}>Date & Time</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={showDateTimePicker}
          >
            <View style={styles.dateTimeContent}>
              <View style={styles.dateTimeMain}>
                <Ionicons name="calendar-outline" size={22} color="#666" style={styles.dateIcon} />
                <Text style={styles.dateText}>{format(date, 'MMM d, h:mm a')}</Text>
              </View>
              {formatRecurrence(recurrence) && (
                <View style={styles.recurrenceContainer}>
                  <Ionicons name="repeat" size={16} color="#6E8B3D" />
                  <Text style={styles.recurrenceText}>{formatRecurrence(recurrence)}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={22} color="#666" />
          </TouchableOpacity>
        </View>
        <CustomDateTimePicker
          isVisible={isDateTimePickerVisible}
          onClose={hideDateTimePicker}
          onSave={handleSaveDateTime}
          initialDate={date}
          initialRecurrence={recurrence}
        />
      </>
    );
  };
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (isEditMode) {
                setIsEditMode(false);
                resetEditStates(); // Reset all edit fields to original values
              } else {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Packing List' : 'Your Packing List'}
          </Text>
          
          <View style={styles.headerButtons}>
            {isOwner && (
              <>
                {isEditMode ? (
                  <TouchableOpacity 
                    style={styles.headerButton}
                    onPress={handleSaveEdits}
                  >
                    <Ionicons name="checkmark" size={24} color="#6E8B3D" />
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.headerButton}
                      onPress={() => setIsEditMode(true)}
                    >
                      <Ionicons name="create-outline" size={22} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.headerButton}
                      onPress={handleDeleteList}
                    >
                      <Ionicons name="trash-outline" size={22} color="#FF5252" />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleShareList}
            >
              <Ionicons name="share-outline" size={22} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={{ flex: 1 }}>
          {/* List Info or Edit Section */}
          {isEditMode ? (
            renderEditMode()
          ) : (
            <View style={styles.infoSection}>
              {/* Title and Activity */}
              <View style={styles.titleRow}>
                <Text style={styles.activityEmoji}>
                  {getActivityEmoji(packingList.activity)}
                </Text>
                <Text style={styles.title} numberOfLines={2}>
                  {packingList.title}
                </Text>
              </View>
              
              {/* Destination and Date */}
              <View style={styles.detailsRow}>
                {packingList.destination && (
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={16} color="#777" />
                    <Text style={styles.detailText}>{packingList.destination}</Text>
                  </View>
                )}
                {packingList.date && (
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#777" />
                    <Text style={styles.detailText}>
                      {packingList.date.toDate ? 
                        format(new Date(packingList.date.toDate()), 'MMM d, h:mm a') :
                        format(new Date(packingList.date), 'MMM d, h:mm a')}
                    </Text>
                  </View>
                )}
                {packingList.recurrence && packingList.recurrence.type !== 'none' && (
                  <View style={styles.detailItem}>
                    <Ionicons name="repeat" size={16} color="#777" />
                    <Text style={styles.detailText}>
                      {formatRecurrence(packingList.recurrence)}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {`${packingList.items.filter(item => item.checked).length}/${packingList.items.length} packed`}
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {`${Math.round(calculateProgress())}%`}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${calculateProgress()}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          )}
          
          {/* Items List Section */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            
            {isLoading ? (
              <ActivityIndicator size="large" color="#6E8B3D" />
            ) : packingList?.items?.length > 0 ? (
              <DraggableFlatList
                data={sortedItems}
                keyExtractor={(item) => item.id}
                onDragEnd={handleReorderItems}
                scrollEnabled={false}
                renderItem={({ item, drag, isActive }) => (
                  <DraggableItem
                    item={item}
                    onToggleChecked={handleToggleChecked}
                    onDeleteItem={handleDeleteItem}
                    drag={drag}
                    isActive={isActive}
                  />
                )}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>No items in this list</Text>
              </View>
            )}
          </View>
        </ScrollView>
        
        {/* Add Item Input (Only visible to owner) */}
        {isOwner && (
          <View style={styles.addItemContainer}>
            <TextInput
              style={styles.addItemInput}
              placeholder="Add a new item..."
              value={newItemText}
              onChangeText={setNewItemText}
              onSubmitEditing={handleAddItem}
            />
            <TouchableOpacity
              style={[
                styles.addItemButton,
                !newItemText.trim() && styles.addItemButtonDisabled
              ]}
              onPress={handleAddItem}
              disabled={!newItemText.trim()}
            >
              <Ionicons
                name="add"
                size={24}
                color={newItemText.trim() ? '#6E8B3D' : '#BDBDBD'}
              />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 5,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 5,
    marginLeft: 10,
  },
  infoSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6E8B3D',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#EFEFEF',
    borderRadius: 5,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6E8B3D',
  },
  itemsSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  emptyList: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemActiveContainer: {
    backgroundColor: '#F8F8F8',
  },
  checkboxContainer: {
    marginRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6E8B3D',
    borderColor: '#6E8B3D',
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
  itemNameContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemNameInput: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#6E8B3D',
    padding: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 5,
    marginRight: 5,
  },
  dragHandle: {
    padding: 5,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    backgroundColor: '#FFFFFF',
  },
  addItemInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  addItemButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  addItemButtonDisabled: {
    opacity: 0.5,
  },
  listContent: {
    paddingBottom: 10,
  },
  editSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
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
  activityIcon: {
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
    marginBottom: 15,
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
  },
  recurrenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 30,
  },
  recurrenceText: {
    fontSize: 14,
    color: '#6E8B3D',
    fontWeight: '500',
    marginLeft: 6,
    flexShrink: 1,
  },
});

export default ListDetailsScreen;