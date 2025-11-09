// src/lib/dbHelper.ts
import { collection, CollectionReference } from "firebase/firestore";
import { db, auth } from "./firebase";

// Get user-specific collection paths
export const getUserCollection = (collectionName: "sales" | "stocks" | "expenses"): CollectionReference => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return collection(db, `users/${userId}/${collectionName}`);
};

// Helper to get current user ID
export const getCurrentUserId = (): string => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
};