import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";
import { UserSessionPayload } from "../../types/auth";

export const ACCESS_TOKEN_COOKIE = "tb_access_token";
export const REFRESH_TOKEN_COOKIE = "tb_refresh_token";

export async function setAuthCookies(accessToken: string, refreshToken?: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  if (refreshToken) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  return token || null;
}

export async function getCurrentSession(): Promise<UserSessionPayload | null> {
  const token = await getAccessTokenFromCookie();
  if (!token) return null;
  return await verifyAccessToken(token);
}
