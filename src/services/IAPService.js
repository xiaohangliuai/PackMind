// src/services/IAPService.js
import { Platform, Alert } from 'react-native';
import * as RNIap from 'react-native-iap';
import { 
  initConnection, 
  getProducts as iapGetProducts, 
  getSubscriptions as iapGetSubscriptions, 
  requestPurchase, 
  requestSubscription,
  getAvailablePurchases,
  getPurchaseHistory,
  purchaseUpdatedListener,
  purchaseErrorListener,
  endConnection
} from 'react-native-iap';
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

// Define subscription IDs (same as productIds in this case)
export const subscriptionIds = Platform.select({
  ios: [
    'com.packmind.premium.monthly',
    'com.packmind.premium.annual'
  ],
  android: [
    'com.packmind.premium.monthly',
    'com.packmind.premium.annual'
  ]
});

// Map product IDs to subscription types
export const productIdToType = {
  'com.packmind.premium.monthly': 'monthly',
  'com.packmind.premium.annual': 'annual',
  'com.packmind.premium.lifetime': 'lifetime'
};

const isAndroid = Platform.OS === 'android';

// Initialize IAP
export const initializeIAP = async () => {
  try {
    console.log('Initializing IAP...');
    
    try {
      await initConnection();
      console.log('IAP initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing IAP:', error);
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
    await endConnection();
    console.log('IAP connection ended');
  } catch (error) {
    console.error('Error ending IAP connection:', error);
  }
};

// Get products information
export const getProductsInfo = async () => {
  try {
    console.log('Getting IAP products...');
    
    // Check if we have product IDs
    if (!productIds || productIds.length === 0) {
      console.warn('No product IDs defined');
      return [];
    }
    
    try {
      const products = await iapGetProducts({ skus: productIds });
      console.log('Products fetched:', products);
      return products;
    } catch (error) {
      console.error('Error getting products from store:', error);
      return [];
    }
  } catch (error) {
    console.error('Error in getProductsInfo:', error);
    return [];
  }
};

// Get subscriptions information
export const getSubscriptionsInfo = async () => {
  try {
    console.log('Getting IAP subscriptions...');
    
    // Check if we have subscription IDs
    if (!subscriptionIds || subscriptionIds.length === 0) {
      console.warn('No subscription IDs defined');
      return [];
    }
    
    try {
      const subscriptions = await iapGetSubscriptions({ skus: subscriptionIds });
      console.log('Subscriptions fetched:', subscriptions);
      return subscriptions;
    } catch (error) {
      console.error('Error getting subscriptions from store:', error);
      return [];
    }
  } catch (error) {
    console.error('Error in getSubscriptionsInfo:', error);
    return [];
  }
};

// Original function names for backward compatibility
export const getProducts = getProductsInfo;
export const getSubscriptions = getSubscriptionsInfo;

// Set up purchase listener
export const setupPurchaseListeners = (callback) => {
  const purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
    console.log('Purchase updated:', purchase);
    callback(purchase);
  });
  
  const purchaseErrorSubscription = purchaseErrorListener((error) => {
    console.error('Purchase error:', error);
  });
  
  return {
    remove: () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    }
  };
};

// Handle in-app purchase
export const handlePurchase = async (product) => {
  try {
    console.log(`Starting purchase for product: ${product.productId}`);
    
    const purchaseData = await requestPurchase({
      sku: product.productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
      skus: productIds,
    });
    
    console.log('Purchase response:', purchaseData);
    return { success: true, purchase: purchaseData };
  } catch (error) {
    console.error('Purchase error:', error);
    
    // Handle specific error cases
    if (error.code === 'E_USER_CANCELLED') {
      return { success: false, error: 'Purchase cancelled by user' };
    }
    
    return { success: false, error: error.message || 'Purchase failed' };
  }
};

// Handle subscription purchase
export const handleSubscription = async (subscription) => {
  try {
    console.log(`Starting subscription for: ${subscription.productId}`);
    
    const offerToken = isAndroid
      ? subscription?.subscriptionOfferDetails[0]?.offerToken
      : null;
    
    const purchaseData = await requestSubscription({
      sku: subscription.productId,
      ...(offerToken && {
        subscriptionOffers: [{ sku: subscription.productId, offerToken }],
      }),
    });
    
    console.log('Subscription response:', purchaseData);
    return { success: true, purchase: purchaseData };
  } catch (error) {
    console.error('Subscription error:', error);
    
    // Handle specific error cases
    if (error.code === 'E_USER_CANCELLED') {
      return { success: false, error: 'Subscription cancelled by user' };
    }
    
    return { success: false, error: error.message || 'Subscription failed' };
  }
};

