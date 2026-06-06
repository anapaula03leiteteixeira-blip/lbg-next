import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { Role } from "@/types";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

export interface AuthUser { email: string; name: string; role: Role; }

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get("lbg_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      email: payload.email as string,
      name:  (payload.name  as string) ?? "",
      role:  (payload.role  as Role)   ?? "viewer",
    };
  } catch { return null; }
}
