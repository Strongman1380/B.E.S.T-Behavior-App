import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

// Get Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
let db;

try {
  // Check if we have valid Firebase config
  const hasValidConfig = firebaseConfig.apiKey && 
                        firebaseConfig.projectId && 
                        firebaseConfig.apiKey !== "demo-api-key";
  
  if (!hasValidConfig) {
    console.warn('Firebase config not found or using demo values, falling back to localStorage');
    db = null;
  } else {
    // Check if Firebase is already initialized
    if (getApps().length === 0) {
      // No Firebase app initialized yet, so initialize it
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      console.log('Firebase initialized successfully');
    } else {
      // Firebase already initialized, use the existing app
      app = getApps()[0];
      db = getFirestore(app);
      console.log('Using existing Firebase app for data storage');
    }
  }
} catch (error) {
  console.warn('Firebase initialization failed, falling back to localStorage:', error.message);
  db = null;
}

// Check if Firebase is available
export const isFirebaseAvailable = () => {
  return db !== null && firebaseConfig.apiKey !== "demo-api-key";
};

// Generic Firestore entity class
class FirestoreEntity {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.listeners = new Map(); // Store real-time listeners
  }

  // Create a new document
  async create(data) {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase not configured');
    }
    
    const docData = {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    if (data.id) {
      await setDoc(doc(db, this.collectionName, data.id), docData);
      return { id: data.id, ...docData };
    } else {
      const docRef = await addDoc(collection(db, this.collectionName), docData);
      return { id: docRef.id, ...docData };
    }
  }

  // Get a document by ID
  async get(id) {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase not configured');
    }
    
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  }

  // List all documents with optional ordering
  async list(orderByField = 'created_at') {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase not configured');
    }
    
    const q = query(collection(db, this.collectionName), orderBy(orderByField, 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // Filter documents
  async filter(filters) {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase not configured');
    }
    
    let q = collection(db, this.collectionName);
    
    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      q = query(q, where(field, '==', value));
    });
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // Update a document
  async update(id, data) {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase not configured');
    }
    
    const docRef = doc(db, this.collectionName, id);
    const updateData = {
      ...data,
      updated_at: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  }

  // Delete a document
  async delete(id) {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase not configured');
    }
    
    await deleteDoc(doc(db, this.collectionName, id));
    return true;
  }

  // Save multiple documents
  async saveAll(dataArray) {
    if (!isFirebaseAvailable()) {
      throw new Error('Firebase not configured');
    }
    
    const promises = dataArray.map(data => this.create(data));
    return await Promise.all(promises);
  }

  // Real-time listener for collection changes
  onSnapshot(callback, filters = {}) {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not available, real-time updates disabled');
      return () => {}; // Return empty unsubscribe function
    }
    
    let q = collection(db, this.collectionName);
    
    // Apply filters if provided
    Object.entries(filters).forEach(([field, value]) => {
      q = query(q, where(field, '==', value));
    });
    
    // Add ordering
    q = query(q, orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    });
    
    return unsubscribe;
  }

  // Real-time listener for a specific document
  onDocSnapshot(id, callback) {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not available, real-time updates disabled');
      return () => {}; // Return empty unsubscribe function
    }
    
    const docRef = doc(db, this.collectionName, id);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback(null);
      }
    });
    
    return unsubscribe;
  }
}

// Export entity instances
export const FirebaseStudent = new FirestoreEntity('students');
export const FirebaseDailyEvaluation = new FirestoreEntity('daily_evaluations');
export const FirebaseSettings = new FirestoreEntity('settings');
export const FirebaseContactLog = new FirestoreEntity('contact_logs');
export const FirebaseBehaviorSummary = new FirestoreEntity('behavior_summaries');
export const FirebaseIncidentReport = new FirestoreEntity('incident_reports');
export const FirebaseUser = new FirestoreEntity('users');

export { db };
