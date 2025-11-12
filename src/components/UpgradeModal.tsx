// src/components/UpgradeModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Crown, Check, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";

// Load Razorpay script (client-side only)
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if script is already loaded
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      setError("");

      const user = auth.currentUser;
      if (!user) {
        setError("Please login first");
        return;
      }

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Failed to load payment gateway");
        return;
      }

      // Create subscription
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userName: user.displayName,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      // Initialize Razorpay checkout with full-screen configuration
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "BizAnalyzer",
        description: "Pro Subscription - ₹49/month",
        // image: "https://razorpay.com/favicon.png", // Add your logo
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok) {
              alert("🎉 Payment successful! Your Pro subscription is now active.");
              window.location.reload(); // Refresh to update UI
            } else {
              throw new Error(verifyData.error || "Payment verification failed");
            }
          } catch (err: any) {
            console.error("Verification error:", err);
            setError(err.message);
          }
        },
        prefill: {
          name: user.displayName || "",
          email: user.email || "",
        },
        theme: {
          color: "#3B82F6",
        },
        modal: {
          // Make Razorpay modal full-screen and closeable
          ondismiss: function () {
            setIsLoading(false);
            console.log("Razorpay modal closed");
          },
          escape: true, // Allow closing with Escape key
          backdropclose: true, // Allow closing by clicking backdrop
        },
        // Full-screen configuration
        fullscreen: true,
        config: {
          display: {
            blocks: {
              banks: {
                name: "Pay via Netbanking",
                instruments: [
                  {
                    method: "netbanking",
                    banks: [
                      "HDFC",
                      "ICICI", 
                      "SBI",
                      "AXIS",
                      "KOTAK",
                      "YESBANK"
                    ]
                  }
                ]
              },
              cards: {
                name: "Pay via Cards",
                instruments: [
                  {
                    method: "card",
                    networks: ["visa", "mastercard", "rupay"]
                  }
                ]
              },
              upi: {
                name: "Pay via UPI",
                instruments: [
                  {
                    method: "upi"
                  }
                ]
              }
            },
            sequence: ["block.banks", "block.cards", "block.upi"],
            preferences: {
              show_default_blocks: true
            }
          }
        }
      };

      // @ts-ignore
      const razorpay = new window.Razorpay(options);
      
      // Add event listeners for Razorpay modal
      razorpay.on('payment.failed', function (response: any) {
        console.error("Payment failed:", response.error);
        setError(`Payment failed: ${response.error.description || "Unknown error"}`);
        setIsLoading(false);
      });

      razorpay.open();
    } catch (err: any) {
      console.error("Upgrade error:", err);
      setError(err.message || "Failed to process upgrade");
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative transform transition-all duration-300 scale-100">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-white text-gray-400 hover:text-gray-600 transition-all duration-200 rounded-full p-1 shadow-lg hover:shadow-xl border border-gray-200 hover:scale-110 z-10"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Upgrade to Pro
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Get unlimited access to all features
        </p>

        {/* Pricing */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl font-bold text-gray-900">₹49</span>
              <span className="text-gray-600">/month</span>
            </div>
            <p className="text-sm text-gray-600">Billed monthly • Cancel anytime</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {[
            "Unlimited sales tracking",
            "Advanced analytics & reports",
            "Inventory management",
            "Expense tracking",
            "Priority support",
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="w-5 h-5" />
              Subscribe Now
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure payment powered by Razorpay
        </p>
      </div>
    </div>
  );
}