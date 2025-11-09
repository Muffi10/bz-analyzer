"use client";

import { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Chrome, TrendingUp, Eye, EyeOff, Mail, Lock, Sparkles } from "lucide-react";
import { createOrUpdateUser } from "@/lib/userService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createOrUpdateUser(result.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let result;
      
      if (isSignup) {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      
      await createOrUpdateUser(result.user);
      router.push("/");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use. Try logging in instead.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Invalid email or password");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else {
        setError(err.message || "Authentication failed");
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
              {isSignup ? "Create Account" : "Welcome Back"}
            </h3>
            <p className="text-gray-600">
              {isSignup ? "Start your 15-day free trial" : "Sign in to your account"}
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailPasswordAuth} className="space-y-5 mb-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignup ? "Minimum 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pl-10 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white/50"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin" />
                  {isSignup ? "Creating Account..." : "Signing In..."}
                </div>
              ) : (
                isSignup ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          {/* Toggle between Login/Signup */}
          <div className="text-center mb-6">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3.5 px-6 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-t-2 border-gray-700 border-solid rounded-full animate-spin" />
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
        </div>
      </div>
    </div>
  );
}