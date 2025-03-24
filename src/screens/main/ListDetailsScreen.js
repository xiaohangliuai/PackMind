// src/screens/main/ListDetailsScreen.js
import React, { useState, useEffect } from 'react';
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
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { getPackingList, updatePackingList, deletePackingList } from '../../models/firestoreModels';
import ItemIcon from '../../components/ItemIcon';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const ListDetailsScreen = ({ route, navigation }) => {
  const { listId } = route.params;
  const { user } = useAuth();
  
  // State
  const [packingList, setPackingList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
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
      
      setPackingList({
        ...packingList,
        items: updatedItems
      });
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };
  
  // Handle reordering items
  const handleReorderItems = async (reorderedItems) => {
    if (!packingList) return;
    
    try {
      await updatePackingList(listId, { items: reorderedItems });
      
      setPackingList({
        ...packingList,
        items: reorderedItems
      });
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
      
      setPackingList({
        ...packingList,
        items: updatedItems
      });
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
      
      setPackingList({
        ...packingList,
        items: updatedItems
      });
      setNewItemText('');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };
  
  // Handle saving list edits
  const handleSaveEdits = async () => {
    if (!packingList) return;
    
    if (!title.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }
    
    try {
      await updatePackingList(listId, {
        title: title.trim(),
        destination: destination.trim() || null
      });
      
      setPackingList({
        ...packingList,
        title: title.trim(),
        destination: destination.trim() || null
      });
      
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating list:', error);
      Alert.alert('Error', 'Failed to update list');
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
  const DraggableItem = ({ item, onToggleChecked, onDelete, isOwner, drag, isActive }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    const onPressIn = () => {
      scale.value = withSpring(1.05);
    };

    const onPressOut = () => {
      scale.value = withSpring(1);
    };

    return (
      <Animated.View
        style={[
          styles.itemRow,
          item.checked && styles.checkedItem,
          isActive && styles.activeItem,
          animatedStyle
        ]}
      >
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => onToggleChecked(item.id)}
        >
          <Ionicons
            name={item.checked ? "checkbox" : "square-outline"}
            size={24}
            color={item.checked ? '#6E8B3D' : '#757575'}
          />
        </TouchableOpacity>
        
        {/* Item Icon */}
        <ItemIcon 
          type={item.type || 'default'} 
          size={22} 
          backgroundColor={item.checked ? '#E0E0E0' : '#E8F5E9'} 
        />
        
        {/* Item Name */}
        <Text style={[styles.itemText, item.checked && styles.checkedText]}>
          {item.name}
        </Text>
        
        {/* Delete button */}
        {isOwner && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF5252" />
          </TouchableOpacity>
        )}
        
        {/* Drag Handle */}
        {isOwner && !item.checked && (
          <TouchableOpacity
            style={styles.dragHandle}
            onPressIn={() => {
              onPressIn();
              drag();
            }}
            onPressOut={onPressOut}
          >
            <Ionicons name="reorder-three-outline" size={22} color="#777" />
          </TouchableOpacity>
        )}
      </Animated.View>
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
        
        {/* List Info */}
        <View style={styles.infoSection}>
          {isEditMode ? (
            <>
              {/* Editable Title */}
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="List Title"
                maxLength={50}
              />
              
              {/* Editable Destination */}
              <TextInput
                style={styles.destinationInput}
                value={destination}
                onChangeText={setDestination}
                placeholder="Destination (Optional)"
              />
            </>
          ) : (
            <>
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
                      {format(new Date(packingList.date.toDate()), 'MMM d, yyyy')}
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
            </>
          )}
        </View>
        
        {/* Items List Section */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items</Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#6E8B3D" />
          ) : packingList?.items?.length > 0 ? (
            <DraggableFlatList
              data={packingList.items.sort((a, b) => {
                if (a.checked && !b.checked) return 1;
                if (!a.checked && b.checked) return -1;
                return 0;
              })}
              keyExtractor={(item) => item.id}
              renderItem={({ item, drag, isActive }) => (
                <DraggableItem
                  item={item}
                  onToggleChecked={handleToggleChecked}
                  onDelete={handleDeleteItem}
                  isOwner={isOwner}
                  drag={drag}
                  isActive={isActive}
                />
              )}
              onDragEnd={({ data }) => handleReorderItems(data)}
              activationDistance={10}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyListText}>
              No items in this list yet
            </Text>
          )}
        </View>
        
        {/* Add Item Input (Only visible to owner) */}
        {isOwner && (
          <View style={styles.addItemContainer}>
            <TextInput
              style={styles.addItemInput}
              placeholder="Add new item..."
              value={newItemText}
              onChangeText={setNewItemText}
              onSubmitEditing={handleAddItem}
            />
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={handleAddItem}
              disabled={!newItemText.trim()}
            >
              <Ionicons
                name="add-circle"
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
    flex: 1,
    padding: 20,
    paddingBottom: 0,
    minHeight: 300,
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
  destinationInput: {
    fontSize: 16,
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingVertical: 5,
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
  emptyListText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    padding: 20,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  addItemInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginRight: 10,
  },
  addItemButton: {
    padding: 5,
  },
  itemRow: {
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
  checkedItem: {
    backgroundColor: '#F5F5F5',
    opacity: 0.8,
  },
  activeItem: {
    backgroundColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 999,
  },
  checkbox: {
    padding: 5,
    marginRight: 5,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#777',
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
});

export default ListDetailsScreen;