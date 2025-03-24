// src/screens/main/ActivityTemplatesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getActivityTemplates } from '../../models/firestoreModels';

// Activity types with emojis and colors
const activityTypes = [
  { id: 'travel', label: 'Travel', emoji: '✈️', color: '#64B5F6' },
  { id: 'beach', label: 'Beach', emoji: '🏖️', color: '#FFD54F' },
  { id: 'camping', label: 'Camping', emoji: '🏕️', color: '#81C784' },
  { id: 'hiking', label: 'Hiking', emoji: '🥾', color: '#AED581' },
  { id: 'skiing', label: 'Skiing', emoji: '🎿', color: '#90CAF9' },
  { id: 'business', label: 'Business', emoji: '💼', color: '#9FA8DA' },
  { id: 'gym', label: 'Gym', emoji: '🏋️', color: '#F48FB1' },
  { id: 'other', label: 'Custom', emoji: '📦', color: '#BDBDBD' },
];

const ActivityTemplatesScreen = ({ navigation }) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch activity templates
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const fetchedTemplates = await getActivityTemplates();
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      // If templates can't be fetched, let's use some samples
      setTemplates([
        {
          id: 'travel',
          name: 'Travel Essentials',
          description: 'Basic items for any trip',
          activity: 'travel',
          itemCount: 15,
        },
        {
          id: 'beach',
          name: 'Beach Day',
          description: 'Everything you need for a day at the beach',
          activity: 'beach',
          itemCount: 12,
        },
        {
          id: 'camping',
          name: 'Weekend Camping',
          description: 'Essential gear for a weekend camping trip',
          activity: 'camping',
          itemCount: 18,
        },
        {
          id: 'hiking',
          name: 'Day Hike',
          description: 'Must-haves for a day hike',
          activity: 'hiking',
          itemCount: 10,
        },
        {
          id: 'skiing',
          name: 'Ski Vacation',
          description: 'Everything for a winter ski trip',
          activity: 'skiing',
          itemCount: 20,
        },
        {
          id: 'business',
          name: 'Business Trip',
          description: 'Professional essentials for a business trip',
          activity: 'business',
          itemCount: 14,
        },
        {
          id: 'gym',
          name: 'Gym Bag',
          description: 'All you need for a workout',
          activity: 'gym',
          itemCount: 8,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  // Handle template selection
  const handleSelectTemplate = (template) => {
    navigation.navigate('Create', { templateId: template.id });
  };
  
  // Render an activity type
  const renderActivityType = ({ item }) => {
    // Filter templates by activity
    const activityTemplates = templates.filter(
      template => template.activity === item.id
    );
    
    return (
      <View style={styles.activitySection}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityEmoji}>{item.emoji}</Text>
          <Text style={styles.activityTitle}>{item.label}</Text>
          <View style={[styles.templateCount, { backgroundColor: item.color + '30' }]}>
            <Text style={[styles.templateCountText, { color: item.color }]}>
              {activityTemplates.length} templates
            </Text>
          </View>
        </View>
        
        {activityTemplates.length > 0 ? (
          <FlatList
            data={activityTemplates}
            keyExtractor={(template) => template.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templatesContainer}
            renderItem={({ item: template }) => (
              <TouchableOpacity
                style={styles.templateCard}
                onPress={() => handleSelectTemplate(template)}
              >
                <View style={[styles.templateIcon, { backgroundColor: item.color + '20' }]}>
                  <Text style={styles.templateIconText}>{item.emoji}</Text>
                </View>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDescription} numberOfLines={2}>
                  {template.description}
                </Text>
                <View style={styles.templateFooter}>
                  <View style={styles.itemCount}>
                    <Ionicons name="list-outline" size={14} color="#777" />
                    <Text style={styles.itemCountText}>
                      {template.itemCount} items
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.useButton}>
                    <Text style={styles.useButtonText}>Use</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyTemplates}>
            <Text style={styles.emptyTemplatesText}>
              No templates available for this activity
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Templates</Text>
        <View style={styles.headerRight} />
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6E8B3D" />
        </View>
      ) : (
        <>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Choose a template to quickly create a packing list for your activity
            </Text>
          </View>
          
          <FlatList
            data={activityTypes}
            keyExtractor={(item) => item.id}
            renderItem={renderActivityType}
            contentContainerStyle={styles.activityList}
          />
        </>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F8F8',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  activityList: {
    paddingBottom: 20,
  },
  activitySection: {
    marginTop: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  activityEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  templateCount: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  templateCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  templatesContainer: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  templateCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateIconText: {
    fontSize: 20,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  templateDescription: {
    fontSize: 14,
    color: '#777',
    marginBottom: 10,
    height: 40,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCountText: {
    fontSize: 12,
    color: '#777',
    marginLeft: 5,
  },
  useButton: {
    backgroundColor: '#6E8B3D',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  useButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyTemplates: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTemplatesText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
});

export default ActivityTemplatesScreen;