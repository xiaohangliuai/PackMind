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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import firebase from '../../firebase/firebaseConfig';

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
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  
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
      
      setIsOwner(list.userId === user.uid);
      
    } catch (error) {
      console.error('Error fetching packing list:', error);
      Alert.alert('Error', 'Failed to load packing list');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
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
      await updatePackingList(listId, { items: updatedItems });
      
      setPackingList(prevList => ({
        ...prevList,
        items: updatedItems
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
      
      // Update Firestore with the new order
      await updatePackingList(listId, { items: reorderedItems });
      
      // Update local state with functional update
      setPackingList(prevList => ({
        ...prevList,
        items: reorderedItems
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
      await updatePackingList(listId, { items: updatedItems });
      
      setPackingList(prevList => ({
        ...prevList,
        items: updatedItems
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
      await updatePackingList(listId, { items: updatedItems });
      
      setPackingList(prevList => ({
        ...prevList,
        items: updatedItems
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
      await updatePackingList(listId, { items: updatedItems });
      
      setPackingList(prevList => ({
        ...prevList,
        items: updatedItems
      }));
    } catch (error) {
      console.error('Error adding suggested item:', error);
      Alert.alert('Error', 'Failed to add suggested item');
    }
  };
  
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
  
  // Handle saving edits
  const handleSaveEdits = async () => {
    if (!packingList) return;
    
    if (!title.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }

    setIsLoading(true);
    
    try {
      // Update the list information
      const listUpdates = {
        title: title.trim(),
        activity: packingList.activity,
        destination: destination.trim(),
        date: date,
        items: packingList.items,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Update Firestore with the information
      await updatePackingList(listId, listUpdates);
      
      // Update local state
      setPackingList(listUpdates);
      setIsEditMode(false);
      setIsLoading(false);
      
      Alert.alert('Success', 'Your packing list has been updated!');
    } catch (error) {
      console.error('Error updating packing list:', error);
      Alert.alert('Error', 'Failed to update packing list. Please try again.');
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
          
          await updatePackingList(listId, { items: updatedItems });
          
          setPackingList(prevList => ({
            ...prevList,
            items: updatedItems
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
                  packingList?.activity === 'other' && styles.activityTypeSelected
                ]}
                onPress={() => {
                  setPackingList(prevList => ({
                    ...prevList,
                    activity: 'other'
                  }));
                }}
              >
                <Text style={styles.activityIcon}>📦</Text>
                <Text style={styles.activityLabel}>Custom</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  packingList?.activity === 'travel' && styles.activityTypeSelected
                ]}
                onPress={() => {
                  setPackingList(prevList => ({
                    ...prevList,
                    activity: 'travel'
                  }));
                }}
              >
                <Text style={styles.activityIcon}>✈️</Text>
                <Text style={styles.activityLabel}>Travel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  packingList?.activity === 'beach' && styles.activityTypeSelected
                ]}
                onPress={() => {
                  setPackingList(prevList => ({
                    ...prevList,
                    activity: 'beach'
                  }));
                }}
              >
                <Text style={styles.activityIcon}>🏖️</Text>
                <Text style={styles.activityLabel}>Beach</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  packingList?.activity === 'camping' && styles.activityTypeSelected
                ]}
                onPress={() => {
                  setPackingList(prevList => ({
                    ...prevList,
                    activity: 'camping'
                  }));
                }}
              >
                <Text style={styles.activityIcon}>🏕️</Text>
                <Text style={styles.activityLabel}>Camping</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  packingList?.activity === 'hiking' && styles.activityTypeSelected
                ]}
                onPress={() => {
                  setPackingList(prevList => ({
                    ...prevList,
                    activity: 'hiking'
                  }));
                }}
              >
                <Text style={styles.activityIcon}>🥾</Text>
                <Text style={styles.activityLabel}>Hiking</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  packingList?.activity === 'skiing' && styles.activityTypeSelected
                ]}
                onPress={() => {
                  setPackingList(prevList => ({
                    ...prevList,
                    activity: 'skiing'
                  }));
                }}
              >
                <Text style={styles.activityIcon}>🎿</Text>
                <Text style={styles.activityLabel}>Skiing</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  packingList?.activity === 'business' && styles.activityTypeSelected
                ]}
                onPress={() => {
                  setPackingList(prevList => ({
                    ...prevList,
                    activity: 'business'
                  }));
                }}
              >
                <Text style={styles.activityIcon}>💼</Text>
                <Text style={styles.activityLabel}>Business</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.activityTypeButton,
                  packingList?.activity === 'gym' && styles.activityTypeSelected
                ]}
                onPress={() => {
                  setPackingList(prevList => ({
                    ...prevList,
                    activity: 'gym'
                  }));
                }}
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
            style={styles.dateContainer}
            onPress={showDatePicker}
          >
            <Text style={styles.dateText}>
              {format(date, 'MMMM d, h:mm a')}
            </Text>
            <Ionicons name="calendar-outline" size={24} color="#777" />
          </TouchableOpacity>
          
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="datetime"
            date={date}
            onConfirm={handleConfirmDate}
            onCancel={hideDatePicker}
          />
        </View>
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
                setTitle(packingList.title);
                setDestination(packingList.destination || '');
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
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 5,
    marginLeft: 15,
  },
  infoSection: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemsSection: {
    padding: 20,
    paddingBottom: 80,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityEmoji: {
    fontSize: 30,
    marginRight: 10,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingVertical: 5,
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 5,
  },
  progressContainer: {
    marginTop: 5,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#555',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6E8B3D',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6E8B3D',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 5,
    marginHorizontal: 2,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  itemActiveContainer: {
    backgroundColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 999,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#757575',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6E8B3D',
    borderColor: '#6E8B3D',
  },
  itemNameContainer: {
    flex: 1,
    paddingVertical: 5,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#777',
  },
  itemNameInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingVertical: 5,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 5,
  },
  dragHandle: {
    padding: 5,
    marginLeft: 5,
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyList: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
  },
  editItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 2,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  editItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  editDeleteButton: {
    padding: 5,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  addItemInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginRight: 10,
    backgroundColor: '#FAFAFA',
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
    backgroundColor: '#BDBDBD',
  },
  editSection: {
    padding: 20,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 15,
  },
  editInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  activityScroll: {
    marginBottom: 20,
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
    padding: 10,
  },
  activityTypeSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#6E8B3D',
  },
  activityIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  activityLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  suggestedItemsMessage: {
    marginTop: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  suggestedItemsText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  suggestedItemsContainer: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  suggestedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    marginVertical: 5,
    backgroundColor: '#FAFAFA',
  },
  suggestedItemText: {
    fontSize: 16,
    color: '#333',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  optionDescription: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
});

export default ListDetailsScreen;