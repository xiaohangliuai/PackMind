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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { getUserPackingLists, getSharedLists } from '../../models/firestoreModels';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [packingLists, setPackingLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('myLists');
  
  // Fetch user's packing lists
  const fetchPackingLists = async () => {
    try {
      const lists = await getUserPackingLists(user.uid);
      setPackingLists(lists);
    } catch (error) {
      console.error('Error fetching packing lists:', error);
    }
  };
  
  // Fetch shared lists
  const fetchSharedLists = async () => {
    try {
      const lists = await getSharedLists(user.uid);
      setSharedLists(lists);
    } catch (error) {
      console.error('Error fetching shared lists:', error);
    }
  };
  
  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchPackingLists(),
        fetchSharedLists()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
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
  }, []);
  
  // Focus listener to refresh data when navigating back to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    
    return unsubscribe;
  }, [navigation]);
  
  // Calculate progress for a list
  const calculateProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const checkedItems = items.filter(item => item.checked);
    return (checkedItems.length / items.length) * 100;
  };
  
  // Render a packing list item
  const renderPackingListItem = ({ item, index }) => {
    const progress = calculateProgress(item.items);
    const formattedDate = item.date ? format(new Date(item.date.toDate()), 'MMM d, yyyy') : 'No date';
    
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
          <Text style={styles.listTitle} numberOfLines={1}>
            {item.title}
          </Text>
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
          {activeTab === 'myLists' ? 'No packing lists yet' : 'No shared lists yet'}
        </Text>
        <Text style={styles.emptyText}>
          {activeTab === 'myLists'
            ? 'Create your first packing list to get started'
            : 'Lists shared with you will appear here'}
        </Text>
        {activeTab === 'myLists' && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('Create')}
          >
            <Text style={styles.createButtonText}>Create List</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Hello, {user?.displayName?.split(' ')[0] || 'there'}!
          </Text>
          <Text style={styles.headerTitle}>Your Packing Lists</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myLists' && styles.activeTab]}
          onPress={() => setActiveTab('myLists')}
        >
          <Text style={[styles.tabText, activeTab === 'myLists' && styles.activeTabText]}>
            My Lists
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shared' && styles.activeTab]}
          onPress={() => setActiveTab('shared')}
        >
          <Text style={[styles.tabText, activeTab === 'shared' && styles.activeTabText]}>
            Shared With Me
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Loading state */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6E8B3D" />
        </View>
      ) : (
        // List of packing lists
        <FlatList
          data={activeTab === 'myLists' ? packingLists : sharedLists}
          renderItem={renderPackingListItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
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
      
      {/* Add button (only on My Lists tab) */}
      {activeTab === 'myLists' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Create')}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  welcomeText: {
    fontSize: 14,
    color: '#777',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    marginRight: 20,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6E8B3D',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#777',
  },
  activeTabText: {
    color: '#6E8B3D',
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
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
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
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6E8B3D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
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
  },
});

export default HomeScreen;