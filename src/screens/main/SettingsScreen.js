// src/screens/main/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  ScrollView,
  Alert,
  Share,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../models/firestoreModels';
import { COLORS, THEME } from '../../constants/theme';
import { useActivityTracker } from '../../hooks/useActivityTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  
  // State
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Check if user is anonymous (guest)
  const isGuestUser = user && user.isAnonymous;
  
  // Track user activity for guest users
  useActivityTracker();
  
  // Fetch user profile
  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      if (isGuestUser) {
        // For guest users, use default settings
        setUserProfile({
          settings: {
            notifications: true
          }
        });
      } else {
        // For registered users, fetch from Firestore
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        
        // Set initial settings from profile
        if (profile) {
          setNotificationsEnabled(profile.settings?.notifications ?? true);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  // Update settings when toggled
  const handleToggleNotifications = (value) => {
    setNotificationsEnabled(value);
    updateSettings({ notifications: value });
  };
  
  // Update settings in Firestore
  const updateSettings = async (settingUpdate) => {
    if (!user) return;
    
    // For guest users, just update local state
    if (isGuestUser) {
      console.log('Settings updated in local state for guest user');
      return;
    }
    
    try {
      // Get current settings, merge with update, and save to Firestore
      const currentSettings = userProfile?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        ...settingUpdate,
      };
      
      await updateUserProfile(user.uid, { settings: updatedSettings });
      console.log('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    }
  };
  
  // Handle upgrade guest account
  const handleUpgradeAccount = () => {
    Alert.alert(
      'Create Account',
      'Would you like to upgrade to a full account? This will preserve your data and prevent it from being deleted after 3 days of inactivity.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Create Account',
          onPress: async () => {
            try {
              // First, store the guest data in AsyncStorage so we can retrieve it after logout
              const guestInfo = { 
                fromGuest: true, 
                guestUserId: user.uid, 
                guestDisplayName: user.displayName || 'Guest User' 
              };
              
              console.log('Storing guest info before logout:', guestInfo);
              
              // Store in AsyncStorage for retrieval after auth state change
              await AsyncStorage.setItem('guestUpgradeInfo', JSON.stringify(guestInfo));
              
              // Then logout - this will trigger navigation to auth stack automatically
              console.log('Logging out guest user to continue with upgrade');
              await logout();
              
              // Navigation to Register will happen in WelcomeScreen
            } catch (error) {
              console.error('Error during account upgrade process:', error);
              Alert.alert('Error', 'Could not prepare account upgrade. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Share the app
  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out PackM!nd+, the smart packing list app! Download it from the App Store or Google Play',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };
  
  // Rate the app
  const handleRateApp = () => {
    const appStoreUrl = 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID';
    const playStoreUrl = 'market://details?id=com.packmindplus';
    
    const url = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
      }
    });
  };
  
  // Handle logout
  const handleLogout = () => {
    const message = isGuestUser ? 
      'Are you sure you want to log out? All your data will be lost as you are using a guest account. Remember that guest data is automatically deleted after 3 days of inactivity.' :
      'Are you sure you want to log out?';

    Alert.alert(
      'Log Out',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled by auth context
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  // Handle navigation back
  const handleGoBack = () => {
    navigation.navigate('Home');
  };
  
  // Get avatar initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  };
  
  // If loading, show spinner
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.PRIMARY} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.accountInfo}>
            <View style={styles.accountAvatar}>
              <Text style={styles.avatarText}>
                {getInitials(user?.displayName || 'User')}
              </Text>
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>
                {user?.displayName || 'Anonymous User'}
              </Text>
              <Text style={styles.accountEmail}>
                {isGuestUser ? 'Guest Account' : (user?.email || 'No email')}
              </Text>
              
              {isGuestUser && (
                <View style={styles.guestBadge}>
                  <Text style={styles.guestBadgeText}>Guest</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Guest Account Banner */}
          {isGuestUser && (
            <View style={styles.guestBanner}>
              <Ionicons name="information-circle-outline" size={24} color={THEME.PRIMARY} style={styles.guestBannerIcon} />
              <Text style={styles.guestBannerText}>
                You're using a guest account. Your data is only stored on this device and will be automatically deleted after 3 days of inactivity.
              </Text>
              <TouchableOpacity 
                style={styles.guestUpgradeButton}
                onPress={handleUpgradeAccount}
              >
                <Text style={styles.guestUpgradeText}>Create Full Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.option}>
            <View style={styles.optionInfo}>
              <Ionicons name="notifications-outline" size={24} color="#777" style={styles.optionIcon} />
              <Text style={styles.optionText}>Enable Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#CCCCCC', true: THEME.PRIMARY }}
              thumbColor="white"
            />
          </View>
        </View>
        
        {/* Premium Section - Only show for full accounts */}
        {!isGuestUser && (
          <View style={styles.premiumSection}>
            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
            <Text style={styles.premiumDescription}>
              Get unlimited lists, priority support, and exclusive features.
            </Text>
            <TouchableOpacity 
              style={styles.premiumButton}
              onPress={() => Alert.alert('Premium', 'Coming soon!')}
            >
              <Text style={styles.premiumButtonText}>View Premium Features</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Feedback</Text>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleShareApp}
          >
            <Ionicons name="share-outline" size={24} color="#777" style={styles.optionIcon} />
            <Text style={styles.optionText}>Share App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleRateApp}
          >
            <Ionicons name="star-outline" size={24} color="#777" style={styles.optionIcon} />
            <Text style={styles.optionText}>Rate App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={() => Linking.openURL('mailto:xiaohangliu2023@gmail.com')}
          >
            <Ionicons name="mail-outline" size={24} color="#777" style={styles.optionIcon} />
            <Text style={styles.optionText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
        
        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          {isGuestUser && (
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={handleUpgradeAccount}
            >
              <Ionicons name="person-add-outline" size={24} color={THEME.PRIMARY} style={styles.optionIcon} />
              <Text style={[styles.optionText, { color: THEME.PRIMARY }]}>Create Full Account</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#FF5252" style={styles.optionIcon} />
            <Text style={[styles.optionText, styles.logoutText]}>Log Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 PackM!nd+</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 34,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  accountAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 14,
    color: '#777',
  },
  guestBadge: {
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  guestBadgeText: {
    fontSize: 12,
    color: '#777',
  },
  guestBanner: {
    backgroundColor: COLORS.LAVENDER,
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  guestBannerIcon: {
    marginBottom: 5,
  },
  guestBannerText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  guestUpgradeButton: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
  },
  guestUpgradeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 15,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  logoutText: {
    color: '#FF5252',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  premiumSection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  premiumDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  premiumButton: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
  },
});

export default SettingsScreen;