"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Chrome, TrendingUp, ShieldCheck, Zap, Crown, Sparkles } from "lucide-react";
import { createOrUpdateUser, getUserData } from "@/lib/userService";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);

    try {
      console.log("🔐 Signing in with Google...");
      const result = await signInWithPopup(auth, googleProvider);
      
      console.log("✅ Google login successful:", result.user.email);
      
      // Check if user already exists before creating/updating
      const existingUserData = await getUserData(result.user.uid);
      
      if (existingUserData) {
        console.log("📋 User already exists, updating last login...");
      } else {
        console.log("🆕 Creating new user account...");
      }
      
      // Create or update user document
      await createOrUpdateUser(result.user);
      
      router.push("/");
    } catch (err: any) {
      console.error("❌ Login error:", err);
      
      // User-friendly error messages
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(err.message || "Sign-in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left space-y-8">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                BizAnalyzer
              </h1>
              <p className="text-blue-600 font-medium mt-1">Business Intelligence Platform</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl lg:text-3xl font-semibold text-gray-800 leading-tight">
              Smart Analytics for <span className="text-blue-600">Growing Businesses</span>
            </h2>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Track sales, manage inventory, and make data-driven decisions with our intuitive platform.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 pt-4">
            {[
              "📊 Real-time sales analytics",
              "📦 Inventory management", 
              "💰 Expense tracking",
              "📈 Profit insights",
              "🔐 Secure & reliable"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-700">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/60 p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome to BizAnalyzer
            </h3>
            <p className="text-gray-600">
              Sign in to start your 15-day free trial
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3.5 px-6 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-t-2 border-gray-700 border-solid rounded-full animate-spin" />
                Signing in...
              </div>
            ) : (
              <>
                <Chrome className="w-5 h-5" />
                Continue with Google
              </>
            )}
          </button>

          {/* Trial Info */}
          <div className="mt-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
            <p className="text-xs text-center text-gray-600">
              🎉 <span className="font-semibold text-blue-600">15-day free trial</span> • No credit card required
            </p>
          </div>

          {/* Features in Mobile View */}
          <div className="lg:hidden mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <h4 className="font-semibold text-black mb-3 text-center">Everything you get:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-blue-600" />
                <span className="text-black">Sales Tracking</span>
              </div>
              <div className="flex items-center gap-1 ">
                <ShieldCheck className="w-3 h-3 text-green-600" />
                <span className="text-black">15-Day Trial</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-600" />
                <span className="text-black">Live Analytics</span>
              </div>
              <div className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-600" />
                <span className="text-black">₹50/month</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}