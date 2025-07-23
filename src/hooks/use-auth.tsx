
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { getFirebase } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseEnabled, setIsFirebaseEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { auth, isFirebaseEnabled: enabled } = getFirebase();
    setIsFirebaseEnabled(enabled);

    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    const { auth } = getFirebase();
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
    const { auth } = getFirebase();
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
    <AuthContext.Provider value={{ user, loading, isFirebaseEnabled, signInWithGoogle, logout }}>
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
