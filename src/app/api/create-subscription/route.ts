//src/app/api/create-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { razorpayInstance } from "@/lib/razorpay";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const { userId, userName, userEmail } = await req.json();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // 🔹 Firestore user reference
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data();
    let customerId = userData.razorpayCustomerId;

    // ✅ Step 1: Create or fetch Razorpay customer
    if (!customerId) {
      try {
        const customer = (await razorpayInstance.customers.create({
          name: userName || userEmail.split("@")[0],
          email: userEmail,
        })) as any;

        customerId = customer.id;
        console.log("✅ Created new Razorpay customer:", customerId);
      } catch (err: any) {
        if (
          err.error?.code === "BAD_REQUEST_ERROR" &&
          err.error?.description?.includes("already exists")
        ) {
          console.log("⚠️ Customer already exists. Fetching existing one...");

          // TypeScript workaround: Razorpay's `.all()` doesn't officially accept `email`, so cast to any
          const customers: any = await (razorpayInstance.customers.all as any)({
            email: userEmail,
            count: 1,
          });

          if (customers?.items?.length > 0) {
            customerId = customers.items[0].id;
            console.log("✅ Using existing customer:", customerId);
          } else {
            throw new Error("Customer exists but could not be retrieved.");
          }
        } else {
          throw err;
        }
      }

      // ✅ Save to Firestore
      await setDoc(userRef, { razorpayCustomerId: customerId }, { merge: true });
      console.log("✅ Customer ID saved to Firestore");
    } else {
      console.log("✅ Using existing customer from Firestore:", customerId);
    }

    // ✅ Step 2: Create Razorpay subscription
    const subscription = (await (razorpayInstance.subscriptions.create as any)({
      plan_id: process.env.RAZORPAY_PLAN_ID!,
      total_count: 12,
      customer_notify: 1,
      customer_id: customerId, // Casted fix
      notes: { userId, userEmail },
    })) as any;

    console.log("✅ Subscription created:", subscription.id);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      customerId,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("❌ Create subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}

