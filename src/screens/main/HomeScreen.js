// src/screens/main/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { cancelPackingReminders } from '../../services/NotificationService';
import { COLORS, THEME } from '../../constants/theme';
import { useActivityTracker } from '../../hooks/useActivityTracker';

const { width } = Dimensions.get('window');

// Constants for day names
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const HomeScreen = ({ navigation }) => {
  // Auth context
  const { user, logout } = useAuth();

  // Track user activity
  useActivityTracker();

  // State declarations
  const [packingLists, setPackingLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [completedAnim] = useState(new Animated.Value(1));

  // Fetch packing lists function
  const fetchPackingLists = useCallback(async () => {
    try {
      if (!user || !user.uid) {
        console.error('No authenticated user found');
        return;
      }
      
      console.log('Fetching packing lists for user ID:', user.uid);
      
      const snapshot = await firebase.firestore()
        .collection('packingLists')
        .where('userId', '==', user.uid)
        .get();
      
      const lists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      lists.sort((a, b) => {
        if (a.updatedAt || b.updatedAt) {
          const updateDateA = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
          const updateDateB = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
          return updateDateB - updateDateA;
        }
        
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
  }, [user]);

  // Effects
  useEffect(() => {
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

    // Pulsing animation for completed indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(completedAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(completedAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, completedAnim]);

  useFocusEffect(
    useCallback(() => {
      console.log("HomeScreen focused, refreshing lists");
      fetchPackingLists();
      return () => {
        // Clean up if needed
      };
    }, [fetchPackingLists])
  );
  
  console.log("HomeScreen rendered, user:", user ? user.uid : "no user");
  
  // Navigation handlers with added debugging
  const handleCreateList = () => {
    console.log("Navigating to Create List screen");
    navigation.navigate('Create');
  };
  
  const handleOpenList = (list) => {
    console.log("Navigating to List Details screen with id:", list.id);
    navigation.navigate('ListDetails', { listId: list.id });
  };
  
  // Handle delete packing list
  const handleDeleteList = async (listId) => {
    try {
      // Delete the list document from Firestore
      await firebase.firestore()
        .collection('packingLists')
        .doc(listId)
        .delete();
      
      // Update local state
      setPackingLists(prevLists => prevLists.filter(list => list.id !== listId));
      
      // Cancel any associated notifications
      try {
        await cancelPackingReminders(listId);
      } catch (notificationError) {
        console.error('Error cancelling notifications:', notificationError);
        // Continue execution even if notification cancellation fails
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      Alert.alert('Error', 'Failed to delete list');
    }
  };
  
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
  
  // Add a formatRecurrence function
  // Format recurrence text for display
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
  
  // Update the renderPackingListItem function to include recurrence information and notification icon
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
    const hasRecurrence = item.recurrence && item.recurrence.type !== 'none';
    const hasNotifications = item.recurrence && 
                            (item.recurrence.notificationsEnabled === true) && 
                            (item.recurrence.notificationType === 'one-time' || 
                             item.recurrence.notificationType === 'recurring');
    
    // Render right actions (delete button)
    const renderRightActions = (progress, dragX) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [0, 80],
        extrapolate: 'clamp',
      });
      
      return (
        <View style={styles.deleteButtonContainer}>
          <Animated.View 
            style={[
              styles.deleteButton, 
              { transform: [{ translateX: trans }] }
            ]}
          >
            <TouchableOpacity
              onPress={() => handleDeleteList(item.id)}
              style={styles.deleteButtonInner}
            >
              <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      );
    };
    
    const ListItem = (
      <TouchableOpacity
        style={[
          styles.listCard,
          progress === 100 && styles.completedListCard
        ]}
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
            <View style={styles.iconContainer}>
              {isShared && (
                <Ionicons name="share-social" size={18} color={THEME.PRIMARY} style={styles.titleIcon} />
              )}
              {hasNotifications && (
                <Ionicons name="notifications" size={18} color={THEME.PRIMARY} style={styles.titleIcon} />
              )}
            </View>
          </View>
          
          <View style={styles.listDetails}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#777" style={styles.detailIcon} />
              <Text style={styles.listDate}>{formattedDate}</Text>
            </View>
            
            <View style={styles.itemCount}>
              <Ionicons name="list-outline" size={14} color="#777" style={styles.detailIcon} />
              <Text style={styles.itemCountText}>
                {item.items ? item.items.length : 0} items
              </Text>
            </View>
          </View>
          
          {/* Recurrence info if available */}
          {hasRecurrence && (
            <View style={styles.recurrenceContainer}>
              <Ionicons name="repeat" size={14} color={THEME.PRIMARY} style={styles.detailIcon} />
              <Text style={styles.recurrenceText}>
                {formatRecurrence(item.recurrence)}
              </Text>
            </View>
          )}
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[
              styles.progressBar, 
              { width: `${progress}%` },
              progress === 100 && styles.completedProgressBar
            ]} />
          </View>
          
          {/* Completion indicator */}
          {progress === 100 && (
            <Animated.View 
              style={[
                styles.completionContainer,
                {transform: [{scale: completedAnim}]}
              ]}
            >
              <Ionicons name="checkmark-circle" size={14} color="#00C853" style={styles.completionIcon} />
              <Text style={styles.completionText}>All packed!</Text>
            </Animated.View>
          )}
        </View>
        
        {/* Arrow */}
        <Ionicons name="chevron-forward" size={20} color="#777" />
      </TouchableOpacity>
    );
    
    return (
      <Swipeable
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
      >
        {ListItem}
      </Swipeable>
    );
  };
  
  // Get activity color
  const getActivityColor = (activity) => {
    const colors = {
      travel: COLORS.LAVENDER,
      camping: COLORS.LAVENDER,
      hiking: COLORS.LAVENDER,
      beach: COLORS.LAVENDER,
      skiing: COLORS.LAVENDER,
      business: COLORS.LAVENDER,
      gym: COLORS.LAVENDER,
      default: COLORS.INDIGO,
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
        <Image
          source={require('../../../assets/app-name-purple.png')}
          style={styles.appLogo}
          resizeMode="contain"
        />
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
            onPress={() => navigation.navigate('Settings')}
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
          <ActivityIndicator size="large" color={THEME.PRIMARY} />
        </View>
      ) : (
        // List of packing lists
        <GestureHandlerRootView style={{ flex: 1 }}>
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
                colors={[THEME.PRIMARY]}
                tintColor={THEME.PRIMARY}
              />
            }
          />
        </GestureHandlerRootView>
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
  appLogo: {
    height: 30,
    width: 120,
    marginLeft: 12,
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
    backgroundColor: THEME.PRIMARY,
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
    ...THEME.SHADOWS.SMALL,
    borderLeftWidth: 4,
    borderLeftColor: THEME.PRIMARY,
  },
  completedListCard: {
    backgroundColor: '#E6F7FF',
    borderLeftColor: '#00C853',
    ...Platform.select({
      ios: {
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginLeft: 8,
    color: THEME.PRIMARY,
  },
  listDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 4,
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
    backgroundColor: THEME.PRIMARY,
  },
  completedProgressBar: {
    backgroundColor: '#00C853',
  },
  completionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  completionIcon: {
    marginRight: 4,
  },
  completionText: {
    fontSize: 12,
    color: '#00C853',
    fontWeight: '600',
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
    backgroundColor: COLORS.INDIGO_15,
  },
  addButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.SHADOWS.MEDIUM,
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
    color: COLORS.INDIGO,
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
    backgroundColor: THEME.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    ...THEME.SHADOWS.SMALL,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recurrenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  recurrenceText: {
    fontSize: 12,
    color: THEME.PRIMARY,
    fontWeight: '500',
  },
  deleteButtonContainer: {
    width: 80,
    backgroundColor: COLORS.ERROR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    ...THEME.SHADOWS.SMALL,
  },
  deleteButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonInner: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
});

export default HomeScreen;