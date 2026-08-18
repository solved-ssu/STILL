export function logServerError(context: string, error: unknown): void {
  console.error(`[STILL] ${context}`, error);
}
