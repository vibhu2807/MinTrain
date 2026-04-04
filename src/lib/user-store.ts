import "server-only";

import { createHash } from "node:crypto";
import { supabase } from "@/lib/supabase";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function signup(username: string, password: string): Promise<{ memberId: string } | { error: string }> {
  const clean = username.trim().toLowerCase();
  if (clean.length < 2) return { error: "Username must be at least 2 characters." };
  if (password.length < 4) return { error: "Password must be at least 4 characters." };
  if (!/^[a-z0-9_]+$/.test(clean)) return { error: "Username can only have letters, numbers, and underscore." };

  const memberId = `member_${clean}`;

  const { error } = await supabase.from("users").insert({
    username: clean,
    password_hash: hashPassword(password),
    member_id: memberId,
  });

  if (error) {
    if (error.code === "23505") return { error: "This username is taken. Pick another one." };
    return { error: "Signup failed. Try again." };
  }

  return { memberId };
}

export async function login(username: string, password: string): Promise<{ memberId: string } | { error: string }> {
  const clean = username.trim().toLowerCase();

  const { data } = await supabase
    .from("users")
    .select("member_id, password_hash")
    .eq("username", clean)
    .single();

  if (!data || data.password_hash !== hashPassword(password)) {
    return { error: "Wrong username or password." };
  }

  return { memberId: data.member_id };
}
