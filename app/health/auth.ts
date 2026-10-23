import "server-only";

import { auth } from "@clerk/nextjs/server";

export async function requireHealthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in to view the Life Dashboard");
  return userId;
}
