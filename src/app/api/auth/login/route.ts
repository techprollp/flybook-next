import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = String(body.username || "").trim();
  const pass = String(body.password || "");
  if (!user || !pass) {
    return NextResponse.json(
      { error: "Enter username and password." },
      { status: 400 }
    );
  }
  if (!verifyPassword(user, pass)) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }
  await createSession(user);
  return NextResponse.json({ ok: true });
}
