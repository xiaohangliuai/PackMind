// src/services/IAPService.js
import { Platform, Alert } from 'react-native';
import * as RNIap from 'react-native-iap';
import firebase from '../firebase/firebaseConfig';

// Define your product IDs
export const productIds = Platform.select({
  ios: [
    'com.packmind.premium.monthly',
    'com.packmind.premium.annual',
    'com.packmind.premium.lifetime'
  ],
  android: [
    'com.packmind.premium.monthly',
    'com.packmind.premium.annual',
    'com.packmind.premium.lifetime'
  ]
});

// Map product IDs to subscription types
export const productIdToType = {
  'com.packmind.premium.monthly': 'monthly',
  'com.packmind.premium.annual': 'annual',
  'com.packmind.premium.lifetime': 'lifetime'
};

// Initialize IAP
export const initializeIAP = async () => {
  try {
    console.log('Initializing IAP...');
    
    try {
      await RNIap.initConnection();
      console.log('IAP initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing IAP:', error);
      
      // In development, we'll simulate IAP is working
      if (__DEV__) {
        console.log('Running in development mode - simulating IAP availability');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Critical error initializing IAP:', error);
    return false;
  }
};

// End IAP connection
export const endIAPConnection = async () => {
  try {
    await RNIap.endConnection();
    console.log('IAP connection ended');
  } catch (error) {
    console.error('Error ending IAP connection:', error);
  }
};

// Get products
export const getProducts = async () => {
  try {
    console.log('Getting IAP products...');
    
    // Check if we have product IDs
    if (!productIds || productIds.length === 0) {
      console.warn('No product IDs defined');
      return getMockProducts();
    }
    
    try {
      const products = await RNIap.getProducts(productIds);
      console.log('Products fetched:', products);
      
      // If no products returned, use mock products
      if (!products || products.length === 0) {
        console.log('No products returned from store, using mock products');
        return getMockProducts();
      }
      
      return products;
    } catch (error) {
      console.error('Error getting products from store:', error);
      console.log('Using mock products for development');
      return getMockProducts();
    }
  } catch (error) {
    console.error('Error in getProducts:', error);
    return getMockProducts();
  }
};

// Get subscriptions
export const getSubscriptions = async () => {
  try {
    console.log('Getting IAP subscriptions...');
    
    // Check if we have product IDs
    if (!productIds || productIds.length === 0) {
      console.warn('No product IDs defined');
      return getMockSubscriptions();
    }
    
    try {
      const subscriptions = await RNIap.getSubscriptions(productIds);
      console.log('Subscriptions fetched:', subscriptions);
      
      // If no subscriptions returned, use mock subscriptions
      if (!subscriptions || subscriptions.length === 0) {
        console.log('No subscriptions returned from store, using mock subscriptions');
        return getMockSubscriptions();
      }
      
      return subscriptions;
    } catch (error) {
      console.error('Error getting subscriptions from store:', error);
      console.log('Using mock subscriptions for development');
      return getMockSubscriptions();
    }
  } catch (error) {
    console.error('Error in getSubscriptions:', error);
    return getMockSubscriptions();
  }
};

// Generate mock products for development
const getMockProducts = () => {
  return [
    {
      productId: 'com.packmind.premium.lifetime',
      title: 'Lifetime Premium',
      description: 'Unlock all premium features forever',
      price: '$21.99',
      currency: 'USD',
      localizedPrice: '$21.99',
      _isMock: true
    }
  ];
};

// Generate mock subscriptions for development
const getMockSubscriptions = () => {
  return [
    {
      productId: 'com.packmind.premium.monthly',
      title: 'Monthly Premium',
      description: 'Unlock all premium features',
      subscriptionPeriodUnitIOS: 'MONTH',
      subscriptionPeriodAndroid: 'P1M',
      price: '$1.69',
      currency: 'USD',
      localizedPrice: '$1.69',
      _isMock: true
    },
    {
      productId: 'com.packmind.premium.annual',
      title: 'Annual Premium',
      description: 'Unlock all premium features',
      subscriptionPeriodUnitIOS: 'YEAR',
      subscriptionPeriodAndroid: 'P1Y',
      price: '$12.99',
      currency: 'USD',
      localizedPrice: '$12.99',
      _isMock: true
    }
  ];
};

// Process purchase for premium
export const purchasePremium = async (productId, userId) => {
  try {
    console.log(`Starting purchase for product: ${productId}`);
    
    if (!userId) {
      console.error('No user ID provided for purchase');
      return { success: false, error: 'User not authenticated' };
    }
    
    // In development, simulate a successful purchase
    if (__DEV__) {
      console.log('Development mode - simulating successful purchase');
      
      // Create a mock purchase object
      const mockPurchase = {
        productId,
        transactionId: 'mock-transaction-' + Date.now(),
        transactionDate: new Date().toISOString(),
        transactionReceipt: 'mock-receipt',
        _isMock: true
      };
      
      try {
        // Validate the purchase (this will update the user profile)
        await validatePurchase(mockPurchase, userId, productId);
        return { success: true, purchase: mockPurchase };
      } catch (error) {
        console.error('Error validating purchase:', error);
        return { success: false, error: 'Purchase validation failed: ' + error.message };
      }
    }
    
    // Production purchase flow
    // Request a purchase
    let purchase;
    if (Platform.OS === 'ios') {
      purchase = await RNIap.requestPurchase(productId);
    } else {
      purchase = await RNIap.requestPurchase(productId, false);
    }
    
    console.log('Purchase response:', purchase);
    
    try {
      // Validate the purchase
      await validatePurchase(purchase, userId, productId);
      return { success: true, purchase };
    } catch (error) {
      console.error('Error validating purchase:', error);
      return { success: false, error: 'Purchase validation failed: ' + error.message };
    }
  } catch (error) {
    console.error('Purchase error:', error);
    
    // Handle specific error cases
    if (error.code === 'E_USER_CANCELLED') {
      return { success: false, error: 'Purchase cancelled by user' };
    }
    
    return { success: false, error: error.message || 'Purchase failed' };
  }
};

// Validate purchase and update user profile
const validatePurchase = async (purchase, userId, productId) => {
  try {
    console.log('Validating purchase:', purchase);
    
    // In a production app, you should validate the receipt with your backend
    // For now, we'll assume it's valid and update the user profile
    
    const subscriptionType = productIdToType[productId];
    if (!subscriptionType) {
      throw new Error('Invalid product ID');
    }
    
    // Calculate expiry date based on subscription type
    let expiryDate = null;
    if (subscriptionType === 'monthly') {
      expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (subscriptionType === 'annual') {
      expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }
    // No expiry for lifetime plan
    
    // Create Firestore timestamp if there's an expiry
    let firestoreTimestamp = null;
    if (expiryDate) {
      firestoreTimestamp = firebase.firestore.Timestamp.fromDate(expiryDate);
    }
    
    // Store purchase info in Firestore
    const db = firebase.firestore();
    const purchaseData = {
      productId,
      purchaseToken: purchase.transactionId || purchase.purchaseToken,
      purchaseTime: firebase.firestore.FieldValue.serverTimestamp(),
      subscriptionType,
      platform: Platform.OS,
      receipt: purchase.transactionReceipt || purchase.purchaseToken
    };
    
    // Add purchase to purchase history
    await db.collection('purchases').add({
      userId,
      ...purchaseData
    });
    
    // Check if user document exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing user document
      await userRef.update({
        isPremium: true,
        premium: true,
        subscriptionType,
        subscriptionExpiryDate: firestoreTimestamp,
        lastPurchase: purchaseData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create new user document
      await userRef.set({
        isPremium: true,
        premium: true,
        subscriptionType,
        subscriptionExpiryDate: firestoreTimestamp,
        lastPurchase: purchaseData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log('Purchase validated and user profile updated');
    return true;
  } catch (error) {
    console.error('Error validating purchase:', error);
    throw error;
  }
};

// Restore purchases
export const restorePurchases = async (userId) => {
  try {
    console.log('Restoring purchases...');
    
    // In development, simulate successful restoration
    if (__DEV__) {
      console.log('Development mode - simulating successful purchase restoration');
      
      // Create a mock purchase for the most valuable subscription (lifetime)
      const mockPurchase = {
        productId: 'com.packmind.premium.lifetime',
        transactionId: 'mock-restore-' + Date.now(),
        transactionDate: new Date().toISOString(),
        transactionReceipt: 'mock-receipt',
        _isMock: true
      };
      
      try {
        // Validate the purchase (this will update the user profile)
        await validatePurchase(mockPurchase, userId, mockPurchase.productId);
        
        return { 
          success: true, 
          message: 'Lifetime subscription restored successfully (development mode)' 
        };
      } catch (error) {
        console.error('Error validating mock restore purchase:', error);
        return {
          success: false,
          message: 'Failed to restore purchase: ' + (error.message || 'Unknown error')
        };
      }
    }
    
    // Production restore flow
    // Get available purchases
    const availablePurchases = await RNIap.getAvailablePurchases();
    console.log('Available purchases:', availablePurchases);
    
    if (!availablePurchases || availablePurchases.length === 0) {
      console.log('No purchases to restore');
      return { success: false, message: 'No previous purchases found' };
    }
    
    // Find the most recent valid purchase
    let validPurchase = null;
    let subscriptionType = null;
    
    for (const purchase of availablePurchases) {
      const productId = purchase.productId;
      if (productIds.includes(productId)) {
        // This is one of our products
        const type = productIdToType[productId];
        
        // For simplicity, we'll just take the most valuable subscription
        // In a real app, you might want to check expiry dates
        if (type === 'lifetime' || 
            (type === 'annual' && subscriptionType !== 'lifetime') ||
            (type === 'monthly' && !subscriptionType)) {
          validPurchase = purchase;
          subscriptionType = type;
        }
      }
    }
    
    if (validPurchase && subscriptionType) {
      try {
        // Validate the purchase and update user profile
        await validatePurchase(validPurchase, userId, validPurchase.productId);
        
        return { 
          success: true, 
          message: `${subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)} subscription restored successfully` 
        };
      } catch (error) {
        console.error('Error validating restored purchase:', error);
        return {
          success: false,
          message: 'Failed to restore purchase: ' + (error.message || 'Unknown error')
        };
      }
    }
    
    return { success: false, message: 'No valid premium subscriptions found' };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { success: false, error: error.message || 'Failed to restore purchases' };
  }
};

// Handle purchase errors
export const handlePurchaseError = (error) => {
  let message = 'An error occurred during the purchase. Please try again.';
  
  if (error.code === 'E_USER_CANCELLED') {
    return null; // User just cancelled, no need for an error
  }
  
  if (error.code === 'E_ALREADY_OWNED') {
    message = 'You already own this item. Try restoring purchases instead.';
  } else if (error.code === 'E_NETWORK_ERROR') {
    message = 'Network error. Please check your connection and try again.';
  } else if (error.code === 'E_SERVICE_ERROR') {
    message = 'Store service is currently unavailable. Please try again later.';
  } else if (error.code === 'E_BILLING_RESPONSE_JSON_PARSE_ERROR') {
    message = 'There was a problem with the payment processing. Please try again.';
  } else if (error.code === 'E_ITEM_UNAVAILABLE') {
    message = 'This item is currently unavailable in your region.';
  }
  
  Alert.alert('Purchase Error', message);
};