// Get current available purchases
export const getCurrentPurchases = async () => {
  try {
    const purchases = await getAvailablePurchases();
    console.log('Available purchases:', purchases);
    return purchases;
  } catch (error) {
    console.error('Error getting purchases:', error);
    return [];
  }
};

// Get purchase history
export const getPurchaseHistoryData = async () => {
  try {
    const purchaseHistory = await getPurchaseHistory();
    console.log('Purchase history:', purchaseHistory);
    return purchaseHistory;
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return [];
  }
};

// Validate purchase and update user profile
export const validatePurchase = async (purchase, userId) => {
  try {
    console.log('Validating purchase:', purchase);
    
    if (!userId) {
      console.error('No user ID provided for validation');
      return { success: false, error: 'User not authenticated' };
    }
    
    const productId = purchase.productId;
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
    } else if (subscriptionType === 'lifetime') {
      // For lifetime, set a far future date
      expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    }
    
    // Get current user from Firebase Auth
    const currentUser = firebase.auth().currentUser;
    const userDisplayName = currentUser ? (currentUser.displayName || '') : '';
    const userEmail = currentUser ? (currentUser.email || '') : '';
    
    // Update user subscription in Firebase
    const userRef = firebase.firestore().collection('users').doc(userId);
    
    await userRef.update({
      displayName: userDisplayName,
      email: userEmail,
      premium: true,
      isPremium: true,
      subscriptionType: subscriptionType,
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      lastPurchase: {
        productId: productId,
        transactionId: purchase.transactionId,
        transactionDate: purchase.transactionDate,
        receiptData: Platform.OS === 'ios' ? purchase.transactionReceipt : null,
        purchaseToken: Platform.OS === 'android' ? purchase.purchaseToken : null
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`User ${userId} subscription updated to ${subscriptionType}`);
    return { success: true };
  } catch (error) {
    console.error('Error validating purchase:', error);
    return { success: false, error: error.message };
  }
};

// Restore purchases for a user
export const restorePurchases = async (userId) => {
  try {
    console.log('Restoring purchases for user:', userId);
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // Get available purchases
    const purchases = await getAvailablePurchases();
    console.log('Available purchases to restore:', purchases);
    
    if (!purchases || purchases.length === 0) {
      return { success: false, error: 'No purchases to restore' };
    }
    
    // Find the most recent valid subscription
    let validPurchase = null;
    
    for (const purchase of purchases) {
      // Check if this is one of our products
      if (productIds.includes(purchase.productId)) {
        if (!validPurchase || purchase.transactionDate > validPurchase.transactionDate) {
          validPurchase = purchase;
        }
      }
    }
    
    if (!validPurchase) {
      return { success: false, error: 'No valid purchases found' };
    }
    
    // Validate and update user profile
    const result = await validatePurchase(validPurchase, userId);
    
    if (result.success) {
      return { 
        success: true, 
        message: 'Purchase restored successfully',
        purchase: validPurchase
      };
    } else {
      return result;
    }
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

// Backward compatibility for purchasePremium
export const purchasePremium = async (productId, userId) => {
  try {
    console.log(`Starting purchase for product: ${productId}`);
    
    if (!userId) {
      console.error('No user ID provided for purchase');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Determine if this is a subscription or one-time purchase
    const isSubscription = productId.includes('monthly') || productId.includes('annual');
    
    // Create a product/subscription object
    const item = {
      productId: productId
    };
    
    let purchaseResult;
    
    if (isSubscription) {
      // Handle as subscription
      purchaseResult = await handleSubscription(item);
    } else {
      // Handle as one-time purchase
      purchaseResult = await handlePurchase(item);
    }
    
    if (purchaseResult.success) {
      try {
        // Validate the purchase (this will update the user profile)
        const validationResult = await validatePurchase(purchaseResult.purchase, userId);
        if (validationResult.success) {
          return { success: true, purchase: purchaseResult.purchase };
        } else {
          return { success: false, error: 'Purchase validation failed: ' + validationResult.error };
        }
      } catch (error) {
        console.error('Error validating purchase:', error);
        return { success: false, error: 'Purchase validation failed: ' + error.message };
      }
    } else {
      return purchaseResult; // Return the error from purchase attempt
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