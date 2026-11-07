import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/session";

export async function POST() {
  try {
    await clearAuthCookies();
    return NextResponse.json({ success: true, message: "Pomyślnie wylogowano." });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Błąd podczas wylogowywania." }, { status: 500 });
  }
}
