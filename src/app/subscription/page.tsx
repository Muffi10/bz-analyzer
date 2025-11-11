// src/app/subscription/page.tsx
"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeft, Crown, Calendar, CreditCard, CheckCircle, XCircle, AlertCircle, Zap } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";

interface UserData {
  subscriptionStatus: "trial" | "active" | "expired" | "cancelled";
  trialEndsAt?: Date;
  currentPeriodEnd?: Date;
  currentPeriodStart?: Date;
  cancelAtPeriodEnd?: boolean;
  createdAt?: Date;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Wait for auth to be ready first
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔐 Auth state changed:", user?.uid);
      if (user) {
        setAuthReady(true);
      } else {
        setAuthReady(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Only fetch data once auth is ready
  useEffect(() => {
    if (authReady) {
      console.log("✅ Auth ready, fetching data...");
      fetchUserData();
      fetchPayments();
    }
  }, [authReady]);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      console.log("🔍 Fetching for user:", user?.uid, user?.email);
      
      if (!user) {
        console.error("❌ No user logged in");
        setIsLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      console.log("📄 User document exists:", userSnap.exists());
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log("📊 Raw Firestore data:", data);
        
        const userData: UserData = {
          subscriptionStatus: data.subscriptionStatus || "trial",
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          razorpaySubscriptionId: data.razorpaySubscriptionId,
          razorpayCustomerId: data.razorpayCustomerId,
        };

        // Handle dates with detailed logging
        console.log("📅 Processing dates...");
        
        if (data.trialEndsAt) {
          console.log("Trial ends at (raw):", data.trialEndsAt);
          userData.trialEndsAt = data.trialEndsAt.toDate ? data.trialEndsAt.toDate() : new Date(data.trialEndsAt);
          console.log("Trial ends at (converted):", userData.trialEndsAt);
        }
        
        if (data.currentPeriodEnd) {
          console.log("Period end (raw):", data.currentPeriodEnd);
          userData.currentPeriodEnd = data.currentPeriodEnd.toDate ? data.currentPeriodEnd.toDate() : new Date(data.currentPeriodEnd);
          console.log("Period end (converted):", userData.currentPeriodEnd);
        }
        
        if (data.currentPeriodStart) {
          console.log("Period start (raw):", data.currentPeriodStart);
          userData.currentPeriodStart = data.currentPeriodStart.toDate ? data.currentPeriodStart.toDate() : new Date(data.currentPeriodStart);
          console.log("Period start (converted):", userData.currentPeriodStart);
        }

        if (data.createdAt) {
          userData.createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        }

        console.log("✅ Final processed user data:", userData);
        setUserData(userData);
      } else {
        console.log("⚠️ No user document found - creating default");
        
        const defaultUserData: UserData = {
          subscriptionStatus: "trial",
          trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };
        setUserData(defaultUserData);
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      
      const defaultUserData: UserData = {
        subscriptionStatus: "trial",
        trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      setUserData(defaultUserData);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("❌ No user for payments fetch");
        return;
      }

      console.log("💳 Fetching payments for user:", user.uid);
      const paymentsRef = collection(db, `users/${user.uid}/payments`);
      const q = query(paymentsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);

      console.log("💳 Found", snapshot.size, "payments");

      const paymentsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("Payment doc:", doc.id, data);
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
        };
      });

