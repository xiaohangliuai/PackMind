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
import firebase from '../../firebase/firebaseConfig';
import { Appbar, Avatar, Badge } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [packingLists, setPackingLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true); // Demo state for notification badge
  const [pulseAnim] = useState(new Animated.Value(1));
  
  console.log("HomeScreen rendered, user:", user ? user.uid : "no user");
  
  // Fetch user's packing lists
  const fetchPackingLists = async () => {
    try {
      if (!user || !user.uid) {
        console.error('No authenticated user found');
        return;
      }
      
      console.log('Fetching packing lists for user ID:', user.uid);
      
      // Use Firebase compat API directly - removed orderBy to avoid need for index
      const snapshot = await firebase.firestore()
        .collection('packingLists')
        .where('userId', '==', user.uid)
        .get();
      
      // Get the data and sort in memory instead
      const lists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by updatedAt first (if available), then by createdAt
      lists.sort((a, b) => {
        // First try to use updatedAt for sorting
        if (a.updatedAt || b.updatedAt) {
          const updateDateA = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
          const updateDateB = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
          return updateDateB - updateDateA;
        }
        
        // Fallback to createdAt
        const createDateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
        const createDateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
        return createDateB - createDateA;
      });
      
      console.log('Successfully retrieved', lists.length, 'packing lists');
      setPackingLists(lists);
    } catch (error) {
      console.error('Error fetching packing lists:', error);
      Alert.alert('Error', 'Failed to load your packing lists. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Navigation handlers with added debugging
  const handleCreateList = () => {
    console.log("Navigating to Create List screen");
    navigation.navigate('Create');
  };
  
  const handleOpenList = (list) => {
    console.log("Navigating to List Details screen with id:", list.id);
    navigation.navigate('ListDetails', { listId: list.id });
  };
  
  // Refresh lists whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("HomeScreen focused, refreshing lists");
      fetchPackingLists();
      return () => {
        // Clean up if needed
      };
    }, [user])
  );
  
  // Load packing lists on component mount
  useEffect(() => {
    console.log("HomeScreen useEffect running, fetching lists");
    
    // Setup loading animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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
    
    let formattedDate = 'No date';
    if (item.date) {
      try {
        // Handle both Firestore Timestamp objects and Date objects
        const dateObj = item.date.toDate ? new Date(item.date.toDate()) : new Date(item.date);
        formattedDate = format(dateObj, 'MMM d, h:mm a');
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }
    
    const isShared = item.sharedWith && item.sharedWith.includes(user.uid);
    
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => handleOpenList(item)}
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
          onPress={handleCreateList}
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
              onRefresh={fetchPackingLists}
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
          onPress={handleCreateList}
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