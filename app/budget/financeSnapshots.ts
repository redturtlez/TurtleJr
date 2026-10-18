interface SnapshotLike {
  asOfDate: string;
  recordedAt: Date | string;
  correctedAt: Date | string | null;
}

export function selectCurrentSnapshot<T extends SnapshotLike>(snapshots: readonly T[]): T | null {
  return snapshots
    .filter((snapshot) => snapshot.correctedAt === null)
    .toSorted((left, right) => {
      const byDate = right.asOfDate.localeCompare(left.asOfDate);
      if (byDate !== 0) return byDate;
      return new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime();
    })[0] ?? null;
}
