import 'react-native-get-random-values';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import {
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDyp_UOsiymL-eGclqlcGAPyJAeB1KhSdo',
  authDomain: 'kisanbot-5dcc0.firebaseapp.com',
  databaseURL: 'https://kisanbot-5dcc0-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'kisanbot-5dcc0',
  storageBucket: 'kisanbot-5dcc0.firebasestorage.app',
  messagingSenderId: '384881804129',
  appId: '1:384881804129:web:8f1af17e5123f09e04bb20',
  measurementId: 'G-LNYJ4QD90H',
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// React Native requires initializeAuth with AsyncStorage persistence
// getAuth() causes "Component auth has not been registered yet" crash
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // Auth already initialized (hot reload)
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
}


export {
  db,
  auth,
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
};