      console.log("✅ Processed payments:", paymentsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error("❌ Error fetching payments:", error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll have access until the end of your current billing period.")) {
      return;
    }

    try {
      setIsCancelling(true);
      const user = auth.currentUser;
      if (!user) return;

      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Subscription cancelled. You'll have access until " + new Date(data.currentPeriodEnd).toLocaleDateString());
        await fetchUserData();
        await fetchPayments();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Cancel error:", error);
      alert("Failed to cancel subscription: " + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const getDaysRemaining = () => {
    if (!userData) {
      console.log("⚠️ getDaysRemaining: No userData");
      return 0;
    }
    
    let endDate: Date | undefined;

    if (userData.subscriptionStatus === "trial" && userData.trialEndsAt) {
      endDate = userData.trialEndsAt;
      console.log("📅 Using trial end date:", endDate);
    } else if (userData.currentPeriodEnd) {
      endDate = userData.currentPeriodEnd;
      console.log("📅 Using period end date:", endDate);
    }

    if (!endDate) {
      console.log("⚠️ No end date found");
      return 0;
    }

    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    console.log("📊 Days remaining:", days);
    return days;
  };

  const getNextBillingDate = () => {
    if (!userData) {
      console.log("⚠️ getNextBillingDate: No userData");
      return "N/A";
    }
    
    if (userData.subscriptionStatus === "trial" && userData.trialEndsAt) {
      return userData.trialEndsAt.toLocaleDateString();
    }
    
    if (userData.currentPeriodEnd) {
      return userData.currentPeriodEnd.toLocaleDateString();
    }
    
    console.log("⚠️ No billing date found");
    return "N/A";
  };

  const getStatusBadge = () => {
    if (!userData) return null;

    if (userData.cancelAtPeriodEnd) {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium flex items-center gap-1">
          <AlertCircle size={14} />
          Cancelling
        </span>
      );
    }

    switch (userData.subscriptionStatus) {
      case "trial":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            Free Trial
          </span>
        );
      case "active":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
            <CheckCircle size={14} />
            Pro Active
          </span>
        );
      case "expired":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            Inactive
          </span>
        );
    }
  };

  if (isLoading || !authReady) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Loading subscription details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        {/* Navbar */}
        <nav className="bg-white shadow-lg border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
                  <p className="text-sm text-gray-600">Manage your subscription and billing</p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-4xl mx-auto p-6">
          {/* Current Plan Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Plan</h2>
                {getStatusBadge()}
              </div>
              
              {(userData?.subscriptionStatus === "active" || userData?.subscriptionStatus === "trial") && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    {userData.subscriptionStatus === "trial" ? "Free" : "₹49"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {userData.subscriptionStatus === "trial" ? "Trial Plan" : "per month"}
                  </div>
                </div>
              )}
            </div>

            {/* Status Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Calendar size={16} />
                  <span className="text-sm font-medium">
                    {userData?.subscriptionStatus === "trial" ? "Trial Ends" : "Next Billing Date"}
                  </span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {getNextBillingDate()}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {getDaysRemaining()} days remaining
                </div>
              </div>

              {userData?.subscriptionStatus === "active" && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <CreditCard size={16} />
                    <span className="text-sm font-medium">Payment Method</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">Razorpay</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {userData.cancelAtPeriodEnd ? "Auto-renewal disabled" : "Auto-renewal enabled"}
                  </div>
                </div>
              )}
            </div>

            {/* Warning for cancelling */}
            {userData?.cancelAtPeriodEnd && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle size={18} />
                  <span className="font-medium">Subscription Cancelling</span>
                </div>
                <p className="text-sm text-orange-700 mt-2">
                  Your subscription will end on {getNextBillingDate()}. 
                  You'll have access until then.
                </p>
              </div>
            )}

            {/* Features */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Plan Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Unlimited Sales Tracking",
                  "Advanced Analytics",
                  "Inventory Management", 
                  "Expense Tracking",
                  "Real-time Reports",
                  "Priority Support"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                    <Zap className="w-4 h-4 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {userData?.subscriptionStatus === "trial" && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Upgrade to Pro
                </button>
              )}

              {userData?.subscriptionStatus === "active" && !userData?.cancelAtPeriodEnd && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Cancel Subscription
                    </>
                  )}
                </button>
              )}

              {(userData?.subscriptionStatus === "expired" || userData?.subscriptionStatus === "cancelled") && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Reactivate Subscription
                </button>
              )}
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Payment History</h2>
              
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          Payment Successful
                        </div>
                        <div className="text-sm text-gray-600">
                          {payment.timestamp.toLocaleDateString()} at{" "}
                          {payment.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">₹{payment.amount}</div>
                      <div className="text-xs text-gray-600">
                        {payment.razorpayPaymentId ? `ID: ${payment.razorpayPaymentId.slice(-8)}` : 'Payment'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No payments message */}
          {payments.length === 0 && userData?.subscriptionStatus !== "trial" && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
              <p className="text-gray-600 text-center py-4">No payment history found</p>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </ProtectedRoute>
  );
}