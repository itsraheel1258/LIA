
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

interface FirebaseServices {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
}

interface AuthContextType extends FirebaseServices {
  user: User | null;
  loading: boolean;
  isFirebaseEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This function initializes Firebase and returns the services.
// It's defined outside the provider to be stable.
const initializeFirebase = (): FirebaseServices & { isFirebaseEnabled: boolean } => {
    if (firebaseConfig.apiKey && typeof window !== 'undefined') {
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);
        return { app, auth, db, storage, isFirebaseEnabled: true };
    }
    return { app: null, auth: null, db: null, storage: null, isFirebaseEnabled: false };
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize Firebase right away.
  const { app, auth, db, storage, isFirebaseEnabled } = initializeFirebase();
  
  const router = useRouter();

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [auth]);

  const signInWithGoogle = async () => {
    if (!auth) {
        console.error("Firebase is not configured. Cannot sign in.");
        throw new Error("Firebase is not configured.");
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) {
        console.error("Firebase is not configured. Cannot log out.");
        return;
    }
    try {
      await signOut(auth);
      router.push('/');
    } catch (error)      {
        console.error("Error signing out", error);
      }
  };

  return (
    <AuthContext.Provider value={{ user, loading, app, auth, db, storage, isFirebaseEnabled, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
