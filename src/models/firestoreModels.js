// src/models/firestoreModels.js
import firebase from '../firebase/firebaseConfig';
import { firestore } from '../config/firebase';

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
    const profileData = {
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await firebase.firestore().collection('userProfiles').doc(userId).set(profileData);
    return { userId, ...profileData };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const docRef = await firebase.firestore().collection('userProfiles').doc(userId).get();
    
    if (docRef.exists) {
      return { userId, ...docRef.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId, data) => {
  try {
    const updateData = {
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await firebase.firestore().collection('userProfiles').doc(userId).update(updateData);
    return { userId, ...updateData };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};