import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createSuperAdminSessionToken,
  getSuperAdminCookieMaxAgeSeconds,
  getSuperAdminCookieName,
  isSuperAdminConfigured,
  verifySuperAdminPassword,
} from "@/lib/super-admin-auth";

const schema = z.object({
  password: z.string().min(1),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isSuperAdminConfigured()) {
      return NextResponse.json({ ok: false, error: "Super admin is not configured" }, { status: 503 });
    }

    const body = schema.parse(await request.json());
    if (!verifySuperAdminPassword(body.password)) {
      return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: getSuperAdminCookieName(),
      value: createSuperAdminSessionToken(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSuperAdminCookieMaxAgeSeconds(),
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Login failed" },
      { status: 400 }
    );
  }
}
