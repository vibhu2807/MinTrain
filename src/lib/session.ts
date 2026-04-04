import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { householdProfiles } from "@/lib/data";
import { getHouseholdState } from "@/lib/household-store";
import { HouseholdMemberId } from "@/lib/types";

export const sessionCookieName = "mintrain_session";

const defaultCredentials: Record<HouseholdMemberId, { username: string; password: string }> = {
  member_you: {
    username: process.env.MINTRAIN_YOU_USERNAME ?? "vibhu",
    password: process.env.MINTRAIN_YOU_PASSWORD ?? "StrongStart!23",
  },
  member_brother: {
    username: process.env.MINTRAIN_BROTHER_USERNAME ?? "brother",
    password: process.env.MINTRAIN_BROTHER_PASSWORD ?? "ProteinStart!23",
  },
  member_sister_in_law: {
    username: process.env.MINTRAIN_SIL_USERNAME ?? "sil",
    password: process.env.MINTRAIN_SIL_PASSWORD ?? "DinnerStart!23",
  },
};

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

function decodeSession(token: string): SessionPayload | null {
  const parsed = decodeSigned<SessionPayload>(token);
  if (parsed == null || !(parsed.memberId in householdProfiles)) return null;
  return parsed;
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(sessionCookieName)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export function verifyCredentials(username: string, password: string) {
  const entries = Object.entries(defaultCredentials) as [
    HouseholdMemberId,
    { username: string; password: string },
  ][];

  const match = entries.find(([, c]) => c.username.toLowerCase() === username.toLowerCase());
  if (!match) return null;

  const [memberId, creds] = match;
  if (creds.password !== password) return null;

  return householdProfiles[memberId];
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

export async function getResolvedHouseholdProfiles() {
  return (await getHouseholdState()).profiles;
}

export async function getProfileForMember(memberId: HouseholdMemberId) {
  const household = await getHouseholdState();
  return household.profiles[memberId];
}

export function demoCredentials() {
  return [
    { label: "You", username: defaultCredentials.member_you.username, password: defaultCredentials.member_you.password },
    { label: "Brother", username: defaultCredentials.member_brother.username, password: defaultCredentials.member_brother.password },
    { label: "Sister-in-law", username: defaultCredentials.member_sister_in_law.username, password: defaultCredentials.member_sister_in_law.password },
  ];
}
