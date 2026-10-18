export function ownedAccountWhere(userId: string, id: string) {
  return { id, userId } as const;
}

export function activeOwnedAccountWhere(userId: string, id: string) {
  return { id, userId, archivedAt: null } as const;
}

export function ownedSnapshotWhere(userId: string, id: string) {
  return { id, userId } as const;
}
