// src/app/api/verify-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySubscriptionSignature } from "@/lib/razorpay";
import { doc, setDoc, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      userId,
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifySubscriptionSignature(
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.error("❌ Invalid signature");
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    console.log("✅ Payment signature verified");

    // Calculate subscription period (30 days from now)
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    // Update user subscription status
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      subscriptionStatus: "active",
      razorpaySubscriptionId: razorpay_subscription_id,
      currentPeriodStart: currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd,
      cancelAtPeriodEnd: false,
    });

    // Store payment record
    const paymentsRef = collection(db, `users/${userId}/payments`);
    await addDoc(paymentsRef, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySubscriptionId: razorpay_subscription_id,
      amount: 49, // ₹1 for testing - Change to 50 for production
      status: "success",
      timestamp: currentPeriodStart,
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
    });

    console.log("✅ User subscription activated");

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated",
    });
  } catch (error: any) {
    console.error("❌ Verify payment error:", error);
    return NextResponse.json(
      { error: error.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}