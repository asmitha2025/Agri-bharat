import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  setDoc,
  doc,
  getDoc,
} from '../firebase';

const AuthContext = createContext(null);

const ADMIN_EMAIL = 'admin@agriweb.com';

async function saveUserToFirestore(uid, data) {
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch (e) {
    console.warn('saveUserToFirestore:', e.message);
  }
}

async function getUserRole(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) return snap.data().role || 'user';
  } catch (e) {}
  return 'user';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = role === 'admin';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const r = u.email === ADMIN_EMAIL ? 'admin' : await getUserRole(u.uid);
        setRole(r);
        setUser(u);
        await AsyncStorage.setItem('agribot-user', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.displayName }));
      } else {
        setUser(null);
        setRole('user');
        await AsyncStorage.removeItem('agribot-user');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const r = cred.user.email === ADMIN_EMAIL ? 'admin' : await getUserRole(cred.user.uid);
      setRole(r);
      return true;
    } catch (e) {
      const msgs = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found': 'Account not found.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      };
      setError(msgs[e.code] || 'Login failed. Please try again.');
      return false;
    }
  };

  const register = async (name, email, password) => {
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const newRole = email === ADMIN_EMAIL ? 'admin' : 'user';
      await saveUserToFirestore(cred.user.uid, {
        name,
        email,
        role: newRole,
        createdAt: new Date().toISOString(),
      });
      setRole(newRole);
      return true;
    } catch (e) {
      const msgs = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setError(msgs[e.code] || 'Registration failed. Please try again.');
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole('user');
  };

  return (
    <AuthContext.Provider value={{ user, role, isAdmin, loading, error, setError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
