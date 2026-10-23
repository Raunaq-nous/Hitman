// Runs once when the server starts: fail fast on an invalid environment.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/providers/env");
    env();
  }
}
