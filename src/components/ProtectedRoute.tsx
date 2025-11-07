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
    

    const timeout = setTimeout(() => {
      console.log("⏰ Timeout reached (5s) - still loading:", loading, "user:", user);
      if (loading && !user) {
        console.log("⚠️ Forcing loading to false due to timeout");
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      
      
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
      
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, pathname, loading, user]);

  

  if (loading) {
    
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