// src/context/PremiumContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { getUserProfile, updateUserProfile } from '../models/firestoreModels';
import firebase from '../firebase/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the context
export const PremiumContext = createContext();

// Define pricing constants
export const PREMIUM_PRICING = {
  MONTHLY: 2.99,
  ANNUAL: 19.99,
  LIFETIME: 49.99
};

// Define feature limits
export const FREE_TIER_LIMITS = {
  MAX_LISTS: 3,
};

// Provider component
export const PremiumProvider = ({ children }) => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState(null);
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load premium status from user profile
  useEffect(() => {
    const loadPremiumStatus = async () => {
      setLoading(true);
      try {
        if (user && !user.isAnonymous) {
          const userProfile = await getUserProfile(user.uid);
          
          if (userProfile) {
            // Set premium status based on user profile
            const userIsPremium = userProfile.premium || false;
            setIsPremium(userIsPremium);
            setSubscriptionType(userProfile.subscriptionType || null);
            setSubscriptionExpiryDate(userProfile.subscriptionExpiryDate || null);
            
            // Save premium status to AsyncStorage for access from notification service
            await AsyncStorage.setItem('user_is_premium', userIsPremium ? 'true' : 'false');
          } else {
            setIsPremium(false);
            setSubscriptionType(null);
            setSubscriptionExpiryDate(null);
            await AsyncStorage.setItem('user_is_premium', 'false');
          }
        } else {
          // Guest users are always free tier
          setIsPremium(false);
          setSubscriptionType(null);
          setSubscriptionExpiryDate(null);
          await AsyncStorage.setItem('user_is_premium', 'false');
        }
      } catch (error) {
        console.error('Error loading premium status:', error);
        // Set default values on error
        setIsPremium(false);
        setSubscriptionType(null);
        setSubscriptionExpiryDate(null);
        await AsyncStorage.setItem('user_is_premium', 'false');
      } finally {
        setLoading(false);
      }
    };

    loadPremiumStatus();
  }, [user]);

  // Start free trial
  const startFreeTrial = async () => {
    if (!user || user.isAnonymous) {
      Alert.alert('Account Required', 'Please create a full account to start a free trial.');
      return false;
    }

    try {
      // Calculate trial expiry date (7 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      let firestoreTimestamp;
      try {
        firestoreTimestamp = firebase.firestore.Timestamp.fromDate(expiryDate);
      } catch (error) {
        console.error('Error creating Firestore timestamp:', error);
        firestoreTimestamp = expiryDate;
      }

      // Update user profile with trial information
      await updateUserProfile(user.uid, {
        premium: true,
        subscriptionType: 'trial',
        subscriptionExpiryDate: firestoreTimestamp,
        trialStarted: true,
      });

      // Update local state
      setIsPremium(true);
      setSubscriptionType('trial');
      setSubscriptionExpiryDate(expiryDate);
      
      // Update AsyncStorage
      await AsyncStorage.setItem('user_is_premium', 'true');

      return true;
    } catch (error) {
      console.error('Error starting free trial:', error);
      Alert.alert('Error', 'Failed to start free trial. Please try again.');
      return false;
    }
  };

  // Subscribe to premium
  const subscribeToPremium = async (plan) => {
    if (!user || user.isAnonymous) {
      Alert.alert('Account Required', 'Please create a full account to subscribe to premium.');
      return false;
    }

    try {
      // In a real app, this would integrate with payment processor
      // For now, we'll just simulate successful payment
      
      let expiryDate = null;
      
      if (plan === 'monthly') {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (plan === 'annual') {
        expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else if (plan === 'lifetime') {
        // Lifetime has no expiry
        expiryDate = null;
      }

      // Prepare the Firestore timestamp if needed
      let firestoreTimestamp = null;
      if (expiryDate) {
        try {
          firestoreTimestamp = firebase.firestore.Timestamp.fromDate(expiryDate);
        } catch (error) {
          console.error('Error creating Firestore timestamp:', error);
          firestoreTimestamp = expiryDate; // Fallback to Date object
        }
      }

      // Update user profile with subscription information
      await updateUserProfile(user.uid, {
        premium: true,
        subscriptionType: plan,
        subscriptionExpiryDate: firestoreTimestamp,
      });

      // Update local state
      setIsPremium(true);
      setSubscriptionType(plan);
      setSubscriptionExpiryDate(expiryDate);
      
      // Update AsyncStorage
      await AsyncStorage.setItem('user_is_premium', 'true');

      return true;
    } catch (error) {
      console.error('Error subscribing to premium:', error);
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
      return false;
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!user || user.isAnonymous) return;

    try {
      // In a real app, this would integrate with payment processor
      // For now, we'll just update the user profile
      
      // Update user profile to remove premium status
      await updateUserProfile(user.uid, {
        premium: false,
        subscriptionType: null,
        subscriptionExpiryDate: null,
      });

      // Update local state
      setIsPremium(false);
      setSubscriptionType(null);
      setSubscriptionExpiryDate(null);
      
      // Update AsyncStorage
      await AsyncStorage.setItem('user_is_premium', 'false');

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
      return false;
    }
  };

  // Check if user can create more lists
  const canCreateMoreLists = async (currentListCount) => {
    // Always allow premium users to create more lists
    if (isPremium) return true;
    
    // Enforce limit for both guest and regular users
    return currentListCount < FREE_TIER_LIMITS.MAX_LISTS;
  };

  // Context value
  const value = {
    isPremium,
    subscriptionType,
    subscriptionExpiryDate,
    loading,
    startFreeTrial,
    subscribeToPremium,
    cancelSubscription,
    canCreateMoreLists,
    pricing: PREMIUM_PRICING,
    limits: FREE_TIER_LIMITS,
  };

  // Provider return
  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};

// Custom hook to use the premium context
export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}; 