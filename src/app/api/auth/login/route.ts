import { NextResponse } from "next/server";
import { signInWithEmailAndPassword, auth } from "@/lib/firebaseAuth";
import { getIdToken } from "firebase/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await getIdToken(userCredential.user);

    // store token in cookie
    const res = NextResponse.json({ success: true, token: idToken });
    res.cookies.set("authToken", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
