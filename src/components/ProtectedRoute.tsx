// src/components/ProtectedRoute.tsx
"use client";

import { useEffect, useState, createContext, useContext, lazy, Suspense } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { getUserData, UserData, checkSubscriptionStatus, getDaysRemaining } from "@/lib/userService";
import { AlertCircle, Crown, TrendingUp, BarChart3, Package, DollarSign } from "lucide-react";

// Context to share user data across components
interface UserContextType {
  user: User | null;
  userData: UserData | null;
  isSubscriptionActive: boolean;
  daysRemaining: number;
}

const UserContext = createContext<UserContextType>({
  user: null,
  userData: null,
  isSubscriptionActive: true,
  daysRemaining: 0,
});

export const useUser = () => useContext(UserContext);

// Lazy loading components for dashboard cards
const DashboardCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-8 bg-gray-300 rounded w-3/4"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
    </div>
  </div>
);

const NavbarSkeleton = () => (
  <nav className="bg-white shadow-lg border-b border-gray-200 px-6 py-4 animate-pulse">
    <div className="max-w-7xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="w-24 h-10 bg-gray-200 rounded-xl"></div>
    </div>
  </nav>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-pulse">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </div>
    <div className="p-6 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4 flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  </div>
);

// Animated loading components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
    <div className="text-center space-y-6">
      {/* Animated logo */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
        </div>
      </div>
      
      {/* Loading text with animation */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-gray-800 animate-pulse">
          BizAnalyzer
        </h2>
        <p className="text-gray-600 text-lg">Preparing your dashboard...</p>
      </div>

      {/* Animated progress bar */}
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
        <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-[loading_2s_ease-in-out_infinite]"></div>
      </div>

      {/* Feature icons animation */}
      <div className="flex justify-center gap-6 pt-4">
        {[BarChart3, Package, DollarSign, TrendingUp].map((Icon, index) => (
          <div
            key={index}
            className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-400 animate-bounce"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <Icon className="w-6 h-6" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
    <NavbarSkeleton />
    <div className="max-w-7xl mx-auto p-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>

      {/* Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Skeleton */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-12 bg-gray-200 rounded-xl"></div>
                </div>
              ))}
              <div className="h-12 bg-gray-300 rounded-xl mt-4"></div>
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="lg:col-span-2">
          <TableSkeleton />
        </div>
      </div>
    </div>
  </div>
);

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !user) {
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(timeout);
      setUser(currentUser);
      
      if (!currentUser) {
        setLoading(false);
        if (pathname !== "/login") {
          router.push("/login");
        }
      } else {
        // Fetch user data
        const data = await getUserData(currentUser.uid);
        setUserData(data);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, pathname, loading, user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !userData) {
    return null;
  }

  const isSubscriptionActive = checkSubscriptionStatus(userData);
  const daysRemaining = getDaysRemaining(userData);

  return (
    <UserContext.Provider value={{ user, userData, isSubscriptionActive, daysRemaining }}>
      {/* Trial/Subscription Banner */}
      {userData.subscriptionStatus === "trial" && daysRemaining > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 text-center text-sm font-medium shadow-lg">
          🎉 Free Trial: <span className="font-bold">{daysRemaining} days remaining</span> • 
          <button 
            onClick={() => alert("Payment integration coming soon!")}
            className="ml-2 underline hover:no-underline font-semibold"
          >
            Upgrade to Pro (₹50/month)
          </button>
        </div>
      )}

      {userData.subscriptionStatus === "expired" && (
        <div className="bg-red-600 text-white px-4 py-3 text-center font-medium shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle size={18} />
            <span>Your trial has ended. Upgrade to continue using BizAnalyzer.</span>
            <button 
              onClick={() => alert("Payment integration coming soon!")}
              className="ml-3 bg-white text-red-600 px-4 py-1 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <Crown className="inline w-4 h-4 mr-1" />
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Read-only overlay for expired subscriptions */}
      {!isSubscriptionActive ? (
        <div className="relative">
          <div className="pointer-events-none opacity-60">
            <Suspense fallback={<DashboardSkeleton />}>
              {children}
            </Suspense>
          </div>
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md pointer-events-auto border-2 border-red-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Trial Ended</h3>
                <p className="text-gray-600 mb-6">
                  Your 15-day free trial has expired. Upgrade to Pro to continue managing your business.
                </p>
                <button
                  onClick={() => alert("Payment integration coming soon!")}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Upgrade to Pro - ₹50/month
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  All your data is safe and will be available after upgrade
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Suspense fallback={<DashboardSkeleton />}>
          {children}
        </Suspense>
      )}
    </UserContext.Provider>
  );
}