import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, setDoc, doc } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const AuthContext = createContext(null);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@agriweb.com';

/** Save user profile to Firestore users collection */
async function saveUserToFirestore(uid, data) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch (e) {
    console.warn('saveUserToFirestore:', e.message);
  }
}

/** Fetch user role from Firestore */
async function getUserRole(uid) {
  if (!db) return 'user';
  try {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) return snap.data().role || 'user';
  } catch {
    // Ignore error in local mode
  }
  return 'user';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('agribot-admin-auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem('agribot-admin-auth');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.email === ADMIN_EMAIL ? 'admin' : 'user';
    }
    return 'user';
  });
  const [loading, setLoading] = useState(() => !!auth);
  const [error, setError]   = useState('');

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const r = u.email === ADMIN_EMAIL ? 'admin' : await getUserRole(u.uid);
        setRole(r);
        setUser(u);
      } else {
        setUser(null);
        setRole('user');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  /* ── Login ── */
  const login = async (email, password) => {
    setError('');
    if (!auth) {
      const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'Agri@2024';
      if (email === ADMIN_EMAIL && password === adminPass) {
        const u = { email, displayName: 'Admin', uid: 'local-admin' };
        localStorage.setItem('agribot-admin-auth', JSON.stringify(u));
        setUser(u); setRole('admin');
        return true;
      }
      setError('Invalid credentials. Please try again.');
      return false;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const r = cred.user.email === ADMIN_EMAIL ? 'admin' : await getUserRole(cred.user.uid);
      setRole(r);
      return true;
    } catch (e) {
      const msgs = {
        'auth/invalid-credential':  'Invalid email or password.',
        'auth/user-not-found':      'Account not found.',
        'auth/wrong-password':      'Incorrect password.',
        'auth/too-many-requests':   'Too many attempts. Try again later.',
      };
      setError(msgs[e.code] || 'Login failed. Please try again.');
      return false;
    }
  };

  /* ── Google Login ── */
  const loginWithGoogle = async () => {
    setError('');
    if (!auth) { setError('Firebase is not configured.'); return false; }
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const u = cred.user;
      const newRole = u.email === ADMIN_EMAIL ? 'admin' : 'user';
      await saveUserToFirestore(u.uid, {
        name: u.displayName || '',
        email: u.email,
        role: newRole,
        photoURL: u.photoURL || '',
        createdAt: new Date().toISOString(),
      });
      setRole(newRole);
      return true;
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
      return false;
    }
  };

  /* ── Register ── */
  const register = async (name, email, password) => {
    setError('');
    if (!auth || !db) {
      setError('Registration requires Firebase to be configured.');
      return false;
    }
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
        'auth/weak-password':         'Password must be at least 6 characters.',
        'auth/invalid-email':         'Please enter a valid email address.',
      };
      setError(msgs[e.code] || 'Registration failed. Please try again.');
      return false;
    }
  };

  /* ── Logout ── */
  const logout = async () => {
    localStorage.removeItem('agribot-admin-auth');
    if (auth) await signOut(auth);
    setUser(null); setRole('user');
  };

  return (
    <AuthContext.Provider value={{ user, role, isAdmin, loading, error, setError, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
