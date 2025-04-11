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
    MONTHLY: 1.69,
    ANNUAL: 12.99, 
    LIFETIME: 21.99
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
  let startFreeTrial = async () => {
    Alert.alert('Error', 'Premium features are currently unavailable. Please try again later.');
    return false;
  };
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
      startFreeTrial = premiumContext.startFreeTrial;
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

  // Handle upgrading from one paid plan to another
  const handleUpgrade = async (newPlan) => {
    try {
      // Check if user is trying to downgrade from annual to monthly
      if (subscriptionType === 'annual' && newPlan === 'monthly') {
        Alert.alert(
          'Downgrade Not Available',
          'You cannot downgrade from an annual to a monthly plan. You can cancel your subscription from the App Store and resubscribe with a monthly plan after your current subscription expires.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get special upgrade price based on current plan and target plan
      let upgradePrice = 0;
      let planName = '';
      
      if (subscriptionType === 'monthly' && newPlan === 'annual') {
        upgradePrice = 10.99;
        planName = 'Annual';
      } else if (subscriptionType === 'monthly' && newPlan === 'lifetime') {
        upgradePrice = 19.99;
        planName = 'Lifetime';
      } else if (subscriptionType === 'annual' && newPlan === 'lifetime') {
        upgradePrice = 7.99;
        planName = 'Lifetime';
      }

      // Show confirmation dialog with special price
      Alert.alert(
        'Confirm Upgrade',
        `Are you sure you want to upgrade to the ${planName} plan for $${upgradePrice.toFixed(2)}? Your current subscription will be replaced with the new plan.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: async () => {
              setIsProcessing(true);
              
              // Call subscribeToPremium from the premium context with special price
              const success = await subscribeToPremium(newPlan, upgradePrice);
              
              setIsProcessing(false);
              setShowUpgradeOptions(false);
              
              if (success) {
                Alert.alert(
                  'Upgrade Successful',
                  `You have successfully upgraded to the ${planName} plan.`,
                  [{ text: 'OK' }]
                );
              }
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Error upgrading plan:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to upgrade plan. Please try again later.');
    }
  };
  
  // Handle anonymous user upgrade
  const handleCreateAccount = async () => {
    try {
      // First, store the guest data in AsyncStorage so we can retrieve it after logout
      const guestInfo = { 
        fromGuest: true, 
        guestUserId: user.uid, 
        guestDisplayName: user.displayName || 'Guest User',
        returnScreen: 'Premium' // Indicate which screen to return to after registration
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
  };
  
  // Handle subscribe
  const handleSubscribe = async () => {
    if (user?.isAnonymous) {
      Alert.alert(
        'Account Required',
        'Please create a full account to subscribe to premium.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Account', 
            onPress: handleCreateAccount
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
  
  // Handle start free trial
  const handleStartFreeTrial = async () => {
    if (user?.isAnonymous) {
      // Show an alert before proceeding with account creation
      Alert.alert(
        'Account Required',
        'You need to create an account to start your free trial. Your data will be preserved.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Account', 
            onPress: handleCreateAccount
          }
        ]
      );
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const success = await startFreeTrial();
      
      if (success) {
        Alert.alert(
          'Free Trial Started!',
          'Your 14-day free trial has been activated. Enjoy all premium features!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      Alert.alert('Error', 'Failed to start free trial. Please try again.');
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
  
  // If user is already premium, show different content
  if (isPremium) {
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
          <Text style={styles.headerTitle}>Premium Status</Text>
          <View style={styles.headerRight} />
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.premiumActiveContainer}>
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={30} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>Premium Active</Text>
            </View>
            
            <Text style={styles.thankYouText}>
              Thank you for being a premium subscriber!
            </Text>
            
            <Text style={styles.currentPlanText}>
              Current Plan: {subscriptionType === 'trial' ? 'Free Trial' : 
                            subscriptionType === 'monthly' ? 'Monthly' :
                            subscriptionType === 'annual' ? 'Annual' : 'Lifetime'}
            </Text>
            
            {/* Show subscription options for trial users */}
            {subscriptionType === 'trial' && (
              <View style={styles.trialUpgradeContainer}>
                <View style={styles.trialExpiryBanner}>
                  <Ionicons name="time-outline" size={20} color={COLORS.WARNING} />
                  <Text style={styles.trialExpiryText}>
                    {subscriptionExpiryDate && typeof subscriptionExpiryDate.toLocaleDateString === 'function' ? 
                      `Your trial expires on ${subscriptionExpiryDate.toLocaleDateString()}` : 
                      'Your free trial will expire soon'}
                  </Text>
                </View>
              
                <Text style={styles.trialUpgradeText}>
                  Upgrade now to continue enjoying premium features!
                </Text>
                
                <View style={styles.planOptions}>
                  {/* Monthly Plan */}
                  <TouchableOpacity
                    style={styles.trialPlanCard}
                    onPress={() => {
                      setSelectedPlan('monthly');
                      handleSubscribe();
                    }}
                  >
                    <View>
                      <Text style={styles.trialPlanTitle}>Monthly</Text>
                      <Text style={styles.planDescription}>Billed monthly</Text>
                    </View>
                    <Text style={styles.trialPlanPrice}>{getProductPrice('monthly')}</Text>
                    <View style={styles.subscribeButton}>
                      <Text style={styles.subscribeButtonText}>Subscribe</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Annual Plan */}
                  <TouchableOpacity
                    style={[styles.trialPlanCard, styles.bestValuePlan]}
                    onPress={() => {
                      setSelectedPlan('annual');
                      handleSubscribe();
                    }}
                  >
                    <View style={styles.bestValueTag}>
                      <Text style={styles.bestValueTagText}>Best Value</Text>
                    </View>
                    <View>
                      <Text style={styles.trialPlanTitle}>Annual</Text>
                      <Text style={styles.planDescription}>Save 44%</Text>
                    </View>
                    <Text style={styles.trialPlanPrice}>{getProductPrice('annual')}</Text>
                    <View style={[styles.subscribeButton, styles.highlightedButton]}>
                      <Text style={[styles.subscribeButtonText, styles.highlightedButtonText]}>Subscribe</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Lifetime Plan */}
                  <TouchableOpacity
                    style={styles.trialPlanCard}
                    onPress={() => {
                      setSelectedPlan('lifetime');
                      handleSubscribe();
                    }}
                  >
                    <View>
                      <Text style={styles.trialPlanTitle}>Lifetime</Text>
                      <Text style={styles.planDescription}>One-time payment</Text>
                    </View>
                    <Text style={styles.trialPlanPrice}>{getProductPrice('lifetime')}</Text>
                    <View style={styles.subscribeButton}>
                      <Text style={styles.subscribeButtonText}>Subscribe</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Show upgrade options for paid users - Monthly and Annual subscribers */}
            {isPremium && subscriptionType !== 'lifetime' && subscriptionType !== 'trial' && (
              <View style={styles.upgradeContainer}>
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={() => setShowUpgradeOptions(!showUpgradeOptions)}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                  <Ionicons 
                    name={showUpgradeOptions ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="white" 
                    style={{marginLeft: 5}}
                  />
                </TouchableOpacity>
                
                {showUpgradeOptions && (
                  <View style={styles.upgradeOptions}>
                    {subscriptionType === 'monthly' && (
                      <>
                        <Text style={styles.upgradeTitle}>Upgrade from Monthly Plan</Text>
                        
                        <TouchableOpacity 
                          style={styles.upgradePlanOption}
                          onPress={() => handleUpgrade('annual')}
                        >
                          <View style={styles.planOptionHeader}>
                            <Text style={styles.planTitle}>Annual Plan</Text>
                            <View style={styles.savingBadge}>
                              <Text style={styles.savingText}>Special Offer</Text>
                            </View>
                          </View>
                          <View style={styles.priceContainer}>
                            <Text style={styles.planPrice}>${(10.99).toFixed(2)}</Text>
                            <Text style={styles.originalPrice}>${(12.99).toFixed(2)}</Text>
                          </View>
                          <Text style={styles.planBilled}>billed annually</Text>
                          <Text style={styles.discountText}>You save $2.00</Text>
                          <Text style={styles.planDescription}>Get all premium features at a discounted rate</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.upgradePlanOption, styles.lastOption]}
                          onPress={() => handleUpgrade('lifetime')}
                        >
                          <View style={styles.planOptionHeader}>
                            <Text style={styles.planTitle}>Lifetime</Text>
                            <View style={styles.savingBadge}>
                              <Text style={styles.savingText}>Best Value</Text>
                            </View>
                          </View>
                          <View style={styles.priceContainer}>
                            <Text style={styles.planPrice}>${(19.99).toFixed(2)}</Text>
                            <Text style={styles.originalPrice}>${(21.99).toFixed(2)}</Text>
                          </View>
                          <Text style={styles.planBilled}>one-time payment</Text>
                          <Text style={styles.discountText}>You save $2.00</Text>
                          <Text style={styles.planDescription}>Pay once and unlock premium features forever</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    
                    {subscriptionType === 'annual' && (
                      <>
                        <Text style={styles.upgradeTitle}>Upgrade from Annual Plan</Text>
                        
                        <TouchableOpacity 
                          style={[styles.upgradePlanOption, styles.lastOption]}
                          onPress={() => handleUpgrade('lifetime')}
                        >
                          <View style={styles.planOptionHeader}>
                            <Text style={styles.planTitle}>Lifetime</Text>
                            <View style={styles.savingBadge}>
                              <Text style={styles.savingText}>Exclusive Offer</Text>
                            </View>
                          </View>
                          <View style={styles.priceContainer}>
                            <Text style={styles.planPrice}>${(7.99).toFixed(2)}</Text>
                            <Text style={styles.originalPrice}>${(21.99).toFixed(2)}</Text>
                          </View>
                          <Text style={styles.planBilled}>one-time payment</Text>
                          <Text style={styles.discountText}>You save $14.00</Text>
                          <Text style={styles.planDescription}>Pay once and unlock premium features forever</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}
            
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
        </ScrollView>
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
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Ionicons name="star" size={36} color={COLORS.GOLD} style={styles.heroIcon} />
          <Text style={styles.heroTitle}>PackMind+ Premium</Text>
          <Text style={styles.heroSubtitle}>Unlock all features for a better experience</Text>
        </View>
        
        <View style={styles.freeTrialSection}>
          <Text style={styles.freeTrialText}>Try Premium FREE for 14 days</Text>
          <TouchableOpacity
            style={styles.freeTrialButton}
            onPress={handleStartFreeTrial}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.freeTrialButtonText}>Start Free Trial</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {!user?.isAnonymous && (
          <>
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
                  ($1.25/month) Cancel anytime
                </Text>
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
                <Text style={styles.lifetimeNote}>One-time payment</Text>
              </TouchableOpacity>
            </View>
            
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
                <Ionicons name="headset" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <View style={styles.featureContent}>
                  <Text style={styles.featureText}>Priority Support</Text>
                  <Text style={styles.featureDescription}>
                    Get help faster when you need it
                  </Text>
                </View>
              </View>
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
                <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
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
  heroSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  heroIcon: {
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
  freeTrialSection: {
    backgroundColor: COLORS.LAVENDER_LIGHT,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 25,
  },
  freeTrialText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  freeTrialButton: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 25,
  },
  freeTrialButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
  trialUpgradeContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
    marginTop: 20,
  },
  trialUpgradeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  trialExpiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  trialExpiryText: {
    fontSize: 14,
    color: COLORS.WARNING,
    fontWeight: '500',
    marginLeft: 5,
  },
  planOptions: {
    flexDirection: 'column',
  },
  upgradeContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  upgradeButton: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  upgradeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  upgradeOptions: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    width: '100%',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  upgradePlanOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    width: '100%',
  },
  planOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  savingBadge: {
    backgroundColor: COLORS.SUCCESS_LIGHT,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 5,
  },
  savingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.SUCCESS,
  },
  planBilled: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  planDescription: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  originalPrice: {
    fontSize: 14,
    color: '#777',
    marginLeft: 10,
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 13,
    color: COLORS.SUCCESS,
    fontWeight: '500',
    marginBottom: 5,
  },
  lastOption: {
    borderBottomWidth: 0,
    paddingBottom: 0,
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
});

export default PremiumScreen; 