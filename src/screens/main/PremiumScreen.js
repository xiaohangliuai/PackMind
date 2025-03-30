// src/screens/main/PremiumScreen.js
import React, { useState } from 'react';
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

// Default premium values
const DEFAULT_PREMIUM_STATE = {
  isPremium: false,
  subscriptionType: null,
  pricing: {
    MONTHLY: 2.99,
    ANNUAL: 19.99, 
    LIFETIME: 49.99
  },
  limits: {
    MAX_LISTS: 3
  }
};

const PremiumScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  
  // State for processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  
  // Safely try to use premium context
  let premiumContext = null;
  let isPremium = false;
  let subscriptionType = null;
  let pricing = DEFAULT_PREMIUM_STATE.pricing;
  let limits = DEFAULT_PREMIUM_STATE.limits;
  let startFreeTrial = async () => {
    Alert.alert('Error', 'Premium features are currently unavailable. Please try again later.');
    return false;
  };
  let subscribeToPremium = async () => {
    Alert.alert('Error', 'Premium features are currently unavailable. Please try again later.');
    return false;
  };
  
  // Try to get premium context
  try {
    premiumContext = usePremium();
    if (premiumContext) {
      isPremium = premiumContext.isPremium;
      subscriptionType = premiumContext.subscriptionType;
      pricing = premiumContext.pricing || DEFAULT_PREMIUM_STATE.pricing;
      limits = premiumContext.limits || DEFAULT_PREMIUM_STATE.limits;
      startFreeTrial = premiumContext.startFreeTrial;
      subscribeToPremium = premiumContext.subscribeToPremium;
    }
  } catch (error) {
    console.log('Premium context not available yet:', error);
  }
  
  // Handle select plan
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
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
            onPress: () => navigation.navigate('Register') 
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
          'Thank you for subscribing to PackM!nd+ Premium!',
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
      Alert.alert(
        'Account Required',
        'Please create a full account to start a free trial.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Account', 
            onPress: () => navigation.navigate('Register') 
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
          'Your 7-day free trial has been activated. Enjoy all premium features!',
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
            
            <View style={styles.featureContainer}>
              <Text style={styles.featureTitle}>Your Premium Benefits:</Text>
              
              <View style={styles.feature}>
                <Ionicons name="checkbox" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <Text style={styles.featureText}>Unlimited packing lists</Text>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="checkbox" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <Text style={styles.featureText}>Advanced notifications and reminders</Text>
              </View>
              
              <View style={styles.feature}>
                <Ionicons name="checkbox" size={24} color={THEME.PRIMARY} style={styles.featureIcon} />
                <Text style={styles.featureText}>Priority support</Text>
              </View>
            </View>
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
          <Text style={styles.heroTitle}>PackM!nd+ Premium</Text>
          <Text style={styles.heroSubtitle}>Unlock all features for a better experience</Text>
        </View>
        
        <View style={styles.freeTrialSection}>
          <Text style={styles.freeTrialText}>Try Premium FREE for 7 days</Text>
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
            <Text style={styles.planPrice}>${pricing.MONTHLY}/month</Text>
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
                <Text style={styles.saveText}>Save 44%</Text>
              </View>
              {selectedPlan === 'annual' && (
                <Ionicons name="checkmark-circle" size={24} color={THEME.PRIMARY} />
              )}
            </View>
            <Text style={styles.planPrice}>${pricing.ANNUAL}/year</Text>
            <Text style={styles.monthlyEquivalent}>
              (${(pricing.ANNUAL / 12).toFixed(2)}/month)
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
            <Text style={styles.planPrice}>${pricing.LIFETIME}</Text>
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
        
        {/* Subscribe Button */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Subscribe {selectedPlan === 'monthly' ? 'Monthly' : 
                        selectedPlan === 'annual' ? 'Annually' : 'Lifetime'}
            </Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          You can cancel your subscription anytime in Settings.
        </Text>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.PRIMARY,
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
    alignItems: 'center',
    marginBottom: 15,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  featureContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    alignSelf: 'flex-start',
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
});

export default PremiumScreen; 