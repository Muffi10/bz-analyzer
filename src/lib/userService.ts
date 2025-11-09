// src/lib/userService.ts
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "firebase/auth";

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  subscriptionStatus: "trial" | "active" | "expired";
  trialEndsAt: Date;
  createdAt: Date;
  migrated?: boolean;
}

export const createOrUpdateUser = async (user: User): Promise<UserData> => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // User exists, return their data
    const data = userSnap.data();
    return {
      ...data,
      trialEndsAt: data.trialEndsAt.toDate(),
      createdAt: data.createdAt.toDate(),
    } as UserData;
  }

  // New user - create with trial
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 15); // 15-day trial

  const userData: UserData = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "User",
    photoURL: user.photoURL || "",
    subscriptionStatus: "trial",
    trialEndsAt,
    createdAt: new Date(),
  };

  await setDoc(userRef, userData);
  console.log("✅ New user created with 15-day trial");

  // Migration is only for the original business owner
  // New users will start fresh, so we skip migration entirely
  // Set this to true for all new users
  await setDoc(userRef, { migrated: true }, { merge: true });
  console.log("✅ New user marked as migrated (no legacy data to migrate)");

  return userData;
};

// Migrate existing data from root collections to user's subcollections
const migrateExistingData = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.data()?.migrated) {
      console.log("✅ Data already migrated");
      return;
    }

    // Check if root collections have data
    console.log("🔍 Checking for data to migrate...");
    
    // First, check if user already has data in their collections
    const [userSalesSnap, userStocksSnap, userExpensesSnap] = await Promise.all([
      getDocs(collection(db, `users/${userId}/sales`)),
      getDocs(collection(db, `users/${userId}/stocks`)),
      getDocs(collection(db, `users/${userId}/expenses`)),
    ]);

    if (!userSalesSnap.empty || !userStocksSnap.empty || !userExpensesSnap.empty) {
      console.log("✅ User already has data in their collections, marking as migrated");
      await setDoc(userRef, { migrated: true }, { merge: true });
      return;
    }

    // Now check root collections
    const [salesSnap, stocksSnap, expensesSnap] = await Promise.all([
      getDocs(collection(db, "sales")),
      getDocs(collection(db, "stocks")),
      getDocs(collection(db, "expenses")),
    ]);

    console.log(`📊 Found in root: ${salesSnap.size} sales, ${stocksSnap.size} stocks, ${expensesSnap.size} expenses`);

    if (salesSnap.empty && stocksSnap.empty && expensesSnap.empty) {
      console.log("✅ No data to migrate");
      await setDoc(userRef, { migrated: true }, { merge: true });
      return;
    }

    console.log("🔄 Starting migration...");

    // Migrate in smaller batches (Firestore batch limit is 500 operations)
    const BATCH_SIZE = 400;
    
    // Migrate sales
    if (!salesSnap.empty) {
      console.log(`📦 Migrating ${salesSnap.size} sales...`);
      for (let i = 0; i < salesSnap.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = salesSnap.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach((docSnap) => {
          const newRef = doc(db, `users/${userId}/sales`, docSnap.id);
          batch.set(newRef, docSnap.data());
        });
        await batch.commit();
        console.log(`✅ Migrated sales batch ${i / BATCH_SIZE + 1}`);
      }
    }

    // Migrate stocks
    if (!stocksSnap.empty) {
      console.log(`📦 Migrating ${stocksSnap.size} stocks...`);
      for (let i = 0; i < stocksSnap.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = stocksSnap.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach((docSnap) => {
          const newRef = doc(db, `users/${userId}/stocks`, docSnap.id);
          batch.set(newRef, docSnap.data());
        });
        await batch.commit();
        console.log(`✅ Migrated stocks batch ${i / BATCH_SIZE + 1}`);
      }
    }

    // Migrate expenses
    if (!expensesSnap.empty) {
      console.log(`📦 Migrating ${expensesSnap.size} expenses...`);
      for (let i = 0; i < expensesSnap.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = expensesSnap.docs.slice(i, i + BATCH_SIZE);
        chunk.forEach((docSnap) => {
          const newRef = doc(db, `users/${userId}/expenses`, docSnap.id);
          batch.set(newRef, docSnap.data());
        });
        await batch.commit();
        console.log(`✅ Migrated expenses batch ${i / BATCH_SIZE + 1}`);
      }
    }

    // Mark as migrated
    await setDoc(userRef, { migrated: true }, { merge: true });
    
    console.log("✅ Data migration complete!");
    console.log(`📊 Successfully migrated: ${salesSnap.size} sales, ${stocksSnap.size} stocks, ${expensesSnap.size} expenses`);
  } catch (error) {
    console.error("❌ Error migrating data:", error);
    throw error;
  }
};

export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    return {
      ...data,
      trialEndsAt: data.trialEndsAt.toDate(),
      createdAt: data.createdAt.toDate(),
    } as UserData;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

export const checkSubscriptionStatus = (userData: UserData): boolean => {
  if (userData.subscriptionStatus === "active") return true;
  if (userData.subscriptionStatus === "trial") {
    return new Date() <= userData.trialEndsAt;
  }
  return false;
};

export const getDaysRemaining = (userData: UserData): number => {
  if (userData.subscriptionStatus !== "trial") return 0;
  const now = new Date();
  const diff = userData.trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};