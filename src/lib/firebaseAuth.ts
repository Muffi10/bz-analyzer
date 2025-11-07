// lib/firebaseAuth.ts
import app from "./firebase"; // 👈 use the existing initialized app
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// ✅ reuse existing app
const auth = getAuth(app);

export { auth, signInWithEmailAndPassword };
