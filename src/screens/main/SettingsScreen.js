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
  AppState,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { usePremium } from '../../context/PremiumContext';
import { getUserProfile, updateUserProfile } from '../../models/firestoreModels';
import { COLORS, THEME } from '../../constants/theme';
import { useActivityTracker } from '../../hooks/useActivityTracker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '../../firebase/firebaseConfig';
import * as Notifications from 'expo-notifications';

const SettingsScreen = ({ navigation }) => {
  const { user, logout, cancelAccount } = useAuth();
  
  // Try to get premium context - use try/catch to prevent errors during initialization
  let isPremium = false;
  let subscriptionType = null;
  try {
    const premiumContext = usePremium();
    isPremium = premiumContext.isPremium;
    subscriptionType = premiumContext.subscriptionType;
  } catch (error) {
    console.log('Premium context not yet available, using defaults');
  }
  
  // State
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  
  // Reference to track app state changes
  const appState = React.useRef(AppState.currentState);
  
  // Check if user is anonymous (guest)
  const isGuestUser = user && user.isAnonymous;
  
  // Track user activity for guest users
  useActivityTracker();
  
  // State for modals
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  
  // Open app notification settings
  const openNotificationSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert(
        'Error',
        'Could not open settings. Please open your device settings manually.'
      );
    }
  };
  
  // Check notification permission status
  const checkNotificationPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      console.log('Current notification permission status:', status);
      setHasNotificationPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };
  
  // Listen for app state changes (e.g., when app comes to foreground from settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground - checking notification permissions');
        checkNotificationPermission();
      }
      
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Fetch user profile
  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      if (isGuestUser) {
        // For guest users, use default settings
        setUserProfile({
          settings: {}
        });
      } else {
        // For registered users, fetch from Firestore
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
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
    checkNotificationPermission();
  }, []);
  
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
        message: 'Check out PackMind+, the smart packing list app! Download it from the App Store or Google Play',
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
  
  // Handle contact support
  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Please email to 2024@xiaohangliuai.com for support',
      [{ text: 'OK' }]
    );
  };
  
  // Handle logout
  const handleLogout = () => {
    const message = isGuestUser ? 
      'Are you sure you want to log out? All your data will be permanently deleted as you are using a guest account.' :
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
              if (isGuestUser) {
                // Delete guest user data from Firebase before logging out
                console.log('Deleting guest user data from Firebase...');
                
                // Delete user packing lists
                const packingListsRef = firebase.firestore().collection('packingLists').where('userId', '==', user.uid);
                const packingListsSnapshot = await packingListsRef.get();
                
                const batch = firebase.firestore().batch();
                
                // Add packing lists to batch for deletion
                packingListsSnapshot.forEach(doc => {
                  batch.delete(doc.ref);
                });
                
                // Delete user profile if exists
                const userProfileRef = firebase.firestore().collection('userProfiles').doc(user.uid);
                const userProfileSnapshot = await userProfileRef.get();
                
                if (userProfileSnapshot.exists) {
                  batch.delete(userProfileRef);
                }
                
                // Execute the batch delete
                await batch.commit();
                
                console.log('Guest data successfully deleted');
              }
              
              // Log out the user
              await logout();
              // Navigation will be handled by auth context
            } catch (error) {
              console.error('Error during logout process:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  // Handle cancel account
  const handleCancelAccount = () => {
    Alert.alert(
      'Cancel Account',
      'Are you sure you want to cancel your account? This will permanently delete all your data and cannot be undone.',
      [
        {
          text: 'No, Keep My Account',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              
              // Delete the account
              await cancelAccount();
              
              // Show success message before auto-logout happens
              Alert.alert(
                'Account Deleted',
                'Your account has been successfully deleted.',
                [{ text: 'OK' }]
              );
              
              // Navigation will be handled by auth context
            } catch (error) {
              console.error('Error canceling account:', error);
              Alert.alert('Error', 'Failed to cancel your account. Please try again.');
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
  
  // Handle open Terms of Service
  const handleOpenTerms = () => {
    setIsTermsModalVisible(true);
  };
  
  // Handle close Terms of Service
  const handleCloseTerms = () => {
    setIsTermsModalVisible(false);
  };
  
  // Handle open Privacy Policy
  const handleOpenPrivacy = () => {
    setIsPrivacyModalVisible(true);
  };
  
  // Handle close Privacy Policy
  const handleClosePrivacy = () => {
    setIsPrivacyModalVisible(false);
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
              <View style={styles.guestButtons}>
                <TouchableOpacity 
                  style={styles.guestUpgradeButton}
                  onPress={handleUpgradeAccount}
                >
                  <Text style={styles.guestUpgradeText}>Create Full Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {/* Premium Section - Only show for full accounts */}
        {!isGuestUser && (
          <View style={styles.premiumSection}>
            <Text style={styles.premiumTitle}>
              {isPremium ? 'Premium Active' : 'Upgrade to Premium'}
            </Text>
            <Text style={styles.premiumDescription}>
              {isPremium 
                ? `You're currently on the ${subscriptionType === 'trial' 
                    ? 'Free Trial' 
                    : subscriptionType === 'monthly' 
                      ? 'Monthly Plan' 
                      : subscriptionType === 'annual' 
                        ? 'Annual Plan' 
                        : 'Lifetime Plan'}`
                : 'Get unlimited lists, advanced notifications, and more.'}
            </Text>
            <TouchableOpacity 
              style={[styles.premiumButton, isPremium && styles.premiumActiveButton]}
              onPress={() => navigation.navigate('Premium')}
            >
              <Text style={styles.premiumButtonText}>
                {isPremium 
                  ? 'Manage Subscription' 
                  : isGuestUser 
                    ? 'Create Account' 
                    : 'View Premium Features'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Notification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={openNotificationSettings}
          >
            <Ionicons 
              name={hasNotificationPermission ? "notifications" : "notifications-outline"} 
              size={24} 
              color={THEME.PRIMARY} 
              style={styles.optionIcon} 
            />
            <View style={styles.optionInfo}>
              <Text style={[styles.optionText, { color: THEME.PRIMARY }]}>Notification Settings</Text>
            </View>
            {hasNotificationPermission && (
              <Text style={styles.enabledText}>Enabled</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleShareApp}
          >
            <Ionicons name="share-outline" size={24} color={THEME.PRIMARY} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: THEME.PRIMARY }]}>Share App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleRateApp}
          >
            <Ionicons name="star-outline" size={24} color={THEME.PRIMARY} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: THEME.PRIMARY }]}>Rate App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleContactSupport}
          >
            <Ionicons name="mail-outline" size={24} color={THEME.PRIMARY} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: THEME.PRIMARY }]}>Contact Support</Text>
          </TouchableOpacity>
        </View>
        
        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Terms</Text>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleOpenTerms}
          >
            <Ionicons name="document-text-outline" size={24} color={THEME.PRIMARY} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: THEME.PRIMARY }]}>Terms of Service</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleOpenPrivacy}
          >
            <Ionicons name="shield-outline" size={24} color={THEME.PRIMARY} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: THEME.PRIMARY }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
        
        {/* Account Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          {!isGuestUser && (
            /* Cancel Account */
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleCancelAccount}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="trash-outline" size={24} color={COLORS.ERROR} style={styles.optionIcon} />
                <Text style={[styles.optionText, {color: COLORS.ERROR}]}>Cancel Account</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Logout */}
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color={COLORS.ERROR} style={styles.optionIcon} />
            <Text style={[styles.optionText, styles.logoutText]}>Log Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 PackMind+</Text>
        </View>
      </ScrollView>
      
      {/* Terms of Service Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isTermsModalVisible}
        onRequestClose={handleCloseTerms}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={handleCloseTerms}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.legalContent}>
              <Text style={styles.legalTitle}>PackMind+ Terms of Service</Text>
              <Text style={styles.legalDate}>Last Updated: April 13, 2025</Text>
              
              <Text style={styles.legalSectionTitle}>1. Introduction</Text>
              <Text style={styles.legalText}>
                PackMind+ is a personal organization application that helps users create and manage packing lists for various activities and trips. By downloading, installing, or using PackMind+ ("App"), you agree to be bound by these Terms of Service. If you do not agree with these terms, please do not use the App.
              </Text>
              
              <Text style={styles.legalSectionTitle}>2. User Responsibilities</Text>
              <Text style={styles.legalSubtitle}>2.1 Accurate Information</Text>
              <Text style={styles.legalText}>
                You agree to provide accurate and complete information when creating an account and using the App.
              </Text>
              <Text style={styles.legalSubtitle}>2.2 Lawful Use</Text>
              <Text style={styles.legalText}>
                You agree not to use the App for any illegal or unauthorized purpose. You must not attempt to interfere with the App's functionality or security.
              </Text>
              <Text style={styles.legalSubtitle}>2.3 User Conduct</Text>
              <Text style={styles.legalText}>
                You are responsible for all activities that occur under your account. You must not engage in any activity that could harm, disable, or impair the App.
              </Text>
              
              <Text style={styles.legalSectionTitle}>3. Account & Access</Text>
              <Text style={styles.legalSubtitle}>3.1 Firebase Integration</Text>
              <Text style={styles.legalText}>
                We use Firebase for data storage and authentication. Your use of the App is also subject to Google's Terms of Service for Firebase.
              </Text>
              <Text style={styles.legalSubtitle}>3.2 Account Security</Text>
              <Text style={styles.legalText}>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities performed under your account.
              </Text>
              <Text style={styles.legalSubtitle}>3.3 Data Synchronization</Text>
              <Text style={styles.legalText}>
                Your packing lists and preferences may be synchronized across devices using your account credentials.
              </Text>
              
              <Text style={styles.legalSectionTitle}>4. Subscription & In-App Purchases</Text>
              <Text style={styles.legalSubtitle}>4.1 Subscription Options</Text>
              <Text style={styles.legalText}>
                We offer the following premium subscription options:
                {'\n'}- Monthly subscription
                {'\n'}- Annual subscription (includes a 14-day free trial)
                {'\n'}- Lifetime purchase (one-time payment)
              </Text>
              <Text style={styles.legalSubtitle}>4.2 Free Trial</Text>
              <Text style={styles.legalText}>
                Users who select the annual subscription receive a 14-day free trial. If you do not cancel before the trial period ends, you will be automatically charged for the annual subscription.
              </Text>
              <Text style={styles.legalSubtitle}>4.3 Payment Processing</Text>
              <Text style={styles.legalText}>
                All payments are processed through the App Store. Subscription fees are set at the time of purchase.
              </Text>
              <Text style={styles.legalSubtitle}>4.4 Auto-Renewal</Text>
              <Text style={styles.legalText}>
                Subscriptions automatically renew unless canceled at least 24 hours before the current period ends. Refunds must be requested from the App Store.
              </Text>
              <Text style={styles.legalSubtitle}>4.5 Subscription Management</Text>
              <Text style={styles.legalText}>
                You can manage or cancel your subscription through your App Store account settings.
              </Text>
              <Text style={styles.legalSubtitle}>4.6 Refund Policy</Text>
              <Text style={styles.legalText}>
                We do not process refunds directly. All refund requests must be submitted through the App Store according to their policies.
              </Text>
              
              <Text style={styles.legalSectionTitle}>5. Intellectual Property</Text>
              <Text style={styles.legalSubtitle}>5.1 App Ownership</Text>
              <Text style={styles.legalText}>
                PackMind+ and its original content, features, and functionality are owned by the developer and are protected by international copyright, trademark, and other intellectual property laws.
              </Text>
              <Text style={styles.legalSubtitle}>5.2 User Content</Text>
              <Text style={styles.legalText}>
                You retain ownership of any content you create using the App. However, you grant us a non-exclusive license to use this content to provide and improve the App's services.
              </Text>
              <Text style={styles.legalSubtitle}>5.3 Restrictions</Text>
              <Text style={styles.legalText}>
                You may not copy, modify, distribute, sell, or lease any part of the App without explicit permission.
              </Text>
              
              <Text style={styles.legalSectionTitle}>6. Termination</Text>
              <Text style={styles.legalSubtitle}>6.1 Termination by Developer</Text>
              <Text style={styles.legalText}>
                We may suspend or terminate your account and access to the App immediately, without prior notice for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
              </Text>
              <Text style={styles.legalSubtitle}>6.2 Termination by User</Text>
              <Text style={styles.legalText}>
                You may terminate your use of the App at any time by uninstalling the App and discontinuing its use. If you have an active subscription, you must cancel it separately through your App Store account.
              </Text>
              <Text style={styles.legalSubtitle}>6.3 Effect of Termination</Text>
              <Text style={styles.legalText}>
                Upon termination, your right to use the App will immediately cease. If you terminate your account, we may retain certain data for legitimate business purposes.
              </Text>
              
              <Text style={styles.legalSectionTitle}>7. Limitation of Liability</Text>
              <Text style={styles.legalSubtitle}>7.1 Disclaimer of Warranties</Text>
              <Text style={styles.legalText}>
                THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE APP WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE.
              </Text>
              <Text style={styles.legalSubtitle}>7.2 Limitation of Liability</Text>
              <Text style={styles.legalText}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED TO DATA LOSS OR CORRUPTION, DEVICE DAMAGE, OR FINANCIAL LOSS.
              </Text>
              <Text style={styles.legalSubtitle}>7.3 Data Responsibility</Text>
              <Text style={styles.legalText}>
                You are responsible for maintaining backup copies of your data. We are not responsible for data loss resulting from user actions, device failures, or service interruptions.
              </Text>
              
              <Text style={styles.legalSectionTitle}>8. Apple App Store Terms</Text>
              <Text style={styles.legalSubtitle}>8.1 Third-Party Beneficiary</Text>
              <Text style={styles.legalText}>
                Apple and its subsidiaries are third-party beneficiaries of this agreement. Upon your acceptance of these terms, Apple will have the right to enforce this agreement against you as a third-party beneficiary.
              </Text>
              <Text style={styles.legalSubtitle}>8.2 Responsibility for App</Text>
              <Text style={styles.legalText}>
                We, not Apple, are solely responsible for the App and its services, including maintenance, support, warranties, and addressing any claims.
              </Text>
              <Text style={styles.legalSubtitle}>8.3 Compliance with Third-Party Terms</Text>
              <Text style={styles.legalText}>
                You agree to comply with all applicable third-party agreements when using the App, such as your wireless data service agreement.
              </Text>
              
              <Text style={styles.legalSectionTitle}>9. Changes to Terms</Text>
              <Text style={styles.legalText}>
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting in the App. Your continued use of the App after any changes indicates your acceptance of the modified Terms.
              </Text>
              
              <Text style={styles.legalSectionTitle}>10. Contact Information</Text>
              <Text style={styles.legalText}>
                For questions about these Terms, please contact:
                {'\n'}Email: 2024@xiaohangliuai.com
              </Text>
              
              <Text style={styles.legalDate}>Effective Date: April 13, 2025</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Privacy Policy Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isPrivacyModalVisible}
        onRequestClose={handleClosePrivacy}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={handleClosePrivacy}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.legalContent}>
              <Text style={styles.legalTitle}>PackMind+ Privacy Policy</Text>
              <Text style={styles.legalDate}>Last Updated: April 13, 2025</Text>
              
              <Text style={styles.legalSectionTitle}>Introduction</Text>
              <Text style={styles.legalText}>
                PackMind+ ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Information Collected</Text>
              <Text style={styles.legalText}>
                We may collect the following types of information:
              </Text>
              <Text style={styles.legalSectionTitle}>Personal Information</Text>
              <Text style={styles.legalText}>
                • Account Information: Name, email address, your packing list information and so on
                {'\n'}• Firebase ID: Unique identifier for authentication and data synchronization
              </Text>
              
              <Text style={styles.legalSectionTitle}>How We Use Your Information</Text>
              <Text style={styles.legalText}>
                We use the information we collect to:
                {'\n'}• Create and manage your account
                {'\n'}• Synchronize your packing lists across devices
                {'\n'}• Send reminder notifications for your scheduled activities
                {'\n'}• Troubleshoot technical issues
                {'\n'}• Process and manage your subscription
                {'\n'}• Communicate important updates about the app
              </Text>
              
              <Text style={styles.legalSectionTitle}>Data Sharing & Third Parties</Text>
              <Text style={styles.legalSectionTitle}>Firebase</Text>
              <Text style={styles.legalText}>
                We use Google Firebase for authentication, data storage, and synchronization. Your use of these services is subject to Google's Privacy Policy.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Apple Services</Text>
              <Text style={styles.legalText}>
                Payment information for subscriptions is processed directly by Apple. We do not store your payment details on our servers.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Data Protection Commitment</Text>
              <Text style={styles.legalText}>
                We are committed to protecting your personal data. As part of this commitment, we will never sell, rent, or trade your personal information to any third parties for marketing or advertising purposes. Any sharing of your data is strictly limited to what is necessary to provide our services and will only occur with your explicit consent, except where required by law.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Security Measures</Text>
              <Text style={styles.legalText}>
                Your privacy and the security of your data are of utmost importance to us. We implement industry-standard technical safeguards and administrative protocols to protect your information from unauthorized access, accidental loss, or alteration. While no digital system can guarantee absolute security, we continuously review and enhance our security practices to provide the highest level of protection possible for your personal information.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Policy Updates</Text>
              <Text style={styles.legalText}>
                We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date at the top of this policy. When we make significant changes, you will be notified through an app update, and the latest privacy policy will always be available within the current version of the app. To ensure you're aware of any changes, we recommend keeping your app updated to the latest version and reviewing this Privacy Policy periodically.
              </Text>
              
              <Text style={styles.legalSectionTitle}>Contact Information</Text>
              <Text style={styles.legalText}>
                If you have questions or concerns about this Privacy Policy, please contact us at:
                {'\n'}Email: 2024@xiaohangliuai.com
              </Text>
              
              <Text style={styles.legalDate}>Effective Date: April 13, 2025</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  guestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  premiumActiveButton: {
    backgroundColor: COLORS.SUCCESS,
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
  enabledText: {
    color: COLORS.SUCCESS,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalBackButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
  },
  legalContent: {
    padding: 20,
  },
  legalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  legalDate: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
  },
  legalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  legalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  legalText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    marginBottom: 10,
  },
});

export default SettingsScreen;