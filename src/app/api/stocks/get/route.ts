//api/stocks/get/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, "stocks"));
    const stocks = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, stocks });
  } catch (error: any) {
    console.error("Error fetching stocks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
