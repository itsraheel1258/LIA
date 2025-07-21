
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
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
    // This check ensures we only try to use Firebase on the client side
    // where it has been initialized.
    if (auth) {
      setIsFirebaseEnabled(true);
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If auth is not available (e.g., server-side or missing config),
      // we reflect that in the state.
      setIsFirebaseEnabled(false);
      setLoading(false);
    }
  }, []);

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
