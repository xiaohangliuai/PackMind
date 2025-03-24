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
    serverTimestamp 
  } from 'firebase/firestore';
  import { firestore } from '../config/firebase';
  
  // PackingList model
  export const packingListsCollection = collection(firestore, 'packingLists');
  
  export const createPackingList = async (data) => {
    const listData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  
    return await addDoc(packingListsCollection, listData);
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
    const q = query(
      packingListsCollection, 
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const lists = [];
    querySnapshot.forEach((doc) => {
      lists.push({ id: doc.id, ...doc.data() });
    });
    
    return lists;
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
    const q = query(
      packingListsCollection, 
      where('sharedWith', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const lists = [];
    querySnapshot.forEach((doc) => {
      lists.push({ id: doc.id, ...doc.data() });
    });
    
    return lists;
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