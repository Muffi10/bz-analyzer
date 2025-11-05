"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("🔐 ProtectedRoute: Component mounted");
    console.log("📍 Current pathname:", pathname);
    console.log("🔥 Firebase auth object:", auth);
    console.log("👤 Auth currentUser:", auth.currentUser);

    const timeout = setTimeout(() => {
      console.log("⏰ Timeout reached (5s) - still loading:", loading, "user:", user);
      if (loading && !user) {
        console.log("⚠️ Forcing loading to false due to timeout");
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("🔔 onAuthStateChanged triggered");
      console.log("👤 Current user:", currentUser);
      console.log("📧 User email:", currentUser?.email);
      console.log("🆔 User UID:", currentUser?.uid);
      
      clearTimeout(timeout);
      setUser(currentUser);
      setLoading(false);
      
      if (!currentUser) {
        console.log("❌ No user found, redirecting to login");
        console.log("📍 Current path:", pathname);
        if (pathname !== "/login") {
          console.log("🔄 Executing redirect to /login");
          router.push("/login");
        }
      } else {
        console.log("✅ User authenticated:", currentUser.email);
      }
    });

    return () => {
      console.log("🧹 Cleaning up ProtectedRoute");
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, pathname, loading, user]);

  console.log("🎨 Rendering ProtectedRoute - loading:", loading, "user:", !!user);

  if (loading) {
    console.log("⏳ Showing loading state");
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Verifying authentication...</p>
          <p className="text-gray-400 text-sm mt-2">Check console for logs</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("🚫 No user, returning null");
    return null;
  }

  console.log("✅ Rendering protected content");
  return <>{children}</>;
}