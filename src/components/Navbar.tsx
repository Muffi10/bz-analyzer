// src/components/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserData, UserData, getDaysRemaining } from "@/lib/userService";
import { Menu, X, Home, TrendingUp, ShoppingCart, DollarSign, BarChart3, LogOut, LogIn, Crown, Calendar } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const data = await getUserData(currentUser.uid);
        setUserData(data);
      } else {
        setUserData(null);
      }
    });
    return unsubscribe;
  }, []);

  // Hide navbar on login page
  if (pathname === "/login") return null;

  const pages = [
    { name: "Home", path: "/", icon: Home },
    { name: "Stocks", path: "/stocks", icon: TrendingUp },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Expenses", path: "/expenses", icon: DollarSign },
    { name: "Reports", path: "/reports", icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    setMenuOpen(false);
    router.push("/login");
  };

  const handleLogin = () => {
    setMenuOpen(false);
    router.push("/login");
  };

  const navigateTo = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  const handleUpgrade = () => {
    setMenuOpen(false);
    router.push("/subscription")
  };

  const daysRemaining = userData ? getDaysRemaining(userData) : 0;

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => router.push("/")}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700 transition-all">
            BizAnalyzer
          </h1>
        </div>

        {/* User Profile & Menu */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden md:flex items-center gap-3">
              {user.photoURL && (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User"} 
                  className="w-10 h-10 rounded-full border-2 border-blue-200 shadow-sm"
                />
              )}
            </div>
          )}
          
          <button
            className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} className="text-gray-700" /> : <Menu size={22} className="text-gray-700" />}
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50
        transform transition-transform duration-300 ease-in-out
        ${menuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">BizAnalyzer</h2>
                <p className="text-sm text-gray-500">Business Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* User Info with Profile Picture */}
          {user && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                {user.photoURL && (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "User"} 
                    className="w-12 h-12 rounded-full border-2 border-blue-300 shadow-sm"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">{user.displayName}</p>
                  <p className="text-xs text-blue-600 truncate">{user.email}</p>
                </div>
              </div>
              
              {/* Subscription Status */}
              {userData && (
                <div className="pt-3 border-t border-blue-200">
                  {userData.subscriptionStatus === "trial" && daysRemaining > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-blue-700">
                        <Calendar size={14} />
                        <span className="font-medium">Trial: {daysRemaining} days left</span>
                      </div>
                      <button
                        onClick={handleUpgrade}
                        className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all text-xs"
                      >
                        <Crown size={12} />
                        <span className="font-medium">Upgrade</span>
                      </button>
                    </div>
                  )}
                  {userData.subscriptionStatus === "active" && (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <Crown size={14} className="text-yellow-600" />
                      <span className="font-medium">Pro Member</span>
                    </div>
                  )}
                  {userData.subscriptionStatus === "expired" && (
                    <button
                      onClick={handleUpgrade}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-xs font-medium"
                    >
                      <Crown size={14} />
                      Subscription Expired - Renew
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Links with Scrollable Area */}
        <div className="flex flex-col h-[calc(100%-280px)]">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {pages.map((page) => {
              const IconComponent = page.icon;
              const isActive = pathname === page.path;
              
              return (
                <button
                  key={page.name}
                  onClick={() => navigateTo(page.path)}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 shadow-sm' 
                      : 'hover:bg-gray-50 hover:shadow-sm'
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                    ${isActive 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    <IconComponent size={20} />
                  </div>
                  <span className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                    {page.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Actions - Fixed at bottom */}
          <div className="p-4 border-t border-gray-200 bg-white space-y-3">
            {/* Upgrade Button */}
            {user && userData && userData.subscriptionStatus !== "active" && (
              <button
                onClick={handleUpgrade}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                <Crown className="w-5 h-5" />
                Upgrade to Pro - ₹50/month
              </button>
            )}
            
            {/* Logout/Login */}
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium"
              >
                <LogOut size={20} />
                Logout
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium"
              >
                <LogIn size={20} />
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}