// SISTROV2-next/src/app/api/auth/mfa-verify/route.ts
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const ASPNET_API_URL = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";
const MFA_TOKEN_TTL_MS = 5 * 60 * 1000;

export function signMfaToken(username: string, companycode: string): string {
  const secret = process.env.NEXTAUTH_SECRET!;
  const exp = Date.now() + MFA_TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ u: username, c: companycode, exp })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyMfaToken(token: string, username: string, companycode: string): boolean {
  try {
    const secret = process.env.NEXTAUTH_SECRET!;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;

    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > data.exp) return false;
    if (data.u !== username || data.c !== (companycode ?? "")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: { username?: string; companycode?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const { username, companycode, code } = body;
  if (!username || !code) {
    return NextResponse.json({ success: false, message: "username dan code wajib" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ASPNET_API_URL}/api/mfa/verifyotp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Username: username, Code: code }),
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, message: "Layanan verifikasi OTP sedang bermasalah. Coba lagi." });
    }

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ success: false, message: data.message ?? "Kode OTP tidak valid." });
    }

    const mfaToken = signMfaToken(username, companycode ?? "");
    return NextResponse.json({ success: true, mfaToken });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message ?? "Tidak dapat memverifikasi OTP." }, { status: 500 });
  }
}
