// src/screens/main/CollaborativeListScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { 
  getPackingList, 
  updatePackingList,
  getUserProfile 
} from '../../models/firestoreModels';
import DraggableList from '../../components/DraggableList';

const CollaborativeListScreen = ({ route, navigation }) => {
  const { listId } = route.params;
  const { user } = useAuth();
  
  // State
  const [packingList, setPackingList] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collaborators, setCollaborators] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  
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
      
      // Fetch collaborators details
      if (list.sharedWith && list.sharedWith.length > 0) {
        const collaboratorDetails = await Promise.all(
          list.sharedWith.map(async (userId) => {
            try {
              const profile = await getUserProfile(userId);
              return {
                id: userId,
                name: profile?.fullName || 'Unknown User',
                email: profile?.email || '',
              };
            } catch (error) {
              console.error('Error fetching collaborator profile:', error);
              return {
                id: userId,
                name: 'Unknown User',
                email: '',
              };
            }
          })
        );
        
        setCollaborators(collaboratorDetails);
      }
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
  
  // Handle adding a new item
  const handleAddItem = async () => {
    if (!packingList || !newItemText.trim()) return;
    
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemText.trim(),
      type: 'default',
      checked: false,
      addedBy: user.uid,
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
  
  // Handle adding a collaborator
  const handleAddCollaborator = async () => {
    if (!emailInput.trim()) return;
    
    setIsAddingCollaborator(true);
    
    try {
      // In a real app, we would search for a user by email
      // For now, let's simulate adding a collaborator
      Alert.alert(
        'Feature in Development',
        'Sharing with collaborators is not yet implemented in this demo.',
        [{ text: 'OK' }]
      );
      
      setEmailInput('');
    } catch (error) {
      console.error('Error adding collaborator:', error);
      Alert.alert('Error', 'Failed to add collaborator');
    } finally {
      setIsAddingCollaborator(false);
    }
  };
  
  // Handle removing a collaborator
  const handleRemoveCollaborator = async (collaboratorId) => {
    if (!packingList) return;
    
    // Confirm removal
    Alert.alert(
      'Remove Collaborator',
      'Are you sure you want to remove this collaborator?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedSharedWith = packingList.sharedWith.filter(
                id => id !== collaboratorId
              );
              
              await updatePackingList(listId, { sharedWith: updatedSharedWith });
              
              setPackingList({
                ...packingList,
                sharedWith: updatedSharedWith
              });
              
              setCollaborators(
                collaborators.filter(collab => collab.id !== collaboratorId)
              );
            } catch (error) {
              console.error('Error removing collaborator:', error);
              Alert.alert('Error', 'Failed to remove collaborator');
            }
          }
        }
      ]
    );
  };
  
  // Render a collaborator item
  const renderCollaboratorItem = ({ item }) => {
    const isOwner = item.id === packingList?.userId;
    
    return (
      <View style={styles.collaboratorItem}>
        <View style={styles.collaboratorAvatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.collaboratorInfo}>
          <Text style={styles.collaboratorName}>{item.name}</Text>
          <Text style={styles.collaboratorEmail}>{item.email}</Text>
        </View>
        
        {isOwner ? (
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>Owner</Text>
          </View>
        ) : (
          user.uid === packingList?.userId && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveCollaborator(item.id)}
            >
              <Ionicons name="close" size={20} color="#FF5252" />
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };
  
  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6E8B3D" />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Collaborate</Text>
            <View style={styles.headerRight} />
          </View>
          
          {/* Collaborators Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Collaborators</Text>
              <Text style={styles.sectionSubtitle}>
                People who can view and edit this list
              </Text>
            </View>
            
            {/* Owner */}
            <View style={styles.collaboratorItem}>
              <View style={[styles.collaboratorAvatar, styles.ownerAvatar]}>
                <Text style={styles.avatarText}>
                  {user.displayName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              
              <View style={styles.collaboratorInfo}>
                <Text style={styles.collaboratorName}>
                  {user.displayName || 'You'} {user.uid === packingList?.userId ? '(You)' : ''}
                </Text>
                <Text style={styles.collaboratorEmail}>{user.email}</Text>
              </View>
              
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerBadgeText}>Owner</Text>
              </View>
            </View>
            
            {/* Collaborators List */}
            {collaborators.length > 0 ? (
              <FlatList
                data={collaborators}
                renderItem={renderCollaboratorItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyCollaboratorsText}>
                No collaborators yet
              </Text>
            )}
            
            {/* Add Collaborator */}
            {user.uid === packingList?.userId && (
              <View style={styles.addCollaboratorContainer}>
                <TextInput
                  style={styles.collaboratorInput}
                  placeholder="Enter email to invite"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddCollaborator}
                  disabled={isAddingCollaborator || !emailInput.trim()}
                >
                  {isAddingCollaborator ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.addButtonText}>Invite</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Shared List Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shared List</Text>
              <Text style={styles.sectionSubtitle}>
                Everyone can add and check off items
              </Text>
            </View>
            
            {/* Items List */}
            {packingList?.items.length > 0 ? (
              <DraggableList
                items={packingList.items}
                onReorder={() => {}}
                onToggleChecked={handleToggleChecked}
                onDelete={() => {}}
                editable={false}
                checkedItemsAtBottom={true}
              />
            ) : (
              <Text style={styles.emptyListText}>
                No items in this list yet
              </Text>
            )}
          </View>
          
          {/* Add Item Input */}
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
        </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 34,
  },
  section: {
    marginBottom: 20,
    flex: 1,
  },
  sectionHeader: {
    padding: 20,
    paddingBottom: 10,
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
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  collaboratorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  ownerAvatar: {
    backgroundColor: '#6E8B3D',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6E8B3D',
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  collaboratorEmail: {
    fontSize: 14,
    color: '#777',
  },
  ownerBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ownerBadgeText: {
    fontSize: 12,
    color: '#6E8B3D',
    fontWeight: '600',
  },
  removeButton: {
    padding: 5,
  },
  emptyCollaboratorsText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    padding: 20,
  },
  addCollaboratorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  collaboratorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#6E8B3D',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
});

export default CollaborativeListScreen;