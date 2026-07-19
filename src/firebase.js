import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const isFirebaseConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.projectId;

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('✅ Firebase connected to project:', firebaseConfig.projectId);
  } catch (e) {
    console.warn('Firebase init failed, using mock data:', e.message);
  }
}

export { db, auth, isFirebaseConfigured, collection, getDocs, addDoc, setDoc, doc, query, orderBy, limit, onSnapshot, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup };
