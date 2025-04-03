// src/context/PremiumContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { getUserProfile, updateUserProfile } from '../models/firestoreModels';
import firebase from '../firebase/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IAPService from '../services/IAPService';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

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
  const [products, setProducts] = useState([]);
  const [isRestoring, setIsRestoring] = useState(false);

  // Initialize IAP when the component mounts
  useEffect(() => {
    const setupIAP = async () => {
      await IAPService.initializeIAP();
      fetchProducts();
    };
    
    setupIAP();
    
    // Clean up when the component unmounts
    return () => {
      IAPService.endIAPConnection();
    };
  }, []);
  
  // Fetch available products
  const fetchProducts = async () => {
    try {
      // Get both regular and subscription products
      const productList = await IAPService.getProducts();
      const subscriptionList = await IAPService.getSubscriptions();
      
      // Combine both types
      const allProducts = [...productList, ...subscriptionList];
      
      // Store the products
      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Load premium status from user profile
  useEffect(() => {
    const loadPremiumStatus = async () => {
      setLoading(true);
      try {
        if (user && !user.isAnonymous) {
          console.log('Loading premium status for user:', user.uid);
          
          // Try both the 'users' and 'userProfiles' collections
          let userProfile = null;
          
          try {
            // Try using the new modular API and 'users' collection
            if (db) {
              const userDocRef = doc(db, 'users', user.uid);
              const docSnap = await getDoc(userDocRef);
              
              if (docSnap.exists()) {
                console.log('Found user profile in "users" collection (modular API)');
                userProfile = { userId: user.uid, ...docSnap.data() };
              }
            }
          } catch (modularError) {
            console.warn('Modular API failed to load profile:', modularError);
          }
          
          // If no profile found, try using the getUserProfile helper
          if (!userProfile) {
            userProfile = await getUserProfile(user.uid);
          }
          
          if (userProfile) {
            // Set premium status based on user profile
            // Check both isPremium and premium fields for backward compatibility
            const userIsPremium = userProfile.isPremium || userProfile.premium || false;
            setIsPremium(userIsPremium);
            setSubscriptionType(userProfile.subscriptionType || null);
            setSubscriptionExpiryDate(userProfile.subscriptionExpiryDate || null);
            
            // Save premium status to AsyncStorage for access from notification service
            await AsyncStorage.setItem('user_is_premium', userIsPremium ? 'true' : 'false');
            
            // Also save subscription type to AsyncStorage
            await AsyncStorage.setItem('subscription_type', userProfile.subscriptionType || 'none');
            
            console.log('Premium status loaded:', 
              userIsPremium ? 'Premium' : 'Free',
              'Type:', userProfile.subscriptionType || 'None');
          } else {
            // No profile found
            console.log('No user profile found, setting to free tier');
            setIsPremium(false);
            setSubscriptionType(null);
            setSubscriptionExpiryDate(null);
            await AsyncStorage.setItem('user_is_premium', 'false');
            await AsyncStorage.setItem('subscription_type', 'none');
          }
        } else {
          // Guest users are always free tier
          console.log('Anonymous user, setting to free tier');
          setIsPremium(false);
          setSubscriptionType(null);
          setSubscriptionExpiryDate(null);
          await AsyncStorage.setItem('user_is_premium', 'false');
          await AsyncStorage.setItem('subscription_type', 'none');
        }
      } catch (error) {
        console.error('Error loading premium status:', error);
        // Set default values on error
        setIsPremium(false);
        setSubscriptionType(null);
        setSubscriptionExpiryDate(null);
        await AsyncStorage.setItem('user_is_premium', 'false');
        await AsyncStorage.setItem('subscription_type', 'none');
      } finally {
        setLoading(false);
      }
    };

    loadPremiumStatus();
  }, [user]);
  
  // Check if a trial is already used
  const checkTrialEligibility = async (userId) => {
    try {
      const userProfile = await getUserProfile(userId);
      return !userProfile?.trialStarted;
    } catch (error) {
      console.error('Error checking trial eligibility:', error);
      return false;
    }
  };

  // Start free trial
  const startFreeTrial = async () => {
    // Don't allow anonymous users
    if (!user || user.isAnonymous) {
      return false;
    }
    
    try {
      // Set trial expiry to 14 days from now (changed from 7 days)
      const trialExpiryDate = new Date();
      trialExpiryDate.setDate(trialExpiryDate.getDate() + 14);
      
      // Ensure db reference is valid
      if (!db) {
        console.error('Firebase db reference is not initialized');
        throw new Error('Database not initialized');
      }
      
      console.log('Starting free trial for user:', user.uid);
      
      // Try to update the user document
      try {
        const userDocRef = doc(db, 'users', user.uid);
        // First get the existing document to preserve fields like createdAt
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          // Update existing document while preserving important fields
          await updateDoc(userDocRef, {
            displayName: user.displayName || '',
            email: user.email || '',
            isPremium: true,
            premium: true,
            subscriptionType: 'trial',
            subscriptionExpiryDate: trialExpiryDate,
            trialStartedAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          // Create new document if it doesn't exist
          await setDoc(userDocRef, {
            displayName: user.displayName || '',
            email: user.email || '',
            isPremium: true,
            premium: true,
            subscriptionType: 'trial',
            subscriptionExpiryDate: trialExpiryDate,
            trialStartedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } catch (updateError) {
        console.log('User document may not exist, creating new document');
        // Create the document if it doesn't exist
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          displayName: user.displayName || '',
          email: user.email || '',
          isPremium: true,
          premium: true,
          subscriptionType: 'trial',
          subscriptionExpiryDate: trialExpiryDate,
          trialStartedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Update local state
      setIsPremium(true);
      setSubscriptionType('trial');
      setSubscriptionExpiryDate(trialExpiryDate);
      
      // Important: Update AsyncStorage immediately so push notifications work without requiring logout/login
      await AsyncStorage.setItem('user_is_premium', 'true');
      await AsyncStorage.setItem('subscription_type', 'trial');
      
      console.log('Free trial started successfully, AsyncStorage updated with premium and trial status');
      return true;
    } catch (error) {
      console.error('Error starting free trial:', error);
      Alert.alert('Error', 'Failed to start free trial. Please try again.');
      return false;
    }
  };

  // Subscribe to premium
  const subscribeToPremium = async (subscriptionType, customPrice = null) => {
    try {
      // Don't allow anonymous users to subscribe
      if (!user) {
        Alert.alert('Account Required', 'Please sign in to subscribe to premium.');
        return false;
      }
      
      if (user.isAnonymous) {
        Alert.alert('Account Required', 'Please create a full account to subscribe to premium.');
        return false;
      }

      // Get product ID based on subscription type
      const productId = subscriptionType === 'monthly' ? 'com.packmind.premium.monthly' :
                         subscriptionType === 'annual' ? 'com.packmind.premium.annual' :
                         'com.packmind.premium.lifetime';
      
      console.log(`Starting purchase for product: ${productId}${customPrice ? ' with custom price: $' + customPrice : ''}`);
      
      // Check if the user document exists and create it if needed
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log('Creating user document before purchase');
          // Create the user document to avoid "No document to update" errors
          await setDoc(userDocRef, {
            displayName: user.displayName || '',
            email: user.email || '',
            isPremium: false,
            premium: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.warn('Error checking/creating user document:', error);
        // Continue with purchase attempt anyway
      }
      
      // Check if the products were properly loaded
      if (!products || products.length === 0 || customPrice) {
        console.log(`${customPrice ? 'Using custom price for upgrade' : 'No products available yet'} - using simulated purchase flow`);
        // Simulate purchase during development
        setIsPremium(true);
        
        // Create expiry date
        let expiryDate = new Date();
        try {
          if (subscriptionType === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          } else if (subscriptionType === 'annual') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            // Lifetime subscription - set to far future date
            expiryDate.setFullYear(expiryDate.getFullYear() + 99);
          }
        } catch (error) {
          console.error('Error creating expiry date:', error);
        }
        
        // Update user profile
        try {
          // Ensure db reference and document path are valid
          if (!db) {
            console.error('Firebase db reference is not initialized');
            throw new Error('Database not initialized');
          }
          
          console.log('Updating user document:', user.uid);
          
          const userDocRef = doc(db, 'users', user.uid);
          // First get the existing document to preserve fields
          const docSnap = await getDoc(userDocRef);
          
          if (docSnap.exists()) {
            // Update existing document while preserving important fields
            await updateDoc(userDocRef, {
              displayName: user.displayName || '',
              email: user.email || '',
              isPremium: true,
              premium: true,
              subscriptionType: subscriptionType,
              subscriptionExpiryDate: expiryDate,
              customUpgradePrice: customPrice, // Store the custom price used for the upgrade
              upgradedAt: new Date(), // Track when the user upgraded
              updatedAt: new Date()
            });
          } else {
            // Create new document if it doesn't exist
            await setDoc(userDocRef, {
              displayName: user.displayName || '',
              email: user.email || '',
              isPremium: true,
              premium: true,
              subscriptionType: subscriptionType,
              subscriptionExpiryDate: expiryDate,
              customUpgradePrice: customPrice,
              upgradedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          
          // Update local state
          setSubscriptionType(subscriptionType);
          setSubscriptionExpiryDate(expiryDate);
          
          console.log(`${customPrice ? 'Upgrade' : 'Simulated purchase'} successful`);
          return true;
        } catch (error) {
          console.error('Error updating user profile:', error);
          
          // Try creating the document if it doesn't exist
          try {
            console.log('Attempting to create user document');
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
              displayName: user.displayName || '',
              email: user.email || '',
              isPremium: true,
              premium: true,
              subscriptionType: subscriptionType,
              subscriptionExpiryDate: expiryDate,
              customUpgradePrice: customPrice,
              upgradedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            // Update local state
            setSubscriptionType(subscriptionType);
            setSubscriptionExpiryDate(expiryDate);
            
            console.log('Created new user profile with premium subscription');
            return true;
          } catch (createError) {
            console.error('Failed to create user profile:', createError);
            Alert.alert('Error', 'Failed to update subscription status. Please try again.');
            return false;
          }
        }
      }
      
      // Find the product
      const productToPurchase = products.find(p => p.productId === productId);
      
      if (!productToPurchase) {
        console.log(`Product ${productId} not found in available products`);
        Alert.alert('Product Unavailable', 'This subscription option is currently unavailable. Please try another option or contact support.');
        return false;
      }
      
      // Real purchase flow
      try {
        // Request the purchase
        const purchase = await IAPService.purchasePremium(productId, user.uid);
        
        // Process the purchase
        if (purchase.success) {
          // The user profile is already updated in the IAP service
          // Just update the local state
          
          // Calculate expiry based on plan
          let expiryDate = null;
          if (subscriptionType === 'monthly') {
            expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          } else if (subscriptionType === 'annual') {
            expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          }
          // No expiry for lifetime
          
          // Update local state
          setIsPremium(true);
          setSubscriptionType(subscriptionType);
          setSubscriptionExpiryDate(expiryDate);
          
          // Update AsyncStorage
          await AsyncStorage.setItem('user_is_premium', 'true');
          
          return true;
        } else {
          // If result.error is 'Purchase cancelled by user', don't show an error
          if (purchase.error === 'Purchase cancelled by user') {
            return false;
          }
          
          Alert.alert('Purchase Failed', purchase.error || 'Failed to process your purchase. Please try again.');
          return false;
        }
      } catch (error) {
        console.error('Purchase error:', error);
        
        // Show appropriate error message
        if (error.message && error.message.includes('right operand of \'in\' is not an object')) {
          Alert.alert(
            'Purchase Unavailable', 
            'In-app purchases are not available in this environment. During development, we\'ll simulate a successful purchase for you.',
            [
              { 
                text: 'OK',
                onPress: async () => {
                  // Simulate successful purchase for development
                  setIsPremium(true);
                  
                  // Create expiry date
                  let expiryDate = new Date();
                  if (subscriptionType === 'monthly') {
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                  } else if (subscriptionType === 'annual') {
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                  } else {
                    // Lifetime subscription
                    expiryDate.setFullYear(expiryDate.getFullYear() + 99);
                  }
                  
                  // Update user profile
                  try {
                    // Ensure db reference and document path are valid
                    if (!db) {
                      console.error('Firebase db reference is not initialized');
                      throw new Error('Database not initialized');
                    }
                    
                    console.log('Updating user document:', user.uid);
                    
                    const userDocRef = doc(db, 'users', user.uid);
                    await updateDoc(userDocRef, {
                      isPremium: true,
                      subscriptionType: subscriptionType,
                      subscriptionExpiryDate: expiryDate,
                      customUpgradePrice: customPrice, // Store the custom price used for the upgrade
                      upgradedAt: new Date() // Track when the user upgraded
                    });
                    
                    // Update local state
                    setSubscriptionType(subscriptionType);
                    setSubscriptionExpiryDate(expiryDate);
                    
                    return true;
                  } catch (error) {
                    console.error('Error updating user profile:', error);
                    Alert.alert('Error', 'Failed to update subscription status. Please try again.');
                    return false;
                  }
                }
              }
            ]
          );
          return false;
        } else {
          Alert.alert('Purchase Failed', 'Failed to process your purchase. Please try again later.');
          return false;
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
      return false;
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!user || user.isAnonymous) return;

    try {
      // In a real app, this would integrate with payment processor
      // For now, we'll just update the user profile
      
      // Ensure db reference is valid
      if (!db) {
        console.error('Firebase db reference is not initialized');
        throw new Error('Database not initialized');
      }
      
      console.log('Cancelling subscription for user:', user.uid);
      
      const userDocRef = doc(db, 'users', user.uid);
      // Update user profile to remove premium status
      await updateDoc(userDocRef, {
        isPremium: false,
        premium: false, // For backward compatibility
        subscriptionType: null,
        subscriptionExpiryDate: null,
        cancelledAt: new Date()
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
  
  // Restore purchases
  const restorePurchases = async () => {
    if (!user || user.isAnonymous) {
      Alert.alert('Account Required', 'Please create a full account to restore purchases.');
      return false;
    }
    
    setIsRestoring(true);
    
    try {
      // Use the IAP service to restore purchases
      const result = await IAPService.restorePurchases(user.uid);
      
      if (result.success) {
        // Reload premium status
        const userProfile = await getUserProfile(user.uid);
        
        if (userProfile) {
          setIsPremium(userProfile.premium || false);
          setSubscriptionType(userProfile.subscriptionType || null);
          setSubscriptionExpiryDate(userProfile.subscriptionExpiryDate || null);
          
          // Update AsyncStorage
          await AsyncStorage.setItem('user_is_premium', userProfile.premium ? 'true' : 'false');
        }
        
        Alert.alert('Success', result.message || 'Your purchases have been restored.');
        return true;
      } else {
        Alert.alert('Restore Failed', result.message || 'No previous purchases were found.');
        return false;
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
      return false;
    } finally {
      setIsRestoring(false);
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
    isRestoring,
    products,
    startFreeTrial,
    subscribeToPremium,
    cancelSubscription,
    restorePurchases,
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