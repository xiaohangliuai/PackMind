// src/models/firestoreModels.js
import { 
    collection, 
    doc, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    serverTimestamp,
    Timestamp 
  } from 'firebase/firestore';
  import { firestore } from '../config/firebase';
  
  // PackingList model
  export const packingListsCollection = collection(firestore, 'packingLists');
  
  export const createPackingList = async (data) => {
    try {
      // Prepare data with proper timestamp handling
      let listData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Make sure userId is always present and set correctly
      if (!listData.userId) {
        console.error('No userId provided when creating packing list');
        throw new Error('No userId provided for packing list creation');
      }
      
      // Convert JavaScript Date to Firestore Timestamp
      if (data.date && data.date instanceof Date) {
        listData.date = Timestamp.fromDate(data.date);
      }
  
      console.log('Creating packing list with data:', JSON.stringify(listData, null, 2));
      
      try {
        // First attempt - use standard Firestore SDK
        console.log('Attempting to create packing list using Firestore SDK');
        return await addDoc(packingListsCollection, listData);
      } catch (initialError) {
        // If error is permission-denied, try a more direct approach
        if (initialError.code === 'permission-denied') {
          console.error('Permission denied error in createPackingList. Consider updating your Firebase rules.');
          
          // Re-throw the error for now - we'll handle this in the UI
          throw initialError;
        }
        
        // For other errors, re-throw
        throw initialError;
      }
    } catch (error) {
      console.error('Error in createPackingList:', error);
      if (error.code === 'permission-denied') {
        console.error('Permission denied. Please check Firebase security rules.');
      }
      throw error;
    }
  };
  
  export const getPackingList = async (listId) => {
    const docRef = doc(firestore, 'packingLists', listId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  };
  
  export const getUserPackingLists = async (userId) => {
    try {
      console.log('Querying packing lists for user:', userId);
      
      const q = query(
        packingListsCollection, 
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      console.log('Query created, attempting to get documents');
      const querySnapshot = await getDocs(q);
      console.log('Query executed, found', querySnapshot.size, 'documents');
      
      const lists = [];
      querySnapshot.forEach((doc) => {
        lists.push({ id: doc.id, ...doc.data() });
      });
      
      return lists;
    } catch (error) {
      console.error('Error in getUserPackingLists:', error);
      // Pass the original error up so we can check for specific Firebase errors
      throw error;
    }
  };
  
  export const updatePackingList = async (listId, data) => {
    const docRef = doc(firestore, 'packingLists', listId);
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    return await updateDoc(docRef, updateData);
  };
  
  export const deletePackingList = async (listId) => {
    const docRef = doc(firestore, 'packingLists', listId);
    return await deleteDoc(docRef);
  };
  
  export const getSharedLists = async (userId) => {
    try {
      if (!userId) {
        console.error('getSharedLists: No userId provided');
        throw new Error('User ID is required to fetch shared lists');
      }
      
      console.log('Fetching shared lists for user:', userId);
      
      const q = query(
        packingListsCollection, 
        where('sharedWith', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      console.log(`Found ${querySnapshot.size} shared lists for user ${userId}`);
      
      const lists = [];
      querySnapshot.forEach((doc) => {
        lists.push({ id: doc.id, ...doc.data() });
      });
      
      return lists;
    } catch (error) {
      console.error('Error in getSharedLists:', error);
      if (error.code === 'permission-denied') {
        console.error('Permission denied when fetching shared lists. Check Firestore rules.');
      }
      throw error;
    }
  };
  
  // ActivityTemplate model
  export const activityTemplatesCollection = collection(firestore, 'activityTemplates');
  
  export const getActivityTemplates = async () => {
    const querySnapshot = await getDocs(activityTemplatesCollection);
    
    const templates = [];
    querySnapshot.forEach((doc) => {
      templates.push({ id: doc.id, ...doc.data() });
    });
    
    return templates;
  };
  
  // UserProfile model
  export const userProfilesCollection = collection(firestore, 'userProfiles');
  
  export const createUserProfile = async (userId, data) => {
    const docRef = doc(firestore, 'userProfiles', userId);
    
    const profileData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    return await setDoc(docRef, profileData);
  };
  
  export const getUserProfile = async (userId) => {
    const docRef = doc(firestore, 'userProfiles', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  };
  
  export const updateUserProfile = async (userId, data) => {
    const docRef = doc(firestore, 'userProfiles', userId);
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    return await updateDoc(docRef, updateData);
  };