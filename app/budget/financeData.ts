import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/database";
import { selectCurrentSnapshot } from "./financeSnapshots";

export interface FinanceSnapshotData {
  id: string;
  balanceCents: string;
  asOfDate: string;
  note: string | null;
  recordedAt: string;
  correctedAt: string | null;
  replacesSnapshotId: string | null;
}

export interface FinanceAccountData {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS";
  currency: string;
  currentBalanceCents: string | null;
  currentAsOfDate: string | null;
  lastRecordedAt: string | null;
  snapshots: FinanceSnapshotData[];
}

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to view Finance");
  return userId;
}

export async function getFinanceAccounts(): Promise<FinanceAccountData[]> {
  const userId = await requireUserId();
  const accounts = await prisma.financeAccount.findMany({
    where: { userId, archivedAt: null },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      currency: true,
      snapshots: {
        orderBy: [{ asOfDate: "desc" }, { recordedAt: "desc" }],
        take: 60,
        select: {
          id: true,
          balanceCents: true,
          asOfDate: true,
          note: true,
          recordedAt: true,
          correctedAt: true,
          replacesSnapshotId: true,
        },
      },
    },
  });

  return accounts.map((account) => {
    const current = selectCurrentSnapshot(account.snapshots);
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      currentBalanceCents: current?.balanceCents.toString() ?? null,
      currentAsOfDate: current?.asOfDate ?? null,
      lastRecordedAt: current?.recordedAt.toISOString() ?? null,
      snapshots: account.snapshots.map((snapshot) => ({
        id: snapshot.id,
        balanceCents: snapshot.balanceCents.toString(),
        asOfDate: snapshot.asOfDate,
        note: snapshot.note,
        recordedAt: snapshot.recordedAt.toISOString(),
        correctedAt: snapshot.correctedAt?.toISOString() ?? null,
        replacesSnapshotId: snapshot.replacesSnapshotId,
      })),
    };
  });
}
