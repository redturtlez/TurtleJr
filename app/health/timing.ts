import "server-only";

export async function measureHealthLoad<T>(label: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    if (process.env.NODE_ENV === "development") {
      console.info(`[health:timing] ${label} ${Math.round(performance.now() - startedAt)}ms`);
    }
  }
}
