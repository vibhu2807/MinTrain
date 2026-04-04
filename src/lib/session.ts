import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ensureProfile } from "@/lib/household-store";
import { HouseholdMemberId } from "@/lib/types";

export const sessionCookieName = "mintrain_session";

const sessionSecret = process.env.MINTRAIN_SESSION_SECRET ?? "change-this-before-public-deploy";

type SessionPayload = {
  memberId: HouseholdMemberId;
  issuedAt: number;
};

function sign(value: string) {
  return createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeSigned<T>(payload: T) {
  const raw = JSON.stringify(payload);
  const base = Buffer.from(raw).toString("base64url");
  return `${base}.${sign(base)}`;
}

function decodeSigned<T>(token: string): T | null {
  const [base, signature] = token.split(".");
  if (!base || !signature) return null;
  const expected = sign(base);
  if (!safeCompare(signature, expected)) return null;
  try {
    return JSON.parse(Buffer.from(base, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(sessionCookieName)?.value;
  if (!token) return null;
  const parsed = decodeSigned<SessionPayload>(token);
  if (!parsed?.memberId) return null;
  return parsed;
}

export function attachSession(response: NextResponse, memberId: HouseholdMemberId) {
  response.cookies.set({
    name: sessionCookieName,
    value: encodeSigned({ memberId, issuedAt: Date.now() }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set({
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getProfileForMember(memberId: HouseholdMemberId) {
  return ensureProfile(memberId);
}
