//api/stocks/update/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Await params in Next.js 15+
    const { id } = await params;
    const body = await req.json();
    const { quantity, cost_per_unit } = body;

    const stockRef = doc(db, "stocks", id);
    await updateDoc(stockRef, {
      ...(quantity !== undefined && { quantity }),
      ...(cost_per_unit !== undefined && { cost_per_unit }),
    });

    return NextResponse.json({ success: true, message: "Stock updated successfully" });
  } catch (error: any) {
    console.error("Error updating stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}