// src/screens/main/PremiumScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePremium } from '../../context/PremiumContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, THEME } from '../../constants/theme';
import firebase from '../../firebase/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default premium values
const DEFAULT_PREMIUM_STATE = {
  isPremium: false,
  subscriptionType: null,
  pricing: {
    MONTHLY: 1.99,
    ANNUAL: 14.99, 
    LIFETIME: 24.99
  },
  limits: {
    MAX_LISTS: 3
  }
};

const PremiumScreen = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  
  // State for processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  
  // Safely try to use premium context
  let premiumContext = null;
  let isPremium = false;
  let subscriptionType = null;
  let subscriptionExpiryDate = null;
  let pricing = DEFAULT_PREMIUM_STATE.pricing;
  let limits = DEFAULT_PREMIUM_STATE.limits;
  let products = [];
  let isRestoring = false;
  let subscribeToPremium = async () => {
    Alert.alert('Error', 'Premium features are currently unavailable. Please try again later.');
    return false;
  };
  let restorePurchases = async () => {
    Alert.alert('Error', 'Premium features are currently unavailable. Please try again later.');
    return false;
  };
  
  // Try to get premium context
  try {
    premiumContext = usePremium();
    if (premiumContext) {
      isPremium = premiumContext.isPremium;
      subscriptionType = premiumContext.subscriptionType;
      subscriptionExpiryDate = premiumContext.subscriptionExpiryDate;
      pricing = premiumContext.pricing || DEFAULT_PREMIUM_STATE.pricing;
      limits = premiumContext.limits || DEFAULT_PREMIUM_STATE.limits;
      products = premiumContext.products || [];
      isRestoring = premiumContext.isRestoring || false;
      subscribeToPremium = premiumContext.subscribeToPremium;
      restorePurchases = premiumContext.restorePurchases;
    }
  } catch (error) {
    console.log('Premium context not available yet:', error);
  }
  
  // Find real product prices if available
  const getProductPrice = (planType) => {
    // Default prices
    let price = pricing.MONTHLY;
    if (planType === 'annual') price = pricing.ANNUAL;
    if (planType === 'lifetime') price = pricing.LIFETIME;
    
    // Try to get real price from store products
    if (products && products.length > 0) {
      const productId = planType === 'monthly' ? 'com.packmind.premium.monthly' :
                         planType === 'annual' ? 'com.packmind.premium.annual' :
                         'com.packmind.premium.lifetime';
      
      const product = products.find(p => p.productId === productId);
      if (product && product.price) {
        return product.localizedPrice || `$${product.price}`;
      }
    }
    
    // Fallback to default pricing if no product info
    return `$${price.toFixed(2)}`;
  };
  
  // Handle selecting a plan during trial
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  // Handle subscribe
  const handleSubscribe = async () => {
    // If user is anonymous, inform them they need to create an account first
    if (user?.isAnonymous) {
      Alert.alert(
        'Account Required',
        'Please create a full account to subscribe to premium.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Account', 
            onPress: () => navigation.navigate('AuthStack')
          }
        ]
      );
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const success = await subscribeToPremium(selectedPlan);
      
      if (success) {
        Alert.alert(
          'Subscription Successful!',
          'Thank you for subscribing to PackMind+ Premium!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle goBack
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Handle restore purchases
  const handleRestorePurchases = () => {
    Alert.alert(
      'Restore Purchases',
      'This will restore any previous purchases you made with your current account. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          onPress: async () => {
            try {
              await restorePurchases();
            } catch (error) {
              console.error('Error in restore purchases:', error);
            }
          } 
        }
      ]
    );
  };
  
  // Check if premium context is available
  const isPremiumAvailable = premiumContext !== null;
  
  // If premium context is not available, show loading indicator
  if (!isPremiumAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.PRIMARY} />
          <Text style={styles.loadingText}>Loading premium information...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Show loading while restoring purchases
  if (isRestoring) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.PRIMARY} />
          <Text style={styles.loadingText}>Restoring purchases...</Text>
        </View>
      </SafeAreaView>
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
        <Text style={styles.headerTitle}>
          {isPremium ? 'Premium Status' : 'Upgrade to Premium'}
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isPremium ? (
          // Premium user content
          <View style={styles.premiumActiveContainer}>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={30} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>Premium Active</Text>
            </View>
            
            <Text style={styles.thankYouText}>
              Thank you for being a premium subscriber!
            </Text>
            
            <Text style={styles.currentPlanText}>
              Current Plan: {
                            subscriptionType === 'monthly' ? 'Monthly' :
                            subscriptionType === 'annual' ? 'Annual' : 'Lifetime'}
            </Text>
            
            {/* Restore Purchases button for premium users */}
            <TouchableOpacity
              style={styles.premiumRestoreButton}
              onPress={handleRestorePurchases}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={THEME.PRIMARY} />
              ) : (
                <Text style={styles.premiumRestoreText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Non-premium user content - now available for all users including guest users
          <>
            {/* Premium Features */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresSectionTitle}>Premium Features</Text>
              
              <View style={styles.feature}>
                <Ionicons name="infinite" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Unlimited Lists</Text>
                  <Text style={styles.featureDescription}>
                    Create as many packing lists as you need (Free: {limits.MAX_LISTS} lists)
                  </Text>
                </View>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="notifications" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Advanced Notifications</Text>
                  <Text style={styles.featureDescription}>
                    Custom reminders, recurring notifications, and more
                  </Text>
                </View>
              </View>

              <View style={styles.feature}>
                <Ionicons name="happy" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Custom Emoji Icons</Text>
                  <Text style={styles.featureDescription}>
                    Personalize your packing list items with custom emoji icons
                  </Text>
                </View>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="headset" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Priority Support</Text>
                  <Text style={styles.featureDescription}>
                    Get help faster when you need it
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Pricing Plans */}
            <View style={styles.pricingSection}>
              <Text style={styles.pricingSectionTitle}>Choose Your Plan</Text>
              
              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.selectedPlan
                ]}
                onPress={() => handleSelectPlan('monthly')}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Monthly</Text>
                  {selectedPlan === 'monthly' && (
                    <Ionicons name="checkmark-circle" size={24} color={THEME.PRIMARY} />
                  )}
                </View>
                <Text style={styles.planPrice}>{getProductPrice('monthly')}</Text>
                <Text style={styles.planDescription}>Billed monthly</Text>
              </TouchableOpacity>
              
              {/* Annual Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'annual' && styles.selectedPlan
                ]}
                onPress={() => handleSelectPlan('annual')}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Annual</Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveText}>Save 37%</Text>
                  </View>
                  {selectedPlan === 'annual' && (
                    <Ionicons name="checkmark-circle" size={24} color={THEME.PRIMARY} />
                  )}
                </View>
                <Text style={styles.planPrice}>{getProductPrice('annual')}</Text>
                <Text style={styles.monthlyEquivalent}>
                  ($1.25/month)
                </Text>
              <View style={styles.freeTrialBadge}>
                <Ionicons name="gift-outline" size={16} color="white" />
                <Text style={styles.freeTrialBadgeText}>14-Day Free Trial</Text>
              </View>
              <Text style={styles.planDescription}>First 14 days free, then billed annually</Text>
              </TouchableOpacity>
              
              {/* Lifetime Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'lifetime' && styles.selectedPlan
                ]}
                onPress={() => handleSelectPlan('lifetime')}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Lifetime</Text>
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>Best Value</Text>
                  </View>
                  {selectedPlan === 'lifetime' && (
                    <Ionicons name="checkmark-circle" size={24} color={THEME.PRIMARY} />
                  )}
                </View>
                <Text style={styles.planPrice}>{getProductPrice('lifetime')}</Text>
                <Text style={styles.planDescription}>One-time payment</Text>
              </TouchableOpacity>
            </View>
            
            {/* Subscribe button */}
            <TouchableOpacity
              style={[styles.subscribeButton, isProcessing && styles.disabledButton]}
              onPress={handleSubscribe}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
              <Text style={styles.subscribeButtonText}>
                {selectedPlan === 'annual' ? 'Start Free Trial' : 'Subscribe Now'}
              </Text>
              )}
            </TouchableOpacity>
            
            {/* Restore Purchases button */}
            <TouchableOpacity
              style={styles.restorePurchasesButton}
              onPress={handleRestorePurchases}
              disabled={isProcessing}
            >
              <Text style={styles.restorePurchasesText}>Restore Purchases</Text>
            </TouchableOpacity>
            
            {/* Terms and conditions */}
            <Text style={styles.termsText}>
              By subscribing, you agree to our Terms of Service and Privacy Policy. 
            {selectedPlan === 'annual' ? ' 14-day free trial available for new Annual subscribers. ' : ' '}
              Subscriptions automatically renew unless auto-renew is turned off at 
              least 24 hours before the end of the current period.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  pricingSection: {
    marginBottom: 25,
  },
  pricingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  planCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPlan: {
    borderColor: THEME.PRIMARY,
    backgroundColor: 'rgba(143, 133, 246, 0.05)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.PRIMARY,
    marginTop: 5,
  },
  monthlyEquivalent: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  lifetimeNote: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },
  saveBadge: {
    backgroundColor: COLORS.SUCCESS_LIGHT,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 5,
  },
  saveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.SUCCESS,
  },
  bestValueBadge: {
    backgroundColor: COLORS.GOLD_LIGHT,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 5,
  },
  bestValueText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.GOLD_DARK,
  },
  featuresSection: {
    marginBottom: 25,
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  featureIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 14,
    color: '#777',
  },
  subscribeButton: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  highlightedButton: {
    backgroundColor: THEME.PRIMARY,
  },
  highlightedButtonText: {
    color: 'white',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  premiumActiveContainer: {
    alignItems: 'center',
    padding: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.GOLD_LIGHT,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  premiumBadgeText: {
    color: COLORS.GOLD_DARK,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  thankYouText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  currentPlanText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#777',
    marginTop: 10,
  },
  premiumRestoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  
  restorePurchasesButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  restorePurchasesText: {
    color: THEME.PRIMARY,
    fontWeight: '600',
  },
  premiumRestoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 5,
    width: '70%',
  },
  premiumRestoreText: {
    color: THEME.PRIMARY,
    fontWeight: '600',
  },
 
  freeTrialBadge: {
    flexDirection: 'row',
    backgroundColor: '#28a745',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  freeTrialBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 5,
  },
});

export default PremiumScreen; 