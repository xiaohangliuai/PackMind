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

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  
  // State
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [checkedItemsAtBottom, setCheckedItemsAtBottom] = useState(true);
  
  // Fetch user profile
  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
      
      // Set initial settings from profile
      if (profile) {
        setNotificationsEnabled(profile.settings?.notifications ?? true);
        setWeatherEnabled(profile.settings?.weather ?? true);
        setCheckedItemsAtBottom(profile.settings?.checkedItemsAtBottom ?? true);
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
  
  // Save settings
  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      const settings = {
        notifications: notificationsEnabled,
        weather: weatherEnabled,
        checkedItemsAtBottom: checkedItemsAtBottom,
      };
      
      await updateUserProfile(user.uid, { settings });
      
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };
  
  // Share app
  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out PackMind, the best app for organizing your packing lists! Download it now.',
        title: 'PackMind - Packing List Organizer',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };
  
  // Rate app
  const handleRateApp = () => {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/yourappid'
      : 'https://play.google.com/store/apps/details?id=com.yourapp';
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open the app store');
      }
    });
  };
  
  // Contact support
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@packmind.com?subject=PackMind Support');
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
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
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>{user.displayName || 'User'}</Text>
              <Text style={styles.accountEmail}>{user.email}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.optionButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF5252" />
            <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
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
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#CCCCCC', true: '#6E8B3D' }}
              thumbColor="white"
            />
          </View>
        </View>
        
        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.option}>
            <View style={styles.optionInfo}>
              <Ionicons name="partly-sunny-outline" size={24} color="#777" style={styles.optionIcon} />
              <Text style={styles.optionText}>Weather Recommendations</Text>
            </View>
            <Switch
              value={weatherEnabled}
              onValueChange={setWeatherEnabled}
              trackColor={{ false: '#CCCCCC', true: '#6E8B3D' }}
              thumbColor="white"
            />
          </View>
          
          <View style={styles.option}>
            <View style={styles.optionInfo}>
              <Ionicons name="checkbox-outline" size={24} color="#777" style={styles.optionIcon} />
              <Text style={styles.optionText}>Move Checked Items to Bottom</Text>
            </View>
            <Switch
              value={checkedItemsAtBottom}
              onValueChange={setCheckedItemsAtBottom}
              trackColor={{ false: '#CCCCCC', true: '#6E8B3D' }}
              thumbColor="white"
            />
          </View>
        </View>
        
        {/* Premium Section */}
        <View style={styles.premiumSection}>
          <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
          <Text style={styles.premiumDescription}>
            Unlock additional features, custom icons, and remove ads.
          </Text>
          <TouchableOpacity style={styles.premiumButton}>
            <Text style={styles.premiumButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
        
        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.optionButton} onPress={handleShareApp}>
            <Ionicons name="share-social-outline" size={24} color="#777" style={styles.optionIcon} />
            <Text style={styles.optionText}>Share App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionButton} onPress={handleRateApp}>
            <Ionicons name="star-outline" size={24} color="#777" style={styles.optionIcon} />
            <Text style={styles.optionText}>Rate App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionButton} onPress={handleContactSupport}>
            <Ionicons name="mail-outline" size={24} color="#777" style={styles.optionIcon} />
            <Text style={styles.optionText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 PackMind</Text>
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
    paddingBottom: 40,
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
    backgroundColor: '#6E8B3D',
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
    backgroundColor: '#6E8B3D',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#6E8B3D',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
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