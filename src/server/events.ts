import "server-only";
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, getSessionRole, type SessionRole } from "@/lib/auth/session";
import { summarizeUsage, type UsageSummary } from "@/lib/usage/summary";
import type { UsageEventType } from "@/generated/prisma/client";

export async function recordEvent(
  type: UsageEventType,
  data: { year?: number; month?: number } = {},
  role?: SessionRole | null,
) {
  try {
    const actorRole = role ?? (await getSessionRole((await cookies()).get(SESSION_COOKIE)?.value));
    const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;

    after(async () => {
      try {
        await prisma.usageEvent.create({
          data: {
            type,
            actor: actorRole === "admin" ? "ADMIN" : "MEMBER",
            year: data.year ?? null,
            month: data.month ?? null,
            userAgent,
          },
        });
      } catch (error) {
        console.error("Falha ao registrar evento de uso", error);
      }
    });
  } catch (error) {
    console.error("Falha ao registrar evento de uso", error);
  }
}

export async function loadUsageSummary(includeAdmin: boolean, now = new Date()): Promise<UsageSummary> {
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const actorFilter = includeAdmin ? {} : { actor: "MEMBER" as const };

  const [events, recent] = await Promise.all([
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: since }, ...actorFilter },
      select: { type: true, createdAt: true },
    }),
    prisma.usageEvent.findMany({
      where: actorFilter,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return summarizeUsage(events, recent, now);
}
