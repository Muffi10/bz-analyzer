// src/lib/razorpay.ts
// NOTE: This file is for SERVER-SIDE use only in API routes
// DO NOT import this in client components!

import Razorpay from "razorpay";
import crypto from "crypto";

// Razorpay instance for server-side operations (lazy initialization)
let razorpayInstanceCache: Razorpay | null = null;

export const getRazorpayInstance = () => {
  if (!razorpayInstanceCache) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured. Check your .env file.");
    }
    
    razorpayInstanceCache = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstanceCache;
};

// For backward compatibility
export const razorpayInstance = {
  get customers() {
    return getRazorpayInstance().customers;
  },
  get subscriptions() {
    return getRazorpayInstance().subscriptions;
  },
};

// Razorpay configuration (public values only)
export const RAZORPAY_CONFIG = {
  keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  planId: process.env.NEXT_PUBLIC_RAZORPAY_PLAN_ID!,
  currency: "INR",
  planAmount: 4900, // ₹49 in paise (4900 paise = ₹49) - CHANGED FOR LIVE
};

// Verify Razorpay signature (SERVER-SIDE ONLY)
export const verifyRazorpaySignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");

    return generated_signature === razorpaySignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

// Verify subscription signature (SERVER-SIDE ONLY)
export const verifySubscriptionSignature = (
  razorpaySubscriptionId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  try {
    const text = `${razorpayPaymentId}|${razorpaySubscriptionId}`;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");

    return generated_signature === razorpaySignature;
  } catch (error) {
    console.error("Subscription signature verification error:", error);
    return false;
  }
};