import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "./tokens";
import { ACCESS_COOKIE } from "./cookies";

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}
