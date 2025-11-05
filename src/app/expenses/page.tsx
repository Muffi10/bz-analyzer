"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("🔐 LoginPage: Component mounted");
    console.log("🔥 Firebase auth:", auth);
    console.log("👤 Current user on mount:", auth.currentUser);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔔 LoginPage: onAuthStateChanged triggered");
      console.log("👤 User state:", user);
      
      if (user) {
        console.log("✅ User already logged in:", user.email);
        console.log("🔄 Redirecting to home page");
        router.push("/");
      } else {
        console.log("❌ No user logged in");
      }
    });

    return () => {
      console.log("🧹 Cleaning up LoginPage");
      unsubscribe();
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔑 Login attempt started");
    console.log("📧 Email:", email);
    
    setError("");
    setIsLoading(true);

    try {
      console.log("🔥 Calling signInWithEmailAndPassword...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login successful!");
      console.log("👤 User:", userCredential.user.email);
      console.log("🆔 UID:", userCredential.user.uid);
      console.log("🎫 Token:", await userCredential.user.getIdToken());
      
      // Wait a bit for auth state to update
      setTimeout(() => {
        console.log("🔄 Navigating to home page");
        router.push("/");
      }, 100);
      
    } catch (err: any) {
      console.error("❌ Login error:", err);
      console.error("📋 Error code:", err.code);
      console.error("📋 Error message:", err.message);
      setError(err.message || "Login failed");
      setIsLoading(false);
    }
  };

  console.log("🎨 Rendering LoginPage - isLoading:", isLoading);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Login
        </h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </p>
          )}

          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
              required
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500 pr-12"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </div>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
          💡 Check browser console (F12) for debug logs
        </div>
      </div>
    </div>
  );
}