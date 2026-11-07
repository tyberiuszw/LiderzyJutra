import { SignJWT, jwtVerify } from "jose";
import { UserSessionPayload } from "../../types/auth";

const getJwtSecret = (type: "access" | "refresh" = "access") => {
  const secret =
    type === "refresh"
      ? process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "liderzy-jutra-development-secret-jwt-key-32-chars-min"
      : process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "liderzy-jutra-development-secret-jwt-key-32-chars-min";
  return new TextEncoder().encode(secret);
};

export async function signAccessToken(payload: UserSessionPayload, expiresIn = "15m"): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret("access"));
}

export async function verifyAccessToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret("access"), {
      algorithms: ["HS256"],
    });
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}

export async function signRefreshToken(userId: string, expiresIn = "30d"): Promise<string> {
  return await new SignJWT({ sub: userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret("refresh"));
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret("refresh"), {
      algorithms: ["HS256"],
    });
    if (payload.type !== "refresh" || !payload.sub) {
      return null;
    }
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
