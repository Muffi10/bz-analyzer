// src/app/api/cancel-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { razorpayInstance } from "@/lib/razorpay";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user data
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const subscriptionId = userData.razorpaySubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // ✅ Cancel subscription at Razorpay (at end of billing cycle)
    await razorpayInstance.subscriptions.cancel(subscriptionId, true);

    // Update Firestore - mark as cancelled but keep active until period ends
    await updateDoc(userRef, {
      cancelAtPeriodEnd: true,
      subscriptionStatus: "active", // still active until period ends
    });

    console.log("✅ Subscription marked for cancellation at period end");

    return NextResponse.json({
      success: true,
      message:
        "Subscription will be cancelled at the end of the current billing period",
      currentPeriodEnd: userData.currentPeriodEnd,
    });
  } catch (error: any) {
    console.error("❌ Cancel subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
