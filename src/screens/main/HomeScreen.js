// src/screens/main/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Alert,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { getUserPackingLists, getSharedLists } from '../../models/firestoreModels';
import { firestore } from '../../config/firebase';
import { Appbar, Avatar, Badge } from 'react-native-paper';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [packingLists, setPackingLists] = useState([]);
  const [sharedLists, setSharedLists] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true); // Demo state for notification badge
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Fetch user's packing lists
  const fetchPackingLists = async () => {
    try {
      if (!user || !user.uid) {
        console.error('No authenticated user found');
        return;
      }
      console.log('Fetching packing lists for user ID:', user.uid);
      const lists = await getUserPackingLists(user.uid);
      console.log('Successfully retrieved', lists.length, 'packing lists');
      setPackingLists(lists);
    } catch (error) {
      console.error('Error fetching packing lists:', error);
      
      // Provide a more detailed error message for debugging
      let errorMessage = 'Failed to load your packing lists. Please try again.';
      
      // Check for specific Firebase error codes
      if (error.code) {
        if (error.code === 'permission-denied') {
          errorMessage = 'Permission denied. You do not have access to these lists.';
        } else if (error.code === 'unavailable') {
          errorMessage = 'Database is currently unavailable. Please try again later.';
        } else if (error.code === 'not-found') {
          errorMessage = 'The collection or document was not found.';
        } else {
          errorMessage += ` (Error code: ${error.code})`;
        }
      }
      
      Alert.alert('Error', errorMessage);
    }
  };
  
  // Fetch shared lists
  const fetchSharedLists = async () => {
    try {
      if (!user || !user.uid) {
        console.error('No authenticated user found');
        // Set sharedLists to empty array, not null, since this is a normal state
        setSharedLists([]);
        return;
      }
      
      console.log('Fetching shared lists for user:', user.uid);
      const lists = await getSharedLists(user.uid);
      setSharedLists(lists); // Normal successful state
      
    } catch (error) {
      console.error('Error fetching shared lists:', error);
      
      // For permission denied or other critical errors, keep as null to show the error UI
      if (error.code === 'permission-denied') {
        console.error('Permission denied when fetching shared lists');
        // Keep as null to show error state
      } else {
        // For network errors or other non-critical errors, set to empty array
        setSharedLists([]); 
      }
    }
  };
  
  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!user) {
        console.log('User not authenticated, skipping data fetch');
        setIsLoading(false);
        return;
      }
      
      // Fetch own packing lists first (primary functionality)
      await fetchPackingLists();
      
      try {
        // Try to fetch shared lists but don't let errors disrupt the main UI
        await fetchSharedLists();
      } catch (error) {
        console.error('Shared lists fetch failed, but continuing anyway:', error);
        // Just set empty shared lists to prevent UI issues
        setSharedLists([]);
      }
      
      // Debug: Log that user is authenticated
      console.log('User is authenticated:', user.email);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Debug Firebase connection
  const debugFirebaseConnection = () => {
    try {
      console.log('====== FIREBASE DEBUG INFO ======');
      console.log('User authenticated:', !!user);
      if (user) {
        console.log('User ID:', user.uid);
        console.log('User email:', user.email);
        console.log('User display name:', user.displayName);
      }
      
      // Check if Firestore is available
      const checkFirestore = firestore._databaseId ? 'Available' : 'Not available';
      console.log('Firestore status:', checkFirestore);
      
      Alert.alert(
        'Debug Info', 
        `User authenticated: ${!!user}\n` +
        `User ID: ${user?.uid || 'None'}\n` +
        `Email: ${user?.email || 'None'}\n` +
        `Firestore status: ${checkFirestore}\n\n` +
        'Check console logs for more details.'
      );
    } catch (error) {
      console.error('Error in debugFirebaseConnection:', error);
      Alert.alert('Debug Error', `Error: ${error.message}`);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };
  
  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [user]); // Add user as dependency to reload when user changes
  
  // Focus listener to refresh data when navigating back to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    
    return unsubscribe;
  }, [navigation, user]);
  
  // Start pulse animation for the add button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  // Calculate progress for a list
  const calculateProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const checkedItems = items.filter(item => item.checked);
    return (checkedItems.length / items.length) * 100;
  };
  
  // Combine both personal and shared lists into one array
  const getAllLists = () => {
    let allLists = [...packingLists];
    
    // Add shared lists if they exist
    if (sharedLists && sharedLists.length > 0) {
      allLists = [...allLists, ...sharedLists];
    }
    
    return allLists;
  };
  
  // Render a packing list item
  const renderPackingListItem = ({ item, index }) => {
    const progress = calculateProgress(item.items);
    const formattedDate = item.date ? format(new Date(item.date.toDate()), 'MMM d, yyyy') : 'No date';
    const isShared = item.sharedWith && item.sharedWith.includes(user.uid);
    
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => navigation.navigate('ListDetails', { listId: item.id })}
        activeOpacity={0.7}
      >
        {/* Activity Icon */}
        <View style={[styles.activityIcon, { backgroundColor: getActivityColor(item.activity) }]}>
          <Text style={styles.activityIconText}>{getActivityEmoji(item.activity)}</Text>
        </View>
        
        {/* List Info */}
        <View style={styles.listInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {isShared && (
              <Ionicons name="share-social" size={18} color="#6E8B3D" />
            )}
          </View>
          <View style={styles.listDetails}>
            <Text style={styles.listDate}>{formattedDate}</Text>
            <View style={styles.itemCount}>
              <Ionicons name="list-outline" size={14} color="#777" />
              <Text style={styles.itemCountText}>
                {item.items ? item.items.length : 0} items
              </Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>
        
        {/* Arrow */}
        <Ionicons name="chevron-forward" size={20} color="#777" />
      </TouchableOpacity>
    );
  };
  
  // Get activity color
  const getActivityColor = (activity) => {
    const colors = {
      travel: '#64B5F6',
      camping: '#81C784',
      hiking: '#AED581',
      beach: '#FFD54F',
      skiing: '#90CAF9',
      business: '#9FA8DA',
      gym: '#F48FB1',
      default: '#BDBDBD',
    };
    
    return colors[activity] || colors.default;
  };
  
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
  
  // Render empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../../../assets/empty-list.svg')}
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>
          No packing lists yet
        </Text>
        <Text style={styles.emptyText}>
          Create your first packing list to get started
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('Create')}
        >
          <Text style={styles.createButtonText}>Create List</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Get avatar initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  };
  
  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent"
        translucent={true}
      />
      
      {/* App Header Bar */}
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>PackMind</Text>
        <View style={styles.rightContainer}>
          <View style={styles.notificationContainer}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => Alert.alert('Notifications', 'No new notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
            {hasNotifications && (
              <View style={styles.badge} />
            )}
          </View>
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => navigation.navigate('Profile')}
          >
            {user?.photoURL ? (
              <Image 
                source={{ uri: user.photoURL }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {getInitials(user?.displayName || 'User')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Welcome Text */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Hello, {user?.displayName?.split(' ')[0] || 'there'}!
        </Text>
      </View>
      
      {/* Loading state */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6E8B3D" />
        </View>
      ) : (
        // List of packing lists
        <FlatList
          data={getAllLists()}
          renderItem={renderPackingListItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState()}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#6E8B3D']}
              tintColor="#6E8B3D"
            />
          }
        />
      )}
      
      {/* Add button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Create')}
          activeOpacity={0.8}
        >
          <Animated.View 
            style={[
              styles.addButtonOuterRing,
              {transform: [{scale: pulseAnim}]}
            ]}
          />
          <View style={styles.addButtonInner}>
            <View style={styles.buttonPattern}>
              <Ionicons name="checkmark" size={12} color="rgba(255, 255, 255, 0.15)" style={styles.patternIcon} />
              <Ionicons name="list" size={12} color="rgba(255, 255, 255, 0.15)" style={styles.patternIcon} />
              <Ionicons name="bag" size={12} color="rgba(255, 255, 255, 0.15)" style={styles.patternIcon} />
            </View>
            <Ionicons name="add" size={30} color="white" />
          </View>
          <Text style={styles.addButtonLabel}>New List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 75 : StatusBar.currentHeight + 40 || 40,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6E8B3D',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationContainer: {
    marginRight: 16,
    position: 'relative',
  },
  iconButton: {
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
    borderWidth: 1,
    borderColor: 'white',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6E8B3D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginTop: 0,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityIconText: {
    fontSize: 24,
  },
  listInfo: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  listDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listDate: {
    fontSize: 14,
    color: '#777',
    marginRight: 10,
  },
  itemCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCountText: {
    fontSize: 14,
    color: '#777',
    marginLeft: 5,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6E8B3D',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonOuterRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(110, 139, 61, 0.15)',
  },
  addButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6E8B3D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
  },
  buttonPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    padding: 4,
    opacity: 0.8,
  },
  patternIcon: {
    transform: [{ rotate: '45deg' }],
    marginHorizontal: -2,
  },
  addButtonLabel: {
    color: '#5c7433',
    fontWeight: 'bold',
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyImage: {
    width: width * 0.5,
    height: width * 0.5,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#6E8B3D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default HomeScreen;