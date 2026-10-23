import "server-only";

import { prisma } from "@/lib/database";

export async function ensureLifeProfile(userId: string): Promise<void> {
  await prisma.lifeProfile.upsert({ where: { userId }, update: {}, create: { userId } });
}
