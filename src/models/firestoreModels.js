// src/models/firestoreModels.js
import firebase from '../firebase/firebaseConfig';
import { firestore } from '../config/firebase';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// PackingList model
const packingListsCollection = 'packingLists';

export const createPackingList = async (data) => {
  try {
    // Prepare data with proper timestamp handling
    let listData = {
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Make sure userId is always present and set correctly
    if (!listData.userId) {
      const currentUser = firebase.auth().currentUser;
      if (currentUser) {
        listData.userId = currentUser.uid;
      } else {
        throw new Error('No authenticated user found');
      }
    }
    
    // Add the document
    const docRef = await firebase.firestore().collection(packingListsCollection).add(listData);
    return { id: docRef.id, ...listData };
  } catch (error) {
    console.error('Error creating packing list:', error);
    throw error;
  }
};

// Get a specific packing list
export const getPackingList = async (listId) => {
  try {
    const docRef = await firebase.firestore().collection(packingListsCollection).doc(listId).get();
    
    if (docRef.exists) {
      return { id: docRef.id, ...docRef.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting packing list:', error);
    throw error;
  }
};

// Get all packing lists for a user
export const getUserPackingLists = async (userId) => {
  try {
    if (!userId) {
      const currentUser = firebase.auth().currentUser;
      if (currentUser) {
        userId = currentUser.uid;
      } else {
        throw new Error('No authenticated user found');
      }
    }
    
    // Removed orderBy to avoid need for index
    const querySnapshot = await firebase.firestore()
      .collection(packingListsCollection)
      .where('userId', '==', userId)
      .get();
    
    const lists = [];
    querySnapshot.forEach((doc) => {
      lists.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by updatedAt in descending order
    lists.sort((a, b) => {
      const dateA = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
      const dateB = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
      return dateB - dateA;
    });
    
    return lists;
  } catch (error) {
    console.error('Error getting user packing lists:', error);
    throw error;
  }
};

// Update an existing packing list
export const updatePackingList = async (listId, data) => {
  try {
    const updateData = {
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await firebase.firestore().collection(packingListsCollection).doc(listId).update(updateData);
    return { id: listId, ...updateData };
  } catch (error) {
    console.error('Error updating packing list:', error);
    throw error;
  }
};

// Delete a packing list
export const deletePackingList = async (listId) => {
  try {
    await firebase.firestore().collection(packingListsCollection).doc(listId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting packing list:', error);
    throw error;
  }
};

// Get all shared lists for a user
export const getSharedLists = async (userId) => {
  try {
    if (!userId) {
      const currentUser = firebase.auth().currentUser;
      if (currentUser) {
        userId = currentUser.uid;
      } else {
        throw new Error('No authenticated user found');
      }
    }
    
    // Query for lists where the user is in the collaborators array
    // Removed orderBy to avoid need for index
    const querySnapshot = await firebase.firestore()
      .collection(packingListsCollection)
      .where('collaborators', 'array-contains', userId)
      .get();
    
    const lists = [];
    querySnapshot.forEach((doc) => {
      lists.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by updatedAt in descending order
    lists.sort((a, b) => {
      const dateA = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
      const dateB = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
      return dateB - dateA;
    });
    
    return lists;
  } catch (error) {
    console.error('Error getting shared lists:', error);
    throw error;
  }
};

// Get activity templates
export const getActivityTemplates = async () => {
  try {
    const querySnapshot = await firebase.firestore()
      .collection('activityTemplates')
      .get();
    
    const templates = [];
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return templates;
  } catch (error) {
    console.error('Error getting activity templates:', error);
    throw error;
  }
};

// User profile functions
export const createUserProfile = async (userId, data) => {
  try {
    // Try using the modular API first
    try {
      // Get user info if available
      let userInfo = {};
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userId) {
          userInfo = {
            displayName: currentUser.displayName || '',
            email: currentUser.email || '',
          };
        }
      } catch (error) {
        console.warn('Could not get user info for new profile:', error);
      }
      
      // Ensure isPremium and premium are synchronized for backward compatibility
      const profileData = {
        ...userInfo,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if ('isPremium' in data && !('premium' in data)) {
        profileData.premium = data.isPremium;
      } else if ('premium' in data && !('isPremium' in data)) {
        profileData.isPremium = data.premium;
      }
      
      // Set default values if not provided
      if (!('isPremium' in profileData) && !('premium' in profileData)) {
        profileData.isPremium = false;
        profileData.premium = false;
      }
      
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, profileData);
      
      return { userId, ...profileData };
    } catch (modularError) {
      console.warn('Modular API failed, falling back to compat:', modularError);
    }
    
    // Fall back to compat API
    const profileData = {
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Ensure isPremium and premium are synchronized for backward compatibility
    if ('isPremium' in data && !('premium' in data)) {
      profileData.premium = data.isPremium;
    } else if ('premium' in data && !('isPremium' in data)) {
      profileData.isPremium = data.premium;
    }
    
    // Set default values if not provided
    if (!('isPremium' in profileData) && !('premium' in profileData)) {
      profileData.isPremium = false;
      profileData.premium = false;
    }
    
    await firebase.firestore().collection('userProfiles').doc(userId).set(profileData);
    return { userId, ...profileData };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    // Try using the modular API first
    try {
      console.log('Getting user profile using modular API for:', userId);
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        console.log('Found user profile (modular API)');
        return { userId, ...docSnap.data() };
      }
    } catch (modularError) {
      console.warn('Modular API failed, falling back to compat:', modularError);
    }
    
    // Fall back to compat API
    console.log('Getting user profile using compat API for:', userId);
    const docRef = await firebase.firestore().collection('userProfiles').doc(userId).get();
    
    if (docRef.exists) {
      console.log('Found user profile (compat API)');
      return { userId, ...docRef.data() };
    } else {
      console.log('No user profile found (compat API)');
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, data) => {
  try {
    // Try using the modular API first
    try {
      console.log('Updating user profile using modular API for:', userId);
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      
      // Ensure isPremium and premium are synchronized for backward compatibility
      if ('isPremium' in data && !('premium' in data)) {
        updateData.premium = data.isPremium;
      } else if ('premium' in data && !('isPremium' in data)) {
        updateData.isPremium = data.premium;
      }
      
      const userDocRef = doc(db, 'users', userId);
      
      // Check if document exists first
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        // Update the document
        await updateDoc(userDocRef, updateData);
      } else {
        // Create the document - try to get user info if available
        let userInfo = {};
        try {
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid === userId) {
            userInfo = {
              displayName: currentUser.displayName || '',
              email: currentUser.email || '',
            };
          }
        } catch (error) {
          console.warn('Could not get user info for new profile:', error);
        }
        
        await setDoc(userDocRef, {
          ...userInfo,
          ...updateData,
          createdAt: new Date()
        });
      }
      
      return { userId, ...updateData };
    } catch (modularError) {
      console.warn('Modular API failed, falling back to compat:', modularError);
    }
    
    // Fall back to compat API
    console.log('Updating user profile using compat API for:', userId);
    const updateData = {
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Ensure isPremium and premium are synchronized for backward compatibility
    if ('isPremium' in data && !('premium' in data)) {
      updateData.premium = data.isPremium;
    } else if ('premium' in data && !('isPremium' in data)) {
      updateData.isPremium = data.premium;
    }
    
    await firebase.firestore().collection('userProfiles').doc(userId).update(updateData);
    return { userId, ...updateData };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Deletes all user data from Firestore
 * This function is called when a user cancels their account
 * It removes:
 * 1. The user profile from the 'users' collection
 * 2. All packing lists created by the user
 * 3. Removes the user from any shared packing lists (as a collaborator)
 * 
 * All operations are performed in a batch to ensure atomicity
 * 
 * @param {string} userId - The ID of the user to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful
 */
export const deleteUserData = async (userId) => {
  try {
    const db = firebase.firestore();
    const batch = db.batch();
    
    // Delete user profile
    const userRef = db.collection('users').doc(userId);
    batch.delete(userRef);
    
    // Delete user's packing lists
    const packingListsSnapshot = await db
      .collection(packingListsCollection)
      .where('userId', '==', userId)
      .get();
      
    packingListsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Remove user from collaborators in shared lists
    const sharedListsSnapshot = await db
      .collection(packingListsCollection)
      .where('collaborators', 'array-contains', userId)
      .get();
      
    sharedListsSnapshot.forEach(doc => {
      const listData = doc.data();
      const updatedCollaborators = listData.collaborators.filter(id => id !== userId);
      batch.update(doc.ref, { collaborators: updatedCollaborators });
    });
    
    // Commit all the batched operations
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
};