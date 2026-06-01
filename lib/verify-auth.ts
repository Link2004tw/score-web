import "server-only";
import { cookies } from "next/headers";
import admin from "firebase-admin";

const TOKEN_COOKIE = "fb_token";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function verifyToken(token: string) {
  try {
    return await admin.auth().verifyIdToken(token);
  } catch {
    throw new AuthError("Invalid auth token");
  }
}

export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value ?? null;
  if (!token) throw new AuthError("No auth token found");
  return verifyToken(token);
}

export async function requireAuthApi(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (headerToken) return verifyToken(headerToken);

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(TOKEN_COOKIE)?.value ?? null;
  if (!cookieToken) throw new AuthError("No auth token found");
  return verifyToken(cookieToken);
}
