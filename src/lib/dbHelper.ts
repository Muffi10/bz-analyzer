// src/lib/dbHelper.ts
import { collection, CollectionReference } from "firebase/firestore";
import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// Promise that resolves when auth is ready
let authReadyPromise: Promise<void> | null = null;

const waitForAuth = (): Promise<void> => {
  if (authReadyPromise) return authReadyPromise;
  
  authReadyPromise = new Promise((resolve) => {
    // If already signed in, resolve immediately
    if (auth.currentUser) {
      resolve();
      return;
    }
    
    // Otherwise wait for auth state to change
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve();
      }
    });
    
    // Timeout after 5 seconds to prevent hanging
    setTimeout(() => {
      unsubscribe();
      resolve();
    }, 5000);
  });
  
  return authReadyPromise;
};

// Get user-specific collection paths (async version - recommended)
export const getUserCollection = async (
  collectionName: "sales" | "stocks" | "expenses"
): Promise<CollectionReference> => {
  await waitForAuth();
  
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return collection(db, `users/${userId}/${collectionName}`);
};

// Synchronous version (use only when you're sure auth is ready)
export const getUserCollectionSync = (
  collectionName: "sales" | "stocks" | "expenses"
): CollectionReference => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User not authenticated. Use getUserCollection() async version instead.");
  }
  return collection(db, `users/${userId}/${collectionName}`);
};

// Helper to get current user ID (async version - recommended)
export const getCurrentUserId = async (): Promise<string> => {
  await waitForAuth();
  
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
};

// Synchronous version (use only when you're sure auth is ready)
export const getCurrentUserIdSync = (): string => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User not authenticated. Use getCurrentUserId() async version instead.");
  }
  return userId;
};

// Helper to check if user is authenticated (doesn't throw)
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Get user ID without throwing (returns null if not authenticated)
export const getUserIdSafe = (): string | null => {
  return auth.currentUser?.uid || null;
};