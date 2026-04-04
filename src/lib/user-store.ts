import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const runtimeDir = path.join(process.cwd(), "runtime");
const usersPath = path.join(runtimeDir, "users.json");

type StoredUser = {
  username: string;
  passwordHash: string;
  memberId: string;
  createdAt: string;
};

type UsersFile = {
  users: StoredUser[];
};

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function readUsers(): Promise<UsersFile> {
  try {
    const raw = await readFile(usersPath, "utf8");
    const parsed = JSON.parse(raw) as UsersFile;
    return { users: Array.isArray(parsed.users) ? parsed.users : [] };
  } catch {
    return { users: [] };
  }
}

async function writeUsers(data: UsersFile) {
  await mkdir(runtimeDir, { recursive: true });
  const tmp = `${usersPath}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, usersPath);
}

export async function signup(username: string, password: string): Promise<{ memberId: string } | { error: string }> {
  const clean = username.trim().toLowerCase();
  if (clean.length < 2) return { error: "Username must be at least 2 characters." };
  if (password.length < 4) return { error: "Password must be at least 4 characters." };
  if (!/^[a-z0-9_]+$/.test(clean)) return { error: "Username can only have letters, numbers, and underscore." };

  const data = await readUsers();
  if (data.users.find((u) => u.username === clean)) {
    return { error: "This username is taken. Pick another one." };
  }

  const memberId = `member_${clean}`;
  data.users.push({
    username: clean,
    passwordHash: hashPassword(password),
    memberId,
    createdAt: new Date().toISOString(),
  });

  await writeUsers(data);
  return { memberId };
}

export async function login(username: string, password: string): Promise<{ memberId: string } | { error: string }> {
  const clean = username.trim().toLowerCase();
  const data = await readUsers();
  const user = data.users.find((u) => u.username === clean);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return { error: "Wrong username or password." };
  }

  return { memberId: user.memberId };
}

export async function getAllMemberIds(): Promise<string[]> {
  const data = await readUsers();
  return data.users.map((u) => u.memberId);
}
