// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

console.log("🔥 Initializing Firebase...");
console.log("🌍 Environment:", process.env.NODE_ENV);
console.log("📍 API Key exists:", !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("📍 Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log("⚙️ Firebase config loaded (keys hidden for security)");

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
console.log("✅ Firebase app initialized:", app.name);

const auth = getAuth(app);
console.log("🔐 Auth instance created");

if (typeof window !== 'undefined') {
  console.log("💾 Setting auth persistence to LOCAL");
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("✅ Auth persistence set successfully");
    })
    .catch((error) => {
      console.error("❌ Auth persistence error:", error);
    });
}

const db = getFirestore(app);
console.log("📦 Firestore instance created");

export { auth, db };
export default app;